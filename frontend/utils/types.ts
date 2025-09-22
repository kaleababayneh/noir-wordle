/**
 * Type definitions for the ZK Wordle game
 */

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: string[];
}

export interface WordCommitmentResult {
  wordCommitmentHashes: string[];
  hashArrayName: string;
}

export interface CircuitInputs {
  // commitment hashes for each letter
  first_letter_commitment_hash: string;
  second_letter_commitment_hash: string;
  third_letter_commitment_hash: string;
  fourth_letter_commitment_hash: string;
  fifth_letter_commitment_hash: string;
  // guess letters as ASCII numbers
  first_letter_guess: string;
  second_letter_guess: string;
  third_letter_guess: string;
  fourth_letter_guess: string;
  fifth_letter_guess: string;
  // calculated final result
  calculated_result: number[];
  // private inputs (correct letters)
  first_letter: string;
  second_letter: string;
  third_letter: string;
  fourth_letter: string;
  fifth_letter: string;
  salt: string;
}

export type LogFunction = (content: string) => void;
