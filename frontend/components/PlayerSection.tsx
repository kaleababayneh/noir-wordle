import { useState } from 'react';
import { WordleGrid } from './WordleGrid';

interface GuessResult {
  word: string;
  results?: string[] | number[];
  isVerified: boolean;
}

interface PlayerSectionProps {
  playerNumber: 1 | 2;
  playerName: string;
  isPlayerTurn: boolean;
  canVerify: boolean;
  shouldVerify: boolean;
  hasPendingGuess: boolean;
  lastGuess: string;
  isPending: boolean;
  isConfirming: boolean;
  isGeneratingProof: boolean;
  playerGuesses: GuessResult[];
  onGuess: (guess: string) => void;
  onVerify: () => void;
  isCurrentUser: boolean;
  hasSecret?: boolean; // New prop to indicate if current user has secret for verification
}

export function PlayerSection({
  playerNumber,
  playerName,
  isPlayerTurn,
  canVerify,
  shouldVerify,
  hasPendingGuess,
  lastGuess,
  isPending,
  isConfirming,
  isGeneratingProof,
  playerGuesses,
  onGuess,
  onVerify,
  hasSecret,
  isCurrentUser
}: PlayerSectionProps) {
  const [guessInput, setGuessInput] = useState("");

  const handleGuess = () => {
    if (guessInput.length === 5 && /^[a-z]+$/i.test(guessInput)) {
      onGuess(guessInput.toLowerCase());
      setGuessInput(""); // Clear input immediately for next guess
    }
  };

  const playerColor = playerNumber === 1 ? 'blue' : 'green';
  const borderColor = playerNumber === 1 ? 'border-blue-500' : 'border-green-500';
  const buttonColor = playerNumber === 1 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600';
  const focusRing = playerNumber === 1 ? 'focus:ring-blue-500' : 'focus:ring-green-500';
  const activeBorder = playerNumber === 1 ? 'border-blue-500' : 'border-green-500';

  const otherPlayerNumber = playerNumber === 1 ? 2 : 1;

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${borderColor} ${
      !isCurrentUser ? 'opacity-75' : ''
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-2xl font-bold text-${playerColor}-600`}>
          👤 {playerName} {isCurrentUser ? '(You)' : ''}
        </h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isPlayerTurn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {isPlayerTurn ? '🎯 Your Turn' : '⏳ Waiting'}
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Wordle Grid */}
        <WordleGrid
          playerNumber={playerNumber}
          guesses={playerGuesses}
          currentGuess={isPlayerTurn ? guessInput : ''}
          maxRows={6}
        />

        {/* Guess Input */}
        {isCurrentUser ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Make Your Guess (5 letters)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value.toLowerCase())}
                placeholder="Enter your guess..."
                maxLength={5}
                className={`flex-1 px-4 py-2 border rounded-lg ${focusRing} focus:ring-2 focus:border-transparent ${
                  isPlayerTurn ? `${activeBorder} border-2` : 'border-gray-300'
                }`}
                disabled={!isPlayerTurn || isPending || isConfirming}
              />
              <button
                onClick={handleGuess}
                disabled={!isPlayerTurn || isPending || isConfirming || guessInput.length !== 5}
                className={`px-6 py-2 ${buttonColor} text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors`}
              >
                {isPending || isConfirming ? "..." : "Guess"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>This is your opponent's board</p>
            <p className="text-sm">You can only see their verified guesses</p>
          </div>
        )}

        {/* Verify Button - Only show for users who have the secret */}
        {hasSecret && (
          <div>
            <button
              onClick={onVerify}
              disabled={!canVerify || isGeneratingProof || isPending || isConfirming}
              className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <span>🔐</span>
              <span>
                {isGeneratingProof ? "Generating Proof..." : `Verify Player ${otherPlayerNumber}'s Guess`}
              </span>
            </button>
            {canVerify && (
              <p className="text-sm text-purple-600 mt-1">
                It's your turn to verify Player {otherPlayerNumber}'s guess: "{lastGuess}"
              </p>
            )}
            {shouldVerify && !hasPendingGuess && (
              <p className="text-sm text-gray-500 mt-1">
                Waiting for Player {otherPlayerNumber} to make a guess...
              </p>
            )}
          </div>
        )}
        
        {/* Show message for users without secret */}
        {isCurrentUser && !hasSecret && canVerify && (
          <div className="text-center py-4 text-gray-500">
            <p>🔐 Only the player with the secret word can verify guesses</p>
            <p className="text-sm">The other player will verify this guess</p>
          </div>
        )}
      </div>
    </div>
  );
}
