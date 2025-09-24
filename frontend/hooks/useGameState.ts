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

  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);
  const [guessHistory, setGuessHistory] = useState<GuessResult[]>([]);
  const [player1Board, setPlayer1Board] = useState<PlayerBoard>({ guesses: [] });
  const [player2Board, setPlayer2Board] = useState<PlayerBoard>({ guesses: [] });

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
  useWatchContractEvent({
    address: contractAddress,
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
        
        // Add unverified guess to the appropriate player's board
        const newGuess = { word: guess.toLowerCase(), isVerified: false };
        console.log('NewGuess event:', { player, guess, player1, player2 });
        
        if (player1 && player.toLowerCase() === (player1 as string).toLowerCase()) {
          console.log('Adding guess to player1 board:', newGuess);
          setPlayer1Board(prev => ({
            guesses: [...prev.guesses, newGuess]
          }));
        } else if (player2 && player.toLowerCase() === (player2 as string).toLowerCase()) {
          console.log('Adding guess to player2 board:', newGuess);
          setPlayer2Board(prev => ({
            guesses: [...prev.guesses, newGuess]
          }));
        } else {
          console.log('Could not match player to board:', { player, player1, player2 });
        }
      });
    },
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'Wordle__GuessResult',
    onLogs(logs) {
      logs.forEach((log) => {
        const { player, guess, result } = log.args as { player: string; guess: string; result: `0x${string}`[] };
        
        // Convert bytes32[] to number[] - bytes32 values are like 0x000...002 for the number 2
        const numericResults = result.map(r => {
          const num = parseInt(r, 16);
          // console.log(`Converting bytes32 ${r} to ${num}`);
          // Ensure we only get valid Wordle results (0, 1, 2)
          if (num < 0 || num > 2) {
            console.warn(`Invalid Wordle result: ${num} from ${r}`);
            return 0; // Default to "not in word"
          }
          return num;
        });
        
        // WORKAROUND: The contract emits the wrong player (next to play instead of guesser)  
        // We need to determine the actual guesser more reliably
        // Logic: Check both player boards to see who has this unverified guess
        
        let actualGuesser: string;
        
        // Check Player 1's board for this unverified guess
        const player1HasGuess = player1Board.guesses.some(g => 
          g.word.toLowerCase() === guess.toLowerCase() && !g.isVerified
        );
        
        // Check Player 2's board for this unverified guess  
        const player2HasGuess = player2Board.guesses.some(g => 
          g.word.toLowerCase() === guess.toLowerCase() && !g.isVerified
        );
        
        if (player1HasGuess && !player2HasGuess) {
          actualGuesser = player1 as string || '';
        } else if (player2HasGuess && !player1HasGuess) {
          actualGuesser = player2 as string || '';
        } else if (player1HasGuess && player2HasGuess) {
          // Both have the guess? This shouldn't happen, use event player as fallback
          console.warn('Both players have unverified guess, using event player:', { guess, player });
          actualGuesser = player;
        } else {
          // Neither has the guess? This might happen if verification is very fast, use event player
          console.warn('No player has unverified guess, using event player:', { guess, player });
          actualGuesser = player;
        }
        
        // console.log('🔍 GuessResult Event Analysis:', { 
        //   eventPlayer: player, 
        //   correctedActualGuesser: actualGuesser,
        //   hashedGuess: guess, 
        //   rawResult: result,
        //   decodedResults: numericResults,
        //   currentVerifier: turnToVerify,
        //   player1Address: player1,
        //   player2Address: player2
        // });
        
        const event: GameEvent = {
          type: 'result',
          player: actualGuesser,
          guess,
          results: numericResults.map(String), // Convert to string array for consistency
          timestamp: new Date()
        };
        setGameEvents(prev => [...prev, event]);
        setGuessHistory(prev => {
          // Check if this guess result already exists to avoid duplicates
          const exists = prev.some(existing => 
            existing.player.toLowerCase() === actualGuesser.toLowerCase() && 
            existing.guess === guess &&
            JSON.stringify(existing.results) === JSON.stringify(numericResults)
          );
          
          if (exists) {
            console.log('Duplicate guess result detected, skipping:', { player: actualGuesser, guess, numericResults });
            return prev;
          }
          
          return [...prev, { player: actualGuesser, guess, results: numericResults.map(String) }];
        });
        
        // Update the appropriate player's board with verification results
        console.log('🔍 GuessResult: Updating board with verification results:', { 
          eventPlayer: player,
          actualGuesser, 
          guess, 
          numericResults, 
          player1HasGuess,
          player2HasGuess,
          player1: player1, 
          player2: player2,
          isPlayer1Match: player1 && actualGuesser.toLowerCase() === (player1 as string).toLowerCase(),
          isPlayer2Match: player2 && actualGuesser.toLowerCase() === (player2 as string).toLowerCase()
        });
        
        if (player1 && actualGuesser.toLowerCase() === (player1 as string).toLowerCase()) {
          console.log('🟦 Updating player1 board with verification');
          setPlayer1Board(prev => {
            console.log('🟦 Player1 board before update:', { 
              guesses: prev.guesses.map(g => ({word: g.word, isVerified: g.isVerified, hasResults: !!g.results}))
            });
            // Find the exact matching guess by word (now that guess is unhashed)
            const matchingGuessIndex = prev.guesses.findIndex(g => 
              g.word.toLowerCase() === guess.toLowerCase() && !g.isVerified
            );
            console.log('🟦 Found matching guess for player1 at index:', matchingGuessIndex);
            
            if (matchingGuessIndex !== -1) {
              const updatedGuesses = [...prev.guesses];
              updatedGuesses[matchingGuessIndex] = { 
                ...updatedGuesses[matchingGuessIndex], 
                results: numericResults.map(String), 
                isVerified: true 
              };
              console.log('✅ Player1 board updated with colors:', { 
                beforeCount: prev.guesses.length,
                afterCount: updatedGuesses.length,
                verifiedCount: updatedGuesses.filter(g => g.isVerified).length,
                results: numericResults,
                updatedGuess: updatedGuesses[matchingGuessIndex]
              });
              return { guesses: updatedGuesses };
            } else {
              console.log('❌ No matching unverified guess found for player1:', { guess, existingGuesses: prev.guesses });
              return prev;
            }
          });
        } else if (player2 && actualGuesser.toLowerCase() === (player2 as string).toLowerCase()) {
          console.log('🟩 Updating player2 board with verification');
          setPlayer2Board(prev => {
            console.log('🟩 Player2 board before update:', { 
              guesses: prev.guesses.map(g => ({word: g.word, isVerified: g.isVerified, hasResults: !!g.results}))
            });
            // Find the exact matching guess by word (now that guess is unhashed)
            const matchingGuessIndex = prev.guesses.findIndex(g => 
              g.word.toLowerCase() === guess.toLowerCase() && !g.isVerified
            );
            console.log('🟩 Found matching guess for player2 at index:', matchingGuessIndex);
            
            if (matchingGuessIndex !== -1) {
              const updatedGuesses = [...prev.guesses];
              updatedGuesses[matchingGuessIndex] = { 
                ...updatedGuesses[matchingGuessIndex], 
                results: numericResults.map(String), 
                isVerified: true 
              };
              console.log('✅ Player2 board updated with colors:', { 
                beforeCount: prev.guesses.length,
                afterCount: updatedGuesses.length,
                verifiedCount: updatedGuesses.filter(g => g.isVerified).length,
                results: numericResults,
                updatedGuess: updatedGuesses[matchingGuessIndex]
              });
              return { guesses: updatedGuesses };
            } else {
              console.log('❌ No matching unverified guess found for player2:', { guess, existingGuesses: prev.guesses });
              return prev;
            }
          });
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
    address: contractAddress,
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

  return {
    gameState,
    gameEvents,
    guessHistory,
    player1Board: player1Board.guesses,
    player2Board: player2Board.guesses
  };
}
