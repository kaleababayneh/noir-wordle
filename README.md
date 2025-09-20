## ZK Wordle


### This is a peer to peer zero knowledge based wordle game

# verification key   bb write_vk --oracle-hash keccak -b ./target/circuits.json -o ./target 
# verifier contract bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol

# deployment command forge script script/DeployAll.s.sol --rpc-url https://ethereum-sepolia-public.nodies.app --private-key xxx --broadcast --skip-simulation --legacy

# join game command forge script script/JoinGame.s.sol --rpc-url https://ethereum-sepolia-public.nodies.app --private-key c8ccc --broadcast