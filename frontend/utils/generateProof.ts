import { UltraHonkBackend, Barretenberg, Fr } from "@aztec/bb.js";
// @ts-ignore
import { Noir } from "@noir-lang/noir_js";
import { CompiledCircuit } from '@noir-lang/types';
import circuit from "../../circuits/target/circuits.json";
import { fetchWordCommitmentHashes } from './contractHelpers';
import { 
  wordToLetterHex, 
  hexLettersToAsciiNumbers, 
  calculateWordleResults,
  getCorrectLettersForPlayer,
  getPlayerNameFromHashArray
} from './gameLogic';
import { HARDCODED_VALUES } from './constants';
import { ProofResult, CircuitInputs, LogFunction } from './types';


function generateSecureSalt(): Fr {
  console.warn('Using hardcoded salt (0). Replace with secure random salt before deployment!');
  return new Fr(0n);
}


export async function generateProof(
  showLog: LogFunction, 
  userGuess?: string, 
  wordCommitmentHashes?: string[], 
  hashArrayName?: string
): Promise<ProofResult> {
  try {
    showLog("Initializing Barretenberg backend... ⏳");
    const bb = await Barretenberg.new();
    const salt = generateSecureSalt();

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

    // Validate user guess
    if (!userGuess) {
      throw new Error("User guess is required");
    }
    
    const guessLetters = wordToLetterHex(userGuess);
    
    showLog("Setting up Noir circuit... ⏳");
    const noir = new Noir(circuit as CompiledCircuit);
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });
    
    // Determine which player's correct letters to use based on the hash array being verified
    const correctLetters = getCorrectLettersForPlayer(finalHashArrayName, HARDCODED_VALUES);

    showLog("Calculating Wordle results... ⏳");
    // Calculate the wordle results using actual letters, not hashes
    const calculatedResults = await calculateWordleResults(guessLetters, correctLetters);
    
    const playerName = getPlayerNameFromHashArray(finalHashArrayName);
    showLog(`Using correct letters for ${playerName}`);
    
    // Convert guess letters to simple ASCII numbers (as expected by circuit)
    const guessAsciiNumbers = hexLettersToAsciiNumbers(guessLetters);
    
    console.log('Debug - Guess letters (hex):', guessLetters);
    console.log('Debug - Guess ASCII numbers:', guessAsciiNumbers);
    console.log('Debug - Correct letters:', correctLetters);
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
      // private inputs (correct letters) - now dynamic based on which player's word is being verified
      first_letter: correctLetters[0],
      second_letter: correctLetters[1],
      third_letter: correctLetters[2],
      fourth_letter: correctLetters[3],
      fifth_letter: correctLetters[4],
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
