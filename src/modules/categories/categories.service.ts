import prisma from '../../config/db';
import { CreateCategoryInput, UpdateCategoryInput } from './categories.schema';

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
  const defaultCategories = categories.filter(c => c.isDefault);
  const customCategories = categories.filter(c => !c.isDefault);

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
  const { name, icon, type } = payload;

  // check if default category with same name and type already exists
  const defaultExists = await prisma.transactionCategory.findFirst({
    where: { name, type, userId: null }
  });
  if (defaultExists) throw new Error('A default category with this name already exists');

  // check if user already has a custom category with same name and type
  const customExists = await prisma.transactionCategory.findFirst({
    where: { name, type, userId }
  });
  if (customExists) throw new Error('You already have a category with this name');

  const category = await prisma.transactionCategory.create({
    data: { name, icon, type, userId, isDefault: false },
    omit: { userId: true }
  });

  return category;
};


// update custom category
export const updateCategoryService = async (
  categoryId: string,
  userId: string,
  payload: UpdateCategoryInput
) => {
  const category = await prisma.transactionCategory.findFirst({
    where: { id: categoryId, userId } // only own custom categories
  });

  if (!category) throw new Error('Category not found');
  if (category.isDefault) throw new Error('Cannot update default categories');

  // check name conflict if name is being changed
  if (payload.name && payload.name !== category.name) {
    const nameExists = await prisma.transactionCategory.findFirst({
      where: { name: payload.name, type: category.type, userId }
    });
    if (nameExists) throw new Error('You already have a category with this name');
  }

  return await prisma.transactionCategory.update({
    where: { id: categoryId },
    data: { ...payload },
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