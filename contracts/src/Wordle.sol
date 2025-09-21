// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { IVerifier } from "./Verifier.sol";

contract Wordle {

    IVerifier public immutable i_verifier;
    bytes32[5] public word_commitment_hash1;
    bytes32[5] public word_commitment_hash2;

    string public last_guess;
    address public player1 = address(0);
    address public player2 = address(0);
    address public winner = address(0);

    uint32 public attempts;

    event WordleNewGuess(address indexed player, string indexed guess);
    error Wordle__InvalidProof();

    modifier onlyIfGameNotOver() {
        require(winner == address(0), "Game is over");
        _;
    }

    modifier onlyIfGameHasnotStarted() {
        require(player1 == address(0) || player2 == address(0), "Game already started");
        _;
    }

    constructor(IVerifier _i_verifier, address _player, bytes32[] memory _word_commitment_hash1) {
        require(_word_commitment_hash1.length == 5, "need 5 hashes");

        for (uint i = 0; i < 5; i++) word_commitment_hash1[i] = _word_commitment_hash1[i];
        i_verifier = _i_verifier;
        player1 = _player;
    }


    function joinGame(address _player,  bytes32[] memory _word_commitment_hash1) public onlyIfGameHasnotStarted{
        require(_player != address(0), "Invalid player");
        require(_player != player1, "Player 1 already joined");
        require(_word_commitment_hash1.length == 5, "need 5 hashes");

        for (uint i = 0; i < 5; i++) word_commitment_hash2[i] = _word_commitment_hash1[i];
        player2 = _player;
    }

    function guess(address player, string memory guess_word) public onlyIfGameNotOver {
        address whose_turn = getTurn();
        require(player == whose_turn, "Not your turn");

        require(bytes(guess_word).length == 5, "Invalid guess");
        last_guess = guess_word;
        emit WordleNewGuess(player, guess_word);
    }

    function verify_guess(bytes memory _proof, bytes32[] memory result, address verifier_player, string memory guess_word) public  onlyIfGameNotOver {
        address whose_turn = getTurn();
        require(verifier_player != whose_turn, "Not your turn to verify");

        bytes32[] memory publicInputs =  new bytes32[](15);

        // Use the word commitment hashes of the player whose turn it is
        if (whose_turn == player1) {
            publicInputs[0] = word_commitment_hash1[0];
            publicInputs[1] = word_commitment_hash1[1];
            publicInputs[2] = word_commitment_hash1[2];
            publicInputs[3] = word_commitment_hash1[3];
            publicInputs[4] = word_commitment_hash1[4];
        } else {
            publicInputs[0] = word_commitment_hash2[0];
            publicInputs[1] = word_commitment_hash2[1];
            publicInputs[2] = word_commitment_hash2[2];
            publicInputs[3] = word_commitment_hash2[3];
            publicInputs[4] = word_commitment_hash2[4];
        }

       publicInputs[5] = bytes32(uint256(uint8(bytes(guess_word)[0])));
       publicInputs[6] = bytes32(uint256(uint8(bytes(guess_word)[1])));
       publicInputs[7] = bytes32(uint256(uint8(bytes(guess_word)[2])));
       publicInputs[8] = bytes32(uint256(uint8(bytes(guess_word)[3])));
       publicInputs[9] = bytes32(uint256(uint8(bytes(guess_word)[4])));

        publicInputs[10] = result[0];
        publicInputs[11] = result[1];
        publicInputs[12] = result[2];
        publicInputs[13] = result[3];
        publicInputs[14] = result[4];

        if (i_verifier.verify(_proof, publicInputs) == false) {
            revert Wordle__InvalidProof();
        }

        //    bytes32[5] memory expected_word_commitment_hash;
        //    bytes32[5] memory expected_guessed_word;
        //    bytes32[5] memory expected_result;

        // // Parse word commitment hashes from proof (positions 0-4)
        // for (uint i = 0; i < 5; i++) {
        //     require(expected_word_commitment_hash[i] == proof_public_inputs[i], "Word commitment hash mismatch");
        // }
        
        // // Parse guessed word letters from proof (positions 5-9)
        // for (uint i = 0; i < 5; i++) {
        //     require(expected_guessed_word[i] == proof_public_inputs[i + 5], "Guessed word mismatch");
        // }
        
        // // Parse result from proof (positions 10-14)
        // for (uint i = 0; i < 5; i++) {
        //     require(expected_result[i] == proof_public_inputs[i + 10], "Result mismatch");
        // }
        
       /**
        (bytes memory proof, bytes32[] memory publicInputs) =
            abi.decode(out, (bytes, bytes32[]));
       
           
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
                result[i-10] = bytes32(uint256(publicInputs[i]));
                //console.logBytes32(result[i-10]);
            }
            */

         
        

        if (result[0] == bytes32(uint256(2)) && result[1] == bytes32(uint256(2)) && result[2] == bytes32(uint256(2)) && result[3] == bytes32(uint256(2)) && result[4] == bytes32(uint256(2))) {
             winner = getTurn();
             emit WordleNewGuess(winner, last_guess);
        }


        attempts += 1;
    }

    function getTurn() public view returns (address) {
        return attempts % 2 == 0 ? player1 : player2;
    }
}