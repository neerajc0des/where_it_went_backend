import { z } from 'zod';

const TransactionTypeEnum = z.enum(['EXPENSE', 'INCOME']);
const dateSchema = z.string().pipe(z.coerce.date());

export const createTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    type: TransactionTypeEnum,
    categoryId: z.uuid('Invalid category ID'),
    accountId: z.uuid('Invalid account ID'),
    merchant: z.string().max(100).optional(),
    note: z.string().max(255).optional(),
    date: dateSchema.optional(),
    isImpulse: z.boolean().optional().default(false),
  })
});

export const updateTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0').optional(),
    type: TransactionTypeEnum.optional(),
    categoryId: z.uuid('Invalid category ID').optional(),
    accountId: z.uuid('Invalid account ID').optional(),
    merchant: z.string().max(100).optional(),
    note: z.string().max(255).optional(),
    date: dateSchema.optional(),
    isImpulse: z.boolean().optional(),
  }).refine(
    data => Object.keys(data).length > 0,
    { message: 'At least one field is required to update' }
  )
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>['body'];