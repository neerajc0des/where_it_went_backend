import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { createTransactionController, deleteTransactionController, getAllTransactionsController, updateTransactionController } from './transactions.controller';
import { createTransactionSchema, updateTransactionSchema } from './transactions.schema';

const router = Router();

router.use(authenticate);

router.get('/', getAllTransactionsController);                                          
router.post('/', validate(createTransactionSchema), createTransactionController);        
router.patch('/:id', validate(updateTransactionSchema), updateTransactionController);    
router.delete('/:id', deleteTransactionController);                                  

export default router;