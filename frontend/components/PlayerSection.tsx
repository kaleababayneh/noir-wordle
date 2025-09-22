import { useState } from 'react';

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
  onGuess: (guess: string) => void;
  onVerify: () => void;
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
  onGuess,
  onVerify
}: PlayerSectionProps) {
  const [guessInput, setGuessInput] = useState("");

  const handleGuess = () => {
    if (guessInput.length === 5 && /^[a-z]+$/i.test(guessInput)) {
      onGuess(guessInput.toLowerCase());
      setGuessInput("");
    }
  };

  const playerColor = playerNumber === 1 ? 'blue' : 'green';
  const borderColor = playerNumber === 1 ? 'border-blue-500' : 'border-green-500';
  const buttonColor = playerNumber === 1 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600';
  const focusRing = playerNumber === 1 ? 'focus:ring-blue-500' : 'focus:ring-green-500';
  const activeBorder = playerNumber === 1 ? 'border-blue-500' : 'border-green-500';

  const otherPlayerNumber = playerNumber === 1 ? 2 : 1;

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-2xl font-bold text-${playerColor}-600`}>
          👤 {playerName}
        </h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isPlayerTurn ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {isPlayerTurn ? '🎯 Your Turn' : '⏳ Waiting'}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Guess Input */}
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

        {/* Verify Button */}
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
      </div>
    </div>
  );
}
