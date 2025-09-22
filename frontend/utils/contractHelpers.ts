/**
 * Contract interaction utilities for reading game state
 */

import { readContract } from '@wagmi/core';
import { config } from '../config';
import { abi } from '../abi/abi';
import { WORDLE_CONTRACT_ADDRESS } from '../constant';
import { WordCommitmentResult } from './types';

/**
 * Get the current player whose turn it is to make a guess
 */
export async function getCurrentTurn(): Promise<string> {
  try {
    const currentTurn = await readContract(config, {
      address: WORDLE_CONTRACT_ADDRESS,
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
export async function getTurnToVerify(): Promise<string> {
  try {
    const turnToVerify = await readContract(config, {
      address: WORDLE_CONTRACT_ADDRESS,
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
export async function getPlayer1Address(): Promise<string> {
  try {
    const player1 = await readContract(config, {
      address: WORDLE_CONTRACT_ADDRESS,
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
export async function getPlayer2Address(): Promise<string> {
  try {
    const player2 = await readContract(config, {
      address: WORDLE_CONTRACT_ADDRESS,
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
 * Fetch word commitment hashes from the contract for verification
 * This matches the updated contract logic: the verifier uses their own word commitment hashes
 * When Player 1 makes a guess, Player 2 verifies using Player 2's hashes (word_commitment_hash2)
 * When Player 2 makes a guess, Player 1 verifies using Player 1's hashes (word_commitment_hash1)
 */
export async function fetchWordCommitmentHashes(): Promise<WordCommitmentResult> {
  try {
    // Get who should verify the current guess
    const turnToVerify = await getTurnToVerify();
    
    // Get player addresses
    const player1 = await getPlayer1Address();
    
    const wordCommitmentHashes: string[] = [];
    
    // Use the verifier's word commitment hashes (matches contract logic)
    // If Player 1 is verifying, use word_commitment_hash1
    // If Player 2 is verifying, use word_commitment_hash2
    const hashArrayName = turnToVerify.toLowerCase() === player1.toLowerCase() 
      ? 'word_commitment_hash1' 
      : 'word_commitment_hash2';
    
    for (let i = 0; i < 5; i++) {
      const hash = await readContract(config, {
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: hashArrayName,
        args: [BigInt(i)],
      }) as `0x${string}`;
      
      wordCommitmentHashes.push(hash);
    }
    
    console.log(`Fetched word commitment hashes for ${hashArrayName} (verifier's hashes):`, wordCommitmentHashes);
    return { wordCommitmentHashes, hashArrayName };
  } catch (error) {
    console.error('Error fetching word commitment hashes:', error);
    throw error;
  }
}

/**
 * Generate commitment hashes for a word (for game creation)
 * @param word - 5-letter word to generate commitments for
 * @returns Array of commitment hashes
 */
export async function generateCommitmentHashes(word: string): Promise<`0x${string}`[]> {
  if (word.length !== 5) {
    throw new Error('Word must be exactly 5 letters');
  }

  const { generateSecureSalt, generateWordCommitment } = await import('./generateProof');
  
  try {
    const salt = generateSecureSalt();
    const commitmentHashes: `0x${string}`[] = [];
    
    for (let i = 0; i < 5; i++) {
      const letter = word[i];
      const letterCode = letter.charCodeAt(0);
      const commitment = generateWordCommitment(letterCode, salt);
      commitmentHashes.push(commitment as `0x${string}`);
    }
    
    console.log(`Generated commitment hashes for word "${word}":`, commitmentHashes);
    return commitmentHashes;
  } catch (error) {
    console.error('Error generating commitment hashes:', error);
    throw error;
  }
}
