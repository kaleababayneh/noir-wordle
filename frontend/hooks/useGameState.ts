import { useReadContract, useWatchContractEvent } from "wagmi";
import { useEffect, useState } from "react";
import { abi } from "../abi/abi";

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

interface PlayerBoard {
  guesses: Array<{
    word: string;
    results?: string[];
    isVerified: boolean;
  }>;
}

interface UseGameStateProps {
  contractAddress: `0x${string}`;
  getPlayerName: (address: string) => string;
  addLog: (message: string) => void;
}

export function useGameState({ contractAddress, getPlayerName, addLog }: UseGameStateProps) {
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

  const [player1Board, setPlayer1Board] = useState<PlayerBoard>({ guesses: [] });
  const [player2Board, setPlayer2Board] = useState<PlayerBoard>({ guesses: [] });
  
  // Track processed events to avoid duplicates from historical events
  const [processedEventIds, setProcessedEventIds] = useState<Set<string>>(new Set());

  // Contract reads for game state (with auto-refresh)
  const { data: currentTurn } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getTurnToPlay',
    query: { refetchInterval: 1000 }
  });

  const { data: turnToVerify } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'getTurnToVerify',
    query: { refetchInterval: 1000 }
  });

  const { data: lastGuess } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'last_guess',
    query: { refetchInterval: 1000 }
  });

  const { data: guesserAttempts } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'guesser_attempts',
    query: { refetchInterval: 1000 }
  });

  const { data: verifierAttempts } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'verifier_attempts',
    query: { refetchInterval: 500 } // Faster for game-critical data
  });

  const { data: winner } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'winner',
    query: { refetchInterval: 2000 } // Moderate frequency for winner status
  });

  const { data: player1 } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'player1',
    query: { refetchInterval: 5000 } // Less frequent - players don't change often
  });

  const { data: player2 } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'player2',
    query: { refetchInterval: 5000 } // Less frequent - players don't change often
  });

  // Event listeners for real-time updates
  // Helper to add guess to board with duplicate prevention
  const addGuessToBoard = (
    setBoard: React.Dispatch<React.SetStateAction<PlayerBoard>>,
    guess: string,
    playerName: string
  ) => {
    const newGuess = { word: guess.toLowerCase(), isVerified: false };
    setBoard(prev => {
      if (prev.guesses.some(g => g.word.toLowerCase() === guess.toLowerCase() && !g.isVerified)) {
        console.log(`⚠️ Duplicate NewGuess for ${playerName}, skipping:`, newGuess);
        return prev;
      }
      console.log(`✅ Adding guess to ${playerName} board:`, newGuess);
      return { guesses: [...prev.guesses, newGuess] };
    });
  };

  useWatchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'Wordle__NewGuess',
    pollingInterval: 1000,
    onLogs(logs) {
      logs.forEach((log) => {
        // Create unique event ID from transaction hash and log index
        const eventId = `${log.transactionHash}-${log.logIndex}`;
        
        // Skip if already processed
        if (processedEventIds.has(eventId)) {
          console.log('⏭️ Skipping already processed NewGuess event:', eventId);
          return;
        }
        
        setProcessedEventIds(prev => new Set(prev).add(eventId));
        
        const { player, guess } = log.args as { player: string; guess: string };
        addLog(`🎯 ${getPlayerName(player)} made a guess: "${guess}"`);
        console.log('🆕 NewGuess event received:', { player, guess, player1, player2, eventId });
        
        if (player1 && player.toLowerCase() === (player1 as string).toLowerCase()) {
          addGuessToBoard(setPlayer1Board, guess, 'player1');
        } else if (player2 && player.toLowerCase() === (player2 as string).toLowerCase()) {
          addGuessToBoard(setPlayer2Board, guess, 'player2');
        } else {
          console.log('❌ Could not match player to board:', { player, player1, player2 });
        }
      });
    },
  });

  // Helper to update board with verification results
  const updateBoardWithVerification = (
    setBoard: React.Dispatch<React.SetStateAction<PlayerBoard>>,
    guess: string,
    results: string[],
    playerName: string
  ) => {
    setBoard(prev => {
      console.log(`� ${playerName} board before update:`, {
        guesses: prev.guesses.map(g => ({ word: g.word, isVerified: g.isVerified, hasResults: !!g.results }))
      });

      const matchingGuessIndex = prev.guesses.findIndex(g =>
        g.word.toLowerCase() === guess.toLowerCase() && !g.isVerified
      );
      console.log(`� Found matching guess for ${playerName} at index:`, matchingGuessIndex);

      if (matchingGuessIndex !== -1) {
        const updatedGuesses = [...prev.guesses];
        updatedGuesses[matchingGuessIndex] = {
          ...updatedGuesses[matchingGuessIndex],
          results,
          isVerified: true
        };
        console.log(`✅ ${playerName} board updated with colors:`, {
          beforeCount: prev.guesses.length,
          afterCount: updatedGuesses.length,
          verifiedCount: updatedGuesses.filter(g => g.isVerified).length,
          updatedGuess: updatedGuesses[matchingGuessIndex]
        });
        return { guesses: updatedGuesses };
      } else {
        console.log(`❌ No matching unverified guess found for ${playerName}:`, { guess, existingGuesses: prev.guesses });
        return prev;
      }
    });
  };

  useWatchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'Wordle__GuessResult',
    pollingInterval: 1000,
    onLogs(logs) {
      logs.forEach((log) => {
        // Create unique event ID from transaction hash and log index
        const eventId = `${log.transactionHash}-${log.logIndex}`;
        
        // Skip if already processed
        if (processedEventIds.has(eventId)) {
          console.log('⏭️ Skipping already processed GuessResult event:', eventId);
          return;
        }
        
        setProcessedEventIds(prev => new Set(prev).add(eventId));
        
        const { player, guess, result } = log.args as { player: string; guess: string; result: `0x${string}`[] };
        
        // Convert bytes32[] to valid Wordle results (0, 1, 2)
        const numericResults = result.map(r => {
          const num = parseInt(r, 16);
          if (num < 0 || num > 2) {
            console.warn(`Invalid Wordle result: ${num} from ${r}`);
            return 0;
          }
          return num;
        }).map(String);
        
        // Determine actual guesser by checking boards
        const player1HasGuess = player1Board.guesses.some(g =>
          g.word.toLowerCase() === guess.toLowerCase() && !g.isVerified
        );
        const player2HasGuess = player2Board.guesses.some(g =>
          g.word.toLowerCase() === guess.toLowerCase() && !g.isVerified
        );
        
        let actualGuesser: string;
        if (player1HasGuess && !player2HasGuess) {
          actualGuesser = player1 as string || '';
        } else if (player2HasGuess && !player1HasGuess) {
          actualGuesser = player2 as string || '';
        } else {
          console.warn(player1HasGuess && player2HasGuess ? 'Both players have unverified guess' : 'No player has unverified guess', { guess, player });
          actualGuesser = player;
        }
        
        console.log('🔍 GuessResult: Updating board with verification results:', {
          eventPlayer: player,
          actualGuesser,
          guess,
          numericResults,
          player1HasGuess,
          player2HasGuess,
          eventId
        });
        
        if (player1 && actualGuesser.toLowerCase() === (player1 as string).toLowerCase()) {
          updateBoardWithVerification(setPlayer1Board, guess, numericResults, 'player1');
        } else if (player2 && actualGuesser.toLowerCase() === (player2 as string).toLowerCase()) {
          updateBoardWithVerification(setPlayer2Board, guess, numericResults, 'player2');
        } else {
          console.log('Could not match actualGuesser to player for verification:', { actualGuesser, player1, player2 });
        }
        addLog(`📊 Verification complete for "${guess}" by ${getPlayerName(actualGuesser)}`);
      });
    },
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'Wordle__CorrectGuess',
    pollingInterval: 1000,
    onLogs(logs) {
      logs.forEach((log) => {
        const { player, guess } = log.args as { player: string; guess: string };
        addLog(`🎉 CORRECT! ${getPlayerName(player)} guessed "${guess}" correctly!`);
      });
    },
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'Wordle__Player2Joined',
    pollingInterval: 1000,
    onLogs() {
      addLog(`👥 Player 2 joined the game!`);
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

  return {
    gameState,
    player1Board: player1Board.guesses,
    player2Board: player2Board.guesses
  };
}
