/**
 * Contract interaction utilities for reading game state
 */

import { readContract } from '@wagmi/core';
import { config } from '../config';
import { abi } from '../abi/abi';
import { WordCommitmentResult } from './types';

/**
 * Get the current player whose turn it is to make a guess
 */
export async function getCurrentTurn(gameAddress: `0x${string}`): Promise<string> {
  try {
    const currentTurn = await readContract(config, {
      address: gameAddress,
      abi: abi,
      functionName: 'getTurnToPlay',
    }) as `0x${string}`;
    
    return currentTurn;
  } catch (error) {
    console.error('Error fetching current turn:', error);
    throw error;
  }
}

/**
 * Get the player whose turn it is to verify the current guess
 */
export async function getTurnToVerify(gameAddress: `0x${string}`): Promise<string> {
  try {
    const turnToVerify = await readContract(config, {
      address: gameAddress,
      abi: abi,
      functionName: 'getTurnToVerify',
    }) as `0x${string}`;
    
    return turnToVerify;
  } catch (error) {
    console.error('Error fetching turn to verify:', error);
    throw error;
  }
}

/**
 * Get player1 address from the contract
 */
export async function getPlayer1Address(gameAddress: `0x${string}`): Promise<string> {
  try {
    const player1 = await readContract(config, {
      address: gameAddress,
      abi: abi,
      functionName: 'player1',
    }) as `0x${string}`;
    
    return player1;
  } catch (error) {
    console.error('Error fetching player1 address:', error);
    throw error;
  }
}

/**
 * Get player2 address from the contract
 */
export async function getPlayer2Address(gameAddress: `0x${string}`): Promise<string> {
  try {
    const player2 = await readContract(config, {
      address: gameAddress,
      abi: abi,
      functionName: 'player2',
    }) as `0x${string}`;
    
    return player2;
  } catch (error) {
    console.error('Error fetching player2 address:', error);
    throw error;
  }
}

/**
 * Get the winner of the game
 */
export async function getWinner(gameAddress: `0x${string}`): Promise<string> {
  try {
    const winner = await readContract(config, {
      address: gameAddress,
      abi: abi,
      functionName: 'winner',
    }) as `0x${string}`;
    
    return winner;
  } catch (error) {
    console.error('Error fetching winner:', error);
    throw error;
  }
}

/**
 * Get the last guess made in the game
 */
export async function getLastGuess(gameAddress: `0x${string}`): Promise<string> {
  try {
    const lastGuess = await readContract(config, {
      address: gameAddress,
      abi: abi,
      functionName: 'last_guess',
    }) as string;
    
    return lastGuess;
  } catch (error) {
    console.error('Error fetching last guess:', error);
    throw error;
  }
}

/**
 * Get the number of guesser attempts
 */
export async function getGuesserAttempts(gameAddress: `0x${string}`): Promise<number> {
  try {
    const attempts = await readContract(config, {
      address: gameAddress,
      abi: abi,
      functionName: 'guesser_attempts',
    }) as unknown as bigint;
    
    return Number(attempts);
  } catch (error) {
    console.error('Error fetching guesser attempts:', error);
    throw error;
  }
}

/**
 * Get the number of verifier attempts
 */
export async function getVerifierAttempts(gameAddress: `0x${string}`): Promise<number> {
  try {
    const attempts = await readContract(config, {
      address: gameAddress,
      abi: abi,
      functionName: 'verifier_attempts',
    }) as unknown as bigint;
    
    return Number(attempts);
  } catch (error) {
    console.error('Error fetching verifier attempts:', error);
    throw error;
  }
}

/**
 * Fetch word commitment hashes from the contract for verification
 * This matches the updated contract logic: the verifier uses their own word commitment hashes
 * When Player 1 makes a guess, Player 2 verifies using Player 2's hashes (word_commitment_hash2)
 * When Player 2 makes a guess, Player 1 verifies using Player 1's hashes (word_commitment_hash1)
 */
