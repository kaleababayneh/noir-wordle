export const abi = [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_verifier",
                    "type": "address",
                    "internalType": "contract IVerifier"
                },
                {
                    "name": "_hasher",
                    "type": "address",
                    "internalType": "contract Poseidon2"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "createGame",
            "inputs": [
                {
                    "name": "_gameId",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "_wordCommitmentHashes",
                    "type": "bytes32[]",
                    "internalType": "bytes32[]"
                }
            ],
            "outputs": [
                {
                    "name": "gameContract",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "gameByContract",
            "inputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "gameContract",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "player1",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "player2",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "isActive",
                    "type": "bool",
                    "internalType": "bool"
                },
                {
                    "name": "createdAt",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "gameId",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "gameIdToContract",
            "inputs": [
                {
                    "name": "",
                    "type": "string",
                    "internalType": "string"
                }
            ],
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
            "name": "games",
            "inputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "outputs": [
                {
                    "name": "gameContract",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "player1",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "player2",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "isActive",
                    "type": "bool",
                    "internalType": "bool"
                },
                {
                    "name": "createdAt",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                {
                    "name": "gameId",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getActiveGames",
            "inputs": [],
            "outputs": [
                {
                    "name": "activeGames",
                    "type": "tuple[]",
                    "internalType": "struct WordleGameFactory.GameInfo[]",
                    "components": [
                        {
                            "name": "gameContract",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "player1",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "player2",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "isActive",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "createdAt",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "gameId",
                            "type": "string",
                            "internalType": "string"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getGameContract",
            "inputs": [
                {
                    "name": "_gameId",
                    "type": "string",
                    "internalType": "string"
                }
            ],
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
            "name": "getGameInfo",
            "inputs": [
                {
                    "name": "_gameContract",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "tuple",
                    "internalType": "struct WordleGameFactory.GameInfo",
                    "components": [
                        {
                            "name": "gameContract",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "player1",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "player2",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "isActive",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "createdAt",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "gameId",
                            "type": "string",
                            "internalType": "string"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getPlayerGameDetails",
            "inputs": [
                {
                    "name": "_player",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "gameInfos",
                    "type": "tuple[]",
                    "internalType": "struct WordleGameFactory.GameInfo[]",
                    "components": [
                        {
                            "name": "gameContract",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "player1",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "player2",
                            "type": "address",
                            "internalType": "address"
                        },
                        {
                            "name": "isActive",
                            "type": "bool",
                            "internalType": "bool"
                        },
                        {
                            "name": "createdAt",
                            "type": "uint256",
                            "internalType": "uint256"
                        },
                        {
                            "name": "gameId",
                            "type": "string",
                            "internalType": "string"
                        }
                    ]
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getPlayerGames",
            "inputs": [
                {
                    "name": "_player",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [
                {
                    "name": "",
                    "type": "address[]",
                    "internalType": "address[]"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "getTotalGames",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "i_hasher",
            "inputs": [],
            "outputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "contract Poseidon2"
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
            "name": "isGameIdAvailable",
            "inputs": [
                {
                    "name": "_gameId",
                    "type": "string",
                    "internalType": "string"
                }
            ],
            "outputs": [
                {
                    "name": "available",
                    "type": "bool",
                    "internalType": "bool"
                }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "joinGameByContract",
            "inputs": [
                {
                    "name": "_gameContract",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "_wordCommitmentHashes",
                    "type": "bytes32[]",
                    "internalType": "bytes32[]"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "joinGameById",
            "inputs": [
                {
                    "name": "_gameId",
                    "type": "string",
                    "internalType": "string"
                },
                {
                    "name": "_wordCommitmentHashes",
                    "type": "bytes32[]",
                    "internalType": "bytes32[]"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "playerGames",
            "inputs": [
                {
                    "name": "",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "",
                    "type": "uint256",
                    "internalType": "uint256"
                }
            ],
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
            "type": "event",
            "name": "GameCreated",
            "inputs": [
                {
                    "name": "gameContract",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "creator",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "gameId",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                },
                {
                    "name": "gameIndex",
                    "type": "uint256",
                    "indexed": false,
                    "internalType": "uint256"
                }
            ],
            "anonymous": false
        },
        {
            "type": "event",
            "name": "PlayerJoinedGame",
            "inputs": [
                {
                    "name": "gameContract",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "player",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "gameId",
                    "type": "string",
                    "indexed": false,
                    "internalType": "string"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "WordleFactory__GameAlreadyFull",
            "inputs": []
        },
        {
            "type": "error",
            "name": "WordleFactory__GameIdAlreadyExists",
            "inputs": []
        },
        {
            "type": "error",
            "name": "WordleFactory__GameNotFound",
            "inputs": []
        },
        {
            "type": "error",
            "name": "WordleFactory__InvalidCommitmentHashes",
            "inputs": []
        },
        {
            "type": "error",
            "name": "WordleFactory__PlayerAlreadyInGame",
            "inputs": []
        }
    ] as const;