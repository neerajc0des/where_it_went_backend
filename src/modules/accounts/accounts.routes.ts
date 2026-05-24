import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { createAccountController, deleteAccountController, getAccountByIdController, getAllAccountsController, permanentlyDeleteAccountController, restoreAccountController, updateAccountController } from "./accounts.controller";

const router = Router();

router.use(authenticate);

router.post('/', createAccountController);
router.put('/:id', updateAccountController);
router.delete('/:id', deleteAccountController);
router.delete('/:id/permanent', permanentlyDeleteAccountController);
router.patch('/:id/restore', restoreAccountController);
router.get('/', getAllAccountsController);
router.get('/:id', getAccountByIdController);

export default router;