export async function fetchWordCommitmentHashes(gameAddress: `0x${string}`, currentUserAddress?: string): Promise<WordCommitmentResult> {
  try {
    // Get player addresses
    const player1 = await getPlayer1Address(gameAddress);
    const player2 = await getPlayer2Address(gameAddress);
    
    // Determine which player the current user is
    let isCurrentUserPlayer1 = false;
    if (currentUserAddress) {
      isCurrentUserPlayer1 = currentUserAddress.toLowerCase() === player1.toLowerCase();
    } else {
      // Fallback to using turnToVerify if no currentUserAddress provided
      const turnToVerify = await getTurnToVerify(gameAddress);
      isCurrentUserPlayer1 = turnToVerify.toLowerCase() === player1.toLowerCase();
    }
    
    const wordCommitmentHashes: string[] = [];
    
    // Use the current user's word commitment hashes (their own secret)
    // If current user is Player 1, use word_commitment_hash1
    // If current user is Player 2, use word_commitment_hash2
    const hashArrayName = isCurrentUserPlayer1 
      ? 'word_commitment_hash1' 
      : 'word_commitment_hash2';
    
    for (let i = 0; i < 5; i++) {
      const hash = await readContract(config, {
        address: gameAddress,
        abi: abi,
        functionName: hashArrayName,
        args: [BigInt(i)],
      }) as `0x${string}`;
      
      wordCommitmentHashes.push(hash);
    }
    
    const isCurrentUserPlayer2 = currentUserAddress?.toLowerCase() === player2.toLowerCase();
    
    console.log(`🔍 Hash fetch debug:`, {
      gameAddress,
      currentUserAddress,
      player1,
      player2,
      isCurrentUserPlayer1,
      isCurrentUserPlayer2,
      hashArrayName,
      fetchedHashes: wordCommitmentHashes
    });
    
    return { wordCommitmentHashes, hashArrayName };
  } catch (error) {
    console.error('Error fetching word commitment hashes:', error);
    throw error;
  }
}

/**
 * Generate commitment hashes for a word (for game creation)
 * @param word - 5-letter word to generate commitments for
 * @param gameContract - game contract address to store the secret for
 * @returns Array of commitment hashes
 */
export async function generateCommitmentHashes(word: string, gameContract?: string): Promise<`0x${string}`[]> {
  if (word.length !== 5) {
    throw new Error('Word must be exactly 5 letters');
  }

  const { generateSecureSalt, generateWordCommitment } = await import('./generateProof');
  
  try {
    const salt = generateSecureSalt();
    const commitmentHashes: `0x${string}`[] = [];
    const letterCodes: number[] = [];
    
    // Generate commitments and collect letter codes
    for (let i = 0; i < 5; i++) {
      const letter = word[i];
      const letterCode = letter.charCodeAt(0);
      letterCodes.push(letterCode);
      
      const commitment = await generateWordCommitment(letterCode, salt);
      commitmentHashes.push(commitment as `0x${string}`);
    }
    
    // Store the secret word locally for later verification
    if (gameContract) {
      const secretData = {
        word: word.toLowerCase(),
        letterCodes,
        salt: salt.toString(),
        timestamp: Date.now()
      };
      
      localStorage.setItem(`wordle_secret_${gameContract}`, JSON.stringify(secretData));
      console.log(`🔐 Stored secret for game ${gameContract}`);
    }
    
    console.log(`Generated commitment hashes for word "${word}":`, commitmentHashes);
    return commitmentHashes;
  } catch (error) {
    console.error('Error generating commitment hashes:', error);
    throw error;
  }
}

/**
 * Retrieve stored secret word for a game
 * @param gameContract - game contract address
 * @returns Secret data or null if not found
 */
export function getStoredSecret(gameContract: string): {
  word: string;
  letterCodes: number[];
  salt: string;
  timestamp: number;
} | null {
  try {
    const secretData = localStorage.getItem(`wordle_secret_${gameContract}`);
    if (!secretData) {
      return null;
    }
    
    return JSON.parse(secretData);
  } catch (error) {
    console.error('Error retrieving stored secret:', error);
    return null;
  }
}
