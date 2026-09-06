import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { setPrimaryAccountController, createAccountController, deleteAccountController, getAccountAnalyticsController, getAccountByIdController, getAccountTransactionsController, getAllAccountsController, restoreAccountController, updateAccountController } from "./accounts.controller";

const router = Router();

router.use(authenticate);

router.post('/', createAccountController);
router.put('/:id', updateAccountController);
router.delete('/:id', deleteAccountController);
// router.delete('/:id/permanent', permanentlyDeleteAccountController);
router.patch('/:id/restore', restoreAccountController);
router.patch('/:id/primary', setPrimaryAccountController);
router.get('/', getAllAccountsController);
router.get('/:id', getAccountByIdController);
router.get('/:id/transactions', getAccountTransactionsController);
router.get("/:accountId/analytics", getAccountAnalyticsController);
    
export default router;