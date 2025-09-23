import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { abi as factoryAbi } from '../abi/factory-abi';
import { WORDLE_FACTORY_ADDRESS } from '../constant';

export interface GameInfo {
  gameContract: string;
  player1: string;
  player2: string;
  isActive: boolean;
  createdAt: bigint;
  gameId: string;
}

export function useWordleFactory() {
  const { address } = useAccount();
  
  // Write functions
  const { writeContract: createGame, isPending: isCreatingGame } = useWriteContract();
  const { writeContract: joinGame, isPending: isJoiningGame } = useWriteContract();
  
  // Read functions
  const { data: totalGames, refetch: refetchTotalGames } = useReadContract({
    address: WORDLE_FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'getTotalGames',
    query: { refetchInterval: 5000 }
  });
  
  const { data: activeGames, refetch: refetchActiveGames } = useReadContract({
    address: WORDLE_FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'getActiveGames',
    query: { refetchInterval: 3000 }
  });
  
  const { data: playerGames, refetch: refetchPlayerGames } = useReadContract({
    address: WORDLE_FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: 'getPlayerGameDetails',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!address,
      refetchInterval: 5000 
    }
  });
  
  // Event listeners
  useWatchContractEvent({
    address: WORDLE_FACTORY_ADDRESS,
    abi: factoryAbi,
    eventName: 'GameCreated',
    onLogs(logs) {
      logs.forEach(async (log) => {
        const { gameContract, creator, gameId } = log.args as { 
          gameContract: string; 
          creator: string; 
          gameId: string;
        };
        
        console.log(`🎮 New game created: ${gameId} by ${creator} at ${gameContract}`);
        
        // If this is the current user's game, store the secret
        if (address && creator.toLowerCase() === address.toLowerCase()) {
          const pendingSecret = sessionStorage.getItem('pendingSecret');
          if (pendingSecret) {
            const { word, gameId: pendingGameId } = JSON.parse(pendingSecret);
            if (pendingGameId === gameId) {
              // Store the secret with the game contract address
              const { generateCommitmentHashes } = await import('../utils/contractHelpers');
              await generateCommitmentHashes(word, gameContract);
              
              // Clear the pending secret
              sessionStorage.removeItem('pendingSecret');
              console.log(`🔐 Secret stored for game ${gameId} at ${gameContract}`);
            }
          }
        }
        
        // Refetch data
        refetchTotalGames();
        refetchActiveGames();
        if (address && creator.toLowerCase() === address.toLowerCase()) {
          refetchPlayerGames();
        }
      });
    },
  });
  
  useWatchContractEvent({
    address: WORDLE_FACTORY_ADDRESS,
    abi: factoryAbi,
    eventName: 'PlayerJoinedGame',
    onLogs(logs) {
      logs.forEach((log) => {
        const { player, gameId } = log.args as { 
          gameContract: string; 
          player: string; 
          gameId: string;
        };
        
        console.log(`👥 Player ${player} joined game: ${gameId}`);
        
        // Refetch data
        refetchActiveGames();
        if (address && player.toLowerCase() === address.toLowerCase()) {
          refetchPlayerGames();
        }
      });
    },
  });
  
  // Helper functions
  const createNewGame = async (gameId: string, wordCommitmentHashes: `0x${string}`[]) => {
    if (!address) throw new Error('Wallet not connected');
    
    // Create game and auto-join as player1
    return createGame({
      address: WORDLE_FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: 'createGame',
      args: [gameId, wordCommitmentHashes],
    });
  };
  
  const joinGameById = async (gameId: string, wordCommitmentHashes: `0x${string}`[]) => {
    if (!address) throw new Error('Wallet not connected');
    
    return joinGame({
      address: WORDLE_FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: 'joinGameById',
      args: [gameId, wordCommitmentHashes],
    });
  };
  
  const joinGameByContract = async (gameContract: `0x${string}`, wordCommitmentHashes: `0x${string}`[]) => {
    if (!address) throw new Error('Wallet not connected');
    
    return joinGame({
      address: WORDLE_FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: 'joinGameByContract',
      args: [gameContract, wordCommitmentHashes],
    });
  };
  
  const checkGameIdAvailability = (gameId: string) => {
    return useReadContract({
      address: WORDLE_FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: 'isGameIdAvailable',
      args: [gameId],
    });
  };
  
  return {
    // Data
    totalGames: totalGames as bigint | undefined,
    activeGames: activeGames as GameInfo[] | undefined,
    playerGames: playerGames as GameInfo[] | undefined,
    
    // Actions
    createNewGame,
    joinGameById,
    joinGameByContract,
    checkGameIdAvailability,
    
    // Loading states
    isCreatingGame,
    isJoiningGame,
    
    // Refetch functions
    refetchActiveGames,
    refetchPlayerGames,
    refetchTotalGames,
  };
}