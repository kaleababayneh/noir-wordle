interface GuessResult {
  player: string;
  guess: string;
  results: string[];
}

interface GuessHistoryProps {
  guessHistory: GuessResult[];
  getPlayerName: (address: string) => string;
}

export function GuessHistory({ guessHistory, getPlayerName }: GuessHistoryProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Guess History</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {guessHistory.length === 0 ? (
          <p className="text-gray-500 italic">No guesses yet...</p>
        ) : (
          guessHistory.map((guess, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-800">
                  {getPlayerName(guess.player)}
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {guess.guess.toUpperCase()}
                </span>
              </div>
              <div className="flex space-x-1">
                {guess.results.map((result, i) => (
                  <div key={i} className={`w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold ${
                    result === '0x0000000000000000000000000000000000000000000000000000000000000002' ? 'bg-green-500' :
                    result === '0x0000000000000000000000000000000000000000000000000000000000000001' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`}>
                    {guess.guess[i].toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
