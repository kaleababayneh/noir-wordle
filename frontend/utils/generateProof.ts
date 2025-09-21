import { UltraHonkBackend, Barretenberg, Fr } from "@aztec/bb.js";
import circuit from "../../circuits/target/circuits.json";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";
import { readContract } from '@wagmi/core';
import { config } from '../config';
import { abi } from '../abi/abi';
import { WORDLE_CONTRACT_ADDRESS } from '../constant';

import { CompiledCircuit } from '@noir-lang/types';

const HARDCODED_VALUES = {
  player1CorrectLetters: [
    "0x0000000000000000000000000000000000000000000000000000000000000061", // a (97)
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x000000000000000000000000000000000000000000000000000000000000006c", // l (108)
    "0x0000000000000000000000000000000000000000000000000000000000000065"  // e (101)
  ],
  player2CorrectLetters: [
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x0000000000000000000000000000000000000000000000000000000000000065", // e (101)
    "0x0000000000000000000000000000000000000000000000000000000000000061", // a (97)
    "0x0000000000000000000000000000000000000000000000000000000000000063", // c (99)
    "0x0000000000000000000000000000000000000000000000000000000000000068"  // h (104)
  ]
};

function wordToLetterHex(word: string): string[] {
  if (word.length !== 5) {
    throw new Error("Word must be exactly 5 letters long");
  }
  
  return word.toLowerCase().split('').map(letter => {
    const ascii = letter.charCodeAt(0);
    return `0x${ascii.toString(16).padStart(64, '0')}`;
  });
}

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

// Function to fetch word commitment hashes from the contract for verification
// This matches the updated contract logic: the verifier uses their own word commitment hashes
// When Player 1 makes a guess, Player 2 verifies using Player 2's hashes (word_commitment_hash2)
// When Player 2 makes a guess, Player 1 verifies using Player 1's hashes (word_commitment_hash1)
export async function fetchWordCommitmentHashes(): Promise<{ wordCommitmentHashes: string[], hashArrayName: string }> {
  try {

    // Get who should verify the current guess
    const turnToVerify = await readContract(config, {
      address: WORDLE_CONTRACT_ADDRESS,
      abi: abi,
      functionName: 'getTurnToVerify',
    }) as `0x${string}`;
    
    // Get player addresses
    const player1 = await readContract(config, {
      address: WORDLE_CONTRACT_ADDRESS,
      abi: abi,
      functionName: 'player1',
    }) as `0x${string}`;
    
    const wordCommitmentHashes: string[] = [];
    
    // Use the verifier's word commitment hashes (matches contract logic)
    // If Player 1 is verifying, use word_commitment_hash1
    // If Player 2 is verifying, use word_commitment_hash2
    const hashArrayName = turnToVerify.toLowerCase() === player1.toLowerCase() ? 'word_commitment_hash1' : 'word_commitment_hash2';
    
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

// Helper function to simulate the wordle checker logic
async function calculateWordleResults(guessLetters: string[], correctLetters: string[]): Promise<number[]> {
  // Ensure we have arrays
  if (!Array.isArray(guessLetters)) {
    console.error('guessLetters is not an array:', guessLetters);
    throw new Error('guessLetters must be an array');
  }
  if (!Array.isArray(correctLetters)) {
    console.error('correctLetters is not an array:', correctLetters);
    throw new Error('correctLetters must be an array');
  }
  
  // Convert hex strings to actual letters for comparison
  const guessChars = guessLetters.map(hex => String.fromCharCode(parseInt(hex, 16)));
  const correctChars = correctLetters.map(hex => String.fromCharCode(parseInt(hex, 16)));
  
  console.log('Guess word:', guessChars.join(''));
  console.log('Correct word:', correctChars.join(''));
  
  // Wordle logic: check each position for correct placement or existence elsewhere
  const results = [];
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === correctChars[i]) {
      results.push(2); // Correct position (green)
    } else {
      // Check if letter exists elsewhere (yellow = 1, not found = 0)
      const letterExistsElsewhere = correctChars.some((char, idx) => 
        idx !== i && char === guessChars[i]
      );
      results.push(letterExistsElsewhere ? 1 : 0);
    }
  }
  
  console.log('Calculated wordle results:', results);
  return results;
}

