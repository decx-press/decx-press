import express from "express";
import bodyParser from "body-parser";
import { ethers } from "ethers";
import { DEKService } from "../services/dEKService";
import { ECIESService } from "../services/encryption/ECIESService";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";

// Import routes
import balanceRouter from "./routes/balance";
import pressRouter from "./routes/press";
import hashRouter from "./routes/hash";
import statusRouter from "./routes/status";
import releaseRouter from "./routes/release";
import healthRouter from "./routes/health";

// Import middleware
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";

// Load environment variables from root directory
dotenv.config({ path: path.join(__dirname, "../.env") });

// Initialize Express app
const app = express();

// ===================================
// MIDDLEWARE CONFIGURATION
// ===================================
app.use(bodyParser.json());
app.use(cors());
app.use(requestLogger);

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
    console.log(`[PRV] [${new Date().toISOString()}] Debug:`, info);
});

provider.on("error", (error) => {
    console.error(`[PRV] [${new Date().toISOString()}] Error:`, error);
});

provider.on("network", (newNetwork, oldNetwork) => {
    console.log(`[PRV] [${new Date().toISOString()}] Network changed:`, {
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
    console.log(`[WLT] [${new Date().toISOString()}] Using wallet address: ${signer.address}`);
    console.log(`[WLT] [${new Date().toISOString()}] Connected to network: ${RPC_URL}`);
    console.log(`[WLT] [${new Date().toISOString()}] Contract address: ${SEP_CONTRACT_ADDY}`);
} else {
    console.error("[WLT] PRIVATE_KEY environment variable is required");
    process.exit(1);
}

// Initialize contract instance
console.log(`[CNT] [${new Date().toISOString()}] Creating contract instance with address: ${SEP_CONTRACT_ADDY}`);
const decxDAG = new ethers.Contract(SEP_CONTRACT_ADDY, contractAbi, signer);

// Initialize ECIES service
console.log(`[ECI] [${new Date().toISOString()}] Creating ECIESService`);
const eciesService = new ECIESService(process.env.PRIVATE_KEY);

// Validate recipient public key
const recipientPublicKey = process.env.PUBLIC_KEY;
if (!recipientPublicKey) {
    console.error("[CFG] PUBLIC_KEY environment variable is required");
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
    console.log(`[STR] [${new Date().toISOString()}] ${operation} for request ${requestId}:`, data);
    console.log(`[STR] [${new Date().toISOString()}] Current store size: ${transactionStore.size}`);
    console.log(`[STR] [${new Date().toISOString()}] Store keys:`, Array.from(transactionStore.keys()));
    console.log(`[STR] [${new Date().toISOString()}] Store contents:`, Array.from(transactionStore.entries()));
};

// Store transaction data
const storeTransaction = (requestId: string, data: { hash?: string; error?: string }) => {
    console.log(`[STOR] [${new Date().toISOString()}] Storing transaction data for ${requestId}:`, data);
    transactionStore.set(requestId, data);
    logTransactionStore("Store operation", requestId, data);
};

// ===================================
// API ROUTES
// ===================================

// Mount routes
app.use("/v1/health", healthRouter);
app.use("/v1/balance", balanceRouter);
app.use("/v1/press", pressRouter);
app.use("/v1/hash", hashRouter);
app.use("/v1/status", statusRouter);
app.use("/v1/release", releaseRouter);

// Error handling middleware - must be last
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    errorHandler(err, req, res, next);
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
