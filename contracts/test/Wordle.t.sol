// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HonkVerifier} from "../src/Verifier.sol";
import { Poseidon2, Field } from "@poseidon/src/Poseidon2.sol";
import { Wordle } from "../src/Wordle.sol";


contract WordleTest is Test {
    Wordle public  wordle;
    Poseidon2 public hasher;
    HonkVerifier public honkverifier;

    address player1 = makeAddr("user1");
    address player2 = makeAddr("user2");


     function setUp() public {
        bytes32[] memory wordHash = new bytes32[](5);
        // apple
        wordHash[0] = bytes32(0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920);
        wordHash[1] = bytes32(0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70);
        wordHash[2] = bytes32(0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70);
        wordHash[3] = bytes32(0x0ed3294f4ba676f67296d5dcccdbe7dff01975032dda4c15eb3e732c77aa5cad);
        wordHash[4] = bytes32(0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00);
        

        honkverifier = new HonkVerifier();
        // Join the game as player 1
        vm.prank(player1);
        wordle = new Wordle(honkverifier, player1, wordHash);
    }

    function testJoinGame() public {
        // Join the game as player 2
        bytes32[] memory wordHash2 = new bytes32[](5);
        // peach
        wordHash2[0] = bytes32(0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70);
        wordHash2[1] = bytes32(0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00);
        wordHash2[2] = bytes32(0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920);
        wordHash2[3] = bytes32(0x20ddfc254a35314d202574123c02421788a45d4c1ff3491232b9494ea6193c84);
        wordHash2[4] = bytes32(0x1ea6c3a57c58edf4d20a808c96f4034e8fefa0bcedea27799ecfa8b7cdbafc90);
        
        vm.prank(player2);
        wordle.joinGame(player2, wordHash2);


        console.log("player1:", wordle.player1());
        console.log("player2:", wordle.player2());

        console.logBytes32(wordle.word_commitment_hash2(0));
       

        // Verify that player 2 is set correctly
        assertEq(wordle.player2(), player2);
    }




}