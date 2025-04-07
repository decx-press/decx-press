import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Load contract ABI from file if available
let contractAbi: any[] = [];
const abiPath = path.join(__dirname, "../contract-abi.json");
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

// Initialize provider with RPC URL
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Configure provider event handlers
provider.on("debug", (info) => {
    console.log(`[PROV] [${new Date().toISOString()}] Debug:`, info);
});

provider.on("error", (error) => {
    console.error(`[PROV] [${new Date().toISOString()}] Error:`, error);
});

provider.on("network", (newNetwork, oldNetwork) => {
    console.log(`[PROV] [${new Date().toISOString()}] Network changed:`, {
        from: oldNetwork?.name,
        to: newNetwork.name
    });
});

// Initialize wallet with private key
let signer;
if (process.env.PRIVATE_KEY) {
    signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`[WLLT] [${new Date().toISOString()}] Using wallet address: ${signer.address}`);
    console.log(`[WLLT] [${new Date().toISOString()}] Connected to network: ${RPC_URL}`);
    console.log(`[WLLT] [${new Date().toISOString()}] Contract address: ${SEP_CONTRACT_ADDY}`);
} else {
    console.error("[WLLT] PRIVATE_KEY environment variable is required");
    process.exit(1);
}

// Initialize contract instance
console.log(`[CONT] [${new Date().toISOString()}] Creating contract instance with address: ${SEP_CONTRACT_ADDY}`);
const decxDAG = new ethers.Contract(SEP_CONTRACT_ADDY, contractAbi, signer);

// Initialize ECIES service
import { ECIESService } from "../../services/encryption/ECIESService";
console.log(`[ECIE] [${new Date().toISOString()}] Creating ECIESService`);
const eciesService = new ECIESService(process.env.PRIVATE_KEY);

// Validate recipient public key
const recipientPublicKey = process.env.PUBLIC_KEY;
if (!recipientPublicKey) {
    console.error("[CONF] PUBLIC_KEY environment variable is required");
    process.exit(1);
}

// Initialize DEKService
import { DEKService } from "../../services/dEKService";
console.log(`[DEKS] [${new Date().toISOString()}] Creating dEKService instance`);
const dekService = new DEKService(decxDAG, eciesService, recipientPublicKey);

export const getProvider = () => provider;
export const getSigner = () => signer;
export const getContract = () => decxDAG;
export const getEciesService = () => eciesService;
export const getDekService = () => dekService;
export const getRecipientPublicKey = () => recipientPublicKey;

export const createWalletFromPrivateKey = (privateKey: string) => {
    return new ethers.Wallet(privateKey, provider);
};

export const createContractWithSigner = (signer: ethers.Wallet) => {
    return new ethers.Contract(SEP_CONTRACT_ADDY, contractAbi, signer);
};
