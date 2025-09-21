export const abi = [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_i_verifier",
                    "type": "address",
                    "internalType": "contract IVerifier"
                },
                {
                    "name": "_word_commitment_hash1",
                    "type": "bytes32[]",
                    "internalType": "bytes32[]"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "getTurnToPlay",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getTurnToVerify",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "guess",
            "inputs": [
                {
                    "name": "guess_word",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "guesser_attempts",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint32",
                    "internalType": "uint32"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "i_verifier",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract IVerifier"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "joinGame",
            "inputs": [
                {
                    "name": "_word_commitment_hash1",
                    "type": "bytes32[]",
                    "internalType": "bytes32[]"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "last_guess",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "player1",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "player2",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "verifier_attempts",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint32",
                    "internalType": "uint32"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "verify_guess",
            "inputs": [
                {
                    "name": "_proof",
                    "type": "bytes",
                    "internalType": "bytes"
                },
                {
                    "name": "result",
                    "type": "bytes32[]",
                    "internalType": "bytes32[]"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "winner",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "word_commitment_hash1",
            "inputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "word_commitment_hash2",
            "inputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "bytes32",
                    "internalType": "bytes32"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "event",
            "name": "Wordle__CorrectGuess",
            "inputs": [
                {
                    "name": "player",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "guess",
                    "type": "string",
                    "indexed": true,
                    "internalType": "string"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Wordle__GuessResult",
            "inputs": [
                {
                    "name": "player",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "guess",
                    "type": "string",
                    "indexed": true,
                    "internalType": "string"
                },
                {
                    "name": "result",
                    "type": "bytes32[]",
                    "indexed": false,
                    "internalType": "bytes32[]"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Wordle__NewGuess",
            "inputs": [
                {
                    "name": "player",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "guess",
                    "type": "string",
                    "indexed": true,
                    "internalType": "string"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Wordle__Player1Joined",
            "inputs": [
                {
                    "name": "player1",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "Wordle__Player2Joined",
            "inputs": [
                {
                    "name": "player2",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "Wordle__InvalidProof",
            "inputs": []
        }
    ] as const;