const axios = require("axios");

const API_URL = "http://localhost:3000";

async function testApi() {
    try {
        // Test health endpoint
        console.log("Testing health endpoint...");
        const healthResponse = await axios.get(`${API_URL}/health`);
        console.log("Health check:", healthResponse.data);

        // Test press endpoint
        console.log("\nTesting press endpoint...");
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
            console.log("\n✅ Test successful! Original content was retrieved correctly.");
        } else {
            console.log("\n❌ Test failed! Retrieved content does not match original.");
            console.log("Original:", content);
            console.log("Retrieved:", releaseResponse.data.originalContent);
        }
    } catch (error) {
        console.error("Error testing API:", error.response?.data || error.message);
    }
}

testApi();
