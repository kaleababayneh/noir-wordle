import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWordleFactory, type GameInfo } from '../hooks/useWordleFactory';
import { generateCommitmentHashes } from '../utils/contractHelpers';

interface GameLobbyProps {
  onGameSelected: (gameContract: string) => void;
}

export function GameLobby({ onGameSelected }: GameLobbyProps) {
  const { address, isConnected } = useAccount();
  const {
    totalGames,
    activeGames,
    playerGames,
    createNewGame,
    joinGameByContract,
    isCreatingGame,
    isJoiningGame,
  } = useWordleFactory();
  console.log("GameLobby render - isConnected:", isConnected, "address:", createNewGame);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [gameId, setGameId] = useState('');
  const [word, setWord] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Connect Your Wallet</h2>
          <p className="text-yellow-700">Please connect your wallet to create or join Wordle games.</p>
        </div>
      </div>
    );
  }

  const handleCreateGame = async () => {
    if (!word.trim() || !gameId.trim()) {
      alert('Please provide both a game ID and your secret word');
      return;
    }

    if (word.length !== 5) {
      alert('Word must be exactly 5 letters');
      return;
    }

    if (!/^[a-zA-Z]+$/.test(word)) {
      alert('Word must contain only letters');
      return;
    }

    try {
      // Validate word exists in the Merkle tree dictionary
      const { isWordInDictionary } = await import('../utils/merkleProof');
      
      if (!isWordInDictionary(word.toLowerCase())) {
        alert(`❌ "${word.toUpperCase()}" is not in the word dictionary. Please choose a valid English word.`);
        return;
      }

      // First generate commitments without storing (we need the game contract address first)
      const commitmentHashes = await generateCommitmentHashes(word.toLowerCase());
      console.log("Commitment hashes generated:", commitmentHashes);
      
      // Create the game
      await createNewGame(gameId, commitmentHashes);
      
      // Store the word and game info for later secret storage
      // We'll store the secret when the GameCreated event is received
      sessionStorage.setItem('pendingSecret', JSON.stringify({
        word: word.toLowerCase(),
        gameId: gameId
      }));
      
      // Reset form
      setGameId('');
      setWord('');
      setShowCreateForm(false);
      
      alert('Game created successfully! 🎉\nYour secret word has been stored securely.');
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    }
  };

  const handleJoinGame = async (game: GameInfo) => {
    // Basic validations
    if (!isConnected || !address) {
      alert('❌ Please connect your wallet first!');
      return;
    }

    if (!word.trim()) {
      alert('Please enter your secret word');
      return;
    }

    if (word.length !== 5) {
      alert('Word must be exactly 5 letters');
      return;
    }

    if (!/^[a-zA-Z]+$/.test(word)) {
      alert('Word must contain only letters');
      return;
    }

    // Double-check if user is trying to join their own game
    console.log('🔍 Join attempt debug:', {
      userAddress: address,
      gameOwner: game.player1,
      userLower: address?.toLowerCase(),
      ownerLower: game.player1.toLowerCase(),
      isMatch: address && game.player1.toLowerCase() === address.toLowerCase(),
      gameContract: game.gameContract,
      gameId: game.gameId,
      isConnected,
      player2: game.player2
    });
    
    if (game.player1.toLowerCase() === address.toLowerCase()) {
      alert('❌ You cannot join your own game! Share the Game ID with a friend instead.');
      return;
    }

    // Additional validation: Check if game still exists and is joinable
    if (game.player2 && game.player2 !== '0x0000000000000000000000000000000000000000') {
      alert('❌ This game is already full! Please choose another game.');
      return;
    }

    // Validate word exists in the Merkle tree dictionary
    try {
      const { isWordInDictionary } = await import('../utils/merkleProof');
      
      if (!isWordInDictionary(word.toLowerCase())) {
        alert(`❌ "${word.toUpperCase()}" is not in the word dictionary. Please choose a valid English word.`);
        return;
      }
    } catch (error) {
      console.error('Error validating word in dictionary:', error);
      alert('❌ Failed to validate word. Please try again.');
      return;
    }

    try {
      const commitmentHashes = await generateCommitmentHashes(word.toLowerCase(), game.gameContract);
      await joinGameByContract(game.gameContract as `0x${string}`, commitmentHashes);
      
      // Reset form and navigate to game
      setWord('');
      setSelectedGame(null);
      setShowJoinForm(false);
      onGameSelected(game.gameContract);
      
      alert('Joined game successfully! 🎉');
    } catch (error: any) {
      console.error('Error joining game:', error);
      
      // Handle specific error messages
      if (error?.message?.includes('Player 1 already joined')) {
        alert('❌ You cannot join your own game! Create a new game or join a different one.');
      } else if (error?.message?.includes('Game is already full')) {
        alert('❌ This game is already full. Please choose another game.');
      } else if (error?.message?.includes('Game not found')) {
        alert('❌ Game not found. It may have been completed or removed.');
      } else {
        alert('❌ Failed to join game. Please try again or contact support.');
      }
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Wordle Game Lobby 🎮</h1>
        <p className="text-gray-600 mb-4">Create a new game or join an existing one to play ZK Wordle!</p>
        
        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left max-w-4xl mx-auto">
          <div className="flex items-start space-x-3">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div>
              <h3 className="text-yellow-800 font-bold mb-2">Testing Multiplayer Games</h3>
              <p className="text-yellow-700 text-sm mb-2">
                To test the multiplayer functionality, you need <strong>two different wallet accounts</strong>:
              </p>
              <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
                <li>Create a game with Account A</li>
                <li>Switch to Account B in MetaMask</li>
                <li>Join the game created by Account A</li>
                <li><strong>You cannot join your own games!</strong></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalGames?.toString() || '0'}</div>
              <div className="text-blue-700">Total Games</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {playerGames?.filter(game => 
                  game.player2 && game.player2 !== '0x0000000000000000000000000000000000000000'
                ).length || 0}
              </div>
              <div className="text-purple-700">Your Active Games</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {playerGames?.filter(game => 
                  address && game.player1.toLowerCase() === address.toLowerCase() && 
                  (!game.player2 || game.player2 === '0x0000000000000000000000000000000000000000')
                ).length || 0}
              </div>
              <div className="text-blue-700">Your Waiting Games</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {activeGames?.filter(game => 
                  !address || game.player1.toLowerCase() !== address.toLowerCase()
                ).length || 0}
              </div>
              <div className="text-green-700">Games to Join</div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            disabled={isCreatingGame}
          >
            {isCreatingGame ? '⏳ Creating...' : '🎯 Create New Game'}
          </button>
          <button
            onClick={() => setShowJoinForm(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            disabled={isJoiningGame}
          >
            {isJoiningGame ? '⏳ Joining...' : '🤝 Join Game'}
          </button>
        </div>
      </div>

      {/* Create Game Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create New Game</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Game ID (unique identifier)
                </label>
                <input
                  type="text"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="e.g., alice-vs-bob"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Secret Word (5 letters)
                </label>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value.toLowerCase())}
                  placeholder="apple"
                  maxLength={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreateGame}
                  disabled={isCreatingGame}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingGame ? 'Creating...' : 'Create Game'}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Game Form */}
      {showJoinForm && selectedGame && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Join Game: {selectedGame.gameId}</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Created by</div>
                <div className="font-mono">{formatAddress(selectedGame.player1)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Secret Word (5 letters)
                </label>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value.toLowerCase())}
                  placeholder="apple"
                  maxLength={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleJoinGame(selectedGame)}
                  disabled={isJoiningGame}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {isJoiningGame ? 'Joining...' : 'Join Game'}
                </button>
                <button
                  onClick={() => {
                    setShowJoinForm(false);
                    setSelectedGame(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Your Active Games - Games you can play now */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🎮 Your Active Games</h2>
          <div className="space-y-3">
            {(() => {
              const yourActiveGames = playerGames?.filter(game => 
                game.player2 && game.player2 !== '0x0000000000000000000000000000000000000000'
              ) || [];
              
              return yourActiveGames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No active games to play.
                  <br />
                  <span className="text-green-600">Join a game to start playing! 🎯</span>
                </div>
              ) : (
                yourActiveGames.map((game) => (
                  <div key={game.gameContract} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-purple-900">{game.gameId}</h3>
                        <p className="text-sm text-purple-700">
                          {address && game.player1.toLowerCase() === address.toLowerCase() 
                            ? `vs ${formatAddress(game.player2)}` 
                            : `vs ${formatAddress(game.player1)}`}
                        </p>
                      </div>
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                        Ready to Play
                      </span>
                    </div>
                    <div className="text-xs text-purple-600 mb-3">
                      Created: {formatDate(game.createdAt)}
                    </div>
                    <button
                      onClick={() => onGameSelected(game.gameContract)}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    >
                      🎮 Play Game
                    </button>
                  </div>
                ))
              );
            })()}
          </div>
        </div>

        {/* Your Waiting Games - Games you created that need player 2 */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">⏳ Your Waiting Games</h2>
          <div className="space-y-3">
            {(() => {
              const yourWaitingGames = playerGames?.filter(game => 
                address && game.player1.toLowerCase() === address.toLowerCase() && 
                (!game.player2 || game.player2 === '0x0000000000000000000000000000000000000000')
              ) || [];
              
              return yourWaitingGames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No games waiting for players.
                  <br />
                  <span className="text-blue-600">Create one to get started! 🎯</span>
                </div>
              ) : (
                yourWaitingGames.map((game) => (
                  <div key={game.gameContract} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-blue-900">{game.gameId}</h3>
                        <p className="text-sm text-blue-700">Your Game - Waiting for Player 2</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        Waiting for Player 2
                      </span>
                    </div>
                    <div className="text-xs text-blue-600 mb-3">
                      Created: {formatDate(game.createdAt)}
                    </div>
                    <div className="text-center py-2">
                      <p className="text-sm text-blue-700 mb-2">Share this Game ID with a friend:</p>
                      <div className="bg-white border border-blue-300 rounded px-3 py-2 mb-2">
                        <p className="text-sm text-blue-900 font-mono font-bold">{game.gameId}</p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(game.gameId)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        📋 Copy Game ID
                      </button>
                    </div>
                  </div>
                ))
              );
            })()}
          </div>
        </div>

        {/* Games to Join - Games created by others */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🤝 Games to Join</h2>
          <div className="space-y-3">
            {(() => {
              const joinableGames = activeGames?.filter(game => 
                !address || game.player1.toLowerCase() !== address.toLowerCase()
              ) || [];
              
              return joinableGames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {activeGames?.length === 0 
                    ? "No active games found. Create the first one! 🎯"
                    : "No games available to join. All active games are your own! 😄"
                  }
                </div>
              ) : (
                joinableGames.map((game) => (
                  <div key={game.gameContract} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{game.gameId}</h3>
                        <p className="text-sm text-gray-600">by {formatAddress(game.player1)}</p>
                      </div>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        Open
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      Created: {formatDate(game.createdAt)}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedGame(game);
                        setShowJoinForm(true);
                      }}
                      className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      Join Game 🤝
                    </button>
                  </div>
                ))
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}