import { Router, Request, Response, NextFunction } from "express";
import { getTransactionStatus } from "../controllers/statusController";

const router = Router();

const statusHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await getTransactionStatus(req, res);
    } catch (error) {
        next(error);
    }
};

router.get("/:requestId", statusHandler);

export default router;
