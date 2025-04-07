import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
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

// Import services
import { getSigner, getContract, getDekService, getProvider } from "./services/walletService";

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
        console.log(`Contract address: ${process.env.SEP_CONTRACT_ADDY}`);
        console.log(`RPC URL: ${process.env.RPC_URL}`);
    });
}

// Export the app for testing purposes
export default app;
