import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { createMoodController, deleteMoodController, getMoodByIdController, getMoodsController } from './mood.controller';
import { createMoodSchema } from './mood.schema';

const router = Router();

router.use(authenticate);

router.get('/', getMoodsController);                                          
router.post('/', validate(createMoodSchema), createMoodController);        
router.get('/:id', getMoodByIdController);    
router.delete('/:id', deleteMoodController);                                  

export default router;