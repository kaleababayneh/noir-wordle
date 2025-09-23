import { UltraHonkBackend, Barretenberg, Fr } from "@aztec/bb.js";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";
import { CompiledCircuit } from '@noir-lang/types';
import circuit from "../../circuits/target/circuits.json";

import { 
  wordToLetterHex, 
  hexLettersToAsciiNumbers, 
  calculateWordleResults
} from './gameLogic';
import { ProofResult, CircuitInputs, LogFunction } from './types';
import { getStoredSecret } from './contractHelpers';
import { readContract } from '@wagmi/core';
import { config } from '../config';
import { abi } from '../abi/abi';
import { WORDLE_CONTRACT_ADDRESS } from '../constant';


export function generateSecureSalt(): Fr {
  // For now using salt 0 as specified, but can be made secure later
  console.log('Using salt Fr(0) as specified');
  return new Fr(0n);
}

/**
 * Generate a proper Poseidon commitment hash for a letter
 * This matches the circuit's commitment verification
 */
export async function generateWordCommitment(letterCode: number, salt: Fr): Promise<string> {
  try {
    const bb = await Barretenberg.new();
    
    // Create inputs for Poseidon2 hash: [salt, letter]
    const inputs = [salt, new Fr(BigInt(letterCode))];
    
    // Use Barretenberg's Poseidon2 implementation to match the circuit
    const hash = await bb.poseidon2Hash(inputs);
    
    await bb.destroy();
    
    // Convert to hex string
    const hashString = hash.toString();
    return `0x${BigInt(hashString).toString(16).padStart(64, '0')}`;
  } catch (error) {
    console.error('Error generating Poseidon commitment:', error);
    throw error;
  }
}


export async function generateProof(
  userGuess: string,
  gameContract: string,
  currentUserAddress?: string
): Promise<{ proof: Uint8Array; publicInputs: string[] }> {
  try {
    console.log("Initializing Barretenberg backend... ⏳");
    const bb = await Barretenberg.new();
    
    // Validate user guess
    if (!userGuess) {
      throw new Error("User guess is required");
    }

    if (!gameContract) {
      throw new Error("Game contract address is required");
    }

    // Get stored secret for this game
    console.log("Retrieving stored secret... ⏳");
    const storedSecret = getStoredSecret(gameContract);
    
    if (!storedSecret) {
      throw new Error("No stored secret found for this game. You can only verify guesses for games you created.");
    }

    const { word, letterCodes, salt: saltString } = storedSecret;
    const salt = new Fr(BigInt(saltString));

    // Fetch commitment hashes from the blockchain (the proper ZK way)
    // We need to find the correct hash array that matches our local secret
    console.log("Fetching word commitment hashes from contract... ⏳");
    
    // Try to determine which hash array contains our commitment hashes
    let commitmentHashes: string[] = [];
    let usedHashArray = '';
    
    // Generate what our commitment hashes should be locally for comparison
    const expectedHashes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const expectedCommitment = await generateWordCommitment(letterCodes[i], salt);
      expectedHashes.push(expectedCommitment);
    }
    
    // Try both hash arrays to find the one that matches our expected hashes
    const hashArrays = ['word_commitment_hash1', 'word_commitment_hash2'] as const;
    
    for (const hashArrayName of hashArrays) {
      const testHashes: string[] = [];
      
      for (let i = 0; i < 5; i++) {
        const hash = await readContract(config, {
          address: WORDLE_CONTRACT_ADDRESS,
          abi: abi,
          functionName: hashArrayName,
          args: [BigInt(i)],
        }) as `0x${string}`;
        testHashes.push(hash);
      }
      
      // Check if this hash array matches our expected hashes
      const matches = expectedHashes.every((expected, index) => 
        expected.toLowerCase() === testHashes[index].toLowerCase()
      );
      
      if (matches) {
        commitmentHashes = testHashes;
        usedHashArray = hashArrayName;
        console.log(`✅ Found matching commitment hashes in ${hashArrayName}`);
        break;
      }
    }
    
    if (commitmentHashes.length === 0) {
      throw new Error("Could not find matching commitment hashes in either hash array. This shouldn't happen.");
    }

    const guessLetters = wordToLetterHex(userGuess);
    
    console.log("Setting up Noir circuit... ⏳");
    const noir = new Noir(circuit as CompiledCircuit);
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
    
    console.log("Calculating Wordle results using your secret word... ⏳");
    // Convert letter codes to hex strings for calculateWordleResults
    const correctLettersHex = letterCodes.map(code => 
      `0x${code.toString(16).padStart(64, '0')}`
    );
    const calculatedResults = await calculateWordleResults(guessLetters, correctLettersHex);
    
    console.log(`Verifying guess "${userGuess}" against your secret word "${word}"`);
    
    // Convert guess letters to simple ASCII numbers (as expected by circuit)
    const guessAsciiNumbers = hexLettersToAsciiNumbers(guessLetters);
    
    console.log('Debug - Guess letters (hex):', guessLetters);
    console.log('Debug - Guess ASCII numbers:', guessAsciiNumbers);
    console.log('Debug - Your secret word:', word);
    console.log('Debug - Your secret letter codes:', letterCodes);
    console.log('Debug - Commitment hashes:', commitmentHashes);
    
    // Prepare inputs in the format expected by the circuit
    const inputs: CircuitInputs = {
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
      // private inputs (correct letters) - use the stored letter codes
      first_letter: letterCodes[0].toString(),
      second_letter: letterCodes[1].toString(),
      third_letter: letterCodes[2].toString(),
      fourth_letter: letterCodes[3].toString(),
      fifth_letter: letterCodes[4].toString(),
      salt: salt.toString()
    };

    console.log("Generating witness... ⏳");
    const { witness } = await noir.execute(inputs as Record<string, any>);
    console.log("Generated witness... ✅");

    console.log("Generating proof... ⏳");
    const { proof, publicInputs } = await honk.generateProof(witness, { keccak: true });
    // Convert publicInputs to string array format expected by the contract
    const publicInputsStrings = publicInputs.map(input => input.toString());
    console.log("Generated proof... ✅");

    // Clean up
    await bb.destroy();

    console.log("Proof: ", proof);
    console.log("Public Inputs: ", publicInputsStrings);
    console.log("Calculated Results: ", calculatedResults);
    
    return { proof, publicInputs: publicInputsStrings };
  } catch (error) {
    console.log(error);
    throw error;
  }
}
