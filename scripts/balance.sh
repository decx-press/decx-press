#!/bin/bash

# Load environment variables
source .env

# Function to check balance
check_balance() {
  local address=$1
  local label=$2

  echo "Checking balance for $label: $address"

  # Make the RPC call to get the balance
  RESPONSE=$(curl -s -X POST $RPC_URL \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$address\", \"latest\"],\"id\":1}")

  # Extract the result
  RESULT=$(echo $RESPONSE | grep -o '"result":"[^"]*"' | cut -d'"' -f4)

  if [ -z "$RESULT" ]; then
    echo "Error: Failed to get balance"
    echo "Response: $RESPONSE"
    return 1
  fi

  # Convert hex to decimal and then to ETH
  BALANCE_WEI=$(printf "%d" $RESULT)
  BALANCE_ETH=$(echo "scale=18; $BALANCE_WEI / 1000000000000000000" | bc)

  echo "Balance: $BALANCE_ETH ETH"

  # Check if balance is too low
  if [ "$BALANCE_WEI" -eq 0 ]; then
    echo -e "⚠️  WARNING: This wallet has no ETH!\n"
  elif (( $(echo "$BALANCE_ETH < 0.01" | bc -l) )); then
    echo -e "⚠️  WARNING: This wallet balance is low!\n"
  else
    echo -e "✅ Balance is sufficient for transactions\n"
  fi
}

echo "===== Wallet Balance Checker ====="

# Check the balance of the PUBLIC_KEY in .env
check_balance "$PUBLIC_KEY" "PUBLIC_KEY from .env"

# Check the balance of the address derived from PRIVATE_KEY
DERIVED_ADDRESS=$(node -e "const { ethers } = require('ethers'); const wallet = new ethers.Wallet('$PRIVATE_KEY'); console.log(wallet.address);")
check_balance "$DERIVED_ADDRESS" "Address derived from PRIVATE_KEY"

echo "===== Faucet Links ====="
echo "If you need test ETH, try these faucets:"
echo "- https://www.alchemy.com/faucets/ethereum-sepolia"
echo "- https://sepolia-faucet.pk910.de/"
echo "- https://faucet.chainstack.com/sepolia-faucet"