export async function generateProof(showLog:(content: string) => void, userGuess?: string, wordCommitmentHashes?: string[], hashArrayName?: string): Promise<{ proof: Uint8Array, publicInputs: string[] }> {
  try {
    showLog("Initializing Barretenberg backend... ⏳");
    const bb = await Barretenberg.new();
    const salt = new Fr(0n);

    // Use provided word commitment hashes, or fetch them, or fall back to hardcoded
    let commitmentHashes = wordCommitmentHashes;
    let finalHashArrayName = hashArrayName || '';
    
    if (!commitmentHashes) {
      showLog("Fetching word commitment hashes from contract... ⏳");
      const result = await fetchWordCommitmentHashes();
      commitmentHashes = result.wordCommitmentHashes;
      finalHashArrayName = result.hashArrayName;
    } else {
      if (!finalHashArrayName) {
        // When hashes are provided but no array name, we need to determine which player's they are
        const result = await fetchWordCommitmentHashes();
        finalHashArrayName = result.hashArrayName;
      }
    }

    // Use user guess if provided, otherwise throw error (since we always expect a guess now)
    if (!userGuess) {
      throw new Error("User guess is required");
    }
    const guessLetters = wordToLetterHex(userGuess);
    
    showLog("Computing guess letter hashes... ⏳");
    // Generate hashes for the guess letters using the same method as the contract script
    const guessLetterHashes = [];
    for (let i = 0; i < 5; i++) {
      const letterAscii = guessLetters[i];
      const hash = (await bb.poseidon2Hash([salt, Fr.fromString(letterAscii)])).toString();
      guessLetterHashes.push(hash);
    }

    showLog("Setting up Noir circuit... ⏳");
    const noir = new Noir(circuit as CompiledCircuit);
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
    
    // Determine which player's correct letters to use based on the hash array being verified
    // If verifying word_commitment_hash1, use player1's correct letters ("apple")
    // If verifying word_commitment_hash2, use player2's correct letters ("peach")
    const correctLetters = finalHashArrayName === 'word_commitment_hash2' 
      ? HARDCODED_VALUES.player2CorrectLetters 
      : HARDCODED_VALUES.player1CorrectLetters;

    showLog("Calculating Wordle results... ⏳");
    // Calculate the wordle results using actual letters, not hashes
    const calculatedResults = await calculateWordleResults(guessLetters, correctLetters);
    
    showLog(`Using correct letters for ${finalHashArrayName === 'word_commitment_hash2' ? 'Player 2 (peach)' : 'Player 1 (apple)'}`);
    
    // Convert guess letters to simple ASCII numbers (as expected by circuit)
    const guessAsciiNumbers = guessLetters.map(hex => parseInt(hex, 16).toString());
    
    console.log('Debug - Guess letters (hex):', guessLetters);
    console.log('Debug - Guess ASCII numbers:', guessAsciiNumbers);
    console.log('Debug - Correct letters:', correctLetters);
    console.log('Debug - Commitment hashes:', commitmentHashes);
    
    // Prepare inputs in the format expected by the circuit
    const inputs = {
      // commitment hashes for each letter (now dynamic from contract)
      first_letter_commitment_hash: commitmentHashes[0],
      second_letter_commitment_hash: commitmentHashes[1],
      third_letter_commitment_hash: commitmentHashes[2],
      fourth_letter_commitment_hash: commitmentHashes[3],
      fifth_letter_commitment_hash: commitmentHashes[4],
      // guess letters as ASCII numbers (matching circuit expectation)
      first_letter_guess: guessAsciiNumbers[0],
      second_letter_guess: guessAsciiNumbers[1],
      third_letter_guess: guessAsciiNumbers[2],
      fourth_letter_guess: guessAsciiNumbers[3],
      fifth_letter_guess: guessAsciiNumbers[4],
      // calculated final result
      calculated_result: calculatedResults,
      // private inputs (correct letters) - now dynamic based on which player's word is being verified
      first_letter: correctLetters[0],
      second_letter: correctLetters[1],
      third_letter: correctLetters[2],
      fourth_letter: correctLetters[3],
      fifth_letter: correctLetters[4],
      salt: salt.toString()
    };





    showLog("Generating witness... ⏳");
    const { witness } = await noir.execute(inputs);
    showLog("Generated witness... ✅");

    showLog("Generating proof... ⏳");
    const { proof, publicInputs } = await honk.generateProof(witness, { keccak: true });
    showLog("Generated proof... ✅");
    
    showLog("Verifying proof... ⏳");
    const isValid = await honk.verifyProof({ proof, publicInputs });
    showLog(`Proof is valid: ${isValid} ✅`);

    // Clean up
    await bb.destroy();

    // Convert publicInputs to string array format expected by the contract
    const publicInputsStrings = publicInputs.map(input => input.toString());

    console.log("Proof: ", proof);
    console.log("Public Inputs: ", publicInputsStrings);
    console.log("Calculated Results: ", calculatedResults);
    
    return { proof, publicInputs: publicInputsStrings };
  } catch (error) {
    console.log(error);
    throw error;
  }
};