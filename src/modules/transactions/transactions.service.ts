import { Prisma } from "@prisma/client";
import prisma from "../../config/db";
import {
    CreateTransactionInput,
    UpdateTransactionInput,
    TransactionFiltersQuery,
    MAX_TRANSACTION_PAGE_SIZE,
    DEFAULT_TRANSACTION_PAGE_SIZE,
} from "./transactions.schema";

// every list endpoint returns the same joined shape, so the client can render one card
// component regardless of which route it fetched from
const transactionListInclude = {
    category: { select: { id: true, name: true, icon: true, type: true } },
    account: { select: { id: true, name: true } },
} satisfies Prisma.TransactionInclude;

// `from` / `to` arrive as calendar days. They are anchored to UTC — the same convention
// analytics.service.ts uses — because the stored timestamps are UTC; anchoring to the
// server's local zone would shift the window by the offset and quietly drop edge rows.
const startOfUtcDay = (day: string) => new Date(`${day}T00:00:00.000Z`);
const endOfUtcDay = (day: string) => new Date(`${day}T23:59:59.999Z`);

// a Decimal signed by its direction of travel, so old and new states of a transaction can
// be diffed with exact arithmetic instead of round-tripping money through IEEE-754 floats
const signedEffect = (type: 'EXPENSE' | 'INCOME', amount: Prisma.Decimal) =>
    type === 'EXPENSE' ? amount.negated() : amount;

// create transaction service
export const createTransactionService = async(
    payload: CreateTransactionInput,
    userId: string
) => {
    const {accountId, categoryId, amount, type} = payload;

    // validate account and category belong to user
    const account = await prisma.account.findFirst({
        where: {
            id: accountId,
            userId
         }
    });
    if (!account) throw new Error('Account not found');

    const category = await prisma.transactionCategory.findFirst({
        where: { id: categoryId,
            OR: [
                {userId: null},
                {userId},
            ]
         }
    });
    if (!category) throw new Error('Category not found');

    const date = new Date(payload.date ?? Date.now());
    const hourOfDay = date.getHours();
    const dayOfWeek = date.getDay();

    const [transaction] = await prisma.$transaction([
        prisma.transaction.create({
            data: {
                ...payload,
                hourOfDay,
                dayOfWeek
            },
            include: transactionListInclude,
        }),

        prisma.account.update({
            where: {
                id: accountId,
                userId,
            },
            data: {
                balance: type==='EXPENSE'
                        ? {decrement: amount}
                        : {increment: amount}
            }
        })
    ]);

    return transaction;
}

// update transaction service
export const updateTransactionService = async(
    transactionId: string,
    payload: UpdateTransactionInput,
    userId: string
) => {
    const {accountId, categoryId, amount: newAmount, type} = payload;

    // validate account and category and transaction belong to user
    const existingTransaction = await prisma.transaction.findFirst({
        where: {
            id: transactionId,
            account: {userId}
         }
    });
    if (!existingTransaction) throw new Error('Transaction not found');

    // `accountId` is optional on the update payload — most edits (note, amount, category)
    // omit it entirely, so fall back to the account the transaction already lives on.
    const sourceAccountId = existingTransaction.accountId;
    const targetAccountId = accountId ?? sourceAccountId;
    const hasMoved = targetAccountId !== sourceAccountId;

    const account = await prisma.account.findFirst({
        where: { id: targetAccountId, userId }
    });
    if (!account) throw new Error('Account not found');


    if (categoryId) {
        const category = await prisma.transactionCategory.findFirst({
            where: { id: categoryId,
                OR: [
                    {userId: null},
                    {userId},
                ]
            }
        });
        if (!category) throw new Error('Category not found');
    }


    const oldEffect = signedEffect(existingTransaction.type, existingTransaction.amount);
    const newEffect = signedEffect(
        type ?? existingTransaction.type,
        newAmount !== undefined
            ? new Prisma.Decimal(newAmount)
            : existingTransaction.amount
    );

    const data: Prisma.TransactionUncheckedUpdateInput = { ...payload };

    // hourOfDay / dayOfWeek are denormalised from `date` and drive the weekday / time-of-day
    // analytics. Only recompute them when the caller actually sent a new date — deriving them
    // from `Date.now()` on every edit would stamp the row with today's bucket while leaving
    // the `date` column untouched, permanently desyncing the two.
    if (payload.date !== undefined) {
        const date = new Date(payload.date);
        data.hourOfDay = date.getHours();
        data.dayOfWeek = date.getDay();
    }

    // balances move by relative increments computed by the database, so a concurrent
    // create/update/delete on the same account cannot be clobbered by a stale read
    const transaction = await prisma.$transaction(async (tx) => {
        const updated = await tx.transaction.update({
            where: { id: transactionId },
            data,
            include: transactionListInclude,
        });

        if (hasMoved) {
            // undo the original entry on the account that actually carried it...
            await tx.account.update({
                where: { id: sourceAccountId },
                data: { balance: { increment: oldEffect.negated() } },
            });

            // ...and apply the new one to the destination
            await tx.account.update({
                where: { id: targetAccountId },
                data: { balance: { increment: newEffect } },
            });
        } else {
            const delta = newEffect.minus(oldEffect);

            if (!delta.isZero()) {
                await tx.account.update({
                    where: { id: targetAccountId },
                    data: { balance: { increment: delta } },
                });
            }
        }

        return updated;
    });

    return transaction;
}

