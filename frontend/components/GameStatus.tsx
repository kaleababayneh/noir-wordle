interface GameStatusProps {
  guesserAttempts: number;
  verifierAttempts: number;
  gameStarted: boolean;
  gameEnded: boolean;
  lastGuess: string;
  currentTurn: string;
  winner: string;
  getPlayerName: (address: string) => string;
}

export function GameStatus({
  guesserAttempts,
  verifierAttempts,
  gameStarted,
  gameEnded,
  lastGuess,
  currentTurn,
  winner,
  getPlayerName
}: GameStatusProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        <div className="bg-blue-100 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{guesserAttempts}</div>
          <div className="text-sm text-gray-600">Guesses</div>
        </div>
        <div className="bg-indigo-100 rounded-lg p-4">
          <div className="text-2xl font-bold text-indigo-600">{verifierAttempts}</div>
          <div className="text-sm text-gray-600">Verifications</div>
        </div>
        <div className="bg-green-100 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">
            {gameEnded ? "Game Over" : gameStarted ? "In Progress" : "Waiting"}
          </div>
          <div className="text-sm text-gray-600">Status</div>
        </div>
        <div className="bg-purple-100 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-600">
            {lastGuess || "None"}
          </div>
          <div className="text-sm text-gray-600">Last Guess</div>
        </div>
        <div className="bg-yellow-100 rounded-lg p-4">
          <div className="text-sm font-medium text-yellow-600">
            {gameEnded ? getPlayerName(winner) : getPlayerName(currentTurn) || "None"}
          </div>
          <div className="text-sm text-gray-600">{gameEnded ? "Winner" : "Current Turn"}</div>
        </div>
      </div>
    </div>
  );
}
