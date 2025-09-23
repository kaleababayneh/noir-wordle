import { UltraHonkBackend, Barretenberg, Fr } from "@aztec/bb.js";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";
import { CompiledCircuit } from '@noir-lang/types';
import circuit from "../../circuits/target/circuits.json";
import { fetchWordCommitmentHashes } from './contractHelpers';
import { 
  wordToLetterHex, 
  hexLettersToAsciiNumbers, 
  calculateWordleResults
} from './gameLogic';
import { ProofResult, CircuitInputs, LogFunction } from './types';


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
  showLog: LogFunction, 
  userGuess?: string, 
  gameContract?: string,
  wordCommitmentHashes?: string[]
): Promise<ProofResult> {
  try {
    showLog("Initializing Barretenberg backend... ⏳");
    const bb = await Barretenberg.new();
    
    // Validate user guess
    if (!userGuess) {
      throw new Error("User guess is required");
    }

    if (!gameContract) {
      throw new Error("Game contract address is required");
    }

    // Get stored secret for this game
    showLog("Retrieving stored secret... ⏳");
    const { getStoredSecret } = await import('./contractHelpers');
    const storedSecret = getStoredSecret(gameContract);
    
    if (!storedSecret) {
      throw new Error("No stored secret found for this game. You can only verify guesses for games you created.");
    }

    const { word, letterCodes, salt: saltString } = storedSecret;
    const salt = new Fr(BigInt(saltString));

    // Use provided word commitment hashes, or fetch them
    let commitmentHashes = wordCommitmentHashes;
    
    if (!commitmentHashes) {
      showLog("Fetching word commitment hashes from contract... ⏳");
      const result = await fetchWordCommitmentHashes();
      commitmentHashes = result.wordCommitmentHashes;
    }

    const guessLetters = wordToLetterHex(userGuess);
    
    showLog("Setting up Noir circuit... ⏳");
    const noir = new Noir(circuit as CompiledCircuit);
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
    
    showLog("Calculating Wordle results using your secret word... ⏳");
    // Convert letter codes to hex strings for calculateWordleResults
    const correctLettersHex = letterCodes.map(code => 
      `0x${code.toString(16).padStart(64, '0')}`
    );
    const calculatedResults = await calculateWordleResults(guessLetters, correctLettersHex);
    
    showLog(`Verifying guess "${userGuess}" against your secret word "${word}"`);
    
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

    showLog("Generating witness... ⏳");
    const { witness } = await noir.execute(inputs as Record<string, any>);
    showLog("Generated witness... ✅");

    showLog("Generating proof... ⏳");
    const { proof, publicInputs } = await honk.generateProof(witness, { keccak: true });
    // Convert publicInputs to string array format expected by the contract
    const publicInputsStrings = publicInputs.map(input => input.toString());
    showLog("Generated proof... ✅");

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
