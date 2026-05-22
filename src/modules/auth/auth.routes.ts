import { Router } from "express";
import { getMeController, loginController, logoutController, refreshTokenController, registerController } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.schema";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/authenticate";

const router = Router();

router.post('/register', validate(registerSchema), registerController);
router.post('/login', validate(loginSchema), loginController);
router.post('/refresh', refreshTokenController);
router.post('/logout', logoutController);

// testing authenticate middleware
router.get('/me', authenticate, getMeController);

export default router;