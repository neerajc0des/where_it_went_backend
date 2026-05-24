import { Request, Response } from "express";
import { createAccountService, deleteAccountService, getAccountByIdService,  getAccountsService, permanentlyDeleteAccountService, restoreAccountService, updateAccountService } from "./accounts.service";


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

export const permanentlyDeleteAccountController = async (req:Request, res: Response)=>{
    try {
        await permanentlyDeleteAccountService(req.params.id as string, req.userId);
        return res.status(200).json({success:true,  message: "Account deleted permanently"});
    } catch (error: any) {
        return res.status(400).json({success: false, message: error.message});
    }
}

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