import { Router, Request, Response, NextFunction } from "express";
import { getBalance } from "../controllers/balanceController";

const router = Router();

const balanceHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await getBalance(req, res);
    } catch (error) {
        next(error);
    }
};

router.get("/", balanceHandler);

export default router;
