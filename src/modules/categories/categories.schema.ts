import { z } from 'zod';

const TransactionTypeEnum = z.enum(['EXPENSE', 'INCOME']);

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
    icon: z.string().max(50, 'Icon name too long').optional(),
    type: TransactionTypeEnum,
  })
});

export const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    icon: z.string().max(50).optional(),
  }).refine(
    data => Object.keys(data).length > 0,
    { message: 'At least one field is required to update' }
  )
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];