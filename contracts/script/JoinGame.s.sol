// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Wordle} from "../src/Wordle.sol";

contract JoinGame is Script {
    function run() external {
        // Contract addresses
        address wordleAddress = 0xB8b8A3dec24f02531525F4f48ff74230AF58D36F;
        
        vm.startBroadcast();
        
        Wordle wordle = Wordle(wordleAddress);
        
        // Word commitment hash for player 2 (example: "peach")
        bytes32[] memory wordHash2 = new bytes32[](5);
        wordHash2[0] = 0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70; // p
        wordHash2[1] = 0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00; // e
        wordHash2[2] = 0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920; // a
        wordHash2[3] = 0x20ddfc254a35314d202574123c02421788a45d4c1ff3491232b9494ea6193c84; // c
        wordHash2[4] = 0x1ea6c3a57c58edf4d20a808c96f4034e8fefa0bcedea27799ecfa8b7cdbafc90; // h
        
        // Join the game as player 2
        address player2 = vm.addr(0xc8b53220c85708ac772d3b06630896d163c4001f9f2cb237e67d78685303cfea);
        
        console.log("Player 2 address:", player2);
        console.log("Joining game...");
        
        wordle.joinGame(player2, wordHash2);
        
        console.log("Successfully joined the game!");
        console.log("Player 2:", wordle.player2());
        
        vm.stopBroadcast();
    }
}