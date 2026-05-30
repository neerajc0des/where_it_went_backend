import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import { smartEntrySchema } from "./ai.schema";
import { smartEntryController } from "./ai.controller";

const router = Router();

router.use(authenticate);

router.post('/', validate(smartEntrySchema), smartEntryController);

export default router;