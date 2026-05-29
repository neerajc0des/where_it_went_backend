import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { deleteNudgeController, generateBalancewarnNudgesController, getAllNudgesController, markNudgeAsReadController } from './nudge.controller';

const router = Router();

router.use(authenticate);

router.get('/', getAllNudgesController);                                          
router.get('/', generateBalancewarnNudgesController);        
router.patch('/:id', markNudgeAsReadController);                                  
router.delete('/:id', deleteNudgeController);                                  

export default router;