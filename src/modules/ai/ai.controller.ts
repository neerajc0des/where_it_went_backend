import { Request, Response } from "express";
import { smartEntryService } from "./ai.service";

export const smartEntryController = async (req: Request, res: Response)=>{
    try {
        const transaction = await smartEntryService(req.userId, req.body);
        return res.status(201).json({
            success: true,
            message: 'Transaction created successfully.',
            data: transaction
        });
    } catch (error:any) {
        return res.status(400).json({success: false, message: error.message})
    }
}