## ZK Wordle


### This is a peer to peer zero knowledge based wordle game

# verification key   bb write_vk --oracle-hash keccak -b ./target/circuits.json -o ./target 
# verifier contract bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol