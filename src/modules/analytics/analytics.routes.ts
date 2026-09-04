import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { getAccountPeriodStatsController } from './analytics.controller';

const router = Router();

router.use(authenticate);

router.get('/accounts/:accountId/stats', getAccountPeriodStatsController);

export default router;
