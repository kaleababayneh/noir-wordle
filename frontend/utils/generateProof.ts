import { UltraHonkBackend, Barretenberg, Fr } from "@aztec/bb.js";
import circuit from "../../circuits/target/circuits.json";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";

import { CompiledCircuit } from '@noir-lang/types';

// Hardcoded values from Wordle.t.sol test
const HARDCODED_VALUES = {
  // Word commitment hashes for "apple"
  wordCommitmentHashes: [
    "0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920", // a
    "0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70", // p
    "0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70", // p
    "0x0ed3294f4ba676f67296d5dcccdbe7dff01975032dda4c15eb3e732c77aa5cad", // l
    "0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00"  // e
  ],
  // Guess letters "apple" (ASCII values as hex)
  guessLetters: [
    "0x0000000000000000000000000000000000000000000000000000000000000061", // a (97)
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x000000000000000000000000000000000000000000000000000000000000006c", // l (108)
    "0x0000000000000000000000000000000000000000000000000000000000000065"  // e (101)
  ],
  // Correct letters "apple" (ASCII values as hex)
  correctLetters: [
    "0x0000000000000000000000000000000000000000000000000000000000000061", // a (97)
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x0000000000000000000000000000000000000000000000000000000000000070", // p (112)
    "0x000000000000000000000000000000000000000000000000000000000000006c", // l (108)
    "0x0000000000000000000000000000000000000000000000000000000000000065"  // e (101)
  ]
};

// Helper function to simulate the wordle checker logic
async function calculateWordleResults(guessLetterHashes: string[], correctCommitmentHashes: string[]): Promise<number[]> {
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

export async function generateProof(showLog:(content: string) => void): Promise<{ proof: Uint8Array, publicInputs: string[] }> {
  try {
    showLog("Initializing Barretenberg backend... ⏳");
    const bb = await Barretenberg.new();
    const salt = new Fr(0n);

    showLog("Computing guess letter hashes... ⏳");
    // Generate hashes for the guess letters using the same method as the contract script
    const guessLetterHashes = [];
    for (let i = 0; i < 5; i++) {
      const letterAscii = HARDCODED_VALUES.guessLetters[i];
      const hash = (await bb.poseidon2Hash([salt, Fr.fromString(letterAscii)])).toString();
      guessLetterHashes.push(hash);
    }

    showLog("Calculating Wordle results... ⏳");
    // Calculate the wordle results
    const calculatedResults = await calculateWordleResults(guessLetterHashes, HARDCODED_VALUES.wordCommitmentHashes);

    showLog("Setting up Noir circuit... ⏳");
    const noir = new Noir(circuit as CompiledCircuit);
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
    
    // Prepare inputs in the format expected by the circuit
    const inputs = {
      // commitment hashes for each letter
      first_letter_commitment_hash: HARDCODED_VALUES.wordCommitmentHashes[0],
      second_letter_commitment_hash: HARDCODED_VALUES.wordCommitmentHashes[1],
      third_letter_commitment_hash: HARDCODED_VALUES.wordCommitmentHashes[2],
      fourth_letter_commitment_hash: HARDCODED_VALUES.wordCommitmentHashes[3],
      fifth_letter_commitment_hash: HARDCODED_VALUES.wordCommitmentHashes[4],
      // guess letters
      first_letter_guess: HARDCODED_VALUES.guessLetters[0],
      second_letter_guess: HARDCODED_VALUES.guessLetters[1],
      third_letter_guess: HARDCODED_VALUES.guessLetters[2],
      fourth_letter_guess: HARDCODED_VALUES.guessLetters[3],
      fifth_letter_guess: HARDCODED_VALUES.guessLetters[4],
      // calculated final result
      calculated_result: calculatedResults,
      // private inputs (correct letters)
      first_letter: HARDCODED_VALUES.correctLetters[0],
      second_letter: HARDCODED_VALUES.correctLetters[1],
      third_letter: HARDCODED_VALUES.correctLetters[2],
      fourth_letter: HARDCODED_VALUES.correctLetters[3],
      fifth_letter: HARDCODED_VALUES.correctLetters[4],
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