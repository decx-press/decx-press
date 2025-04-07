import { Router, Request, Response } from "express";
import { getSigner } from "../services/walletService";

const router = Router();

router.get("/", (req: Request, res: Response) => {
    const signer = getSigner();
    res.json({
        status: "ok",
        contractAddress: process.env.SEP_CONTRACT_ADDY,
        signerAddress: signer.address
    });
});

export default router;
