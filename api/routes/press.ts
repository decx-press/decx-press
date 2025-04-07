import { Router, Request, Response, NextFunction } from "express";
import { pressContent } from "../controllers/pressController";

const router = Router();

const pressHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await pressContent(req, res);
    } catch (error) {
        next(error);
    }
};

router.post("/", pressHandler);

export default router;
