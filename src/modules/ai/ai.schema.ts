import { z } from 'zod';

export const smartEntrySchema = z.object({
  body: z.object({
    prompt: z.string()
      .min(3, 'Input too short. Please describe the transaction')
      .max(500, 'Input too long'),
  })
});

export type SmartEntryInput = z.infer<typeof smartEntrySchema>['body'];