import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { getAccountPeriodStatsService } from './analytics.service';
import { periodStatsParamsSchema, periodStatsQuerySchema } from './analytics.schema';

export const getAccountPeriodStatsController = async (req: Request, res: Response) => {
  try {
    // parsed here rather than through validate() — that middleware only writes the
    // parsed `body` back onto the request, so coerced query params would be lost
    const { accountId } = periodStatsParamsSchema.parse(req.params);
    const query = periodStatsQuerySchema.parse(req.query);

    const stats = await getAccountPeriodStatsService(req.userId, accountId, query);

    return res.status(200).json({
      success: true,
      message: 'Account stats fetched successfully',
      data: stats,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return res.status(400).json({ success: false, errors: error.issues });
    }

    const notFound = error.message === 'Account not found';
    return res.status(notFound ? 404 : 400).json({
      success: false,
      message: error.message,
    });
  }
};
