// SPDX-License-Identifier: UNLICE

pragma solidity ^0.8.24;

contract Wordle {

    bytes32[5] public word_hash1;
    bytes32[5] public word_hash2;

   
    mapping (address => bytes32) public salt_commitment;

    address public player1;
    address public player2;
    uint32 public attempts;

    bool public player1_won;
    bool public player2_won;


    constructor(address _player1, address _player2, string memory _word_hash1, string memory _word_hash2) {
        word_hash1 = _word_hash1;
        word_hash2 = _word_hash2;
        player1 = _player1;
        player2 = _player2;
    }


    function guess(address player, string memory guess_word) public {
        address whose_turn = getTurn();
        require(player == whose_turn, "Not your turn");

        bytes32 commitment = salt_commitment[player];

        bytes memory wordBytes = bytes(guess_word);
        require(wordBytes.length == 5, "Word must be 5 letters");
        
        // Process each letter for Wordle logic
        for (uint i = 0; i < wordBytes.length; i++) {
            bytes1 currentLetter = wordBytes[i];
            
            if (currentLetter >= 0x41 && currentLetter <= 0x5A) {
                currentLetter = bytes1(uint8(currentLetter) + 32);
            }
            
            // Here you can implement Wordle logic:
            // - Check if letter is in correct position
            // - Check if letter exists in target word
            // - Track letter colors (green/yellow/gray)
        }

        attempts += 1;
    }


    function getTurn() public view returns (address) {
        return attempts % 2 == 0 ? player1 : player2;
    }

}