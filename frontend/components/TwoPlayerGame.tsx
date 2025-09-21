import { useState, useEffect, useCallback } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useReadContract,
} from "wagmi";
import { abi } from "../abi/abi.ts";
import { WORDLE_CONTRACT_ADDRESS, PLAYER_1_ADDRESS, PLAYER_2_ADDRESS } from "../constant.ts";
import { generateProof } from "../utils/generateProof.ts";

// taken from @aztec/bb.js/proof
export function uint8ArrayToHex(buffer: Uint8Array): string {
  const hex: string[] = [];
  buffer.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = "0" + h;
    }
    hex.push(h);
  });
  return hex.join("");
}

interface GameState {
  currentTurn: string;
  turnToVerify: string;
  lastGuess: string;
  guesserAttempts: number;
  verifierAttempts: number;
  winner: string;
  player1: string;
  player2: string;
}

interface GameEvent {
  type: 'guess' | 'result' | 'correct' | 'join';
  player: string;
  guess?: string;
  results?: string[];
  timestamp: Date;
}

interface GuessResult {
  player: string;
  guess: string;
  results: string[];
}

export default function TwoPlayerGame() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // State management
  const [gameState, setGameState] = useState<GameState>({
    currentTurn: "",
    turnToVerify: "",
    lastGuess: "",
    guesserAttempts: 0,
    verifierAttempts: 0,
    winner: "",
    player1: "",
    player2: "",
  });

  const [player1GuessInput, setPlayer1GuessInput] = useState("");
  const [player2GuessInput, setPlayer2GuessInput] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [guessHistory, setGuessHistory] = useState<GuessResult[]>([]);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  // Contract reads for game state (with auto-refresh)
  const { data: currentTurn } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'getTurnToPlay',
    query: { refetchInterval: 1000 }
  });

  const { data: turnToVerify } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'getTurnToVerify',
    query: { refetchInterval: 1000 }
  });

  const { data: lastGuess } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'last_guess',
    query: { refetchInterval: 1000 }
  });

  const { data: guesserAttempts } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'guesser_attempts',
    query: { refetchInterval: 1000 }
  });

  const { data: verifierAttempts } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'verifier_attempts',
    query: { refetchInterval: 1000 }
  });

  const { data: winner } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'winner',
    query: { refetchInterval: 1000 }
  });

  const { data: player1 } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'player1',
    query: { refetchInterval: 1000 }
  });

  const { data: player2 } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'player2',
    query: { refetchInterval: 1000 }
  });

  // Event listeners for real-time updates
  useWatchContractEvent({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    eventName: 'Wordle__NewGuess',
    onLogs(logs) {
      logs.forEach((log) => {
        const { player, guess } = log.args as { player: string; guess: string };
        const event: GameEvent = {
          type: 'guess',
          player,
          guess,
          timestamp: new Date()
        };
        setGameEvents(prev => [...prev, event]);
        addLog(`🎯 ${getPlayerName(player)} made a guess: "${guess}"`);
      });
    },
  });

  useWatchContractEvent({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    eventName: 'Wordle__GuessResult',
    onLogs(logs) {
      logs.forEach((log) => {
        const { player, guess, result } = log.args as { player: string; guess: string; result: string[] };
        const event: GameEvent = {
          type: 'result',
          player,
          guess,
          results: result,
          timestamp: new Date()
        };
        setGameEvents(prev => [...prev, event]);
        setGuessHistory(prev => [...prev, { player, guess, results: result }]);
        addLog(`📊 Verification complete for "${guess}" by ${getPlayerName(player)}`);
      });
    },
  });

  useWatchContractEvent({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    eventName: 'Wordle__CorrectGuess',
    onLogs(logs) {
      logs.forEach((log) => {
        const { player, guess } = log.args as { player: string; guess: string };
        const event: GameEvent = {
          type: 'correct',
          player,
          guess,
          timestamp: new Date()
        };
        setGameEvents(prev => [...prev, event]);
        addLog(`🎉 CORRECT! ${getPlayerName(player)} guessed "${guess}" correctly!`);
      });
    },
  });

  useWatchContractEvent({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    eventName: 'Wordle__Player2Joined',
    onLogs(logs) {
      logs.forEach((log) => {
        const { player2 } = log.args as { player2: string };
        const event: GameEvent = {
          type: 'join',
          player: player2,
          timestamp: new Date()
        };
        setGameEvents(prev => [...prev, event]);
        addLog(`👥 Player 2 joined the game!`);
      });
    },
  });

  // Update game state when contract data changes
  useEffect(() => {
    setGameState({
      currentTurn: currentTurn as string || "",
      turnToVerify: turnToVerify as string || "",
      lastGuess: lastGuess as string || "",
      guesserAttempts: Number(guesserAttempts) || 0,
      verifierAttempts: Number(verifierAttempts) || 0,
      winner: winner as string || "",
      player1: player1 as string || "",
      player2: player2 as string || "",
    });
  }, [currentTurn, turnToVerify, lastGuess, guesserAttempts, verifierAttempts, winner, player1, player2]);

  // Utility functions
  const addLog = useCallback((message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const getPlayerName = (address: string) => {
    if (address.toLowerCase() === PLAYER_1_ADDRESS.toLowerCase()) return "Player 1";
    if (address.toLowerCase() === PLAYER_2_ADDRESS.toLowerCase()) return "Player 2";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const showLog = (message: string) => {
    addLog(message);
  };

  // Game actions
  const handlePlayer1Guess = async () => {
    if (!player1GuessInput || player1GuessInput.length !== 5) {
      addLog("❌ Please enter exactly 5 letters");
      return;
    }

    if (!/^[a-z]+$/i.test(player1GuessInput)) {
      addLog("❌ Please enter only letters");
      return;
    }

    try {
      addLog(`Player 1 making guess: "${player1GuessInput.toUpperCase()}" 🎯`);
      
      writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: 'guess',
        args: [PLAYER_1_ADDRESS, player1GuessInput.toLowerCase()],
      });

      setPlayer1GuessInput("");
    } catch (error) {
      addLog(`❌ Error making guess: ${error}`);
    }
  };

  const handlePlayer2Guess = async () => {
    if (!player2GuessInput || player2GuessInput.length !== 5) {
      addLog("❌ Please enter exactly 5 letters");
      return;
    }

    if (!/^[a-z]+$/i.test(player2GuessInput)) {
      addLog("❌ Please enter only letters");
      return;
    }

    try {
      addLog(`Player 2 making guess: "${player2GuessInput.toUpperCase()}" 🎯`);
      
      writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: 'guess',
        args: [PLAYER_2_ADDRESS, player2GuessInput.toLowerCase()],
      });

      setPlayer2GuessInput("");
    } catch (error) {
      addLog(`❌ Error making guess: ${error}`);
    }
  };

  const handlePlayer1Verify = async () => {
    if (!gameState.lastGuess) {
      addLog("❌ No guess to verify");
      return;
    }

    try {
      setIsGeneratingProof(true);
      addLog("🔐 Player 1 generating ZK proof for verification...");

      const { proof, publicInputs } = await generateProof(showLog, gameState.lastGuess);
      
      // Extract only the results (positions 10-14) from publicInputs
      const results = publicInputs.slice(10, 15) as `0x${string}`[];
      
      addLog("✅ ZK proof generated successfully!");
      addLog("📤 Submitting verification to contract...");
      addLog(`🔍 Results being submitted: ${results}`);

      writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: 'verify_guess',
        args: [`0x${uint8ArrayToHex(proof)}`, results, PLAYER_1_ADDRESS],
      });

    } catch (error) {
      addLog(`❌ Error during verification: ${error}`);
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const handlePlayer2Verify = async () => {
    if (!gameState.lastGuess) {
      addLog("❌ No guess to verify");
      return;
    }

    try {
      setIsGeneratingProof(true);
      addLog("🔐 Player 2 generating ZK proof for verification...");

      const { proof, publicInputs } = await generateProof(showLog, gameState.lastGuess);
      
      // Extract only the results (positions 10-14) from publicInputs
      const results = publicInputs.slice(10, 15) as `0x${string}`[];
      
      addLog("✅ ZK proof generated successfully!");
      addLog("📤 Submitting verification to contract...");
      addLog(`🔍 Results being submitted: ${results}`);

      writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: 'verify_guess',
        args: [`0x${uint8ArrayToHex(proof)}`, results, PLAYER_2_ADDRESS],
      });

    } catch (error) {
      addLog(`❌ Error during verification: ${error}`);
    } finally {
      setIsGeneratingProof(false);
    }
  };

  // Game status helpers
  const isPlayer1Turn = gameState.currentTurn.toLowerCase() === PLAYER_1_ADDRESS.toLowerCase();
  const isPlayer2Turn = gameState.currentTurn.toLowerCase() === PLAYER_2_ADDRESS.toLowerCase();
  const shouldPlayer1Verify = gameState.turnToVerify.toLowerCase() === PLAYER_1_ADDRESS.toLowerCase();
  const shouldPlayer2Verify = gameState.turnToVerify.toLowerCase() === PLAYER_2_ADDRESS.toLowerCase();
  const gameStarted = gameState.player1 !== "" && gameState.player2 !== "";
  const gameEnded = gameState.winner !== "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎯 Two-Player ZK Wordle</h1>
          <p className="text-lg text-gray-600">Turn-based word guessing with Zero-Knowledge proofs</p>
        </div>

        {/* Game Status */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="bg-blue-100 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{gameState.guesserAttempts}</div>
              <div className="text-sm text-gray-600">Guesses</div>
            </div>
            <div className="bg-indigo-100 rounded-lg p-4">
              <div className="text-2xl font-bold text-indigo-600">{gameState.verifierAttempts}</div>
              <div className="text-sm text-gray-600">Verifications</div>
            </div>
            <div className="bg-green-100 rounded-lg p-4">
              <div className="text-sm font-medium text-green-600">
                {gameEnded ? "Game Over" : gameStarted ? "In Progress" : "Waiting"}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
            <div className="bg-purple-100 rounded-lg p-4">
              <div className="text-sm font-medium text-purple-600">
                {gameState.lastGuess || "None"}
              </div>
              <div className="text-sm text-gray-600">Last Guess</div>
            </div>
            <div className="bg-yellow-100 rounded-lg p-4">
              <div className="text-sm font-medium text-yellow-600">
                {gameEnded ? getPlayerName(gameState.winner) : getPlayerName(gameState.currentTurn) || "None"}
              </div>
              <div className="text-sm text-gray-600">{gameEnded ? "Winner" : "Current Turn"}</div>
            </div>
          </div>
        </div>

        {/* Split Game Interface */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Player 1 Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-blue-600">👤 Player 1</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isPlayer1Turn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {isPlayer1Turn ? '🎯 Your Turn' : '⏳ Waiting'}
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Player 1 Guess Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Make Your Guess (5 letters)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={player1GuessInput}
                    onChange={(e) => setPlayer1GuessInput(e.target.value.toLowerCase())}
                    placeholder="Enter your guess..."
                    maxLength={5}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!isPlayer1Turn || isPending || isConfirming}
                  />
                  <button
                    onClick={handlePlayer1Guess}
                    disabled={!isPlayer1Turn || isPending || isConfirming || player1GuessInput.length !== 5}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isPending || isConfirming ? "..." : "Guess"}
                  </button>
                </div>
              </div>

              {/* Player 1 Verify Button */}
              <div>
                <button
                  onClick={handlePlayer1Verify}
                  disabled={!shouldPlayer1Verify || isGeneratingProof || isPending || isConfirming}
                  className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  <span>🔐</span>
                  <span>
                    {isGeneratingProof ? "Generating Proof..." : "Verify Player 2's Guess"}
                  </span>
                </button>
                {shouldPlayer1Verify && (
                  <p className="text-sm text-purple-600 mt-1">
                    It's your turn to verify Player 2's guess: "{gameState.lastGuess}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Player 2 Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-green-600">👤 Player 2</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                isPlayer2Turn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {isPlayer2Turn ? '🎯 Your Turn' : '⏳ Waiting'}
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Player 2 Guess Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Make Your Guess (5 letters)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={player2GuessInput}
                    onChange={(e) => setPlayer2GuessInput(e.target.value.toLowerCase())}
                    placeholder="Enter your guess..."
                    maxLength={5}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={!isPlayer2Turn || isPending || isConfirming}
                  />
                  <button
                    onClick={handlePlayer2Guess}
                    disabled={!isPlayer2Turn || isPending || isConfirming || player2GuessInput.length !== 5}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isPending || isConfirming ? "..." : "Guess"}
                  </button>
                </div>
              </div>

              {/* Player 2 Verify Button */}
              <div>
                <button
                  onClick={handlePlayer2Verify}
                  disabled={!shouldPlayer2Verify || isGeneratingProof || isPending || isConfirming}
                  className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  <span>🔐</span>
                  <span>
                    {isGeneratingProof ? "Generating Proof..." : "Verify Player 1's Guess"}
                  </span>
                </button>
                {shouldPlayer2Verify && (
                  <p className="text-sm text-purple-600 mt-1">
                    It's your turn to verify Player 1's guess: "{gameState.lastGuess}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Game History and Events */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Guess History */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Guess History</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {guessHistory.length === 0 ? (
                <p className="text-gray-500 italic">No guesses yet...</p>
              ) : (
                guessHistory.map((guess, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-800">
                        {getPlayerName(guess.player)}
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        {guess.guess.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {guess.results.map((result, i) => (
                        <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${
                          result === '0x0000000000000000000000000000000000000000000000000000000000000002' ? 'bg-green-500' :
                          result === '0x0000000000000000000000000000000000000000000000000000000000000001' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`}>
                          {guess.guess[i].toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📝 Activity Log</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 italic">No activity yet...</p>
              ) : (
                logs.slice(-10).reverse().map((log, index) => (
                  <div key={index} className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        {(isPending || isConfirming) && (
          <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>{isPending ? "Confirming transaction..." : "Waiting for confirmation..."}</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="fixed bottom-4 left-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg max-w-md">
            <p className="text-sm">❌ {error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
