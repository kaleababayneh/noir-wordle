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
    query: { refetchInterval: 1000 }
  });

  const { data: winner } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'winner',
    query: { refetchInterval: 1000 }
  });

  const { data: player1 } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'player1',
    query: { refetchInterval: 1000 }
  });

  const { data: player2 } = useReadContract({
    address: contractAddress,
    abi: abi,
    functionName: 'player2',
    query: { refetchInterval: 1000 }
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
        const { player, guess, result } = log.args as { player: string; guess: string; result: string[] };
        
        // WORKAROUND: The contract emits the wrong player (next to play instead of guesser)
        // We need to infer the actual guesser from the current verifier attempts
        // The logic: if verifier_attempts goes from N to N+1, then:
        // - If N was even, Player 2 was verifying, so Player 1 made the guess
        // - If N was odd, Player 1 was verifying, so Player 2 made the guess
        
        // Get current verifier attempts count to determine who verified
        const currentVerifierAttempts = Number(verifierAttempts) || 0;
        
        // Determine who made the guess being verified
        let actualGuesser: string;
        if (currentVerifierAttempts % 2 === 1) {
          // Odd verifier attempts means Player 1 just verified, so Player 2 made the guess
          actualGuesser = player2 as string || '';
        } else {
          // Even verifier attempts means Player 2 just verified, so Player 1 made the guess  
          actualGuesser = player1 as string || '';
        }
        
        // Fallback to event player if we can't determine the addresses
        if (!actualGuesser || actualGuesser === '0x0000000000000000000000000000000000000000') {
          actualGuesser = player;
        }
        
        console.log('Corrected GuessResult:', { 
          eventPlayer: player, 
          actualGuesser,
          guess, 
          verifierAttempts: currentVerifierAttempts
        });
        
        const event: GameEvent = {
          type: 'result',
          player: actualGuesser,
          guess,
          results: result,
          timestamp: new Date()
        };
        setGameEvents(prev => [...prev, event]);
        setGuessHistory(prev => {
          // Check if this guess result already exists to avoid duplicates
          const exists = prev.some(existing => 
            existing.player.toLowerCase() === actualGuesser.toLowerCase() && 
            existing.guess === guess &&
            JSON.stringify(existing.results) === JSON.stringify(result)
          );
          
          if (exists) {
            console.log('Duplicate guess result detected, skipping:', { player: actualGuesser, guess, result });
            return prev;
          }
          
          return [...prev, { player: actualGuesser, guess, results: result }];
        });
        
        // Update the appropriate player's board with verification results
        console.log('Updating board with verification results:', { actualGuesser, guess, result, player1, player2 });
        
        if (player1 && actualGuesser.toLowerCase() === (player1 as string).toLowerCase()) {
          console.log('Updating player1 board with verification');
          setPlayer1Board(prev => {
            const updatedGuesses = prev.guesses.map(g => 
              g.word === guess.toLowerCase() && !g.isVerified
                ? { ...g, results: result, isVerified: true }
                : g
            );
            console.log('Player1 board update:', { before: prev.guesses, after: updatedGuesses });
            return { guesses: updatedGuesses };
          });
        } else if (player2 && actualGuesser.toLowerCase() === (player2 as string).toLowerCase()) {
          console.log('Updating player2 board with verification');
          setPlayer2Board(prev => {
            const updatedGuesses = prev.guesses.map(g => 
              g.word === guess.toLowerCase() && !g.isVerified
                ? { ...g, results: result, isVerified: true }
                : g
            );
            console.log('Player2 board update:', { before: prev.guesses, after: updatedGuesses });
            return { guesses: updatedGuesses };
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
