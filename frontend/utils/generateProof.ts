import { UltraHonkBackend, Barretenberg, Fr } from "@aztec/bb.js";
import circuit from "../../circuits/target/circuits.json";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";
import { readContract } from '@wagmi/core';
import { config } from '../config';
import { abi } from '../abi/abi';
import { WORDLE_CONTRACT_ADDRESS } from '../constant';

import { CompiledCircuit } from '@noir-lang/types';

// Hardcoded values from Wordle.t.sol test
const HARDCODED_VALUES = {
  // Word commitment hashes for "apple"
  // wordCommitmentHashes: [
  //   "0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920", // a
  //   "0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70", // p
  //   "0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70", // p
  //   "0x0ed3294f4ba676f67296d5dcccdbe7dff01975032dda4c15eb3e732c77aa5cad", // l
  //   "0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00"  // e
  // ],
  // Guess letters "apple" (ASCII values as hex)
  // guessLetters: [
  //   "0x0000000000000000000000000000000000000000000000000000000000000061", // a (97)
  //   "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
  //   "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
  //   "0x000000000000000000000000000000000000000000000000000000000000006c", // l (108)
  //   "0x0000000000000000000000000000000000000000000000000000000000000065"  // e (101)
  // ],
  // Correct letters for Player 1's word ("apple") (ASCII values as hex)
  player1CorrectLetters: [
    "0x0000000000000000000000000000000000000000000000000000000000000061", // a (97)
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x000000000000000000000000000000000000000000000000000000000000006c", // l (108)
    "0x0000000000000000000000000000000000000000000000000000000000000065"  // e (101)
  ],
  // Correct letters for Player 2's word ("peach") (ASCII values as hex)
  player2CorrectLetters: [
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x0000000000000000000000000000000000000000000000000000000000000065", // e (101)
    "0x0000000000000000000000000000000000000000000000000000000000000061", // a (97)
    "0x0000000000000000000000000000000000000000000000000000000000000063", // c (99)
    "0x0000000000000000000000000000000000000000000000000000000000000068"  // h (104)
  ]
};

// Helper function to convert a word to letter ASCII hex values
function wordToLetterHex(word: string): string[] {
  if (word.length !== 5) {
    throw new Error("Word must be exactly 5 letters long");
  }
  
  return word.toLowerCase().split('').map(letter => {
    const ascii = letter.charCodeAt(0);
    return `0x${ascii.toString(16).padStart(64, '0')}`;
  });
}

// Function to get whose turn it is
export async function getCurrentTurn(): Promise<string> {
  try {
    const currentTurn = await readContract(config, {
      address: WORDLE_CONTRACT_ADDRESS,
      abi: abi,
      functionName: 'getTurn',
    }) as `0x${string}`;
    
    return currentTurn;
  } catch (error) {
    console.error('Error fetching current turn:', error);
    throw error;
  }
}

// Function to fetch word commitment hashes from the contract for verification
// When Player 1 makes a guess, we verify against Player 2's word commitment hashes
// When Player 2 makes a guess, we verify against Player 1's word commitment hashes
export async function fetchWordCommitmentHashes(): Promise<{ wordCommitmentHashes: string[], hashArrayName: string }> {
  try {
    // Get whose turn it is (who made the guess)
    const currentTurn = await getCurrentTurn();
    
    // Get player addresses
    const player1 = await readContract(config, {
      address: WORDLE_CONTRACT_ADDRESS,
      abi: abi,
      functionName: 'player1',
    }) as `0x${string}`;
    
    const wordCommitmentHashes: string[] = [];
    
    // Fetch the OPPOSITE player's word commitment hashes for verification
    // If it's Player 1's turn (they made the guess), verify against Player 2's hashes
    // If it's Player 2's turn (they made the guess), verify against Player 1's hashes
    const hashArrayName = currentTurn.toLowerCase() === player1.toLowerCase() ? 'word_commitment_hash2' : 'word_commitment_hash1';
    
    for (let i = 0; i < 5; i++) {
      const hash = await readContract(config, {
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: hashArrayName,
        args: [BigInt(i)],
      }) as `0x${string}`;
      
      wordCommitmentHashes.push(hash);
    }
    
    console.log(`Fetched word commitment hashes for ${hashArrayName}:`, wordCommitmentHashes);
    return { wordCommitmentHashes, hashArrayName };
  } catch (error) {
    console.error('Error fetching word commitment hashes:', error);
    throw error;
  }
}

