import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import { CreateCategoryInput, UpdateCategoryInput } from './categories.schema';
import { DEFAULT_CATEGORIES } from '../../utils/default-categories';

// get all categories 
export const getCategoriesService = async (userId: string) => {
  const categories = await prisma.transactionCategory.findMany({
    where: {
      OR: [
        { userId: null },  // default categories
        { userId }         // user's custom categories
      ]
    },
    orderBy: [
      { isDefault: 'desc' }, // defaults first
      { createdAt: 'asc' }
    ],
    omit: { userId: true }
  });

  // separate into two groups for cleaner frontend consumption
  const defaultCategories = categories.filter((c:any) => c.isDefault);
  const customCategories = categories.filter((c:any) => !c.isDefault);

  return { defaultCategories, customCategories };
};

// get categories by type
export const getCategoriesByTypeService = async (
  userId: string,
  type: 'EXPENSE' | 'INCOME'
) => {
  return await prisma.transactionCategory.findMany({
    where: {
      type,
      OR: [
        { userId: null },
        { userId }
      ]
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' }
    ],
    omit: { userId: true }
  });
};

// create custom category
export const createCategoryService = async (
  userId: string,
  payload: CreateCategoryInput
) => {
  const { name, icon, type, isDefault } = payload;

  // check if user already has a custom category with same name and type
  const catExists = await prisma.transactionCategory.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, userId }
  });
  if (catExists) throw new Error('You already have a category with this name');

  try {
    return await prisma.transactionCategory.create({
      data: { name, icon, type, userId, isDefault },
      omit: { userId: true }
    });

  } catch (error:any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new Error('You already have a category with this name');
    }
    throw error;
  }
};


// update custom category
export const updateCategoryService = async (
  categoryId: string,
  userId: string,
  payload: UpdateCategoryInput
) => {
  const category = await prisma.transactionCategory.findFirst({
    where: { id: categoryId, userId }
  }); 

  if (!category) throw new Error('Category not found'); 

  if (payload.name && payload.name !== category.name) {
    const nameExists = await prisma.transactionCategory.findFirst({
      where: { 
        name: { equals: payload.name },
        userId 
      }
    });
    
    if (nameExists && nameExists.id !== categoryId) {
      throw new Error('You already have a category with this name');
    }
  }

  return await prisma.transactionCategory.update({
    where: { id: categoryId },
    data: { ...payload},
    omit: { userId: true }  
  });
};

// get transaction count before delete — for warning
// export const getCategoryTransactionCountService = async (
//   categoryId: string,
//   userId: string
// ) => {
//   const category = await prisma.transactionCategory.findFirst({
//     where: { id: categoryId, userId }
//   });

//   if (!category) throw new Error('Category not found');
//   if (category.isDefault) throw new Error('Cannot delete default categories');

//   const count = await prisma.transaction.count({
//     where: {
//       categoryId,
//       account: { userId }
//     }
//   });

//   return { count, categoryName: category.name };
// };

// delete custom category
export const deleteCategoryService = async (
  categoryId: string,
  userId: string
) => {
  const category = await prisma.transactionCategory.findFirst({
    where: { id: categoryId, userId }
  });

  if (!category) throw new Error('Category not found');
  if (category.isDefault) throw new Error('Cannot delete default categories');

  await prisma.transactionCategory.delete({
    where: { id: categoryId }
  });

  return { message: 'Category and its transactions deleted successfully' };
};

export const seedDefaultCategoriesService = async (userId: string) => {
  await prisma.transactionCategory.createMany({
    data: DEFAULT_CATEGORIES.map((cat) => ({
      ...cat,
      userId,
      isDefault: true,
    })),
    skipDuplicates: true, 
  });
};