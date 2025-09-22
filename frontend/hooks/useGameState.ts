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
    guessHistory
  };
}
