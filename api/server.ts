import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { ethers } from "ethers";
import { DEKService } from "../services/dEKService";
import { ECIESService } from "../services/encryption/ECIESService";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Load contract ABI from file if available
let contractAbi: any[] = [];
const abiPath = path.join(__dirname, "contract-abi.json");
if (fs.existsSync(abiPath)) {
    try {
        contractAbi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
        console.log("Loaded ABI from file");
    } catch (error) {
        console.error("Error loading ABI from file:", error);
    }
} else {
    // Try to parse from environment variable
    try {
        contractAbi = JSON.parse(process.env.CONTRACT_ABI || "[]");
    } catch (error) {
        console.error("Error parsing ABI from environment variable:", error);
    }
}

// Get contract address from environment
const SEP_CONTRACT_ADDY = process.env.SEP_CONTRACT_ADDY;
if (!SEP_CONTRACT_ADDY) {
    console.error("SEP_CONTRACT_ADDY environment variable is required");
    process.exit(1);
}

// Get RPC URL from environment
const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) {
    console.error("RPC_URL environment variable is required");
    process.exit(1);
}

// Connect to provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Set up signer
let signer;
if (process.env.PRIVATE_KEY) {
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Using wallet address: ${signer.address}`);
} else {
    console.error("PRIVATE_KEY environment variable is required");
    process.exit(1);
}

// Create contract instance
const decxDAG = new ethers.Contract(SEP_CONTRACT_ADDY, contractAbi, signer);

// Create ECIESService with the private key
const eciesService = new ECIESService(process.env.PRIVATE_KEY);

// Get recipient public key from environment
const recipientPublicKey = process.env.PUBLIC_KEY;
if (!recipientPublicKey) {
    console.error("PUBLIC_KEY environment variable is required");
    process.exit(1);
}

// Create DEKService instance
const dekService = new DEKService(decxDAG, eciesService, recipientPublicKey);

// API Routes

// Health check endpoint
app.get("/health", function (req: Request, res: Response) {
    res.json({
        status: "ok",
        contractAddress: SEP_CONTRACT_ADDY,
        signerAddress: signer.address
    });
});

// Press content endpoint
app.post("/press", function (req: Request, res: Response) {
    (async () => {
        try {
            const { content, recipientPublicKey } = req.body;

            if (!content) {
                return res.status(400).json({ error: "Content is required" });
            }

            console.log(`Pressing content: ${content.substring(0, 20)}${content.length > 20 ? "..." : ""}`);

            // Use provided recipient key or default to the server's configured key
            const targetPublicKey = recipientPublicKey || process.env.PUBLIC_KEY;

            // Validate recipient public key format
            if (!targetPublicKey.startsWith("0x")) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid recipient public key format",
                    message: "Recipient public key must start with 0x"
                });
            }

            try {
                // Create a temporary DEKService instance with the specified recipient
                const tempDekService = new DEKService(decxDAG, eciesService, targetPublicKey);

                // Track gas usage
                const gasTracker = { totalGasUsed: ethers.parseUnits("0", "wei") };
                const finalHash = await tempDekService.press(content, gasTracker);

                console.log(`Content pressed successfully. Final hash: ${finalHash}`);
                console.log(`Recipient public key: ${targetPublicKey.substring(0, 10)}...`);
                console.log(`Gas used: ${gasTracker.totalGasUsed.toString()}`);

                return res.json({
                    success: true,
                    finalHash,
                    contentLength: content.length,
                    recipientPublicKey: targetPublicKey,
                    gasUsed: gasTracker.totalGasUsed.toString()
                });
            } catch (error) {
                if (error instanceof Error && error.message.includes("Recipient public key")) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid recipient public key",
                        message: error.message
                    });
                }
                throw error; // Re-throw other errors to be caught by the outer catch
            }
        } catch (error) {
            console.error("Error in /press route:", error);
            return res.status(500).json({
                success: false,
                error: "An error occurred during pressing",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    })();
});

// Release content endpoint
app.post("/release", function (req: Request, res: Response) {
    (async () => {
        try {
            const { finalHash, recipientPublicKey } = req.body;

            if (!finalHash) {
                return res.status(400).json({ error: "finalHash is required" });
            }

            console.log(`Releasing content from hash: ${finalHash}`);

            // If a recipient key is provided, verify it matches the server's public key
            // This is a security check to ensure the server can decrypt the content
            if (recipientPublicKey && recipientPublicKey !== process.env.PUBLIC_KEY) {
                return res.status(403).json({
                    success: false,
                    error: "Cannot decrypt content encrypted for a different recipient",
                    message: "This content was encrypted for a different public key"
                });
            }

            // Track gas usage
            const gasTracker = { totalGasUsed: ethers.parseUnits("0", "wei") };
            const originalContent = await dekService.release(finalHash, gasTracker);

            console.log(`Content released successfully. Length: ${originalContent.length}`);
            console.log(`Gas used: ${gasTracker.totalGasUsed.toString()}`);

            return res.json({
                success: true,
                originalContent,
                contentLength: originalContent.length,
                gasUsed: gasTracker.totalGasUsed.toString()
            });
        } catch (error) {
            console.error("Error in /release route:", error);
            return res.status(500).json({
                success: false,
                error: "An error occurred during releasing",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    })();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`DEKService API listening on port ${PORT}`);
    console.log(`Contract address: ${SEP_CONTRACT_ADDY}`);
    console.log(`RPC URL: ${RPC_URL}`);
});
