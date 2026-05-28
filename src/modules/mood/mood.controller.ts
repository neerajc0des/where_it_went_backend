import { Request, Response } from 'express';
import {
  createMoodService,
  getMoodsService,
  getMoodByIdService,
  deleteMoodService,
} from './mood.service';

export const createMoodController = async (req: Request, res: Response) => {
  try {
    const mood = await createMoodService(req.userId, req.body);
    return res.status(201).json({
      success: true,
      message: 'Mood logged successfully',
      data: mood
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getMoodsController = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await getMoodsService(req.userId, page, limit);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getMoodByIdController = async (req: Request, res: Response) => {
  try {
    const mood = await getMoodByIdService(req.params.id as string, req.userId);
    return res.status(200).json({ success: true, data: mood });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const deleteMoodController = async (req: Request, res: Response) => {
  try {
    const result = await deleteMoodService(req.params.id as string, req.userId);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
