// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { Wordle } from "./Wordle.sol";
import { IVerifier } from "./Verifier.sol";
import { Poseidon2 } from "../lib/poseidon2-evm/src/Poseidon2.sol";

contract WordleGameFactory {
    
    struct GameInfo {
        address gameContract;
        address player1;
        address player2;
        bool isActive;
        uint256 createdAt;
        string gameId; // Human-readable game ID
    }
    
    // Immutable verifier contract address
    IVerifier public immutable i_verifier;
    Poseidon2 public immutable i_hasher;
    
    // Array of all games
    GameInfo[] public games;
    
    // Mapping from game contract address to game info
    mapping(address => GameInfo) public gameByContract;
    
    // Mapping from player address to their game contracts
    mapping(address => address[]) public playerGames;
    
    // Mapping from gameId to contract address  
    mapping(string => address) public gameIdToContract;
    
    // Counter for generating unique game IDs
    uint256 private gameCounter;
    
    // Events
    event GameCreated(
        address indexed gameContract,
        address indexed creator,
        string gameId,
        uint256 gameIndex
    );
    
    event PlayerJoinedGame(
        address indexed gameContract,
        address indexed player,
        string gameId
    );
    
    error WordleFactory__GameNotFound();
    error WordleFactory__GameAlreadyFull();
    error WordleFactory__PlayerAlreadyInGame();
    error WordleFactory__InvalidCommitmentHashes();
    error WordleFactory__GameIdAlreadyExists();
    
    constructor(IVerifier _verifier, Poseidon2 _hasher) {
        require(address(_verifier) != address(0), "Invalid verifier address");
        require(address(_hasher) != address(0), "Invalid hasher address");
        i_verifier = _verifier;
        i_hasher = _hasher;
    }
    
    /**
     * @dev Creates a new empty Wordle game 
     * @param _gameId Human-readable game identifier (e.g., "alice-vs-bob")
     * @return gameContract Address of the newly created game contract
     */
    function createGame(
        string memory _gameId,
        bytes32[] memory _wordCommitmentHashes
    ) external returns (address gameContract) {
        require(bytes(_gameId).length > 0, "Game ID cannot be empty");
        require(gameIdToContract[_gameId] == address(0), "Game ID already exists");
        require(_wordCommitmentHashes.length == 5, "Need exactly 5 commitment hashes");
        
        // Deploy new empty Wordle game contract
        gameContract = address(new Wordle(i_verifier, i_hasher));
        
        // Creator joins as player1
        Wordle(gameContract).joinGame(msg.sender, _wordCommitmentHashes);
        
        // Create game info with creator as player1
        GameInfo memory newGame = GameInfo({
            gameContract: gameContract,
            player1: msg.sender,
            player2: address(0),
            isActive: true,
            createdAt: block.timestamp,
            gameId: _gameId
        });
        
        // Store game info
        games.push(newGame);
        gameByContract[gameContract] = newGame;
        gameIdToContract[_gameId] = gameContract;
        playerGames[msg.sender].push(gameContract);
        
        gameCounter++;
        
        // Game created with creator as player1
        emit GameCreated(gameContract, msg.sender, _gameId, games.length - 1);
        
        return gameContract;
    }
    
    /**
     * @dev Join an existing game by contract address
     * @param _gameContract Address of the game contract to join
     * @param _wordCommitmentHashes Array of 5 commitment hashes for the joiner's word
     */
    function joinGameByContract(
        address _gameContract,
        bytes32[] memory _wordCommitmentHashes
    ) external {
        _joinGame(_gameContract, _wordCommitmentHashes);
    }
    
    /**
     * @dev Join an existing game by game ID
     * @param _gameId Human-readable game identifier
     * @param _wordCommitmentHashes Array of 5 commitment hashes for the joiner's word
     */
    function joinGameById(
        string memory _gameId,
        bytes32[] memory _wordCommitmentHashes
    ) external {
        address gameContract = gameIdToContract[_gameId];
        require(gameContract != address(0), "Game ID not found");
        
        _joinGame(gameContract, _wordCommitmentHashes);
    }
    
    /**
     * @dev Internal function to join a game
     * @param _gameContract Address of the game contract to join
     * @param _wordCommitmentHashes Array of 5 commitment hashes for the joiner's word
     */
    function _joinGame(
        address _gameContract,
        bytes32[] memory _wordCommitmentHashes
    ) internal {
        require(_wordCommitmentHashes.length == 5, "Need exactly 5 commitment hashes");
        
        GameInfo storage gameInfo = gameByContract[_gameContract];
        require(gameInfo.gameContract != address(0), "Game not found");
        require(gameInfo.player2 == address(0), "Game is already full");
        
        // Join the game through the Wordle contract
        Wordle(_gameContract).joinGame(msg.sender, _wordCommitmentHashes);
        
        // Update game info based on which player slot was filled
        Wordle wordleContract = Wordle(_gameContract);
        address player1 = wordleContract.player1();
        address player2 = wordleContract.player2();
        
        gameInfo.player1 = player1;
        gameInfo.player2 = player2;
        
        // Update games array
        for (uint i = 0; i < games.length; i++) {
            if (games[i].gameContract == _gameContract) {
                games[i].player1 = player1;
                games[i].player2 = player2;
                break;
            }
        }
        
        playerGames[msg.sender].push(_gameContract);
        
        emit PlayerJoinedGame(_gameContract, msg.sender, gameInfo.gameId);
    }
    
    /**
     * @dev Get all games created by or involving a specific player
     * @param _player Address of the player
     * @return playerGameContracts Array of game contract addresses
     */
    function getPlayerGames(address _player) external view returns (address[] memory) {
        return playerGames[_player];
    }
    
    /**
     * @dev Get detailed information about all games for a player
     * @param _player Address of the player
     * @return gameInfos Array of GameInfo structs
     */
    function getPlayerGameDetails(address _player) external view returns (GameInfo[] memory gameInfos) {
        address[] memory playerGameAddresses = playerGames[_player];
        gameInfos = new GameInfo[](playerGameAddresses.length);
        
        for (uint i = 0; i < playerGameAddresses.length; i++) {
            gameInfos[i] = gameByContract[playerGameAddresses[i]];
        }
        
        return gameInfos;
    }
    
    /**
     * @dev Get all active games (waiting for player 2)
     * @return activeGames Array of GameInfo structs for games needing a player 2
     */
    function getActiveGames() external view returns (GameInfo[] memory activeGames) {
        // First, count active games
        uint activeCount = 0;
        for (uint i = 0; i < games.length; i++) {
            if (games[i].isActive && games[i].player2 == address(0)) {
                activeCount++;
            }
        }
        
        // Create array of active games
        activeGames = new GameInfo[](activeCount);
        uint currentIndex = 0;
        
        for (uint i = 0; i < games.length; i++) {
            if (games[i].isActive && games[i].player2 == address(0)) {
                activeGames[currentIndex] = games[i];
                currentIndex++;
            }
        }
        
        return activeGames;
    }
    
    /**
     * @dev Get total number of games created
     * @return Total number of games
     */
    function getTotalGames() external view returns (uint256) {
        return games.length;
    }
    
    /**
     * @dev Get game info by contract address
     * @param _gameContract Address of the game contract
     * @return GameInfo struct
     */
    function getGameInfo(address _gameContract) external view returns (GameInfo memory) {
        require(gameByContract[_gameContract].gameContract != address(0), "Game not found");
        return gameByContract[_gameContract];
    }
    
    /**
     * @dev Get game contract address by game ID
     * @param _gameId Human-readable game identifier
     * @return gameContract Address of the game contract
     */
    function getGameContract(string memory _gameId) external view returns (address) {
        return gameIdToContract[_gameId];
    }
    
    /**
     * @dev Check if a game ID is available
     * @param _gameId Human-readable game identifier to check
     * @return available True if the game ID is available
     */
    function isGameIdAvailable(string memory _gameId) external view returns (bool available) {
        return gameIdToContract[_gameId] == address(0);
    }


}