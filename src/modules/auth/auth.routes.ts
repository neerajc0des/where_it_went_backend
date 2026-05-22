import { Router } from "express";
import { loginController, registerController } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.schema";
import { validate } from "../../middlewares/validate";

const router = Router();

router.post(
    '/register', 
    validate(registerSchema),
    registerController
);
router.post(
    '/login', 
    validate(loginSchema),
    loginController
);

export default router;