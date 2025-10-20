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
  
  // Simplified secret check - runs once and whenever game contract changes
  useEffect(() => {
    if (!gameContract) {
      setHasSecret(false);
      return;
    }
    
    const checkSecret = async () => {
      try {
        const { getStoredSecret, generateCommitmentHashes } = await import('../utils/contractHelpers');
        let storedSecret = getStoredSecret(gameContract);
        
        // FALLBACK: If no secret found, check for pendingSecret from game creation
        if (!storedSecret) {
          const pendingSecret = sessionStorage.getItem('pendingSecret');
          if (pendingSecret) {
            try {
              const { word, gameId, salt } = JSON.parse(pendingSecret);
              console.log('🔄 Found pendingSecret, storing it now for game:', {
                word,
                gameId,
                hasSalt: !!salt,
                gameContract
              });
              
              // Store the secret with the game contract address using the SAME salt
              await generateCommitmentHashes(word, gameContract, salt);
              
              // Verify it was stored
              storedSecret = getStoredSecret(gameContract);
              
              if (storedSecret) {
                console.log('✅ Successfully stored pending secret for game');
                // Clear the pending secret
                sessionStorage.removeItem('pendingSecret');
              }
            } catch (parseError) {
              console.error('❌ Error processing pending secret:', parseError);
            }
          }
        }
        
        console.log('🔍 Secret check for game:', {
          gameAddress: gameContract,
          hasSecret: !!storedSecret,
          secretWord: storedSecret?.word,
          currentUser: currentAccount
        });
        
        setHasSecret(!!storedSecret);
      } catch (error) {
        console.error('❌ Error checking secret:', error);
        setHasSecret(false);
      }
    };
    
    checkSecret();
  }, [gameContract, currentAccount]);

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
    if (!gameContract) {
      addLog("❌ No game contract address available");
      return;
    }

    // Determine which player's unverified guess we need to verify
    // Player 1 verifies Player 2's guesses, Player 2 verifies Player 1's guesses
    let guessToVerify: string | undefined;
    
    if (isCurrentUserPlayer1) {
      // Player 1 verifies Player 2's unverified guesses
      const unverifiedGuess = player2Board.find(g => !g.isVerified);
      guessToVerify = unverifiedGuess?.word;
    } else if (isCurrentUserPlayer2) {
      // Player 2 verifies Player 1's unverified guesses
      const unverifiedGuess = player1Board.find(g => !g.isVerified);
      guessToVerify = unverifiedGuess?.word;
    }

    if (!guessToVerify) {
      addLog("❌ No unverified guess found to verify");
      console.log('⚠️ No guess to verify:', { 
        isCurrentUserPlayer1, 
        isCurrentUserPlayer2, 
        player1Board: player1Board.map(g => ({ word: g.word, verified: g.isVerified })),
        player2Board: player2Board.map(g => ({ word: g.word, verified: g.isVerified }))
      });
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
      addLog(`🔍 Verifying guess "${guessToVerify}" against your secret word "${storedSecret.word}"`);

      const { proof, publicInputs } = await generateProof(
        guessToVerify,
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

  // Game status - simplified
  const gameStarted = !!(gameState.player1 && gameState.player2 && 
                      gameState.player1 !== "0x0000000000000000000000000000000000000000" && 
                      gameState.player2 !== "0x0000000000000000000000000000000000000000");
  const gameEnded = !!(gameState.winner && gameState.winner !== "0x0000000000000000000000000000000000000000");
  
  // Determine turn states
  const isPlayer1Turn = gameState.currentTurn.toLowerCase() === gameState.player1?.toLowerCase();
  const isPlayer2Turn = gameState.currentTurn.toLowerCase() === gameState.player2?.toLowerCase();
  const shouldPlayer1Verify = gameState.turnToVerify.toLowerCase() === gameState.player1?.toLowerCase();
  const shouldPlayer2Verify = gameState.turnToVerify.toLowerCase() === gameState.player2?.toLowerCase();
  
  // Check for unverified guesses - Player 1 verifies Player 2's guesses and vice versa
  const player1HasUnverifiedGuess = player1Board.some(g => !g.isVerified);
  const player2HasUnverifiedGuess = player2Board.some(g => !g.isVerified);
  
  // Verify button logic: SIMPLIFIED
  // Show verify button if:
  // 1. It's your turn to verify (shouldPlayerXVerify)
  // 2. You ARE this player (isCurrentUserPlayerX)
  // 3. You HAVE the secret (hasSecret === true)
  // 4. Opponent HAS unverified guess (playerYHasUnverifiedGuess)
  const showVerifyForPlayer1 = shouldPlayer1Verify && isCurrentUserPlayer1 && hasSecret === true && player2HasUnverifiedGuess;
  const showVerifyForPlayer2 = shouldPlayer2Verify && isCurrentUserPlayer2 && hasSecret === true && player1HasUnverifiedGuess;

  console.log('🔍 Verification State:', {
    // Game state (RAW addresses for comparison)
    gameContractAddress: gameContract,
    player1Raw: gameState.player1,
    player2Raw: gameState.player2,
    turnToVerifyRaw: gameState.turnToVerify,
    currentUserRaw: currentAccount,
    
    // Lowercased comparisons
    player1Lower: gameState.player1?.toLowerCase(),
    player2Lower: gameState.player2?.toLowerCase(),
    turnToVerifyLower: gameState.turnToVerify?.toLowerCase(),
    currentUserLower: currentAccount?.toLowerCase(),
    
    // Role checks
    isCurrentUserPlayer1,
    isCurrentUserPlayer2,
    shouldPlayer1Verify,
    shouldPlayer2Verify,
    
    // Detailed turn state
    turnToVerifyEqualsPlayer1: gameState.turnToVerify?.toLowerCase() === gameState.player1?.toLowerCase(),
    turnToVerifyEqualsPlayer2: gameState.turnToVerify?.toLowerCase() === gameState.player2?.toLowerCase(),
    currentUserEqualsPlayer1: currentAccount?.toLowerCase() === gameState.player1?.toLowerCase(),
    currentUserEqualsPlayer2: currentAccount?.toLowerCase() === gameState.player2?.toLowerCase(),
    
    // Board state  
    player1BoardCount: player1Board.length,
    player2BoardCount: player2Board.length,
    player1HasUnverifiedGuess,
    player2HasUnverifiedGuess,
    player1AllGuesses: player1Board.map(g => ({ word: g.word, verified: g.isVerified })),
    player2AllGuesses: player2Board.map(g => ({ word: g.word, verified: g.isVerified })),
    player1UnverifiedGuesses: player1Board.filter(g => !g.isVerified).map(g => g.word),
    player2UnverifiedGuesses: player2Board.filter(g => !g.isVerified).map(g => g.word),
    
    // Secret state - CRITICAL FOR DEBUGGING
    hasSecret,
    hasSecretType: typeof hasSecret,
    secretCheckResult: `Secret ${hasSecret ? 'FOUND' : 'NOT FOUND'} for game ${gameContract}`,
    
    // Final result breakdown
    showVerifyForPlayer1,
    showVerifyForPlayer1_breakdown: {
      shouldPlayer1Verify,
      isCurrentUserPlayer1,
      hasSecret,
      player2HasUnverifiedGuess,
      reason: !showVerifyForPlayer1 ? (
        !shouldPlayer1Verify ? 'Not your turn to verify' :
        !isCurrentUserPlayer1 ? 'You are not Player 1' :
        !hasSecret ? '❌ NO SECRET FOUND FOR THIS GAME - Did you create/join this game with your current wallet?' :
        !player2HasUnverifiedGuess ? 'Player 2 has no unverified guesses' :
        'Unknown reason'
      ) : 'All conditions met!'
    },
    showVerifyForPlayer2,
    showVerifyForPlayer2_breakdown: {
      shouldPlayer2Verify,
      isCurrentUserPlayer2,
      hasSecret,
      player1HasUnverifiedGuess,
      reason: !showVerifyForPlayer2 ? (
        !shouldPlayer2Verify ? 'Not your turn to verify' :
        !isCurrentUserPlayer2 ? 'You are not Player 2' :
        !hasSecret ? '❌ NO SECRET FOUND FOR THIS GAME - Did you create/join this game with your current wallet?' :
        !player1HasUnverifiedGuess ? 'Player 1 has no unverified guesses' :
        'Unknown reason'
      ) : 'All conditions met!'
    }
  });



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎯 P2P ZK Wordle</h1>
          <p className="text-lg text-gray-600">Turn-based word guessing with Zero-Knowledge proofs</p>
        </div>

        {/* Warning: Missing Secret */}
        {gameStarted && !hasSecret && (isCurrentUserPlayer1 || isCurrentUserPlayer2) && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  ⚠️ No Secret Word Found for This Game
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>You cannot verify guesses because you don't have the secret word stored for this game.</p>
                  <p className="mt-1"><strong>This happens when:</strong></p>
                  <ul className="list-disc list-inside mt-1">
                    <li>You switched to a different game</li>
                    <li>You're viewing a game you didn't create or join</li>
                    <li>Your browser cleared localStorage</li>
                  </ul>
                  <p className="mt-2 font-medium">Game Address: <code className="text-xs bg-yellow-100 px-1 py-0.5 rounded">{gameContract}</code></p>
                </div>
              </div>
            </div>
          </div>
        )}

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
            canVerify={showVerifyForPlayer1}
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
            canVerify={showVerifyForPlayer2}
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
