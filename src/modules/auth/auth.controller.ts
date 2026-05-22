import { Request, Response } from "express";

export const registerController = async (
    req: Request,
    res: Response
) => {
    return res.status(201).json({
        success: true,
        message: 'Registered successfully',
        data: req.body
    })
}

export const loginController = async (
    req: Request,
    res: Response
) => {
    return res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: req.body
    })
}