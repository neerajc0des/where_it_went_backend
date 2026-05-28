import z from "zod";

export const generateRecapSchema = z.object({
  body: z.object({
    type: z.enum(['MONTHLY', 'YEARLY'], {
      error: 'Type must be MONTHLY or YEARLY'
    }),

    month: z.number().min(1).max(12).optional(),
    year: z.number().min(2000).max(2100),
  }).refine(
    data => !(data.type === 'MONTHLY' && !data.month),
    { message: 'Month is required for MONTHLY recap' }
  )
});

export type GenerateRecapInput = z.infer<typeof generateRecapSchema>['body'];