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
      console.log(`🎮 GameCreated event received - ${logs.length} log(s)`);
      logs.forEach(async (log) => {
        try {
          const { gameContract, creator, gameId } = log.args as { 
            gameContract: string; 
            creator: string; 
            gameId: string;
          };
          
          console.log(`🎮 GameCreated details:`, {
            gameId,
            creator,
            gameContract,
            currentUserAddress: address,
            isCurrentUser: address && creator.toLowerCase() === address.toLowerCase()
          });
          
          // If this is the current user's game, store the secret
          if (address && creator.toLowerCase() === address.toLowerCase()) {
            console.log('🔐 This is current user\'s game, processing secret storage...');
            
            const pendingSecret = sessionStorage.getItem('pendingSecret');
            console.log('📦 Checking for pendingSecret:', { 
              exists: !!pendingSecret,
              value: pendingSecret ? JSON.parse(pendingSecret) : null
            });
            
            if (pendingSecret) {
              console.log('📦 Found pending secret in sessionStorage');
              
              try {
                const { word, gameId: pendingGameId } = JSON.parse(pendingSecret);
                console.log(`🔍 Comparing gameIds:`, {
                  pendingGameId,
                  createdGameId: gameId,
                  match: pendingGameId === gameId
                });
                
                if (pendingGameId === gameId) {
                  console.log('✅ GameId match, storing secret for contract:', gameContract);
                  
                  // Store the secret with the game contract address
                  const { generateCommitmentHashes } = await import('../utils/contractHelpers');
                  const hashes = await generateCommitmentHashes(word, gameContract);
                  
                  console.log('✅ generateCommitmentHashes completed:', {
                    word,
                    gameContract,
                    hashesReturned: hashes?.length || 0
                  });
                  
                  // Clear the pending secret
                  sessionStorage.removeItem('pendingSecret');
                  console.log(`🔐 Secret successfully stored and pending secret cleared for game ${gameId} at ${gameContract}`);
                } else {
                  console.log(`⚠️ GameId mismatch - not storing secret for this game`);
                }
              } catch (parseError) {
                console.error('❌ Error parsing or processing pending secret:', parseError);
              }
            } else {
              console.log('❌ No pending secret found in sessionStorage');
              
              // Debug: show all session storage items
              const sessionItems = Object.keys(sessionStorage);
              console.log('📝 All sessionStorage keys:', sessionItems);
              sessionItems.forEach(key => {
                console.log(`  - ${key}:`, sessionStorage.getItem(key));
              });
            }
          } else {
            console.log('ℹ️ Not current user\'s game, skipping secret storage');
          }
          
          // Refetch data
          refetchTotalGames();
          refetchActiveGames();
          if (address && creator.toLowerCase() === address.toLowerCase()) {
            refetchPlayerGames();
          }
        } catch (eventError) {
          console.error('❌ Error processing GameCreated event:', eventError);
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
      gas: 5000000n, // Set reasonable gas limit (5M)
    });
  };
  
  const joinGameById = async (gameId: string, wordCommitmentHashes: `0x${string}`[]) => {
    if (!address) throw new Error('Wallet not connected');
    
    return joinGame({
      address: WORDLE_FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: 'joinGameById',
      args: [gameId, wordCommitmentHashes],
      gas: 3000000n, // Set reasonable gas limit (3M)
    });
  };
  
  const joinGameByContract = async (gameContract: `0x${string}`, wordCommitmentHashes: `0x${string}`[]) => {
    if (!address) throw new Error('Wallet not connected');
    
    return joinGame({
      address: WORDLE_FACTORY_ADDRESS,
      abi: factoryAbi,
      functionName: 'joinGameByContract',
      args: [gameContract, wordCommitmentHashes],
      gas: 3000000n, // Set reasonable gas limit (3M)
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