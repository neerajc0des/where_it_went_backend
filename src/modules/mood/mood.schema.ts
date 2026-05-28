import { z } from 'zod';

const MoodTypeEnum = z.enum([
  'HAPPY',
  'NEUTRAL',
  'ANXIOUS',
  'STRESSED',
  'SAD'
]);

export const createMoodSchema = z.object({
  body: z.object({
    mood: MoodTypeEnum,
    note: z.string().max(255).optional(),
    loggedAt: z.iso.datetime({ error: 'Invalid date format' }).optional(),
  })
});

export type CreateMoodInput = z.infer<typeof createMoodSchema>['body'];