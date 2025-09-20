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


        // console.log("player1:", wordle.player1());
        // console.log("player2:", wordle.player2());

        // console.logBytes32(wordle.word_commitment_hash2(0));
       

        // Verify that player 2 is set correctly
        assertEq(wordle.player2(), player2);
    }


    function testGuess() public {

        testJoinGame();

        // Player 1 makes a guess
        vm.prank(player1);
        string memory guess_word = "soxep";
        string memory correct_word = "apple";
        wordle.guess(player1, guess_word);
        assertEq(wordle.last_guess(), guess_word);

        bytes32[] memory result = new bytes32[](5);
        result[0] = bytes32(uint256(0));
        result[1] = bytes32(uint256(0));
        result[2] = bytes32(uint256(0));
        result[3] = bytes32(uint256(1));
        result[4] = bytes32(uint256(1));
        // Player 2 verifies the guess
        vm.prank(player2);
        uint256 NUM_ARGS = 18;
        string[] memory inputs = new string[](NUM_ARGS);
        inputs[0] = "npx";
        inputs[1] = "tsx";
        inputs[2] = "js-scripts/generateProof.ts";


        inputs[3] = vm.toString(wordle.word_commitment_hash1(0));
        inputs[4] = vm.toString(wordle.word_commitment_hash1(1));
        inputs[5] = vm.toString(wordle.word_commitment_hash1(2));
        inputs[6] = vm.toString(wordle.word_commitment_hash1(3));
        inputs[7] = vm.toString(wordle.word_commitment_hash1(4));

        // console.log("inputs[0]:", inputs[3]);
        // console.log("inputs[1]:", inputs[4]);
        // console.log("inputs[2]:", inputs[5]);
        // console.log("inputs[3]:", inputs[6]);
        // console.log("inputs[4]:", inputs[7]);
       

        inputs[8] = vm.toString(bytes32(uint256(uint8(bytes(guess_word)[0]))));
        inputs[9] = vm.toString(bytes32(uint256(uint8(bytes(guess_word)[1]))));
        inputs[10] = vm.toString(bytes32(uint256(uint8(bytes(guess_word)[2]))));
        inputs[11] = vm.toString(bytes32(uint256(uint8(bytes(guess_word)[3]))));
        inputs[12] = vm.toString(bytes32(uint256(uint8(bytes(guess_word)[4]))));

        inputs[13] = vm.toString(bytes32(uint256(uint8(bytes(correct_word)[0]))));
        inputs[14] = vm.toString(bytes32(uint256(uint8(bytes(correct_word)[1]))));
        inputs[15] = vm.toString(bytes32(uint256(uint8(bytes(correct_word)[2]))));
        inputs[16] = vm.toString(bytes32(uint256(uint8(bytes(correct_word)[3]))));
        inputs[17] = vm.toString(bytes32(uint256(uint8(bytes(correct_word)[4]))));

       
        // console.log("inputs[3]:", inputs[8]);
        // console.log("inputs[4]:", inputs[9]);
        // console.log("inputs[5]:", inputs[10]);
        // console.log("inputs[6]:", inputs[11]);
        // console.log("inputs[7]:", inputs[12]);
        // inputs[13] = vm.toString(result[0]);
        // inputs[14] = vm.toString(result[1]);
        // inputs[15] = vm.toString(result[2]);
        // inputs[16] = vm.toString(result[3]);
        // inputs[17] = vm.toString(result[4]);

       // bytes memory proof;
       // bytes32[] memory publicInputs;
        bytes memory out = vm.ffi(inputs);

       (bytes memory proof, bytes32[] memory publicInputs) =
            abi.decode(out, (bytes, bytes32[]));
       
    //   console.logBytes(proof);
    /*

    console.log("=== PUBLIC INPUTS ===");
    console.log("Total public inputs:", publicInputs.length);


    console.log("Word commitment hashes:");
    for (uint i = 0; i < 5; i++) {
        console.log("  Hash", i, ":");
        console.logBytes32(publicInputs[i]);
    }
    
    
    console.log("Guess letters (ASCII):");
    for (uint i = 5; i < 10; i++) {
        console.log("  Hash", i, ":");
        console.logBytes32(publicInputs[i]);
    }
    
    
    console.log("Wordle results:");
    for (uint i = 10; i < 15; i++) {
        console.log("  Position", i-10, "- Result:", uint256(publicInputs[i]));
    }
    */
    //   bytes memory _proof, bytes32[] memory result, address verifier_player, string memory guess_word

    wordle.verify_guess(proof, result, player2, guess_word);
       

    }

}