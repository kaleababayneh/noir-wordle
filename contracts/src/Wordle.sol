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

    uint32 public guesser_attempts = 0;
    uint32 public verifier_attempts = 0;

    event Wordle__Player1Joined(address indexed player1);
    event Wordle__Player2Joined(address indexed player2);

    event Wordle__NewGuess(address indexed player, string guess);
    event Wordle__CorrectGuess(address indexed player, string guess);
    event Wordle__GuessResult(address indexed player, string guess, bytes32[] result);

    error Wordle__InvalidProof();

    modifier onlyIfGameNotOver() {
        require(winner == address(0), "Game is over");
        _;
    }

    modifier onlyIfGameHasnotStarted() {
        require(player1 == address(0) || player2 == address(0), "Game already started");
        _;
    }

    constructor(IVerifier _i_verifier, bytes32[] memory _word_commitment_hash1) {
        require(address(_i_verifier) != address(0), "Invalid verifier address");
        require(_word_commitment_hash1.length == 5, "need 5 hashes");
        require(msg.sender != address(0), "Invalid player");
        
        // Validate commitment hashes are not zero
        for (uint i = 0; i < 5; i++) {
            require(_word_commitment_hash1[i] != bytes32(0), "Invalid commitment hash");
            word_commitment_hash1[i] = _word_commitment_hash1[i];
        }
        
        i_verifier = _i_verifier;
        player1 = msg.sender;
        emit Wordle__Player1Joined(msg.sender);
    }


    function joinGame(bytes32[] memory _word_commitment_hash1) public onlyIfGameHasnotStarted{
        require(msg.sender != address(0), "Invalid player");
        require(msg.sender != player1, "Player 1 already joined");
        require(_word_commitment_hash1.length == 5, "need 5 hashes");

        // Validate commitment hashes are not zero
        for (uint i = 0; i < 5; i++) {
            require(_word_commitment_hash1[i] != bytes32(0), "Invalid commitment hash");
            word_commitment_hash2[i] = _word_commitment_hash1[i];
        }
        
        player2 = msg.sender;
        emit Wordle__Player2Joined(msg.sender);
    }

    function guess(string memory guess_word) public onlyIfGameNotOver {
        require(player2 != address(0), "Player 2 not joined yet");
        address whose_turn = getTurnToPlay();
        require(msg.sender == whose_turn, "Not your turn");
        require(guesser_attempts == verifier_attempts, "Wait for verification");

        // Enhanced input validation
        bytes memory guess_bytes = bytes(guess_word);
        require(guess_bytes.length == 5, "Invalid guess length");
        
        // Validate each character is a lowercase letter
        for (uint i = 0; i < 5; i++) {
            require(guess_bytes[i] >= 0x61 && guess_bytes[i] <= 0x7A, "Only lowercase letters allowed");
        }
        
        last_guess = guess_word;
        guesser_attempts += 1;
        emit Wordle__NewGuess(msg.sender, guess_word);
    }

    function verify_guess(bytes memory _proof, bytes32[] memory result) public  onlyIfGameNotOver {
        address whose_turn_to_verify = getTurnToVerify();
        address whose_turn_to_play = getTurnToPlay();
        require(msg.sender == whose_turn_to_verify, "Not your turn to verify");
        require(guesser_attempts - verifier_attempts == 1, "No guess to verify");
        
        // Validate result array
        require(result.length == 5, "Result must have exactly 5 elements");
        
        // Validate each result is 0, 1, or 2
        for (uint i = 0; i < 5; i++) {
            uint256 val = uint256(result[i]);
            require(val <= 2, "Invalid result value");
        }
        
        // Ensure last_guess is not empty (safety check)
        require(bytes(last_guess).length == 5, "Invalid last guess state");

        bytes32[] memory publicInputs =  new bytes32[](15);


        if (whose_turn_to_verify == player1) {
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

       publicInputs[5] = bytes32(uint256(uint8(bytes(last_guess)[0])));
       publicInputs[6] = bytes32(uint256(uint8(bytes(last_guess)[1])));
       publicInputs[7] = bytes32(uint256(uint8(bytes(last_guess)[2])));
       publicInputs[8] = bytes32(uint256(uint8(bytes(last_guess)[3])));
       publicInputs[9] = bytes32(uint256(uint8(bytes(last_guess)[4])));

        publicInputs[10] = result[0];
        publicInputs[11] = result[1];
        publicInputs[12] = result[2];
        publicInputs[13] = result[3];
        publicInputs[14] = result[4];

        if (i_verifier.verify(_proof, publicInputs) == false) {
            revert Wordle__InvalidProof();
        }


        if (result[0] == bytes32(uint256(2)) && result[1] == bytes32(uint256(2)) && result[2] == bytes32(uint256(2)) && result[3] == bytes32(uint256(2)) && result[4] == bytes32(uint256(2))) {
             winner = getTurnToPlay();
             emit Wordle__CorrectGuess(winner, last_guess);
        }

        emit Wordle__GuessResult(whose_turn_to_play, last_guess, result);
        verifier_attempts += 1;
    }

    function getTurnToPlay() public view returns (address) {
        return guesser_attempts % 2 == 0 ? player1 : player2;
    }

    function getTurnToVerify() public view returns (address) {
        return verifier_attempts % 2 == 0 ? player2 : player1;
    }
}