export const deleteTransactionService = async(
    transactionId: string,
    userId: string
)=>{
    // scoped through the account relation, so a transaction belonging to another user
    // is indistinguishable from one that does not exist
    const existingTransaction = await prisma.transaction.findFirst({
        where: {
            id: transactionId,
            account: {userId}
         }
    });
    if (!existingTransaction) throw new Error('Transaction not found');

    await prisma.$transaction([
        prisma.transaction.delete({
            where: { id: transactionId }
        }),

        prisma.account.update({
            where: { id: existingTransaction.accountId },
            data: {
                // undo the entry: an expense is credited back, income is debited back
                balance: existingTransaction.type === 'EXPENSE'
                    ? { increment: existingTransaction.amount }
                    : { decrement: existingTransaction.amount }
            }
        })
    ]);

    return {message: 'Transaction deleted successfully'};
}

export const getAllTransactionService = async(
    userId: string,
    filters: Partial<TransactionFiltersQuery> = {}
) => {
    const { accountId, categoryId, type, search, from, to } = filters;

    const page = Math.max(1, Math.trunc(filters.page ?? 1));
    const limit = Math.min(
        MAX_TRANSACTION_PAGE_SIZE,
        Math.max(1, Math.trunc(filters.limit ?? DEFAULT_TRANSACTION_PAGE_SIZE))
    );
    const skip = (page - 1) * limit;

    // An explicit account is already an ownership check on that one account, so it is not
    // additionally filtered by isArchived — otherwise the detail page for an archived
    // account would show an empty list. The unscoped feed still hides archived accounts.
    const accountFilter: Prisma.AccountWhereInput = accountId
        ? { id: accountId, userId }
        : { userId, isArchived: false };

    const where: Prisma.TransactionWhereInput = {
        account: accountFilter,
        ...(categoryId && { categoryId }),
        ...(type && { type }),
        ...(search && {
            OR: [
                { merchant: { contains: search, mode: 'insensitive' } },
                { note: { contains: search, mode: 'insensitive' } },
            ],
        }),
        ...((from || to) && {
            date: {
                ...(from && { gte: startOfUtcDay(from) }),
                // inclusive of the whole `to` day
                ...(to && { lte: endOfUtcDay(to) }),
            },
        }),
    };

    // totals are grouped over the same `where`, so they cover the WHOLE filtered set
    // rather than the current page, and are read in the same transaction as the page
    const [transactions, total, totalsByType] = await prisma.$transaction([
        prisma.transaction.findMany({
            where,
            include: transactionListInclude,
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),

        prisma.transaction.count({ where }),

        prisma.transaction.groupBy({
            by: ['type'],
            where,
            _sum: { amount: true },
        }),
    ]);

    const sumFor = (transactionType: 'EXPENSE' | 'INCOME') =>
        Number(totalsByType.find(row => row.type === transactionType)?._sum.amount ?? 0);

    return {
        transactions,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
        },
        totals: {
            expense: sumFor('EXPENSE'),
            income: sumFor('INCOME'),
        },
    };
}

export const getTransactionByIdService = async(
    transactionId: string,
    userId: string
) => {
    const transaction = await prisma.transaction.findFirst({
        where: {
            id: transactionId,
            account: {
                userId
            }
        },
        include: transactionListInclude,
    });

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    return transaction;
};
