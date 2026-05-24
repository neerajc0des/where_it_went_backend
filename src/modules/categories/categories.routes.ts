import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { createCategorySchema, updateCategorySchema } from './categories.schema';
import { getCategoriesController, getCategoriesByTypeController, createCategoryController, updateCategoryController, getCategoryTransactionCountController, deleteCategoryController} from './categories.controller';

const router = Router();

router.use(authenticate);

router.get('/', getCategoriesController);                                          
router.get('/type/:type', getCategoriesByTypeController);                          
router.post('/', validate(createCategorySchema), createCategoryController);        
router.patch('/:id', validate(updateCategorySchema), updateCategoryController);    
router.get('/:id/count', getCategoryTransactionCountController);                   
router.delete('/:id', deleteCategoryController);                                  

export default router;