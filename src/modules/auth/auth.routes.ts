import 'dotenv/config';

import { Request, Response, Router } from "express";
import { getMeController, loginController, logoutController, refreshTokenController, registerController, verifyEmail } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.schema";
import { validate } from "../../middlewares/validate";
import { authenticate } from "../../middlewares/authenticate";
import passport from "../../config/passport";

const router = Router();

router.post('/register', validate(registerSchema), registerController);
router.get("/verify_email", verifyEmail);
router.post('/login', validate(loginSchema), loginController);
router.post('/refresh', refreshTokenController);
router.post('/logout', logoutController);

// testing authenticate middleware
router.get('/me', authenticate, getMeController);

// Google OAuth routes — no validate middleware needed
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false ,
    prompt: 'select_account'
  })
);

router.get('/google/redirect',
  passport.authenticate('google', { 
    session: false, 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` 
  }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    // redirect to frontend with tokens in query params
    // res.redirect(
    //   `${process.env.FRONTEND_URL}/auth/redirect?accessToken=${user.appAccessToken}&refreshToken=${user.appRefreshToken}`
    // );

    return res.status(200).json({
      success: true,
      data: {
        accessToken: user.appAccessToken,
        refreshToken: user.appRefreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      }
    });
  }
);


export default router;