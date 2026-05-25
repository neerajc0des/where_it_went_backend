import prisma from "../../config/db";
import { CreateTransactionInput, UpdateTransactionInput } from "./transactions.schema";

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
                dayOfWeek,
                hourOfDay 
            },
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

    const account = await prisma.account.findFirst({
        where: { id: accountId ?? existingTransaction.accountId, userId }
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


    const currentBalance = account.balance.toNumber();
    const oldAmount = existingTransaction.amount.toNumber();
    const updatedAmount = (newAmount ?? oldAmount);

    // old transactionundo
    const balanceAfterUndo = existingTransaction.type === 'EXPENSE'
                                                ? currentBalance + oldAmount  
                                                : currentBalance - oldAmount
    
    // applying new changes
    const updatedBalance = (type??existingTransaction.type)==='EXPENSE' 
                                                            ?balanceAfterUndo - updatedAmount  
                                                            :balanceAfterUndo + updatedAmount
    

    const date = new Date(payload.date ?? Date.now());
    const hourOfDay = date.getHours();
    const dayOfWeek = date.getDay();

    const [transaction] = await prisma.$transaction([
        prisma.transaction.update({
            where: { id: transactionId },
            data: {
                ...payload,
                dayOfWeek,
                hourOfDay 
            },
        }),
        
        prisma.account.update({
            where: {
                id: accountId,
                userId,
            },
            data: {
                balance: updatedBalance
            }
        })
    ]);

    return transaction;
}


export const deleteTransactionService = async(
    transactionId: string,
    userId: string
)=>{
    const existingTransaction = await prisma.transaction.findFirst({
        where: { 
            id: transactionId,
            account: {userId}
         }
    });
    if (!existingTransaction) throw new Error('Transaction not found');

    const account = await prisma.account.findFirst({
        where: { id: existingTransaction.accountId, userId }
    });
    if (!account) throw new Error('Account not found');



    const currentBalance = account.balance.toNumber();
    const oldAmount = existingTransaction.amount.toNumber();

    // old transaction undo
    const balanceAfterUndo = existingTransaction.type === 'EXPENSE'
                                                ? currentBalance + oldAmount  
                                                : currentBalance - oldAmount

    await prisma.$transaction([
        prisma.transaction.delete({
            where: { id: transactionId }
        }),

        prisma.account.update({
        where: { id: existingTransaction.accountId },
            data: { balance: balanceAfterUndo }
        })
    ]);

    return {message: 'Transaction deleted successfully'};
}

export const getAllTransactionService = async(
    userId: string,
    accountId?: string,
    page: number = 1,
    limit: number = 20
) => {

    const skip = (page - 1) * limit;

    const [transactions, total] = await prisma.$transaction([
        prisma.transaction.findMany({
            where: { 
                account: { 
                    userId, 
                    isArchived: false,
                    ...(accountId && { id: accountId })
                } 
            },  
            include: {
                category: { select: { id: true, name: true, icon: true, type: true } },
                account: { select: { id: true, name: true, type: true } }
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        }),

        prisma.transaction.count({
            where: {
                account: {
                userId,
                isArchived: false,
                ...(accountId && { id: accountId })
                }
            }
        })
    ]);
    
    return {
        transactions,
            pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
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
        include: {
            category: { select: { id: true, name: true, icon: true, type: true } },
            account: { select: { id: true, name: true, type: true } }
        }
    });

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    return transaction;
};