import { Request, Response } from "express";
import { ZodError } from "zod";
import { createAccountService, deleteAccountService, getAccountAnalyticsService, getAccountByIdService,  getAccountsService, getAccountTransactionsService, restoreAccountService, updateAccountService } from "./accounts.service";
import { transactionFiltersQuerySchema } from "../transactions/transactions.schema";


export const createAccountController = async (req:Request, res: Response)=>{
    try {
        const account = await createAccountService(req.body, req.userId);
        return res.status(201).json({success:true,  message: "Account created successfully", data: account,});
    } catch (error: any) {
        return res.status(400).json({success: false, message: error.message});
    }
}

export const updateAccountController = async (req:Request, res: Response)=>{
    try {
        const updatedAccount = await updateAccountService(req.params.id as string, req.body, req.userId);
        return res.status(200).json({success:true,  message: "Account updated successfully", data: updatedAccount,});
    } catch (error: any) {
        return res.status(400).json({success: false, message: error.message});
    }
}

export const deleteAccountController = async (req:Request, res: Response)=>{
    try {
        await deleteAccountService(req.params.id as string, req.userId);
        return res.status(200).json({success:true,  message: "Account deleted successfully"});
    } catch (error: any) {
        return res.status(400).json({success: false, message: error.message});
    }
}

// export const permanentlyDeleteAccountController = async (req:Request, res: Response)=>{
//     try {
//         await permanentlyDeleteAccountService(req.params.id as string, req.userId);
//         return res.status(200).json({success:true,  message: "Account deleted permanently"});
//     } catch (error: any) {
//         return res.status(400).json({success: false, message: error.message});
//     }
// }

export const restoreAccountController = async (req: Request, res:Response)=>{
    try {
        await restoreAccountService(req.params.id as string, req.userId);
        return res.status(200).json({success:true,  message: "Account restored successfully"});
    } catch (error: any) {
        return res.status(400).json({success: false, message: error.message});
    }
}

// get all accounts
export const getAllAccountsController = async (req:Request, res: Response)=>{
    try {
        const accounts = await getAccountsService(req.userId);
        return res.status(200).json({ success: true, data: accounts });  

    } catch (error:any) {
        return res.status(400).json({ success: false, message: error.message });
    }
}

// getAccount by id 
export const getAccountByIdController = async (req:Request, res: Response)=>{
    try {
        const accounts = await getAccountByIdService(req.params.id as string,req.userId);
        return res.status(200).json({ success: true, data: accounts });  

    } catch (error:any) {
        return res.status(400).json({ success: false, message: error.message });
    }
}

// get all account transactions
export const getAccountTransactionsController = async (req:Request, res: Response)=>{
    try {
        // the route is '/:id/transactions' — this used to read req.query.accountId, which was
        // always undefined and dropped the account filter entirely
        const accountId = req.params.id as string;

        // parsed here rather than through validate() — that middleware only writes the
        // parsed `body` back onto the request, so coerced query params would be lost.
        // accountId comes from the path, so any accountId in the query string is ignored.
        const { accountId: _ignored, ...filters } = transactionFiltersQuerySchema.parse(req.query);

        const result = await getAccountTransactionsService(req.userId, accountId, filters);
        return res.status(200).json({ success: true, data: result });

    } catch (error:any) {
        if (error instanceof ZodError) {
            return res.status(400).json({ success: false, errors: error.issues });
        }

        const notFound = error.message === 'Account not found';
        return res.status(notFound ? 404 : 400).json({ success: false, message: error.message });
    }
}

type Period = "all" | "week" | "month" | "year";

export const getAccountAnalyticsController = async (
  req: Request,
  res: Response
) => {
  // the route is '/:accountId/analytics' — this used to read req.query.id, which was always undefined
  const accountId = req.params.accountId as string;

  const {period = "all", from, to} = req.query as {
    period?: Period;
    from?: string;
    to?: string;
  };

  try {
    // service signature is (userId, accountId, ...) — the first two args used to be swapped
    const analytics = await getAccountAnalyticsService(req.userId,accountId,period,from,to);

    return res.status(200).json({
      success: true,
      message: "Account analytics fetched successfully.",
      data: analytics,
    });
    
  } catch (error) {
    console.error("Error fetching account analytics:", error);

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch account analytics.",
    });
  }
};