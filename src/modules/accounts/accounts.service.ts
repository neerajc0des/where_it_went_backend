import prisma from "../../config/db";
import { Prisma } from "@prisma/client";

import { CreateAccountInput, UpdateAccountInput } from "./accounts.schema";
import { getAllTransactionService } from "../transactions/transactions.service";
import { TransactionFiltersQuery } from "../transactions/transactions.schema";


// create account
export const createAccountService = async (
    payload: CreateAccountInput,
    userId: string
) => {
    const { name, icon, balance, monthlyBudget } = payload;

    if (name.trim().toLowerCase() === 'wallet') {
        throw new Error("The name 'Wallet' is reserved by the system.")
    }

    // the very first account a user creates becomes their primary, so transaction
    // entry always has a sensible default without them choosing one
    const existingCount = await prisma.account.count({
        where: { userId, isDeleted: false }
    });

    const account = await prisma.account.create({
        data: {
            name,
            icon,
            balance,
            openingBalance: balance,
            monthlyBudget,
            userId,
            isPrimary: existingCount === 0,
        },
        omit: { userId: true }
    })

    return account;
}

// update account
export const updateAccountService = async (
    accountId: string,
    payLoad: UpdateAccountInput,
    userId: string
) => {
    const account = await prisma.account.findFirst({
        where: {
            id: accountId,
            userId
        }
    });

    if (!account) throw new Error('Account not found');

    const data: Prisma.AccountUpdateInput = { ...payLoad };

    // balance is openingBalance plus everything the transactions did to it, so a
    // corrected opening balance has to shift the running balance by the same amount.
    // Recomputing from the transactions instead would undo any manual correction.
    if (payLoad.openingBalance !== undefined) {
        const delta = payLoad.openingBalance - account.openingBalance.toNumber();

        if (delta !== 0) data.balance = { increment: delta };
    }

    const updatedAccount = await prisma.account.update({
        where: {
            id: accountId,
        },
        data,
        omit: { userId: true },
    });

    return updatedAccount;
}

export const deleteAccountService = async (
    accountId: string,
    userId: string,
) => {
    const account = await prisma.account.findFirst({
        where: {
            id: accountId,
            userId
        }
    });

    if (!account) throw new Error('Account not found');
    if (account.isDeleted) throw new Error('Account is already deleted');

    await prisma.account.update({
        where: { id: accountId },
        data: {
            isDeleted: true,
            isPrimary: false,
        }
    })

    // never leave the user without a primary — promote their next most recent account
    if (account.isPrimary) {
        const successor = await prisma.account.findFirst({
            where: { userId, isDeleted: false },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });

        if (successor) {
            await prisma.account.update({
                where: { id: successor.id },
                data: { isPrimary: true },
            });
        }
    }

    return {
        message: 'Account archived successfully'
    }
}

// export const permanentlyDeleteAccountService = async (
//     accountId: string,
//     userId: string,
// ) => {
//     const account = await prisma.account.findFirst({
//         where: {
//             id: accountId,
//             userId
//         }
//     });

//     if (!account) {
//         throw new Error('Account not found');
//     }

//     await prisma.account.delete({
//         where: {
//             id: accountId
//         }
//     })

//     return { message: 'Account deleted permanently!' };
// }

export const restoreAccountService = async (
    accountId: string,
    userId: string,
) => {
    const account = await prisma.account.findFirst({
        where: {
            id: accountId,
            userId
        }
    });

    if (!account) throw new Error('Account not found');
    if (!account.isDeleted) throw new Error('Account is already active');

    await prisma.account.update({
        where: { id: accountId },
        data: {
            isDeleted: false
        }
    })

    return { message: 'Account restored successfully' };
}

/** Exactly one account per user carries isPrimary, so this swaps rather than sets. */
export const setPrimaryAccountService = async (accountId: string, userId: string) => {
    const account = await prisma.account.findFirst({
        where: { id: accountId, userId, isDeleted: false },
    });

    if (!account) throw new Error('Account not found');

    const [, updated] = await prisma.$transaction([
        prisma.account.updateMany({
            where: { userId, isPrimary: true },
            data: { isPrimary: false },
        }),
        prisma.account.update({
            where: { id: accountId },
            data: { isPrimary: true },
            omit: { userId: true },
        }),
    ]);

    return updated;
};

/** The account transaction entry defaults to. Falls back so callers always get one. */
export const getPrimaryAccount = async (userId: string) => {
    const primary = await prisma.account.findFirst({
        where: { userId, isDeleted: false, isPrimary: true },
    });

    if (primary) return primary;

    return prisma.account.findFirst({
        where: { userId, isDeleted: false },
        orderBy: { createdAt: 'asc' },
    });
};

