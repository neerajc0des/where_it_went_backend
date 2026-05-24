import { Request, Response } from 'express';
import {
  getCategoriesService,
  getCategoriesByTypeService,
  createCategoryService,
  updateCategoryService,
  getCategoryTransactionCountService,
  deleteCategoryService,
} from './categories.service';

export const getCategoriesController = async (req: Request, res: Response) => {
  try {
    const categories = await getCategoriesService(req.userId);
    return res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getCategoriesByTypeController = async (req: Request, res: Response) => {
  try {
    const rawType = req.params.type;
    const typeStr = Array.isArray(rawType) ? rawType[0] : rawType;
    const type = (typeStr || '').toUpperCase() as 'EXPENSE' | 'INCOME';
    
    if (!['EXPENSE', 'INCOME'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid type — must be EXPENSE or INCOME' });
    }
    const categories = await getCategoriesByTypeService(req.userId, type);
    return res.status(200).json({ success: true, data: categories });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const createCategoryController = async (req: Request, res: Response) => {
  try {
    const category = await createCategoryService(req.userId, req.body);
    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCategoryController = async (req: Request, res: Response) => {
  try {
    const category = await updateCategoryService(
      req.params.id as string,
      req.userId,
      req.body
    );
    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getCategoryTransactionCountController = async (req: Request, res: Response) => {
  try {
    const result = await getCategoryTransactionCountService(
      req.params.id as string,
      req.userId
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCategoryController = async (req: Request, res: Response) => {
  try {
    const result = await deleteCategoryService(
      req.params.id as string,
      req.userId
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};