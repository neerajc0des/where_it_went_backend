import { Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  createTransactionService,
  updateTransactionService,
  deleteTransactionService,
  getAllTransactionService,
  getTransactionByIdService,
} from './transactions.service';
import { transactionFiltersQuerySchema } from './transactions.schema';

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
    const notFound = error.message === 'Transaction not found';
    return res
      .status(notFound ? 404 : 400)
      .json({ success: false, message: error.message });
  }
};

export const deleteTransactionController = async (req: Request, res: Response) => {
  try {
    const result = await deleteTransactionService(
      req.params.id as string,
      req.userId
    );

    return res.status(200).json({ success: true, message: result.message, data: result });
  } catch (error: any) {
    const notFound = error.message === 'Transaction not found';
    return res
      .status(notFound ? 404 : 400)
      .json({ success: false, message: error.message });
  }
};

export const getAllTransactionsController = async (req: Request, res: Response) => {
  try {
    // parsed here rather than through validate() — that middleware only writes the
    // parsed `body` back onto the request, so coerced query params would be lost
    const filters = transactionFiltersQuerySchema.parse(req.query);

    const result = await getAllTransactionService(req.userId, filters);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }

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
