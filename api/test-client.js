const axios = require("axios");
const ethers = require("ethers");

const API_URL = "http://localhost:3000";

// Set a timeout for all axios requests
axios.defaults.timeout = 180000; // 3 minutes

// Check if gas reporting is enabled
const REPORT_GAS = process.argv.includes("--report-gas");

// Function to format gas costs in a readable way
function formatGasCost(wei, ethPrice = 2500) {
    // Assuming $2500 per ETH
    const ethValue = ethers.formatEther(wei);

    // Adjust for realistic gas prices on Ethereum
    // Current gas prices are typically around 20-50 Gwei per gas unit
    // We'll use 30 Gwei as a reasonable estimate for mainnet
    const gasUnits = Number(wei);
    const gasPrice = 30; // 30 Gwei
    const estimatedCost = gasUnits * gasPrice * 1e-9; // Convert to ETH

    const usdValue = estimatedCost * ethPrice;

    // Convert Wei to Gwei directly (1 Gwei = 10^9 Wei)
    const gweiValueRaw = Number(wei) / 1e9;

    // Use more decimal places for small values
    let gweiFormatted;
    if (gweiValueRaw < 0.01) {
        gweiFormatted = gweiValueRaw.toFixed(6); // Use 6 decimal places for very small values
    } else if (gweiValueRaw < 1) {
        gweiFormatted = gweiValueRaw.toFixed(4); // Use 4 decimal places for small values
    } else {
        gweiFormatted = gweiValueRaw.toFixed(2); // Use 2 decimal places for normal values
    }

    // Add estimated mainnet cost
    return {
        wei: wei.toString(),
        gwei: gweiFormatted,
        eth: parseFloat(ethValue).toFixed(6),
        usd: usdValue.toFixed(4),
        estimatedMainnetCost: {
            eth: estimatedCost.toFixed(6),
            usd: usdValue.toFixed(4)
        }
    };
}

async function testApi() {
    // Track total gas used
    let totalGasUsed = ethers.parseEther("0");
    const transactions = [];

    try {
        console.log("🔍 DECX.PRESS API TEST");
        console.log("=======================");
        if (REPORT_GAS) {
            console.log("Gas reporting: ENABLED");
        }

        // Test health endpoint
        console.log("\n📡 Testing health endpoint...");
        const healthResponse = await axios.get(`${API_URL}/health`);
        console.log("Health check:", healthResponse.data);

        // Test 1: Default encryption (for the server's public key)
        console.log("\n🔐 --- Test 1: Default Encryption ---");
        console.log("Testing press endpoint with default recipient...");
        const content = "a"; // Use a single character to reduce processing time

        console.log(`Content to press: "${content}"`);
        const pressStartTime = Date.now();
        const pressResponse = await axios.post(`${API_URL}/press`, { content });
        const pressDuration = Date.now() - pressStartTime;

        console.log(`Press response (${pressDuration}ms):`, pressResponse.data);

        // Add gas information to the response if not already present
        if (REPORT_GAS) {
            if (!pressResponse.data.gasUsed) {
                // If the server doesn't provide gas info, we need to modify the server.ts file
                console.log("⚠️ Gas information not provided by server. Please update the server to track gas usage.");
            } else {
                const gasCost = ethers.getBigInt(pressResponse.data.gasUsed);
                totalGasUsed += gasCost;
                const formattedGas = formatGasCost(gasCost);
                console.log(`⛽ Gas used for press: ${formattedGas.gwei} Gwei ($${formattedGas.usd})`);

                transactions.push({
                    operation: "Press",
                    content: content,
                    gasUsed: gasCost.toString(),
                    formattedGas
                });
            }
        }

        const finalHash = pressResponse.data.finalHash;

        // Test release endpoint
        console.log("\n🔓 Testing release endpoint...");
        const releaseStartTime = Date.now();
        const releaseResponse = await axios.post(`${API_URL}/release`, { finalHash });
        const releaseDuration = Date.now() - releaseStartTime;

        console.log(`Release response (${releaseDuration}ms):`, releaseResponse.data);

        // Add gas information to the release response if not already present
        if (REPORT_GAS) {
            if (!releaseResponse.data.gasUsed) {
                // If the server doesn't provide gas info, we need to modify the server.ts file
                console.log("⚠️ Gas information not provided by server. Please update the server to track gas usage.");
            } else {
                const gasCost = ethers.getBigInt(releaseResponse.data.gasUsed);
                totalGasUsed += gasCost;
                const formattedGas = formatGasCost(gasCost);
                console.log(`⛽ Gas used for release: ${formattedGas.gwei} Gwei ($${formattedGas.usd})`);

                transactions.push({
                    operation: "Release",
                    hash: finalHash,
                    gasUsed: gasCost.toString(),
                    formattedGas
                });
            }
        }

        // Verify the content matches
        if (releaseResponse.data.originalContent === content) {
            console.log("\n✅ Test 1 successful! Original content was retrieved correctly.");
        } else {
            console.log("\n❌ Test 1 failed! Retrieved content does not match original.");
            console.log("Original:", content);
            console.log("Retrieved:", releaseResponse.data.originalContent);
        }

        // Print gas summary
        if (REPORT_GAS && transactions.length > 0) {
            console.log("\n⛽ GAS USAGE SUMMARY");
            console.log("====================");
            transactions.forEach((tx) => {
                console.log(`${tx.operation}: ${tx.formattedGas.gwei} Gwei ($${tx.formattedGas.usd})`);
            });

            const totalFormatted = formatGasCost(totalGasUsed);
            console.log(`\nTotal Gas: ${totalFormatted.gwei} Gwei (${totalFormatted.eth} ETH, $${totalFormatted.usd})`);

            // Add estimated mainnet costs
            console.log("\n💰 ESTIMATED MAINNET COSTS (at 30 Gwei gas price)");
            console.log("==================================================");
            transactions.forEach((tx) => {
                console.log(
                    `${tx.operation}: ${tx.formattedGas.estimatedMainnetCost.eth} ETH ($${tx.formattedGas.estimatedMainnetCost.usd})`
                );
            });
            console.log(
                `\nTotal Estimated: ${totalFormatted.estimatedMainnetCost.eth} ETH ($${totalFormatted.estimatedMainnetCost.usd})`
            );
        } else if (REPORT_GAS) {
            console.log("\nℹ️ No gas information available. The API server may not be reporting gas usage.");
        }

        console.log("\n✨ All tests completed!");
        // Explicitly exit with success code
        process.exit(0);
    } catch (error) {
        console.error("❌ Error testing API:", error.response?.data || error.message);
        // Explicitly exit with error code
        process.exit(1);
    }
}

// Set a global timeout for the entire test
const testTimeout = setTimeout(() => {
    console.error("⏱️ Test timed out after 300 seconds");
    process.exit(1);
}, 300000); // 5 minutes

// Clear the timeout if tests complete successfully
testApi()
    .then(() => clearTimeout(testTimeout))
    .catch((error) => {
        console.error("❌ Unhandled error in tests:", error);
        clearTimeout(testTimeout);
        process.exit(1);
    });
