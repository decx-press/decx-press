import { Router, Request, Response, NextFunction } from "express";
import { releaseContent } from "../controllers/releaseController";

const router = Router();

const releaseHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await releaseContent(req, res);
    } catch (error) {
        next(error);
    }
};

router.post("/", releaseHandler);

export default router;
