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

// Initialize Express app
const app = express();

// ===================================
// MIDDLEWARE CONFIGURATION
// ===================================
app.use(bodyParser.json());
app.use(cors());

// ===================================
// ENVIRONMENT & CONFIG VALIDATION
// ===================================

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

// Validate required environment variables
const SEP_CONTRACT_ADDY = process.env.SEP_CONTRACT_ADDY;
if (!SEP_CONTRACT_ADDY) {
    console.error("SEP_CONTRACT_ADDY environment variable is required");
    process.exit(1);
}

const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) {
    console.error("RPC_URL environment variable is required");
    process.exit(1);
}

// ===================================
// PROVIDER CONFIGURATION
// ===================================

// Initialize provider with RPC URL
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Configure provider event handlers
provider.on("debug", (info) => {
    console.log(`[PROVIDER] [${new Date().toISOString()}] Debug:`, info);
});

provider.on("error", (error) => {
    console.error(`[PROVIDER] [${new Date().toISOString()}] Error:`, error);
});

provider.on("network", (newNetwork, oldNetwork) => {
    console.log(`[PROVIDER] [${new Date().toISOString()}] Network changed:`, {
        from: oldNetwork?.name,
        to: newNetwork.name
    });
});

// ===================================
// WALLET & CONTRACT CONFIGURATION
// ===================================

// Initialize wallet with private key
let signer;
if (process.env.PRIVATE_KEY) {
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`[WALLET] [${new Date().toISOString()}] Using wallet address: ${signer.address}`);
    console.log(`[WALLET] [${new Date().toISOString()}] Connected to network: ${RPC_URL}`);
    console.log(`[WALLET] [${new Date().toISOString()}] Contract address: ${SEP_CONTRACT_ADDY}`);
} else {
    console.error("[WALLET] PRIVATE_KEY environment variable is required");
    process.exit(1);
}

// Initialize contract instance
console.log(`[CONTRACT] [${new Date().toISOString()}] Creating contract instance with address: ${SEP_CONTRACT_ADDY}`);
const decxDAG = new ethers.Contract(SEP_CONTRACT_ADDY, contractAbi, signer);

// Initialize ECIES service
console.log(`[ECIES] [${new Date().toISOString()}] Creating ECIESService`);
const eciesService = new ECIESService(process.env.PRIVATE_KEY);

// Validate recipient public key
const recipientPublicKey = process.env.PUBLIC_KEY;
if (!recipientPublicKey) {
    console.error("[CONFIG] PUBLIC_KEY environment variable is required");
    process.exit(1);
}

// Initialize DEKService
console.log(`[DEK] [${new Date().toISOString()}] Creating dEKService instance`);
const dekService = new DEKService(decxDAG, eciesService, recipientPublicKey);

// ===================================
// TRANSACTION STORE MANAGEMENT
// ===================================

// Store for transaction hashes and errors
const transactionStore = new Map<string, { hash?: string; error?: string }>();

// Add logging for transaction store operations
const logTransactionStore = (operation: string, requestId: string, data?: any) => {
    console.log(`[STORE] [${new Date().toISOString()}] ${operation} for request ${requestId}:`, data);
    console.log(`[STORE] [${new Date().toISOString()}] Current store size: ${transactionStore.size}`);
    console.log(`[STORE] [${new Date().toISOString()}] Store keys:`, Array.from(transactionStore.keys()));
    console.log(`[STORE] [${new Date().toISOString()}] Store contents:`, Array.from(transactionStore.entries()));
};

// Store transaction data
const storeTransaction = (requestId: string, data: { hash?: string; error?: string }) => {
    console.log(`[STORE] [${new Date().toISOString()}] Storing transaction data for ${requestId}:`, data);
    transactionStore.set(requestId, data);
    logTransactionStore("Store operation", requestId, data);
};

