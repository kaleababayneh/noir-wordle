interface WordleGridProps {
  playerNumber: 1 | 2;
  guesses: Array<{
    word: string;
    results?: string[] | number[];
    isVerified: boolean;
  }>;
  currentGuess?: string;
  maxRows?: number;
}

export function WordleGrid({ 
  playerNumber, 
  guesses, 
  currentGuess = "",
  maxRows = 6 
}: WordleGridProps) {
  // Debug logging
  console.log(`Player ${playerNumber} WordleGrid guesses:`, guesses);
  
    // Helper function to get cell styling based on result
  const getCellStyling = (result?: string | number, hasLetter: boolean = false) => {
    const baseStyle = "w-12 h-12 border-2 flex items-center justify-center text-lg font-bold uppercase transition-all duration-300";
    
    if (!hasLetter) {
      return `${baseStyle} bg-white text-transparent border-gray-200`;
    }
    
    if (!result) {
      // Letter entered but not yet verified - Wordle style
      return `${baseStyle} bg-white text-gray-900 border-gray-400 shadow-sm`;
    }
    
    // Verified results - Wordle style with white text on colored backgrounds
    // Handle integer results: 2=green, 1=yellow, 0=gray
    const resultValue = typeof result === 'string' ? parseInt(result) : result;
    
    switch (resultValue) {
      case 2:
        return `${baseStyle} bg-green-600 text-white border-green-600 shadow-md`; // Correct position
      case 1:
        return `${baseStyle} bg-yellow-500 text-white border-yellow-500 shadow-md`; // Wrong position
      case 0:
      default:
        return `${baseStyle} bg-gray-600 text-white border-gray-600 shadow-md`; // Not in word
    }
  };

  // Create grid rows
  const rows = [];
  
  // Add completed guesses (verified or unverified)  
  for (let i = 0; i < guesses.length && i < maxRows; i++) {
    const guess = guesses[i];
    const cells = [];
    
    for (let j = 0; j < 5; j++) {
      // Only show letters if the word is valid and contains actual letters
      let letter = '';
      if (guess.word && guess.word.length === 5 && /^[a-zA-Z]{5}$/.test(guess.word)) {
        letter = guess.word[j] || '';
      }
      
      const result = guess.isVerified ? guess.results?.[j] : undefined;
      
      cells.push(
        <div 
          key={`${i}-${j}`} 
          className={getCellStyling(result, letter !== '')}
        >
          {letter}
        </div>
      );
    }
    
    rows.push(
      <div key={`row-${i}-${guess.word}-${guess.isVerified}`} className="flex gap-1 justify-center">
        {cells}
      </div>
    );
  }
  
  // Add current guess row (if there's space and a current guess)
  if (guesses.length < maxRows && currentGuess && currentGuess.length > 0) {
    const cells = [];
    
    for (let j = 0; j < 5; j++) {
      const letter = currentGuess[j] || '';
      
      cells.push(
        <div 
          key={`current-${j}`} 
          className={getCellStyling(undefined, letter !== '')}
        >
          {letter}
        </div>
      );
    }
    
    rows.push(
      <div key={`current-guess-${currentGuess}`} className="flex gap-1 justify-center">
        {cells}
      </div>
    );
  }
  
  // Fill remaining empty rows
  const remainingRows = maxRows - rows.length;
  for (let i = 0; i < remainingRows; i++) {
    const cells = [];
    
    for (let j = 0; j < 5; j++) {
      cells.push(
        <div 
          key={`empty-${i}-${j}`} 
          className={getCellStyling(undefined, false)}
        >
        </div>
      );
    }
    
    rows.push(
      <div key={`empty-row-${i}`} className="flex gap-1 justify-center">
        {cells}
      </div>
    );
  }

  const playerColor = playerNumber === 1 ? 'blue' : 'green';

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className={`text-center mb-3 text-sm font-semibold text-${playerColor}-600`}>
        Player {playerNumber} Board
      </div>
      <div className="flex flex-col gap-1 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        {rows}
      </div>
    </div>
  );
}
