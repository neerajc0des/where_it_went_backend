import { z } from 'zod';

const TransactionTypeEnum = z.enum(['EXPENSE', 'INCOME']);
const dateSchema = z.string().pipe(z.coerce.date());

// listing is capped so a client cannot ask for the whole table in one page
export const MAX_TRANSACTION_PAGE_SIZE = 100;
export const DEFAULT_TRANSACTION_PAGE_SIZE = 20;

export const createTransactionSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    type: TransactionTypeEnum,
    categoryId: z.string().uuid('Invalid category ID'),
    accountId: z.string().uuid('Invalid account ID'),
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

// `from` / `to` are plain calendar days, same contract the analytics module uses
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

// A cleared filter is usually serialised as an empty string rather than dropped from the
// query string, so normalise '' to absent before the field schema ever sees it — otherwise
// `?accountId=` would fail uuid validation instead of meaning "no account filter".
const blankAsAbsent = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const transactionFiltersQuerySchema = z
  .object({
    page: z.coerce
      .number()
      .int('page must be a whole number')
      .min(1, 'page must be at least 1')
      .default(1),

    limit: z.coerce
      .number()
      .int('limit must be a whole number')
      .min(1, 'limit must be at least 1')
      .default(DEFAULT_TRANSACTION_PAGE_SIZE)
      // clamped rather than rejected: an oversized limit is a client bug, not a request error
      .transform(value => Math.min(value, MAX_TRANSACTION_PAGE_SIZE)),

    accountId: z.preprocess(blankAsAbsent, z.uuid('Invalid account ID').optional()),
    categoryId: z.preprocess(blankAsAbsent, z.uuid('Invalid category ID').optional()),
    type: z.preprocess(blankAsAbsent, TransactionTypeEnum.optional()),
    search: z.preprocess(blankAsAbsent, z.string().max(100).trim().optional()),
    from: z.preprocess(blankAsAbsent, dateOnly.optional()),
    to: z.preprocess(blankAsAbsent, dateOnly.optional()),
  })
  .refine(
    data => !(data.from && data.to) || data.from <= data.to,
    { message: "'from' must be on or before 'to'", path: ['from'] }
  );

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>['body'];
export type TransactionFiltersQuery = z.infer<typeof transactionFiltersQuerySchema>;