export const getAccountsService = async (userId: string) => {
    const accounts = await prisma.account.findMany({
        where: { 
            userId,
            isDeleted: false,
         },
        orderBy: { 
            createdAt: 'desc',
            
        },
        omit: { userId: true },
        include: {
            _count: {
                select: {
                    transactions: true,
                },
            },
        },

    });

    return accounts;
};

export const getAccountByIdService = async (accountId: string, userId: string) => {
    const account = await prisma.account.findFirst({
        where: { id: accountId, userId },
        omit: { userId: true },
        include: {
            transactions: {
                orderBy: { date: 'desc'},
                take: 5,
            }
        }
    }); 

    if (!account) throw new Error('Account not found');

    return account;
};

export const getAccountTransactionsService = async (
    userId: string,
    accountId: string,
    filters: Partial<TransactionFiltersQuery> = {}
) => {
    // an empty id used to fall through to findFirst({ id: undefined }), which matched the
    // user's first account and then listed every transaction in the table — reject it here
    if (!accountId) throw new Error("Account not found");

    const account = await prisma.account.findFirst({
        where: {
            id: accountId,
            userId,
        },
    });

    if (!account) {
        throw new Error("Account not found");
    }

    // delegated so this route returns exactly what GET /transactions returns — same
    // filters, same joined category/account, same ordering, same pagination and totals
    return getAllTransactionService(userId, { ...filters, accountId });
};

type Period = "all" | "week" | "month" | "year";

export const getAccountAnalyticsService = async (
    userId: string,
    accountId: string,
    period: Period = "all",
    from?: string,
    to?: string,
) => {
    const account = await prisma.account.findFirst({
        where: {
            id: accountId,
            userId,
        },
        select: {
            id: true,
            name: true,
            balance: true,
        },
    });

    if (!account) {
        throw new Error("Account not found");
    }

    const now = new Date();

    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    switch (period) {
        case "week":
            startDate = new Date();
            startDate.setDate(now.getDate() - 7);
            break;
        case "month":
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;

        case "year":
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;

        case "all":
            startDate = undefined;
            endDate = undefined;
            break;
    }

    if (from && to) {
        startDate = new Date(from);
        endDate = new Date(to);
    }

    const dateFilter =
        startDate && endDate
            ? Prisma.sql`AND t.date BETWEEN ${startDate} AND ${endDate}`
            : Prisma.empty;

    const summary = await prisma.$queryRaw<
        {
            expense: Prisma.Decimal;
            income: Prisma.Decimal;
            transactionCount: bigint;
        }[]
    >`
    SELECT
      COALESCE(SUM(CASE WHEN t.type='EXPENSE' THEN t.amount END),0) AS expense,
      COALESCE(SUM(CASE WHEN t.type='INCOME' THEN t.amount END),0) AS income,
      COUNT(*) AS "transactionCount"
    FROM "Transaction" t
    WHERE t."accountId"=${accountId}
    ${dateFilter};
  `;

    const expenseBreakdown = await prisma.$queryRaw<
        {
            categoryId: string;
            category: string;
            icon: string | null;
            amount: Prisma.Decimal;
        }[]
    >`
    SELECT
      c.id as "categoryId",
      c.name as category,
      c.icon,
      SUM(t.amount) as amount
    FROM "Transaction" t
    JOIN "TransactionCategory" c
      ON c.id=t."categoryId"
    WHERE
      t."accountId"=${accountId}
      AND t.type='EXPENSE'
      ${dateFilter}
    GROUP BY c.id,c.name,c.icon
    ORDER BY amount DESC;
  `;

    const incomeBreakdown = await prisma.$queryRaw<
        {
            categoryId: string;
            category: string;
            icon: string | null;
            amount: Prisma.Decimal;
        }[]
    >`
    SELECT
      c.id as "categoryId",
      c.name as category,
      c.icon,
      SUM(t.amount) as amount
    FROM "Transaction" t
    JOIN "TransactionCategory" c
      ON c.id=t."categoryId"
    WHERE
      t."accountId"=${accountId}
      AND t.type='INCOME'
      ${dateFilter}
    GROUP BY c.id,c.name,c.icon
    ORDER BY amount DESC;
  `;

    const totalExpense = Number(summary[0].expense);
    const totalIncome = Number(summary[0].income);

    return {
        account,

        summary: {
            expense: totalExpense,
            income: totalIncome,
            transactionCount: Number(summary[0].transactionCount),
        },

        expenseBreakdown: expenseBreakdown.map((x) => ({
            ...x,
            amount: Number(x.amount),
            percentage:
                totalExpense === 0
                    ? 0
                    : Number(((Number(x.amount) / totalExpense) * 100).toFixed(1)),
        })),

        incomeBreakdown: incomeBreakdown.map((x) => ({
            ...x,
            amount: Number(x.amount),
            percentage:
                totalIncome === 0
                    ? 0
                    : Number(((Number(x.amount) / totalIncome) * 100).toFixed(1)),
        })),
    };


}