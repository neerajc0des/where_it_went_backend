import { Request, Response } from "express";
import { deleteNudgeService, generateBalanceWarningNudgeService, getAllNudgesService, markNudgeAsReadService } from "./nudge.service";

export const generateBalancewarnNudgesController = async (req: Request, res:Response) =>{
  try {
    const nudges = await generateBalanceWarningNudgeService(req.userId);
    return res.status(200).json({
      success: true,
      message: "Balance warning nudge list generated successfully",
      data: nudges
    })
  } catch (error:any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export const markNudgeAsReadController = async(req: Request, res:Response)=>{
  try {
    const result = markNudgeAsReadService(req.params.id as string, req.userId);

    res.status(200).json({
      success: true,
      message: "Nudge marked as read.",
      data: result
    })
  } catch (error:any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export const getAllNudgesController = async (req:Request, res:Response)=>{
  try {
    const nudges = await getAllNudgesService(req.userId);

    res.status(200).json({
      success: true,
      data: nudges
    })
  } catch (error:any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

export const deleteNudgeController = async (req:Request, res:Response)=>{
  try {
    const result = await deleteNudgeService(req.params.id as string, req.userId);

    return res.status(200).json({
      success: true,
      message: result.message
    })
  } catch (error:any) {
    return res.status(400).json({ success: false, message: error.message });
  }
}