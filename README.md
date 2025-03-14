# decx.press Infrastructure

![Hardhat Tests](https://github.com/decx-press/decx-press/actions/workflows/test.yml/badge.svg)
![Code Coverage](https://codecov.io/gh/decx-press/decx-press/branch/main/graph/badge.svg)

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Blockchain Configuration](#blockchain-configuration)
- [API](#api)
  - [Running the API](#running-the-api)
  - [API Endpoints](#api-endpoints)
  - [Testing the API](#testing-the-api)
- [Project Directory Structure](#project-directory-structure)

## Getting Started

### Prerequisites

- [Node.js v18+](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs)
- [npm](https://www.npmjs.com/get-npm)
- [MetaMask](https://metamask.io/) or another Ethereum wallet

#### Recommended Tools

- If using VSCode, install the [Solidity/Hardhat](https://marketplace.visualstudio.com/items?itemName=NomicFoundation.hardhat-solidity) extension.

### Setup

#### 1. Clone the repository

> ```bash
> git clone git@github.com:decx-press/decx-press.git # for ssh
> cd decx-press
> ```

#### 2. Install dependencies

Install the required npm packages:

> ```bash
> npm install
> ```

This will install the required npm packages:

- **[Hardhat](https://hardhat.org/docs)**: The development environment for building, testing, and deploying smart contracts. It installs Solidity, Ethers, Chai, and other tools.
- **[Hardhat Toolbox](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-toolbox)**: A collection of tools and utilities for Hardhat, including a local Ethereum network, a test runner, and a coverage tool. It includes:
  - **@nomiclabs/hardhat-ethers**: A plugin for Hardhat that provides a set of utilities for interacting with the Ethereum network using Ethers.
  - **@nomiclabs/hardhat-etherscan**: A plugin for Hardhat that provides a set of utilities for interacting with the Etherscan API.
  - **@nomiclabs/hardhat-waffle**: A plugin for Hardhat that provides a set of utilities for testing smart contracts using Waffle.
  - **@nomicfoundation/hardhat-chai-matchers**: Provides Chai testing library matchers specifically for smart contracts.
  - **hardhat-gas-reporter**: Adds gas usage reports for your transactions and smart contract function calls.
  - **solidity-coverage**: A plugin for Hardhat that provides a set of utilities for testing smart contracts using Solidity Coverage.
  - **typechain**: A plugin for Hardhat that generates TypeScript bindings for your smart contracts.

### Blockchain Configuration

To interact with the Ethereum blockchain (Sepolia testnet), follow these steps:

#### 1. Set up a MetaMask wallet
__This step is required to interact with the Ethereum blockchain. If you already have a wallet, you can skip this step.__
- Install the [MetaMask extension](https://metamask.io/download/) for your browser or mobile app
- Create a new wallet or import an existing one
- Make sure to securely store your seed phrase

#### 2. Fund your wallet with a small amount of ETH
__This step allows us to use testnet ETH to test the API by ensuring we are not a bot.__
- Send approximately 0.0001 ETH (about $5) to your wallet address
- Send it via Coinbase, or buy directly from MetaMask
- This helps prove your wallet is not a bot for faucet services
- Depending on the network, the transaction may take a few minutes to clear (up to half an hour)

#### 3. Get Sepolia testnet ETH
__Sepolia is a testnet for Ethereum. It is not real money but allows us to test the API.__
- Once the transaction has cleared, use your wallet address to request testnet funds in order to test the API
- Visit [Alchemy's Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
- Enter your wallet address and click "Send me ETH"

#### 4. Create an Infura account
__Infura is a service that provides access to the Ethereum blockchain. It is not required to interact with the Ethereum blockchain but is recommended for production use.__
- Sign up at [Infura](https://infura.io/)
- Create a new project with Ethereum mainnet and Sepolia testnet access
- Copy your API key and endpoint URLs

#### 5. Configure your environment
__This allows us to keep our private keys and API within reach of the API calls but not committed to the codebase.__
- Copy `.env.dummy` to `.env`
> ```bash
> $ mv .env.dummy .env
> ```
- In newly created `.env` file, update the following values:
  - `PUBLIC_KEY`: Your MetaMask wallet address
  - `PRIVATE_KEY`: Your wallet's private key (from MetaMask: Account > Sepolia Menu (3 vertical dots next to Sepolia funds) > Account details > Show private key)
  - `SEPOLIA_API_KEY`: Your Infura API key
  - `RPC_URL`: Your Infura Sepolia endpoint URL

#### 6. Verify your configuration
__This allows us to verify that our configuration is correct before we start using the API.__
- Run the balance check script to verify your Sepolia funds:
  ```bash
  npm run balance
  ```

#### 7. Compile the Contracts
__We will need to compile the contracts before we can deploy them to the blockchain or interact with them.__
Compile your Solidity contracts using Hardhat's compiler:

> ```bash
> npm run compile # defined in package.json under 'scripts'
> ```

#### 8. Run a Local Hardhat Node
__This will start a local Ethereum node on port 8545 and will generate a list of accounts with private keys and 1000 ETH for each account.__
Start a local Ethereum node for testing and development:

> ```bash
> npm run node # defined in package.json under 'scripts'
> ```
>
> This will start a local Ethereum node on port 8545 and will generate a list of accounts with private keys and 1000 ETH for each account.

#### 9. Deploy the Contracts

Deploy your contracts to the local Hardhat node (must have a running local hardhat node in the previous step):

> ```bash
> npm run deploy --module=module_file_name --network=network_name # defined in package.json under 'scripts'
> ```
>
> For `module_file_name`, use the name of the module file you want to deploy. Modules are located in the `ignition/modules` directory.
> For `network_name`, use:

- **`localhost`** for local testing. (a running local hardhat node is required)
- **`sepolia`** for Sepolia testnet.
- **`mainnet`** for Ethereum mainnet (use with caution).

To use the placeholder Lock module, run:

> ```bash
> npm run deploy --module=Lock --network=localhost
> ```

#### 10. Run Tests

Run your tests using Hardhat's test runner:

> ```bash
> npm run test # defined in package.json under 'scripts'
> ```

If you want to run the tests with gas fees printed, run:

> ```bash
> npm run test:fees # defined in package.json under 'scripts'
> ```

If you want to run the tests for CI, run:

> ```bash
> npm run test:ci # defined in package.json under 'scripts'
> ```

#### 11. Check Test Coverage

Check the test coverage of your contracts:

> ```bash
> npm run coverage # defined in package.json under 'scripts'
> ```

#### 12. Interact with the Contracts

Interact with your deployed contracts using Hardhat's interactive console:

> ```bash
> npm run console # defined in package.json under 'scripts'
> ```

## API

The decx-press API provides access to the decx Encryption Key Service (dEKService) functionality through a simple REST interface.

### Running the API

Start the API server locally:

```bash
npm run start:api
```

The API will be available at http://localhost:3000.

### API Endpoints

#### Health Check

```
GET /health
```

Returns the status of the API and information about the connected contract.

#### Press Content

```
POST /press
Content-Type: application/json

{
  "content": "Your content to press",
  "recipientPublicKey": "0x04..." (optional)
}
```

If `recipientPublicKey` is provided, the content will be encrypted specifically for that recipient. Only someone with the corresponding private key will be able to decrypt it.

Returns:
```json
{
  "success": true,
  "finalHash": "0x...",
  "contentLength": 123,
  "recipientPublicKey": "0x04..."
}
```

#### Release Content

```
POST /release
Content-Type: application/json

{
  "finalHash": "0x...",
  "recipientPublicKey": "0x04..." (optional)
}
```

The `recipientPublicKey` parameter is used for validation. The API server can only decrypt content that was encrypted for its public key.

Returns:
```json
{
  "success": true,
  "originalContent": "Your original content",
  "contentLength": 123
}
```

### Testing the API

With the API running, open another terminal and run the test client to verify the API works:

```bash
npm run test:api
```

This will make a POST request to the `/press` endpoint with the content "Jumpy dwarf foxes blitz quickly in a night vex." and print the response.

### Integration with CLI

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

## Project Directory Structure

```bash
decx-press/
├── .github/             # GitHub Actions configuration
├── api/                 # API server and related files
├── artifacts/           # Compiled Contracts generated by Hardhat (gitignored)
├── cache/               # Compilation cache (gitignored)
├── contracts/           # Solidity contracts
├── docs/                # Documentation
├── ignition/            # Ignition configuration
├── services/            # Service layer including dEKService
├── test/                # Test files using Mocha and Chai
├── typechain-types/     # TypeScript types generated by Hardhat (gitignored)
├── .gitignore           # Files and directories to ignore in git
├── hardhat.config.js    # Hardhat configuration file
├── package.json         # Project dependencies
├── package-lock.json    # Project dependencies in locked versioning (gitignored)
└── README.md            # This file
```
