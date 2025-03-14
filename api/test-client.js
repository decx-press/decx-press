const axios = require("axios");

const API_URL = "http://localhost:3000";

// Set a timeout for all axios requests
axios.defaults.timeout = 180000; // 3 minutes

async function testApi() {
    try {
        // Test health endpoint
        console.log("Testing health endpoint...");
        const healthResponse = await axios.get(`${API_URL}/health`);
        console.log("Health check:", healthResponse.data);

        // Test 1: Default encryption (for the server's public key)
        console.log("\n--- Test 1: Default Encryption ---");
        console.log("Testing press endpoint with default recipient...");
        const content = "decx";
        const pressResponse = await axios.post(`${API_URL}/press`, { content });
        console.log("Press response:", pressResponse.data);

        const finalHash = pressResponse.data.finalHash;

        // Test release endpoint
        console.log("\nTesting release endpoint...");
        const releaseResponse = await axios.post(`${API_URL}/release`, { finalHash });
        console.log("Release response:", releaseResponse.data);

        // Verify the content matches
        if (releaseResponse.data.originalContent === content) {
            console.log("\n✅ Test 1 successful! Original content was retrieved correctly.");
        } else {
            console.log("\n❌ Test 1 failed! Retrieved content does not match original.");
            console.log("Original:", content);
            console.log("Retrieved:", releaseResponse.data.originalContent);
        }

        console.log("\nAll tests completed!");
        // Explicitly exit with success code
        process.exit(0);
    } catch (error) {
        console.error("Error testing API:", error.response?.data || error.message);
        // Explicitly exit with error code
        process.exit(1);
    }
}

// Set a global timeout for the entire test
const testTimeout = setTimeout(() => {
    console.error("Test timed out after 300 seconds");
    process.exit(1);
}, 300000); // 5 minutes

// Clear the timeout if tests complete successfully
testApi()
    .then(() => clearTimeout(testTimeout))
    .catch((error) => {
        console.error("Unhandled error in tests:", error);
        clearTimeout(testTimeout);
        process.exit(1);
    });
