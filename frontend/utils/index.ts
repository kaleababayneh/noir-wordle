// Main proof generation function
export { generateProof } from './generateProof';

// Merkle proof utilities
export {
  generateMerkleProof,
  isWordInDictionary,
  englishWordToField,
  formatPathIndicesForSolidity,
  loadMerkleTree
} from './merkleProof';

// Contract interaction utilities
export {
  getCurrentTurn,
  getTurnToVerify,
  getPlayer1Address,
  fetchWordCommitmentHashes
} from './contractHelpers';

// Game logic utilities
export {
  wordToLetterHex,
  hexLettersToAsciiNumbers,
  hexLettersToChars,
  calculateWordleResults,
  getCorrectLettersForPlayer,
  getPlayerNameFromHashArray
} from './gameLogic';

// Constants
export {
  HARDCODED_VALUES,
  WORD_LENGTH,
  WORDLE_RESULTS
} from './constants';

// Types
export type {
  ProofResult,
  WordCommitmentResult,
  CircuitInputs,
  LogFunction
} from './types';
