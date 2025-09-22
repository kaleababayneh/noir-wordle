

import { WORD_LENGTH, WORDLE_RESULTS } from './constants';


export function wordToLetterHex(word: string): string[] {
  if (word.length !== WORD_LENGTH) {
    throw new Error(`Word must be exactly ${WORD_LENGTH} letters long`);
  }
  
  return word.toLowerCase().split('').map(letter => {
    const ascii = letter.charCodeAt(0);
    return `0x${ascii.toString(16).padStart(64, '0')}`;
  });
}


export function hexLettersToAsciiNumbers(hexLetters: string[]): string[] {
  return hexLetters.map(hex => parseInt(hex, 16).toString());
}

export function hexLettersToChars(hexLetters: string[]): string[] {
  return hexLetters.map(hex => String.fromCharCode(parseInt(hex, 16)));
}

export async function calculateWordleResults(guessLetters: string[], correctLetters: string[]): Promise<number[]> {
  // Validate inputs
  if (!Array.isArray(guessLetters)) {
    console.error('guessLetters is not an array:', guessLetters);
    throw new Error('guessLetters must be an array');
  }
  if (!Array.isArray(correctLetters)) {
    console.error('correctLetters is not an array:', correctLetters);
    throw new Error('correctLetters must be an array');
  }
  
  if (guessLetters.length !== WORD_LENGTH || correctLetters.length !== WORD_LENGTH) {
    throw new Error(`Both guess and correct letters must have exactly ${WORD_LENGTH} letters`);
  }
  
  // Convert hex strings to actual letters for comparison
  const guessChars = hexLettersToChars(guessLetters);
  const correctChars = hexLettersToChars(correctLetters);
  
  console.log('Guess word:', guessChars.join(''));
  console.log('Correct word:', correctChars.join(''));
  
  // Wordle logic: check each position for correct placement or existence elsewhere
  const results = [];
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === correctChars[i]) {
      results.push(WORDLE_RESULTS.CORRECT); // Correct position (green)
    } else {
      // Check if letter exists elsewhere (yellow = 1, not found = 0)
      const letterExistsElsewhere = correctChars.some((char, idx) => 
        idx !== i && char === guessChars[i]
      );
      results.push(letterExistsElsewhere ? WORDLE_RESULTS.WRONG_POSITION : WORDLE_RESULTS.INCORRECT);
    }
  }
  
  console.log('Calculated wordle results:', results);
  return results;
}

/**
 * Get the correct letters for a specific player based on hash array name
 */
export function getCorrectLettersForPlayer(hashArrayName: string, hardcodedValues: any): string[] {

  return hashArrayName === 'word_commitment_hash2' 
    ? hardcodedValues.player2CorrectLetters 
    : hardcodedValues.player1CorrectLetters;
}


export function getPlayerNameFromHashArray(hashArrayName: string): string {
  return hashArrayName === 'word_commitment_hash2' ? 'Player 2 ' : 'Player 1 ';
}
