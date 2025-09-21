import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useReadContract,
} from "wagmi";
import { abi } from "../abi/abi.ts";
import { WORDLE_CONTRACT_ADDRESS } from "../constant.ts";
import { generateProof, fetchWordCommitmentHashes } from "../utils/generateProof.ts";

// Player addresses derived from private keys
const PLAYER_1_ADDRESS = "0x532581141fA3a833090F95eBB76aCEa8Eaf9dD7d";
const PLAYER_2_ADDRESS = "0x0b4A86d53A47f643427f041DCA2E212E615d65E7";

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

interface GuessResult {
  player: string;
  guess: string;
  results: number[];
  timestamp: string;
}

export default function TwoPlayerGameSplit() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  
  // Input states for both players
  const [player1GuessInput, setPlayer1GuessInput] = useState("");
  const [player2GuessInput, setPlayer2GuessInput] = useState("");
  
  // Game state
  const [logs, setLogs] = useState<string[]>([]);
  const [guessHistory, setGuessHistory] = useState<GuessResult[]>([]);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  // Read game state from contract
  const { data: currentTurn, refetch: refetchCurrentTurn } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'getTurnToPlay',
  });

  const { data: turnToVerify, refetch: refetchTurnToVerify } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'getTurnToVerify',
  });

  const { data: lastGuess, refetch: refetchLastGuess } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'last_guess',
  });

  const { data: attempts, refetch: refetchAttempts } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'attempts',
  });

  const { data: winner, refetch: refetchWinner } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'winner',
  });

  const { data: player1, refetch: refetchPlayer1 } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'player1',
  });

  const { data: player2, refetch: refetchPlayer2 } = useReadContract({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    functionName: 'player2',
  });

  // Function to refetch all contract data
  const refreshGameState = async () => {
    showLog("🔄 Refreshing game state...");
    await Promise.all([
      refetchCurrentTurn(),
      refetchTurnToVerify(),
      refetchLastGuess(),
      refetchAttempts(),
      refetchWinner(),
      refetchPlayer1(),
      refetchPlayer2(),
    ]);
  };

  // Watch for contract events
  useWatchContractEvent({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    eventName: 'WordleNewGuess',
    onLogs(logs) {
      logs.forEach((log) => {
        showLog(`🎯 New guess submitted!`);
        refreshGameState();
      });
    },
  });

  useWatchContractEvent({
    address: WORDLE_CONTRACT_ADDRESS,
    abi: abi,
    eventName: 'WordleGuessResult',
    onLogs(logs) {
      logs.forEach((log) => {
        showLog(`📊 Guess verified!`);
        refreshGameState();
      });
    },
  });

  // Load game state on component mount
  useEffect(() => {
    refreshGameState();
  }, []);

  // Clear input after successful transaction
  useEffect(() => {
    if (isConfirmed) {
      setPlayer1GuessInput("");
      setPlayer2GuessInput("");
      refreshGameState();
    }
  }, [isConfirmed]);

  const showLog = (content: string): void => {
    setLogs((prevLogs) => [...prevLogs, `[${new Date().toLocaleTimeString()}] ${content}`]);
  };

  const formatGuessResult = (results: number[]): string => {
    return results.map(r => {
      if (r === 2) return '🟩'; // Correct position
      if (r === 1) return '🟨'; // Wrong position
      return '⬜'; // Not in word
    }).join('');
  };

  // Player 1 makes a guess
  const handlePlayer1Guess = async () => {
    if (currentTurn !== PLAYER_1_ADDRESS) {
      showLog("❌ It's not Player 1's turn!");
      return;
    }

    if (!player1GuessInput || player1GuessInput.length !== 5) {
      showLog("❌ Player 1: Please enter exactly 5 letters");
      return;
    }

    if (!/^[a-z]+$/i.test(player1GuessInput)) {
      showLog("❌ Player 1: Please enter only letters (a-z)");
      return;
    }

    try {
      showLog(`🎯 Player 1 making guess: "${player1GuessInput.toUpperCase()}"`);

      await writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: "guess",
        args: [
          PLAYER_1_ADDRESS,
          player1GuessInput.toLowerCase()
        ],
      });
    } catch (error: unknown) {
      console.error(error);
      showLog("❌ Player 1: Error occurred during guess submission");
    }
  };

  // Player 2 makes a guess
  const handlePlayer2Guess = async () => {
    if (currentTurn !== PLAYER_2_ADDRESS) {
      showLog("❌ It's not Player 2's turn!");
      return;
    }

    if (!player2GuessInput || player2GuessInput.length !== 5) {
      showLog("❌ Player 2: Please enter exactly 5 letters");
      return;
    }

    if (!/^[a-z]+$/i.test(player2GuessInput)) {
      showLog("❌ Player 2: Please enter only letters (a-z)");
      return;
    }

    try {
      showLog(`🎯 Player 2 making guess: "${player2GuessInput.toUpperCase()}"`);

      await writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: "guess",
        args: [
          PLAYER_2_ADDRESS,
          player2GuessInput.toLowerCase()
        ],
      });
    } catch (error: unknown) {
      console.error(error);
      showLog("❌ Player 2: Error occurred during guess submission");
    }
  };

  // Player 1 verifies Player 2's guess
  const handlePlayer1Verify = async () => {
    if (turnToVerify !== PLAYER_1_ADDRESS) {
      showLog("❌ It's not Player 1's turn to verify!");
      return;
    }

    if (!lastGuess) {
      showLog("❌ No guess to verify!");
      return;
    }

    try {
      setIsGeneratingProof(true);
      showLog("🔍 Player 1 starting verification process...");
      
      // Generate proof using the last guess
      const { proof, publicInputs } = await generateProof(showLog, lastGuess as string);
      showLog("✅ Player 1: Proof generated");

      // Extract results from public inputs (positions 10-14)
      const results: `0x${string}`[] = [];
      for (let i = 10; i < 15; i++) {
        results.push(`0x${BigInt(publicInputs[i]).toString(16).padStart(64, '0')}` as `0x${string}`);
      }

      showLog("📤 Player 1: Submitting verification...");
      await writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: "verify_guess",
        args: [
          `0x${uint8ArrayToHex(proof)}` as `0x${string}`,
          results,
          PLAYER_1_ADDRESS
        ],
      });

    } catch (error: unknown) {
      console.error(error);
      showLog("❌ Player 1: Error occurred during verification");
    } finally {
      setIsGeneratingProof(false);
    }
  };

  // Player 2 verifies Player 1's guess
  const handlePlayer2Verify = async () => {
    if (turnToVerify !== PLAYER_2_ADDRESS) {
      showLog("❌ It's not Player 2's turn to verify!");
      return;
    }

    if (!lastGuess) {
      showLog("❌ No guess to verify!");
      return;
    }

    try {
      setIsGeneratingProof(true);
      showLog("🔍 Player 2 starting verification process...");
      
      // Generate proof using the last guess
      const { proof, publicInputs } = await generateProof(showLog, lastGuess as string);
      showLog("✅ Player 2: Proof generated");

      // Extract results from public inputs (positions 10-14)
      const results: `0x${string}`[] = [];
      for (let i = 10; i < 15; i++) {
        results.push(`0x${BigInt(publicInputs[i]).toString(16).padStart(64, '0')}` as `0x${string}`);
      }

      showLog("📤 Player 2: Submitting verification...");
      await writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: "verify_guess",
        args: [
          `0x${uint8ArrayToHex(proof)}` as `0x${string}`,
          results,
          PLAYER_2_ADDRESS
        ],
      });

    } catch (error: unknown) {
      console.error(error);
      showLog("❌ Player 2: Error occurred during verification");
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const isPlayer1Turn = currentTurn === PLAYER_1_ADDRESS;
  const isPlayer2Turn = currentTurn === PLAYER_2_ADDRESS;
  const isPlayer1VerifyTurn = turnToVerify === PLAYER_1_ADDRESS;
  const isPlayer2VerifyTurn = turnToVerify === PLAYER_2_ADDRESS;
  const gameWinner = winner !== "0x0000000000000000000000000000000000000000" ? winner : null;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          ⚔️ Two Player ZK Wordle Battle
        </h1>
        
        {/* Game Status Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Attempts</p>
              <p className="text-xl font-bold">{Number(attempts) || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Turn</p>
              <p className="text-xl font-bold text-blue-600">
                {isPlayer1Turn ? "Player 1" : isPlayer2Turn ? "Player 2" : "Loading..."}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Guess</p>
              <p className="text-xl font-bold text-purple-600">
                {lastGuess ? (lastGuess as string).toUpperCase() : "None"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Winner</p>
              <p className="text-xl font-bold text-green-600">
                {gameWinner ? (gameWinner === PLAYER_1_ADDRESS ? "Player 1 🎉" : "Player 2 🎉") : "None"}
              </p>
            </div>
          </div>
        </div>

        {/* Split Screen Interface */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Player 1 Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-600 text-center">
              🔵 Player 1
            </h2>
            <div className="space-y-4">
              
              {/* Player 1 Guess Section */}
              <div className="border-2 border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Make a Guess</h3>
                <input
                  type="text"
                  value={player1GuessInput}
                  onChange={(e) => setPlayer1GuessInput(e.target.value.toLowerCase())}
                  placeholder="Enter 5-letter word"
                  maxLength={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 uppercase text-center text-lg font-mono"
                  disabled={!isPlayer1Turn || isPending || isConfirming || !!gameWinner}
                />
                <button
                  onClick={handlePlayer1Guess}
                  disabled={!isPlayer1Turn || isPending || isConfirming || !!gameWinner}
                  className={`w-full py-2 px-4 rounded-md font-semibold ${
                    isPlayer1Turn && !gameWinner
                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isPending || isConfirming ? '⏳ Processing...' : '🎯 Make Player 1 Guess'}
                </button>
              </div>

              {/* Player 1 Verify Section */}
              <div className="border-2 border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Verify Player 2's Guess</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {lastGuess && isPlayer1VerifyTurn 
                    ? `Verify guess: "${(lastGuess as string).toUpperCase()}"` 
                    : "Waiting for Player 2's guess..."}
                </p>
                <button
                  onClick={handlePlayer1Verify}
                  disabled={!isPlayer1VerifyTurn || !lastGuess || isGeneratingProof || !!gameWinner}
                  className={`w-full py-2 px-4 rounded-md font-semibold ${
                    isPlayer1VerifyTurn && lastGuess && !gameWinner
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isGeneratingProof ? '🔍 Generating Proof...' : '✅ Verify Player 2\'s Guess'}
                </button>
              </div>

            </div>
          </div>

          {/* Player 2 Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-red-600 text-center">
              🔴 Player 2
            </h2>
            <div className="space-y-4">
              
              {/* Player 2 Guess Section */}
              <div className="border-2 border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Make a Guess</h3>
                <input
                  type="text"
                  value={player2GuessInput}
                  onChange={(e) => setPlayer2GuessInput(e.target.value.toLowerCase())}
                  placeholder="Enter 5-letter word"
                  maxLength={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 uppercase text-center text-lg font-mono"
                  disabled={!isPlayer2Turn || isPending || isConfirming || !!gameWinner}
                />
                <button
                  onClick={handlePlayer2Guess}
                  disabled={!isPlayer2Turn || isPending || isConfirming || !!gameWinner}
                  className={`w-full py-2 px-4 rounded-md font-semibold ${
                    isPlayer2Turn && !gameWinner
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isPending || isConfirming ? '⏳ Processing...' : '🎯 Make Player 2 Guess'}
                </button>
              </div>

              {/* Player 2 Verify Section */}
              <div className="border-2 border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Verify Player 1's Guess</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {lastGuess && isPlayer2VerifyTurn 
                    ? `Verify guess: "${(lastGuess as string).toUpperCase()}"` 
                    : "Waiting for Player 1's guess..."}
                </p>
                <button
                  onClick={handlePlayer2Verify}
                  disabled={!isPlayer2VerifyTurn || !lastGuess || isGeneratingProof || !!gameWinner}
                  className={`w-full py-2 px-4 rounded-md font-semibold ${
                    isPlayer2VerifyTurn && lastGuess && !gameWinner
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isGeneratingProof ? '🔍 Generating Proof...' : '✅ Verify Player 1\'s Guess'}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Game Logs */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">📋 Game Log</h3>
          <div className="bg-gray-50 rounded-md p-4 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No activity yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transaction Status */}
        {(isPending || isConfirming) && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              {isPending && "⏳ Transaction pending..."}
              {isConfirming && "🔄 Waiting for confirmation..."}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">❌ Error: {error.message}</p>
          </div>
        )}

      </div>
    </div>
  );
}
