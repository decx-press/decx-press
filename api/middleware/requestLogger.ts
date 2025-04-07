import { Request, Response, NextFunction } from "express";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    console.log(`[${req.method}] [${new Date().toISOString()}] ${req.path}`);
    next();
};