// ===================================
// API ROUTES
// ===================================

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
    const startTime = Date.now();
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    console.log(`[PRESS] [${new Date().toISOString()}] Starting press operation (ID: ${requestId})`);

    // Track if the request is still active
    let isRequestActive = true;

    req.on("close", () => {
        isRequestActive = false;
        console.log(
            `[PRESS] [${new Date().toISOString()}] Client disconnected after ${(Date.now() - startTime) / 1000}s`
        );
    });

    (async () => {
        try {
            const { content, recipientPublicKey, storeOnChain } = req.body;

            // Validate required fields
            if (!content) {
                return res.status(400).json({ error: "Content is required" });
            }

            console.log(`[PRESS] [${new Date().toISOString()}] Content length: ${content.length}`);
            console.log(`[PRESS] [${new Date().toISOString()}] Store on chain: ${storeOnChain}`);

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

            console.log(
                `[PRESS] [${new Date().toISOString()}] Using recipient public key: ${targetPublicKey.substring(0, 10)}...`
            );

            // Determine whether to store on chain (default to false for gas efficiency)
            const shouldStoreOnChain = storeOnChain !== undefined ? storeOnChain : false;

            // Warn if storing large content on chain
            if (shouldStoreOnChain && content.length > 10) {
                console.warn(
                    `[PRESS] [${new Date().toISOString()}] WARNING: Storing ${content.length} characters on-chain may be expensive and could fail.`
                );
            }

            try {
                console.log(`[PRESS] [${new Date().toISOString()}] Creating temporary dEKService instance`);
                const tempDekService = new DEKService(decxDAG, eciesService, targetPublicKey);
                const gasTracker = { totalGasUsed: ethers.parseUnits("0", "wei") };

                console.log(`[PRESS] [${new Date().toISOString()}] Starting press operation with dEKService`);

                // Add detailed logging for transaction submission
                console.log(`[PRESS] [${new Date().toISOString()}] Content length: ${content.length}`);
                console.log(`[PRESS] [${new Date().toISOString()}] Store on chain: ${shouldStoreOnChain}`);
                console.log(
                    `[PRESS] [${new Date().toISOString()}] Target public key: ${targetPublicKey.substring(0, 10)}...`
                );

                // Log initial network state
                const initialNetworkState = await provider.getNetwork();
                console.log(`[PRESS] [${new Date().toISOString()}] Initial network state:`, {
                    chainId: initialNetworkState.chainId,
                    name: initialNetworkState.name
                });

                // Log initial gas state
                const initialGasState = await provider.getFeeData();
                console.log(`[PRESS] [${new Date().toISOString()}] Initial gas state:`, {
                    gasPrice: ethers.formatUnits(initialGasState.gasPrice || 0, "gwei"),
                    maxFeePerGas: ethers.formatUnits(initialGasState.maxFeePerGas || 0, "gwei"),
                    maxPriorityFeePerGas: ethers.formatUnits(initialGasState.maxPriorityFeePerGas || 0, "gwei")
                });

                // Submit transaction to the blockchain
                const result = await tempDekService.press(content, gasTracker, shouldStoreOnChain);

                // Store the transaction hash
                storeTransaction(requestId, { hash: result.finalHash });

                // Return immediately with the transaction hash
                console.log(
                    `[PRESS] [${new Date().toISOString()}] Returning immediate response with transaction hash: ${result.finalHash}`
                );
                res.json({
                    success: true,
                    message: "Transaction submitted",
                    contentLength: content.length,
                    recipientPublicKey: targetPublicKey,
                    storedOnChain: shouldStoreOnChain,
                    requestId,
                    transactionHash: result.finalHash
                });
                console.log(`[PRESS] [${new Date().toISOString()}] ===== CURL COMMAND COMPLETED =====`);
                console.log(
                    `[PRESS] [${new Date().toISOString()}] Check status with: curl http://localhost:3000/status/${result.finalHash}`
                );
            } catch (error) {
                console.error(`[PRESS] [${new Date().toISOString()}] Error in dEKService operation:`, error);
                if (error instanceof Error) {
                    console.error(`[PRESS] [${new Date().toISOString()}] Error stack:`, error.stack);
                }
                if (error instanceof Error && error.message.includes("Recipient public key")) {
                    if (isRequestActive) {
                        return res.status(400).json({
                            success: false,
                            error: "Invalid recipient public key",
                            message: error.message
                        });
                    }
                }
                throw error;
            }
        } catch (error) {
            console.error(`[PRESS] [${new Date().toISOString()}] Error in /press route:`, error);
            if (error instanceof Error) {
                console.error(`[PRESS] [${new Date().toISOString()}] Error stack:`, error.stack);
            }
            if (isRequestActive) {
                return res.status(500).json({
                    success: false,
                    error: "An error occurred during pressing",
                    message: error instanceof Error ? error.message : String(error)
                });
            }
        }
    })();
});

