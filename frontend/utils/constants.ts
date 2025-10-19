export const WORD_LENGTH = 5;

export const WORDLE_RESULTS = {
  INCORRECT: 0,      // Letter not in word (gray)
  WRONG_POSITION: 1, // Letter in word but wrong position (yellow)
  CORRECT: 2         // Letter in correct position (green)
} as const;
