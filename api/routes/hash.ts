import { Router, Request, Response, NextFunction } from "express";
import { getHash } from "../controllers/hashController";

const router = Router();

const hashHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await getHash(req, res);
    } catch (error) {
        next(error);
    }
};

router.post("/", hashHandler);

export default router;
