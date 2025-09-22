import { useState, useCallback } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { abi } from "../abi/abi.ts";
import { WORDLE_CONTRACT_ADDRESS } from "../constant.ts";
import { generateProof } from "../utils/generateProof.ts";
import { GameStatus } from "./GameStatus";
import { PlayerSection } from "./PlayerSection";
import { useGameState } from "../hooks/useGameState";

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

// Interfaces moved to separate components and hooks

export default function TwoPlayerGame() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const { address: currentAccount } = useAccount();

  // State management
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  // Utility functions
  const addLog = useCallback((message: string) => {
    // Log disabled for cleaner UI
    console.log(message);
  }, []);

  const getPlayerName = (address: string) => {
    if (address.toLowerCase() === gameState.player1?.toLowerCase()) return "Player 1";
    if (address.toLowerCase() === gameState.player2?.toLowerCase()) return "Player 2";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const showLog = (message: string) => {
    addLog(message);
  };

  // Use the custom hook for game state management
  const { gameState, player1Board, player2Board } = useGameState({
    contractAddress: WORDLE_CONTRACT_ADDRESS,
    getPlayerName,
    addLog
  });

  // Local board state for immediate updates
  const [localPlayer1Guesses, setLocalPlayer1Guesses] = useState<Array<{word: string; results?: number[]; isVerified: boolean}>>([]);
  const [localPlayer2Guesses, setLocalPlayer2Guesses] = useState<Array<{word: string; results?: number[]; isVerified: boolean}>>([]);

  // Combine local guesses with contract results
  const finalPlayer1Board = [...localPlayer1Guesses];
  const finalPlayer2Board = [...localPlayer2Guesses];

  // Update with verified results from contract
  player1Board.forEach(contractGuess => {
    const index = finalPlayer1Board.findIndex(g => g.word === contractGuess.word);
    if (index >= 0) {
      // Update existing guess with verification results
      const results = contractGuess.results?.map(r => typeof r === 'string' ? parseInt(r) : r);
      finalPlayer1Board[index] = { ...contractGuess, results };
    }
  });

  player2Board.forEach(contractGuess => {
    const index = finalPlayer2Board.findIndex(g => g.word === contractGuess.word);
    if (index >= 0) {
      // Update existing guess with verification results
      const results = contractGuess.results?.map(r => typeof r === 'string' ? parseInt(r) : r);
      finalPlayer2Board[index] = { ...contractGuess, results };
    }
  });



  // Game actions
  const handleGuess = async (guess: string) => {
    if (!guess || guess.length !== 5) {
      addLog("❌ Please enter exactly 5 letters");
      return;
    }

    if (!/^[a-z]+$/i.test(guess)) {
      addLog("❌ Please enter only letters");
      return;
    }

    try {
      addLog(`Making guess: "${guess.toUpperCase()}" 🎯`);
      
      // Immediately add the guess to the current player's board (unverified)
      // This ensures the guess shows up on the board right away like real Wordle
      const newGuess = { word: guess.toLowerCase(), isVerified: false };
      
      if (currentAccount?.toLowerCase() === gameState.player1?.toLowerCase()) {
        setLocalPlayer1Guesses(prev => [...prev, newGuess]);
      } else if (currentAccount?.toLowerCase() === gameState.player2?.toLowerCase()) {
        setLocalPlayer2Guesses(prev => [...prev, newGuess]);
      }
      
      writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: 'guess',
        args: [guess.toLowerCase()],
      });
    } catch (error) {
      addLog(`❌ Error making guess: ${error}`);
    }
  };

  const handleVerify = async () => {
    if (!gameState.lastGuess) {
      addLog("❌ No guess to verify");
      return;
    }

    try {
      setIsGeneratingProof(true);
      addLog("🔐 Generating ZK proof for verification...");

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
        args: [`0x${uint8ArrayToHex(proof)}`, results],
      });

    } catch (error) {
      addLog(`❌ Error during verification: ${error}`);
    } finally {
      setIsGeneratingProof(false);
    }
  };

  // Game status helpers
  const isPlayer1Turn = gameState.currentTurn.toLowerCase() === gameState.player1?.toLowerCase();
  const isPlayer2Turn = gameState.currentTurn.toLowerCase() === gameState.player2?.toLowerCase();
  const shouldPlayer1Verify = gameState.turnToVerify.toLowerCase() === gameState.player1?.toLowerCase();
  const shouldPlayer2Verify = gameState.turnToVerify.toLowerCase() === gameState.player2?.toLowerCase();
  const gameStarted = gameState.player1 !== "" && gameState.player2 !== "" && 
                      gameState.player1 !== "0x0000000000000000000000000000000000000000" && 
                      gameState.player2 !== "0x0000000000000000000000000000000000000000";
  const gameEnded = gameState.winner !== "" && gameState.winner !== "0x0000000000000000000000000000000000000000";
  
  // Check if there's a pending guess to verify
  const hasPendingGuess = gameState.guesserAttempts - gameState.verifierAttempts === 1;
  const canPlayer1Verify = shouldPlayer1Verify && hasPendingGuess;
  const canPlayer2Verify = shouldPlayer2Verify && hasPendingGuess;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎯 P2P ZK Wordle</h1>
          <p className="text-lg text-gray-600">Turn-based word guessing with Zero-Knowledge proofs</p>
        </div>

        {/* Game Status */}
        <GameStatus
          guesserAttempts={gameState.guesserAttempts}
          verifierAttempts={gameState.verifierAttempts}
          gameStarted={gameStarted}
          gameEnded={gameEnded}
          lastGuess={gameState.lastGuess}
          currentTurn={gameState.currentTurn}
          winner={gameState.winner}
          getPlayerName={getPlayerName}
        />

        {/* Split Game Interface */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Player 1 Section */}
          <PlayerSection
            playerNumber={1}
            playerName="Player 1"  
            isPlayerTurn={isPlayer1Turn}
            canVerify={canPlayer1Verify}
            shouldVerify={shouldPlayer1Verify}
            hasPendingGuess={hasPendingGuess}
            lastGuess={gameState.lastGuess}
            isPending={isPending}
            isConfirming={isConfirming}
            isGeneratingProof={isGeneratingProof}
            playerGuesses={finalPlayer1Board}
            onGuess={handleGuess}
            onVerify={handleVerify}
          />

          {/* Player 2 Section */}
          <PlayerSection
            playerNumber={2}
            playerName="Player 2"
            isPlayerTurn={isPlayer2Turn}
            canVerify={canPlayer2Verify}
            shouldVerify={shouldPlayer2Verify}
            hasPendingGuess={hasPendingGuess}
            lastGuess={gameState.lastGuess}
            isPending={isPending}
            isConfirming={isConfirming}
            isGeneratingProof={isGeneratingProof}
            playerGuesses={finalPlayer2Board}
            onGuess={handleGuess}
            onVerify={handleVerify}
          />
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
