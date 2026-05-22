import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodType) => 
    async(
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const parsed: any = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            req.body = parsed.body;

            next();
        } catch (error) {
            if(error instanceof ZodError){
                return res.status(400).json({
                    success: false,
                    errors: error.issues
                });
            }   
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }