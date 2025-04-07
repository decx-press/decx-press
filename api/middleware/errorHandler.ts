import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[ERROR] [${new Date().toISOString()}] Unhandled error:`, err);

    return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: err.message
    });
};
