import { useState, useCallback, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { abi } from "../abi/abi.ts";
import { generateProof } from "../utils/generateProof.ts";
import { GameStatus } from "./GameStatus";
import { PlayerSection } from "./PlayerSection";
import { useGameState } from "../hooks/useGameState";

interface TwoPlayerGameProps {
  gameContract?: string;
  onBackToLobby?: () => void;
}

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

export default function TwoPlayerGame({ gameContract }: TwoPlayerGameProps = {}) {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const { address: currentAccount } = useAccount();

  // Ensure gameContract is provided
  if (!gameContract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">No Game Contract</h2>
            <p className="text-red-700">No game contract address provided. Please select a game from the lobby.</p>
          </div>
        </div>
      </div>
    );
  }

  // State management
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [hasSecret, setHasSecret] = useState<boolean | null>(null);

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

  // Use the custom hook for game state management
  const { gameState, player1Board, player2Board } = useGameState({
    contractAddress: gameContract as `0x${string}`,
    getPlayerName,
    addLog
  });

  // Local state for immediate guess feedback (UX)
  const [pendingGuesses, setPendingGuesses] = useState<{
    player1: Array<{word: string; isVerified: boolean}>;
    player2: Array<{word: string; isVerified: boolean}>;
  }>({
    player1: [],
    player2: []
  });

  // Current user's role detection
  const isCurrentUserPlayer1 = currentAccount?.toLowerCase() === gameState.player1?.toLowerCase();
  const isCurrentUserPlayer2 = currentAccount?.toLowerCase() === gameState.player2?.toLowerCase();
  
  // Check if current user has the secret for this game
  const checkHasSecret = useCallback(async () => {
    if (!gameContract) {
      console.log('🔍 No game contract provided for secret check');
      setHasSecret(false);
      return;
    }
    
    try {
      console.log(`🔍 Checking for secret for game: ${gameContract}`);
      const { getStoredSecret } = await import('../utils/contractHelpers');
      const storedSecret = getStoredSecret(gameContract);
      
      console.log('🔍 Secret check result:', {
        gameAddress: gameContract,
        hasStoredSecret: !!storedSecret,
        storedSecret: storedSecret ? { 
          word: storedSecret.word, 
          salt: storedSecret.salt,
          letterCodesCount: storedSecret.letterCodes?.length,
          timestamp: new Date(storedSecret.timestamp).toLocaleString()
        } : null,
        currentAccount: currentAccount
      });
      
      setHasSecret(!!storedSecret);
    } catch (error) {
      console.error('❌ Error checking secret:', error);
      setHasSecret(false);
    }
  }, [gameContract, currentAccount]);
  
  // Check for secret on component mount and whenever game state changes
  useEffect(() => {
    checkHasSecret();
  }, [checkHasSecret, gameState.player1, gameState.player2, gameState.turnToVerify]);

  // Create separate boards based on user's perspective
  const createUserBoard = (contractBoard: any[], playerKey: 'player1' | 'player2', isOwnBoard: boolean) => {
    const pending = pendingGuesses[playerKey];
    const hybrid: any[] = [];
    
    if (isOwnBoard) {
      // For your own board: show all your guesses (pending + verified)
      pending.forEach(pendingGuess => {
        const contractResult = contractBoard.find(contractGuess => 
          contractGuess.word.toLowerCase() === pendingGuess.word.toLowerCase()
        );
        
        if (contractResult) {
          hybrid.push({
            word: pendingGuess.word,
            isVerified: true,
            results: contractResult.results?.map((r: any) => typeof r === 'string' ? parseInt(r) : r)
          });
        } else {
          hybrid.push({
            word: pendingGuess.word,
            isVerified: false,
            results: undefined
          });
        }
      });
      
      // Add any contract guesses that aren't in pending
      contractBoard.forEach(contractGuess => {
        const existsInPending = pending.some(pendingGuess => 
          pendingGuess.word.toLowerCase() === contractGuess.word.toLowerCase()
        );
        if (!existsInPending) {
          hybrid.push({
            word: contractGuess.word,
            isVerified: contractGuess.isVerified,
            results: contractGuess.results?.map((r: any) => typeof r === 'string' ? parseInt(r) : r)
          });
        }
      });
    } else {
      // For opponent's board: show ALL guesses (verified and unverified)
      // This ensures both players see the same board state and color updates
      contractBoard.forEach(contractGuess => {
        hybrid.push({
          word: contractGuess.word,
          isVerified: contractGuess.isVerified,
          results: contractGuess.results?.map((r: any) => typeof r === 'string' ? parseInt(r) : r)
        });
      });
    }
    
    return hybrid;
  };

  const finalPlayer1Board = createUserBoard(player1Board, 'player1', isCurrentUserPlayer1);
  const finalPlayer2Board = createUserBoard(player2Board, 'player2', isCurrentUserPlayer2);

  // Debug logging for hybrid board approach  
  console.log('🎮 TwoPlayerGame board state:', {
    currentUser: currentAccount,
    isCurrentUserPlayer1,
    isCurrentUserPlayer2,
    player1Address: gameState.player1,
    player2Address: gameState.player2,
    contractPlayer1Board: player1Board.length,
    contractPlayer2Board: player2Board.length,
    finalPlayer1Board: finalPlayer1Board.length,
    finalPlayer2Board: finalPlayer2Board.length,
    player1Verified: finalPlayer1Board.filter(g => g.isVerified).length,
    player2Verified: finalPlayer2Board.filter(g => g.isVerified).length
  });

  // No cleanup needed - pending guesses stay to maintain chronological order
  // Verification results are merged in createHybridBoard()



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
      
      // Generate Merkle proof for the word
      const { generateMerkleProof, isWordInDictionary } = await import('../utils/merkleProof');
      
      // First check if word is in dictionary
      if (!isWordInDictionary(guess.toLowerCase())) {
        addLog(`❌ "${guess.toUpperCase()}" is not in the word dictionary`);
        return;
      }
      
      // Generate Merkle proof
      const merkleProof = generateMerkleProof(guess.toLowerCase());
      if (!merkleProof) {
        addLog(`❌ Failed to generate Merkle proof for "${guess.toUpperCase()}"`);
        return;
      }
      
      addLog(`✅ Word "${guess.toUpperCase()}" validated in dictionary`);
      addLog(`🔐 Generated Merkle proof (index: ${merkleProof.index})`);
      
      // Immediately add to local state for instant UX feedback
      const newGuess = { word: guess.toLowerCase(), isVerified: false };
      
      if (currentAccount?.toLowerCase() === gameState.player1?.toLowerCase()) {
        setPendingGuesses(prev => ({
          ...prev,
          player1: [...prev.player1, newGuess]
        }));
      } else if (currentAccount?.toLowerCase() === gameState.player2?.toLowerCase()) {
        setPendingGuesses(prev => ({
          ...prev,
          player2: [...prev.player2, newGuess]
        }));
      }
      
      // Submit guess with Merkle proof
      if (!gameContract) {
        addLog("❌ No game contract address available");
        return;
      }
      
      writeContract({
        address: gameContract as `0x${string}`,
        abi: abi,
        functionName: 'guess',
        args: [
          guess.toLowerCase(),
          merkleProof.pathElements as `0x${string}`[],
          merkleProof.pathIndices
        ],
        gas: 5000000n, // Set reasonable gas limit (5M, well under 16.7M cap)
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

    if (!gameContract) {
      addLog("❌ No game contract address available");
      return;
    }

    // Check if current user has the secret for this game
    const { getStoredSecret } = await import('../utils/contractHelpers');
    const storedSecret = getStoredSecret(gameContract);
    
    if (!storedSecret) {
      addLog("❌ You can only verify guesses for games where you have the secret word!");
      addLog("💡 Only the player who created the game can verify guesses.");
      return;
    }

    try {
      setIsGeneratingProof(true);
      addLog("🔐 Generating ZK proof for verification...");
      addLog(`🔍 Verifying guess "${gameState.lastGuess}" against your secret word "${storedSecret.word}"`);

      const { proof, publicInputs } = await generateProof(
        gameState.lastGuess,
        gameContract,
        currentAccount
      );
      
      // Extract only the results (positions 10-14) from publicInputs
      const results = publicInputs.slice(10, 15) as `0x${string}`[];
      
      addLog("✅ ZK proof generated successfully!");
      addLog("📤 Submitting verification to contract...");
      addLog(`🔍 Results being submitted: ${results}`);

      writeContract({
        address: gameContract as `0x${string}`,
        abi: abi,
        functionName: 'verify_guess',
        args: [`0x${uint8ArrayToHex(proof)}`, results],
        gas: 10000000n, // Higher gas limit for ZK proof verification (10M, under 16.7M cap)
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
  
  // Check if there are unverified guesses on the opponent's board
  // Player 1 verifies Player 2's guesses, Player 2 verifies Player 1's guesses
  const player2HasUnverifiedGuess = player2Board.some(guess => !guess.isVerified);
  const player1HasUnverifiedGuess = player1Board.some(guess => !guess.isVerified);
  
  // Can verify if: it's your turn to verify AND opponent has unverified guesses AND you have the secret
  const canPlayer1Verify = shouldPlayer1Verify && player2HasUnverifiedGuess && hasSecret === true;
  const canPlayer2Verify = shouldPlayer2Verify && player1HasUnverifiedGuess && hasSecret === true;

  console.log('🔍 Verification debug:', {
    hasSecret,
    shouldPlayer1Verify,
    shouldPlayer2Verify,
    isCurrentUserPlayer1,
    isCurrentUserPlayer2,
    player1HasUnverifiedGuess,
    player2HasUnverifiedGuess,
    canPlayer1Verify,
    canPlayer2Verify,
    player1ShowsVerify: shouldPlayer1Verify && isCurrentUserPlayer1 && hasSecret === true && player2HasUnverifiedGuess,
    player2ShowsVerify: shouldPlayer2Verify && isCurrentUserPlayer2 && hasSecret === true && player1HasUnverifiedGuess,
    player1Board: player1Board.map(g => ({ word: g.word, verified: g.isVerified })),
    player2Board: player2Board.map(g => ({ word: g.word, verified: g.isVerified }))
  });



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
        />

        {/* Split Game Interface */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Player 1 Section */}
          <PlayerSection
            playerNumber={1}
            playerName="Player 1"  
            isPlayerTurn={isPlayer1Turn && isCurrentUserPlayer1}
            canVerify={canPlayer1Verify}
            shouldVerify={shouldPlayer1Verify}
            hasPendingGuess={player2HasUnverifiedGuess}
            lastGuess={gameState.lastGuess}
            isPending={isPending}
            isConfirming={isConfirming}
            isGeneratingProof={isGeneratingProof}
            playerGuesses={finalPlayer1Board}
            onGuess={handleGuess}
            onVerify={handleVerify}
            isCurrentUser={isCurrentUserPlayer1}
            hasSecret={shouldPlayer1Verify && isCurrentUserPlayer1 && hasSecret === true}
          />

          {/* Player 2 Section */}
          <PlayerSection
            playerNumber={2}
            playerName="Player 2"
            isPlayerTurn={isPlayer2Turn && isCurrentUserPlayer2}
            canVerify={canPlayer2Verify}
            shouldVerify={shouldPlayer2Verify}
            hasPendingGuess={player1HasUnverifiedGuess}
            lastGuess={gameState.lastGuess}
            isPending={isPending}
            isConfirming={isConfirming}
            isGeneratingProof={isGeneratingProof}
            playerGuesses={finalPlayer2Board}
            onGuess={handleGuess}
            onVerify={handleVerify}
            isCurrentUser={isCurrentUserPlayer2}
            hasSecret={shouldPlayer2Verify && isCurrentUserPlayer2 && hasSecret === true}
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