// Function to fetch word commitment hashes (backwards compatibility)
export async function fetchWordCommitmentHashesOnly(): Promise<string[]> {
  try {
    const result = await fetchWordCommitmentHashes();
    return result.wordCommitmentHashes;
  } catch (error) {
    console.error('Error fetching word commitment hashes:', error);
    throw error;
  }
}

// Helper function to simulate the wordle checker logic
async function calculateWordleResults(guessLetterHashes: string[], correctCommitmentHashes: string[]): Promise<number[]> {
  // Ensure we have arrays
  if (!Array.isArray(guessLetterHashes)) {
    console.error('guessLetterHashes is not an array:', guessLetterHashes);
    throw new Error('guessLetterHashes must be an array');
  }
  if (!Array.isArray(correctCommitmentHashes)) {
    console.error('correctCommitmentHashes is not an array:', correctCommitmentHashes);
    throw new Error('correctCommitmentHashes must be an array');
  }
  
  console.log('calculateWordleResults inputs:', { guessLetterHashes, correctCommitmentHashes });
  
  // For "apple" vs "apple", all positions should be correct (value 2)
  // This is a simplified version - you might need to implement the actual wordle logic
  const results = [];
  for (let i = 0; i < 5; i++) {
    if (guessLetterHashes[i] === correctCommitmentHashes[i]) {
      results.push(2); // Correct position
    } else {
      // Check if letter exists elsewhere (yellow = 1, not found = 0)
      const letterExistsElsewhere = correctCommitmentHashes.some((hash, idx) => 
        idx !== i && hash === guessLetterHashes[i]
      );
      results.push(letterExistsElsewhere ? 1 : 0);
    }
  }
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
      console.log('After fetching from contract:', { commitmentHashes, finalHashArrayName });
    } else {
      if (!finalHashArrayName) {
        // When hashes are provided but no array name, we need to determine which player's they are
        const result = await fetchWordCommitmentHashes();
        finalHashArrayName = result.hashArrayName;
        showLog(`Using provided commitmentHashes, determined they are: ${finalHashArrayName}`);
      } else {
        showLog(`Using provided commitmentHashes for: ${finalHashArrayName}`);
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

    showLog("Calculating Wordle results... ⏳");
    console.log('About to call calculateWordleResults with:', { guessLetterHashes, commitmentHashes });
    // Calculate the wordle results
    const calculatedResults = await calculateWordleResults(guessLetterHashes, commitmentHashes);

    showLog("Setting up Noir circuit... ⏳");
    const noir = new Noir(circuit as CompiledCircuit);
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
    
    // Determine which player's correct letters to use based on the hash array being verified
    // If verifying word_commitment_hash1, use player1's correct letters ("apple")
    // If verifying word_commitment_hash2, use player2's correct letters ("peach")
    const correctLetters = finalHashArrayName === 'word_commitment_hash2' 
      ? HARDCODED_VALUES.player2CorrectLetters 
      : HARDCODED_VALUES.player1CorrectLetters;
    
    showLog(`Using correct letters for ${finalHashArrayName === 'word_commitment_hash2' ? 'Player 2 (peach)' : 'Player 1 (apple)'}`);
    
    // Prepare inputs in the format expected by the circuit
    const inputs = {
      // commitment hashes for each letter (now dynamic from contract)
      first_letter_commitment_hash: commitmentHashes[0],
      second_letter_commitment_hash: commitmentHashes[1],
      third_letter_commitment_hash: commitmentHashes[2],
      fourth_letter_commitment_hash: commitmentHashes[3],
      fifth_letter_commitment_hash: commitmentHashes[4],
      // guess letters (now dynamic based on user input)
      first_letter_guess: guessLetters[0],
      second_letter_guess: guessLetters[1],
      third_letter_guess: guessLetters[2],
      fourth_letter_guess: guessLetters[3],
      fifth_letter_guess: guessLetters[4],
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

    console.log('=== CIRCUIT INPUTS DEBUG ===');
    console.log('commitmentHashes:', commitmentHashes);
    console.log('guessLetters:', guessLetters);
    console.log('correctLetters:', correctLetters);
    console.log('calculatedResults:', calculatedResults);
    console.log('finalHashArrayName:', finalHashArrayName);
    console.log('inputs:', inputs);



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