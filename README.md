## ZK Wordle


### This is a peer to peer zero knowledge based wordle game

# verification key   bb write_vk --oracle-hash keccak -b ./target/circuits.json -o ./target 
# verifier contract bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol

# deployment command forge script script/DeployAll.s.sol --rpc-url https://ethereum-sepolia-public.nodies.app --private-key xxx --broadcast --skip-simulation --legacy

# join game command forge script script/JoinGame.s.sol --rpc-url https://ethereum-sepolia-public.nodies.app --private-key c8ccc --broadcast


# Check player1
cast call 0xb509d73A10255E2Eb0b74720d257ECDd7C2d6153 "player1()" --rpc-url https://sepolia.gateway.tenderly.co

# Check player2  
cast call 0xb509d73A10255E2Eb0b74720d257ECDd7C2d6153 "player2()" --rpc-url https://sepolia.gateway.tenderly.co

# Check attempts
cast call 0xb509d73A10255E2Eb0b74720d257ECDd7C2d6153 "attempts()" --rpc-url https://sepolia.gateway.tenderly.co

# Check winner
cast call 0xb509d73A10255E2Eb0b74720d257ECDd7C2d6153 "winner()" --rpc-url https://sepolia.gateway.tenderly.co

# Check last guess
cast call 0xb509d73A10255E2Eb0b74720d257ECDd7C2d6153 "last_guess()" --rpc-url https://sepolia.gateway.tenderly.co


# deploy forge script script/DeployAll.s.sol --rpc-url https://sepolia.gateway.tenderly.co --private-key xxx --broadcast


# game state 


echo "=== NEW GAME STATE ===" && echo "Player 1:" && cast call 0x155E78fb3b3D7995B1d56B7A4C0894f7eBDE4002 "player1()" --rpc-url https://sepolia.gateway.tenderly.co && echo "Player 2:" && cast call 0x155E78fb3b3D7995B1d56B7A4C0894f7eBDE4002 "player2()" --rpc-url https://sepolia.gateway.tenderly.co && echo "Current turn:" && cast call 0x155E78fb3b3D7995B1d56B7A4C0894f7eBDE4002 "getTurn()" --rpc-url https://sepolia.gateway.tenderly.co



kaleab@Kaleabs-MacBook-Air contracts % forge script script/DeployAll.s.sol --rpc-url https://eth-sepoli
a.g.alchemy.com/v2/yfYMfVW6oD82nAyfAQmuz --private-key xx --broadcast