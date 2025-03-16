const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_URL = "http://localhost:3000";

// Set a timeout for all axios requests
axios.defaults.timeout = 180000; // 3 minutes

async function testLocalStorage() {
    try {
        console.log("🔍 DECX.PRESS LOCAL STORAGE TEST");
        console.log("================================");

        // Test health endpoint
        console.log("\n📡 Testing health endpoint...");
        const healthResponse = await axios.get(`${API_URL}/health`);
        console.log("Health check:", healthResponse.data);

        // Test 1: Press content with local storage only (no on-chain storage)
        console.log("\n🔐 --- Test 1: Local Storage Only ---");
        console.log("Testing press endpoint with local storage...");
        const content = "a"; // Test a single character to reduce processing time

        console.log(`Content to press: "${content}"`);
        const pressStartTime = Date.now();
        const pressResponse = await axios.post(`${API_URL}/press`, {
            content
        });
        const pressDuration = Date.now() - pressStartTime;

        console.log(`Press response (${pressDuration}ms):`);
        console.log(`  Final hash: ${pressResponse.data.finalHash}`);
        console.log(`  Content length: ${pressResponse.data.contentLength}`);
        console.log(`  Stored on chain: ${pressResponse.data.storedOnChain}`);
        console.log(
            `  Encrypted contents size: ${Object.keys(pressResponse.data.encryptedContents || {}).length} hashes`
        );
        console.log(`  Gas used: ${pressResponse.data.gasUsed}`);

        // Save encrypted contents to a local file
        const encryptedContents = pressResponse.data.encryptedContents;
        const finalHash = pressResponse.data.finalHash;

        const localStorageDir = path.join(__dirname, "local-storage");
        if (!fs.existsSync(localStorageDir)) {
            fs.mkdirSync(localStorageDir);
        }

        const filePath = path.join(localStorageDir, `${finalHash}.json`);
        fs.writeFileSync(
            filePath,
            JSON.stringify(
                {
                    finalHash,
                    encryptedContents,
                    timestamp: Date.now(),
                    contentLength: pressResponse.data.contentLength
                },
                null,
                2
            )
        );

        console.log(`\n💾 Saved encrypted contents to ${filePath}`);

        // Test release endpoint with local storage
        console.log("\n🔓 Testing release endpoint with local storage...");

        // Read the encrypted contents from the file
        const savedData = JSON.parse(fs.readFileSync(filePath, "utf8"));

        const releaseStartTime = Date.now();
        const releaseResponse = await axios.post(`${API_URL}/release`, {
            finalHash: savedData.finalHash,
            encryptedContents: savedData.encryptedContents
        });
        const releaseDuration = Date.now() - releaseStartTime;

        console.log(`Release response (${releaseDuration}ms):`);
        console.log(`  Original content: "${releaseResponse.data.originalContent}"`);
        console.log(`  Content length: ${releaseResponse.data.contentLength}`);
        console.log(`  Gas used: ${releaseResponse.data.gasUsed}`);

        // Verify the content matches
        if (releaseResponse.data.originalContent === content) {
            console.log("\n✅ Test 1 successful! Original content was retrieved correctly using local storage.");
        } else {
            console.log("\n❌ Test 1 failed! Retrieved content does not match original.");
            console.log("Original:", content);
            console.log("Retrieved:", releaseResponse.data.originalContent);
        }

        // Test 2: Press content with on-chain storage (for comparison)
        console.log("\n🔐 --- Test 2: On-Chain Storage ---");
        console.log("Testing press endpoint with on-chain storage...");
        const content2 = "b"; // Test a single character to reduce processing time

        console.log(`Content to press: "${content2}"`);
        const pressStartTime2 = Date.now();
        const pressResponse2 = await axios.post(`${API_URL}/press`, {
            content: content2,
            storeOnChain: true // Explicitly store on-chain
        });
        const pressDuration2 = Date.now() - pressStartTime2;

        console.log(`Press response (${pressDuration2}ms):`);
        console.log(`  Final hash: ${pressResponse2.data.finalHash}`);
        console.log(`  Content length: ${pressResponse2.data.contentLength}`);
        console.log(`  Stored on chain: ${pressResponse2.data.storedOnChain}`);
        console.log(`  Gas used: ${pressResponse2.data.gasUsed}`);

        // Test release endpoint with on-chain storage
        console.log("\n🔓 Testing release endpoint with on-chain storage...");

        const finalHash2 = pressResponse2.data.finalHash;
        const releaseStartTime2 = Date.now();
        const releaseResponse2 = await axios.post(`${API_URL}/release`, {
            finalHash: finalHash2
            // No need to provide encryptedContents since it's stored on-chain
        });
        const releaseDuration2 = Date.now() - releaseStartTime2;

        console.log(`Release response (${releaseDuration2}ms):`);
        console.log(`  Original content: "${releaseResponse2.data.originalContent}"`);
        console.log(`  Content length: ${releaseResponse2.data.contentLength}`);
        console.log(`  Gas used: ${releaseResponse2.data.gasUsed}`);

        // Verify the content matches
        if (releaseResponse2.data.originalContent === content2) {
            console.log("\n✅ Test 2 successful! Original content was retrieved correctly using on-chain storage.");
        } else {
            console.log("\n❌ Test 2 failed! Retrieved content does not match original.");
            console.log("Original:", content2);
            console.log("Retrieved:", releaseResponse2.data.originalContent);
        }

        // Compare gas usage
        console.log("\n⛽ GAS USAGE COMPARISON");
        console.log("======================");
        console.log(`Local storage: ${pressResponse.data.gasUsed} gas units`);
        console.log(`On-chain storage: ${pressResponse2.data.gasUsed} gas units`);

        const gasRatio = parseInt(pressResponse2.data.gasUsed) / parseInt(pressResponse.data.gasUsed);
        console.log(`On-chain uses ${gasRatio.toFixed(2)}x more gas than local storage`);

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
testLocalStorage()
    .then(() => clearTimeout(testTimeout))
    .catch((error) => {
        console.error("❌ Unhandled error in tests:", error);
        clearTimeout(testTimeout);
        process.exit(1);
    });
