import prisma from "../../config/db";
import { CreateAccountInput, UpdateAccountInput } from "./accounts.schema";


// create account
export const createAccountService = async (
    payload: CreateAccountInput,
    userId: string
) => {
    const { name, icon, balance, monthlyBudget } = payload;

    if (name.trim().toLowerCase() === 'wallet') {
        throw new Error("The name 'Wallet' is reserved by the system.")
    }

    const account = await prisma.account.create({
        data: {
            name,
            icon,
            balance,
            openingBalance: balance,
            monthlyBudget,
            userId
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

    const updatedAccount = await prisma.account.update({
        where: {
            id: accountId,
        },
        data: {
            ...payLoad
        },
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
            isDeleted: true
        }
    })

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
    page: number,
    limit: number
) => {
    const account = await prisma.account.findFirst({
        where: {
            id: accountId,
            userId,
        },
    });

    if (!account) {
        throw new Error("Account not found");
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await prisma.$transaction([
        prisma.transaction.findMany({
            where: { accountId },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        }),

        prisma.transaction.count({
            where: { accountId },
        }),
    ]);

    return {
        transactions,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
        },
    };
};