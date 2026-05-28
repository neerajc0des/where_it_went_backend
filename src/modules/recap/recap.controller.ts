import { Request, Response } from 'express';
import {
  generateRecapService,
  getAllRecapsService,
  getRecapByIdService,
  deleteRecapService,
} from './recap.service';

export const generateRecapController = async (req: Request, res: Response) => {
  try {
    const recap = await generateRecapService(req.userId, req.body);
    return res.status(201).json({
      success: true,
      message: 'Recap generated successfully',
      data: recap
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllRecapsController = async (req: Request, res: Response) => {
  try {
    const recaps = await getAllRecapsService(req.userId);
    return res.status(200).json({ success: true, data: recaps });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getRecapByIdController = async (req: Request, res: Response) => {
  try {
    const recap = await getRecapByIdService(req.params.id as string, req.userId);
    return res.status(200).json({ success: true, data: recap });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const deleteRecapController = async (req: Request, res: Response) => {
  try {
    const result = await deleteRecapService(req.params.id as string, req.userId);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};