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

    function guess( address player, string memory guess_word) public onlyIfGameNotOver {
        address whose_turn = getTurn();
        require(player == whose_turn, "Not your turn");
        bytes memory wordBytes = bytes(guess_word);
        require(wordBytes.length == 5, "Word must be 5 letters");
        last_guess = guess_word;
    }

    function verify_guess(bytes memory _proof, bytes memory result, address player, string memory guess_word) public  onlyIfGameNotOver {
        address whose_turn = getTurn();
        require(player == whose_turn, "Not your turn");
        
        bytes32[] memory publicInputs =  new bytes32[](11);

        publicInputs[0] = bytes32(uint256(uint8(bytes(guess_word)[0])));
        publicInputs[1] = bytes32(uint256(uint8(bytes(guess_word)[1])));
        publicInputs[2] = bytes32(uint256(uint8(bytes(guess_word)[2])));
        publicInputs[3] = bytes32(uint256(uint8(bytes(guess_word)[3])));
        publicInputs[4] = bytes32(uint256(uint8(bytes(guess_word)[4])));
        publicInputs[5] = word_commitment_hash1[0];
        publicInputs[6] = word_commitment_hash1[1];
        publicInputs[7] = word_commitment_hash1[2];
        publicInputs[8] = word_commitment_hash1[3];
        publicInputs[9] = word_commitment_hash1[4];
        publicInputs[10] = bytes32(uint256(uint8(result[0])) + (uint256(uint8(result[1])) << 8) + (uint256(uint8(result[2])) << 16) + (uint256(uint8(result[3])) << 24) + (uint256(uint8(result[4])) << 32));


        i_verifier.verify(
            _proof, 
            publicInputs
        );

        if (i_verifier.verify(_proof, publicInputs) == false) {
            revert Wordle__InvalidProof();
        }

        // if (result[0] == 2 && result[1] == 2 && result[2] == 2 && result[3] == 2 && result[4] == 2) {
        //     winner = player;
        // }

        attempts += 1;
    }

    function getTurn() public view returns (address) {
        return attempts % 2 == 0 ? player1 : player2;
    }

 

}