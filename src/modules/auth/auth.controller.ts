import { Request, Response } from "express";
import { loginService, logoutService, refreshTokenService, registerService, verifyEmailService } from "./auth.service";
import prisma from "../../config/db";

export const registerController = async (req: Request, res: Response) => {
    try {
        const result = await registerService(req.body, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return res.status(201).json({ 
            success: true, data: result 
        });

    } catch (error: any) {
        return res.status(400).json({ 
            success: false, message: error.message 
        });
    }
}

export const loginController = async (req: Request, res: Response) => {
    try {
        const result = await loginService(req.body.email, req.body.password, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return res.status(200).json({ 
            success: true, data: result 
        });
    } catch (error: any) {
        return res.status(400).json({ 
            success: false, message: error.message 
        });
    }
}

// email verification
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // We expect the token to come from the URL query: /verify-email?token=xyz
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Verification token is required" });
    }

    const result = await verifyEmailService(token);
    res.status(200).json({
         success: true,
        result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const refreshTokenController = async (req: Request, res: Response) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) return res.status(400).json({ 
            success: false, 
            message: 'Refresh token required' 
        });

        const tokens = await refreshTokenService(refreshToken);
        
        return res.status(200).json({ 
            success: true, 
            data: tokens 
        });
    } catch (error: any) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired refresh token' 
        });
    }
}

export const logoutController = async (req: Request, res: Response) => {
    try {
        const result = await logoutService(req.body.refreshToken);
        return res.status(200).json({
            success: true, 
            message: 'Logged out successfully'
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false, message: error.message
        });
    }
}

// testing controller for authenticate middleware
export const getMeController = async (req: Request, res: Response) => {
  try {
        const userId = req.userId;
        const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
            id: true, 
            name: true, 
            email: true, 
            createdAt: true }
        });

        return res.status(200).json({ success: true, data: user });

    } catch (error: any) {
        return res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// session controllers
export const getSessionsController = async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { 
        userId: req.userId, 
        isRevoked: false, 
        expiresAt: { gt: new Date() } 
      },
      select: { 
        id: true, deviceName: true, 
        ipAddress: true, 
        createdAt: true, expiresAt: true 
      }
    });
    return res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const revokeSessionController = async (req: Request, res: Response) => {
  try {
    await prisma.session.updateMany({
      where: { id: req.params.id as string, userId: req.userId },
      data: { isRevoked: true }
    });
    return res.status(200).json({ success: true, message: 'Session revoked' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const revokeAllSessionsController = async (req: Request, res: Response) => {
  try {
    await prisma.session.updateMany({
      where: { userId: req.userId },
      data: { isRevoked: true }
    });
    return res.status(200).json({ success: true, message: 'All sessions revoked' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};