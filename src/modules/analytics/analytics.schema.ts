import { z } from 'zod';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const periodStatsParamsSchema = z.object({
  accountId: z.uuid('Invalid account ID'),
});

export const periodStatsQuerySchema = z
  .object({
    // both optional — defaults to the last 30 days
    from: dateOnly.optional(),
    to: dateOnly.optional(),

    // 'auto' picks day / week / month based on how long the range is
    groupBy: z.enum(['auto', 'day', 'week', 'month']).default('auto'),
  })
  .refine(
    data => !(data.from && data.to) || data.from <= data.to,
    { message: "'from' must be on or before 'to'", path: ['from'] }
  );

export type PeriodStatsParams = z.infer<typeof periodStatsParamsSchema>;
export type PeriodStatsQuery = z.infer<typeof periodStatsQuerySchema>;