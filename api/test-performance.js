const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_URL = "http://localhost:3000";

// Set a timeout for all axios requests
axios.defaults.timeout = 300000; // 5 minutes

async function testPerformance() {
    try {
        console.log("🔍 DECX.PRESS PERFORMANCE TEST");
        console.log("==============================");

        // Test health endpoint
        console.log("\n📡 Testing health endpoint...");
        const healthResponse = await axios.get(`${API_URL}/health`);
        console.log("Health check:", healthResponse.data);

        // Define test cases with different content sizes
        const testCases = [
            { name: "Single Character", content: "a", storeOnChain: false },
            { name: "Short Text (10 chars)", content: "abcdefghij", storeOnChain: false },
            { name: "Repeated Single Character in word", content: "baaaaaad", storeOnChain: false }
            // Longer content tests are optional and commented out by default
            // { name: "Long Text (100 chars)", content: "a".repeat(100), storeOnChain: false },
            // { name: "Very Long (500 chars)", content: "a".repeat(500), storeOnChain: false },
        ];

        const results = [];

        // Run each test case
        for (const testCase of testCases) {
            console.log(`\n🔐 --- Test: ${testCase.name} ---`);
            console.log(`Content length: ${testCase.content.length} characters`);
            console.log(`Store on chain: ${testCase.storeOnChain}`);

            try {
                // Press content
                console.log("\n → Pressing content...");
                const pressStartTime = Date.now();
                const pressResponse = await axios.post(`${API_URL}/press`, {
                    content: testCase.content,
                    storeOnChain: testCase.storeOnChain
                });
                const pressDuration = Date.now() - pressStartTime;

                console.log(`Press completed in ${pressDuration}ms`);
                console.log(`Final hash: ${pressResponse.data.finalHash}`);
                console.log(`Gas used: ${pressResponse.data.gasUsed}`);

                // Save encrypted contents if not storing on chain
                let filePath = null;
                if (!testCase.storeOnChain && pressResponse.data.encryptedContents) {
                    const localStorageDir = path.join(__dirname, "local-storage");
                    if (!fs.existsSync(localStorageDir)) {
                        fs.mkdirSync(localStorageDir);
                    }

                    filePath = path.join(localStorageDir, `perf-${pressResponse.data.finalHash}.json`);
                    fs.writeFileSync(
                        filePath,
                        JSON.stringify(
                            {
                                finalHash: pressResponse.data.finalHash,
                                encryptedContents: pressResponse.data.encryptedContents,
                                timestamp: Date.now(),
                                contentLength: pressResponse.data.contentLength
                            },
                            null,
                            2
                        )
                    );

                    console.log(`Saved encrypted contents to ${filePath}`);
                }

                // Release content
                console.log("\n → Releasing content...");
                const releaseStartTime = Date.now();

                let releasePayload = {
                    finalHash: pressResponse.data.finalHash
                };

                // Add encrypted contents if we saved them locally
                if (filePath) {
                    const savedData = JSON.parse(fs.readFileSync(filePath, "utf8"));
                    releasePayload.encryptedContents = savedData.encryptedContents;
                }

                const releaseResponse = await axios.post(`${API_URL}/release`, releasePayload);
                const releaseDuration = Date.now() - releaseStartTime;

                console.log(`Release completed in ${releaseDuration}ms`);
                console.log(`Original content length: ${releaseResponse.data.contentLength}`);
                console.log(`Gas used: ${releaseResponse.data.gasUsed}`);

                // Verify content
                const contentMatches = releaseResponse.data.originalContent === testCase.content;
                console.log(`Content verification: ${contentMatches ? "✅ Success" : "❌ Failed"}`);

                // Add debugging for failed verification
                if (!contentMatches) {
                    console.log("Expected length:", testCase.content.length);
                    console.log("Received length:", releaseResponse.data.originalContent.length);
                    if (testCase.content.length <= 20) {
                        console.log("Expected:", testCase.content);
                        console.log("Received:", releaseResponse.data.originalContent);
                    } else {
                        console.log("Expected (first 20 chars):", testCase.content.substring(0, 20));
                        console.log(
                            "Received (first 20 chars):",
                            releaseResponse.data.originalContent.substring(0, 20)
                        );
                    }
                }

                // Save results
                results.push({
                    name: testCase.name,
                    contentLength: testCase.content.length,
                    storeOnChain: testCase.storeOnChain,
                    pressDuration,
                    pressGasUsed: pressResponse.data.gasUsed,
                    releaseDuration,
                    releaseGasUsed: releaseResponse.data.gasUsed,
                    contentVerified: contentMatches
                });
            } catch (error) {
                console.error(`❌ Error in test case "${testCase.name}":`, error.response?.data || error.message);
                results.push({
                    name: testCase.name,
                    contentLength: testCase.content.length,
                    storeOnChain: testCase.storeOnChain,
                    error: error.message
                });
            }
        }

        // Print summary
        console.log("\n📊 PERFORMANCE TEST RESULTS");
        console.log("==========================");
        console.log("| Test Case | Content Length | Press Time | Release Time | Press Gas | Release Gas | Status |");
        console.log("|-----------|---------------|------------|--------------|-----------|-------------|--------|");

        for (const result of results) {
            if (result.error) {
                console.log(
                    `| ${result.name.padEnd(9)} | ${String(result.contentLength).padEnd(13)} | ERROR | ERROR | ERROR | ERROR | ❌ Failed |`
                );
            } else {
                console.log(
                    `| ${result.name.padEnd(9)} | ${String(result.contentLength).padEnd(13)} | ${String(result.pressDuration).padEnd(10)}ms | ${String(result.releaseDuration).padEnd(12)}ms | ${String(result.pressGasUsed).padEnd(9)} | ${String(result.releaseGasUsed).padEnd(11)} | ${result.contentVerified ? "✅ Success" : "❌ Failed"} |`
                );
            }
        }

        console.log("\n✨ Performance tests completed!");

        process.exit(0);
    } catch (error) {
        console.error("❌ Error in performance tests:", error.response?.data || error.message);
        process.exit(1);
    }
}

// Set a global timeout for the entire test
const testTimeout = setTimeout(() => {
    console.error("⏱️ Test timed out after 10 minutes");
    process.exit(1);
}, 600000); // 10 minutes

// Clear the timeout if tests complete successfully
testPerformance()
    .then(() => clearTimeout(testTimeout))
    .catch((error) => {
        console.error("❌ Unhandled error in tests:", error);
        clearTimeout(testTimeout);
        process.exit(1);
    });
