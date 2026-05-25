import { Request, Response } from 'express';
import {
  createTransactionService,
  updateTransactionService,
  deleteTransactionService,
  getAllTransactionService,
  getTransactionByIdService,
} from './transactions.service';

export const createTransactionController = async (req: Request, res: Response) => {
  try {
    const transaction = await createTransactionService(req.body, req.userId);
    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateTransactionController = async (req: Request, res: Response) => {
  try {
    const transaction = await updateTransactionService(
      req.params.id as string,
      req.body,
      req.userId
    );
    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteTransactionController = async (req: Request, res: Response) => {
  try {
    const result = await deleteTransactionService(
      req.params.id as string,
      req.userId
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllTransactionsController = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const accountId = req.query.accountId as string | undefined;

    const result = await getAllTransactionService(req.userId, accountId, page, limit);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getTransactionByIdController = async (req: Request, res: Response) => {
  try {
    const transaction = await getTransactionByIdService(
      req.params.id as string,
      req.userId
    );
    return res.status(200).json({ success: true, data: transaction });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
};