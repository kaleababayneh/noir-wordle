// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Wordle} from "../src/Wordle.sol";
import {HonkVerifier, IVerifier} from "../src/Verifier.sol";

contract DeployAll is Script {
    function run() external returns (Wordle, HonkVerifier) {
        vm.startBroadcast();
        
        // Deploy Verifier first
        HonkVerifier verifier = new HonkVerifier();
        console.log("Verifier deployed at:", address(verifier));
        
        // Prepare Wordle constructor parameters
        bytes32[] memory wordCommitmentHash = new bytes32[](5);
        // Add your actual commitment hashes here
        wordCommitmentHash[0] = 0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920;
        wordCommitmentHash[1] = 0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70;
        wordCommitmentHash[2] = 0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70;
        wordCommitmentHash[3] = 0x0ed3294f4ba676f67296d5dcccdbe7dff01975032dda4c15eb3e732c77aa5cad;
        wordCommitmentHash[4] = 0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00;
        
        // Deploy Wordle with the verifier
        Wordle wordle = new Wordle(
            IVerifier(address(verifier)),
            wordCommitmentHash
        );
        
        console.log("Wordle deployed at:", address(wordle));
        
        vm.stopBroadcast();
        return (wordle, verifier);
    }
}