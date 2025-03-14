# decx-press API

This API provides access to the decx Encryption Key Service (dEKService) functionality through a simple REST interface.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   PORT=3000
   SEP_CONTRACT_ADDY=0xYourContractAddressHere
   RPC_URL=https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY
   PRIVATE_KEY=0xYourPrivateKeyHere
   PUBLIC_KEY=0xYourPublicKeyHere
   ```

3. Create a `contract-abi.json` file with your contract's ABI.

## Running the API

```
npm run start:api
```

## API Endpoints

### Health Check

```
GET /health
```

Returns the status of the API and information about the connected contract.

### Press Content

```
POST /press
Content-Type: application/json

{
  "content": "Your content to press"
}
```

Returns:
```json
{
  "success": true,
  "finalHash": "0x...",
  "contentLength": 123
}
```

### Release Content

```
POST /release
Content-Type: application/json

{
  "finalHash": "0x..."
}
```

Returns:
```json
{
  "success": true,
  "originalContent": "Your original content",
  "contentLength": 123
}
```

## Testing

Run the test client to verify the API works:

```
node test-client.js
```

## Integration with CLI

To integrate this API with your CLI, make HTTP requests to these endpoints using a library like axios:

```javascript
const axios = require('axios');

// Press content
const pressResponse = await axios.post('http://localhost:3000/press', {
  content: 'Hello world'
});
const finalHash = pressResponse.data.finalHash;

// Release content
const releaseResponse = await axios.post('http://localhost:3000/release', {
  finalHash
});
const originalContent = releaseResponse.data.originalContent;
```