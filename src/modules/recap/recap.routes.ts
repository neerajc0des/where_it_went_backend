import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { deleteRecapController, generateRecapController, getAllRecapsController, getRecapByIdController } from './recap.controller';
import { generateRecapSchema } from './recap.schema';

const router = Router();

router.use(authenticate);

router.get('/', getAllRecapsController);                                          
router.post('/', validate(generateRecapSchema), generateRecapController);        
router.get('/:id', getRecapByIdController);    
router.delete('/:id', deleteRecapController);                                  

export default router;