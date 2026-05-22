import { Request, Response } from "express";
import { loginService, logoutService, refreshTokenService, registerService } from "./auth.service";
import prisma from "../../config/db";

export const registerController = async (req: Request, res: Response) => {
    try {
        const result = await registerService(req.body);
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
        const result = await loginService(req.body.email, req.body.password);
        return res.status(200).json({ 
            success: true, data: result 
        });
    } catch (error: any) {
        return res.status(400).json({ 
            success: false, message: error.message 
        });
    }
}

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