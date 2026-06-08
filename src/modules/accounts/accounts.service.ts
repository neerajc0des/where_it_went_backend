import prisma from "../../config/db";
import { CreateAccountInput, UpdateAccountInput } from "./accounts.schema";


// create account
export const createAccountService = async (
    payload: CreateAccountInput,
    userId: string
) => {
    const {name, icon, balance, monthlyBudget} = payload;

    if (name.trim().toLowerCase() === 'wallet') {
        throw new Error("The name 'Wallet' is reserved by the system.")
    }

    const account = await prisma.account.create({
        data: {
            name,
            icon,
            balance,
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
)=>{
    const {name, icon, balance, monthlyBudget} = payLoad;

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

export const deleteAccountService = async(
    accountId:string,
    userId:string,
) =>{
    const account = await prisma.account.findFirst({where: {
        id: accountId,
        userId
    }});

    if (!account) throw new Error('Account not found');
    if (account.isArchived) throw new Error('Account is already archived');

    await prisma.account.update({
        where: {id: accountId},
        data: {
            isArchived: true
        }
    })

    return {
        message: 'Account archived successfully'
    }
}

export const permanentlyDeleteAccountService = async(
    accountId:string,
    userId: string,
) => {
    const account = await prisma.account.findFirst({
        where: {
            id: accountId,
            userId
        }
    });

    if(!account) {
        throw new Error('Account not found');
    }

    await prisma.account.delete({
        where:{
            id: accountId
        }
    })

    return {message: 'Account deleted permanently!'};
}

export const restoreAccountService = async(
    accountId:string,
    userId:string,
) =>{
    const account = await prisma.account.findFirst({where: {
        id: accountId,
        userId
    }});

    if (!account) throw new Error('Account not found');
    if (!account.isArchived) throw new Error('Account is already active');

    await prisma.account.update({
        where: {id: accountId},
        data: {
            isArchived: false
        }
    })

    return {message: 'Account restored successfully' }; 
}

export const getAccountsService = async (userId: string) => {
    const accounts = await prisma.account.findMany({
        where: { userId, isArchived: false },
        orderBy: { createdAt: 'desc' },
        omit: { userId: true }
    });
    
  return accounts;
};

export const getAccountByIdService = async (accountId:string, userId: string) => {
    const account = await prisma.account.findFirst({
        where: { id:accountId, userId, isArchived: false },
        omit: { userId: true },
    });

    if (!account) throw new Error('Account not found');

    return account;
};