// Transaction status endpoint
app.get("/status/:txHash", (req: Request, res: Response) => {
    (async () => {
        try {
            const { txHash } = req.params;
            console.log(`[STATUS] [${new Date().toISOString()}] Checking status for transaction: ${txHash}`);

            const status = await dekService.checkTransactionStatus(txHash);
            console.log(`[STATUS] [${new Date().toISOString()}] Transaction status:`, status);

            return res.json({
                success: true,
                ...status
            });
        } catch (error) {
            console.error(`[STATUS] [${new Date().toISOString()}] Error checking transaction status:`, error);
            return res.status(500).json({
                success: false,
                error: "Failed to check transaction status",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    })();
});

// Release content endpoint
app.post("/release", function (req: Request, res: Response) {
    (async () => {
        try {
            console.log("[RELEASE] Starting release operation");
            const { finalHash, recipientPublicKey, encryptedContents } = req.body;

            if (!finalHash) {
                return res.status(400).json({ error: "finalHash is required" });
            }

            console.log(`[RELEASE] Processing hash: ${finalHash}`);

            // If a recipient key is provided, verify it matches the server's public key
            if (recipientPublicKey && recipientPublicKey !== process.env.PUBLIC_KEY) {
                return res.status(403).json({
                    success: false,
                    error: "Cannot decrypt content encrypted for a different recipient",
                    message: "This content was encrypted for a different public key"
                });
            }

            // Convert encryptedContents from base64 strings to Buffer objects if provided
            let localEncryptedContents: Map<string, Buffer> | undefined;
            if (encryptedContents) {
                console.log("[RELEASE] Converting encrypted contents from base64");
                localEncryptedContents = new Map();
                for (const [hash, content] of Object.entries(encryptedContents)) {
                    localEncryptedContents.set(hash, Buffer.from(content as string, "base64"));
                }
                console.log(`[RELEASE] Processed ${localEncryptedContents.size} encrypted contents`);
            }

            // Track gas usage
            const gasTracker = { totalGasUsed: ethers.parseUnits("0", "wei") };

            console.log("[RELEASE] Starting release operation with DEKService");
            // Release content with optional local encrypted contents
            const originalContent = await dekService.release(finalHash, gasTracker, localEncryptedContents);
            console.log("[RELEASE] Release operation completed successfully");

            console.log(`[RELEASE] Content length: ${originalContent.length}`);
            console.log(`[RELEASE] Gas used: ${gasTracker.totalGasUsed.toString()}`);

            return res.json({
                success: true,
                originalContent,
                contentLength: originalContent.length,
                gasUsed: gasTracker.totalGasUsed.toString()
            });
        } catch (error) {
            console.error("[RELEASE] Error in /release route:", error);
            return res.status(500).json({
                success: false,
                error: "An error occurred during releasing",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    })();
});

// Get transaction hash by request ID
app.get("/hash/:requestId", (req: Request, res: Response) => {
    (async () => {
        try {
            const { requestId } = req.params;
            console.log(`[HASH] [${new Date().toISOString()}] Checking hash for request ID: ${requestId}`);
            console.log(`[HASH] [${new Date().toISOString()}] Current store size: ${transactionStore.size}`);
            console.log(`[HASH] [${new Date().toISOString()}] Store keys:`, Array.from(transactionStore.keys()));

            logTransactionStore("Retrieving", requestId);
            const result = transactionStore.get(requestId);
            console.log(`[HASH] [${new Date().toISOString()}] Retrieved result:`, result);

            if (!result) {
                logTransactionStore("Not found", requestId);
                return res.status(404).json({
                    success: false,
                    error: "Transaction not found",
                    message: "The request ID is invalid"
                });
            }

            if (result.error) {
                logTransactionStore("Found error", requestId, result.error);
                return res.status(500).json({
                    success: false,
                    error: "Transaction failed",
                    message: result.error
                });
            }

            if (!result.hash) {
                logTransactionStore("Still processing", requestId);
                return res.status(202).json({
                    success: true,
                    status: "processing",
                    message: "Transaction is still being processed"
                });
            }

            logTransactionStore("Found hash", requestId, result.hash);
            return res.json({
                success: true,
                transactionHash: result.hash
            });
        } catch (error) {
            console.error(`[HASH] [${new Date().toISOString()}] Error retrieving transaction hash:`, error);
            return res.status(500).json({
                success: false,
                error: "Failed to retrieve transaction hash",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    })();
});

// Check wallet balance
app.get("/balance", (req: Request, res: Response) => {
    (async () => {
        try {
            console.log(`[BALANCE] [${new Date().toISOString()}] Checking wallet balance`);

            // Get current network info
            const network = await provider.getNetwork();

            const balance = await provider.getBalance(signer.address);
            const balanceInEth = ethers.formatEther(balance);
            console.log(
                `[BALANCE] [${new Date().toISOString()}] Wallet balance: ${balanceInEth} ETH on ${network.name} (Chain ID: ${network.chainId})`
            );

            // Get network gas prices for reference
            const feeData = await provider.getFeeData();
            const gasPrice = feeData.gasPrice || ethers.parseUnits("0", "gwei");
            const gasPriceGwei = ethers.formatUnits(gasPrice, "gwei");

            // Estimate how many transactions can be sent with current balance
            // Assuming 500,000 gas limit per transaction
            const gasLimit = 500000;
            const gasCost = gasPrice * BigInt(gasLimit);
            const txCount = gasCost > 0 ? balance / gasCost : 0;

            // Calculate recommended balance for at least one transaction
            const recommendedBalance = gasCost * BigInt(3); // 3x safety buffer
            const needsMoreFunds = balance < gasCost;

            return res.json({
                success: true,
                address: signer.address,
                network: {
                    name: network.name,
                    chainId: network.chainId.toString(),
                    rpcUrl: RPC_URL
                },
                balanceWei: balance.toString(),
                balanceEth: balanceInEth,
                networkGasPrice: gasPriceGwei + " gwei",
                estimatedTxCount: Math.floor(Number(txCount)),
                sufficientFunds: !needsMoreFunds,
                recommendedMinBalanceWei: recommendedBalance.toString(),
                recommendedMinBalanceEth: ethers.formatEther(recommendedBalance)
            });
        } catch (error) {
            console.error(`[BALANCE] [${new Date().toISOString()}] Error checking wallet balance:`, error);
            return res.status(500).json({
                success: false,
                error: "Failed to check wallet balance",
                message: error instanceof Error ? error.message : String(error)
            });
        }
    })();
});

// ===================================
// SERVER INITIALIZATION
// ===================================

const PORT = process.env.PORT || 3000;
let server: any = null;

// Only start the server if it hasn't been started yet
if (!server) {
    server = app.listen(PORT, () => {
        console.log(`DEKService API listening on port ${PORT}`);
        console.log(`Contract address: ${SEP_CONTRACT_ADDY}`);
        console.log(`RPC URL: ${RPC_URL}`);
    });
}

// Export the app for testing purposes
export default app;
