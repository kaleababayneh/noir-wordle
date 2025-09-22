// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WordleGameFactory} from "../src/WordleGameFactory.sol";
import {HonkVerifier} from "../src/Verifier.sol";

contract DeployWordleFactory is Script {
    function run() external returns (WordleGameFactory factory, HonkVerifier verifier) {
        vm.startBroadcast();

        // Deploy the verifier first (if not already deployed)
        verifier = new HonkVerifier();
        console.log("Verifier deployed at:", address(verifier));

        // Deploy the WordleGameFactory
        factory = new WordleGameFactory(verifier);
        console.log("WordleGameFactory deployed at:", address(factory));

        vm.stopBroadcast();

        return (factory, verifier);
    }
}