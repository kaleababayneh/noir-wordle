import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { abi } from "../abi/abi.ts";
import { WORDLE_CONTRACT_ADDRESS } from "../constant.ts";
import { generateProof, fetchWordCommitmentHashes, getCurrentTurn, getTurnToVerify } from "../utils/generateProof.ts";

// Player addresses derived from private keys
const PLAYER_1_ADDRESS = "0x532581141fA3a833090F95eBB76aCEa8Eaf9dD7d";
const PLAYER_2_ADDRESS = "0x0b4A86d53A47f643427f041DCA2E212E615d65E7";

// taken from @aztec/bb.js/proof
export function uint8ArrayToHex(buffer: Uint8Array): string {
  const hex: string[] = [];

  buffer.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = "0" + h;
    }
    hex.push(h);
  });

  return hex.join("");
}

export default function TwoPlayerGame() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState("");
  const [wordCommitmentHashes, setWordCommitmentHashes] = useState<string[] | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);


  const showLog = (content: string): void => {
    setLogs((prevLogs) => [...prevLogs, content]);
  };

  // Function to refresh game state
  const refreshGameState = async () => {
    try {
      const currentTurn = await getCurrentTurn();
      setCurrentTurn(currentTurn);
      showLog(`Current turn: ${currentTurn === PLAYER_1_ADDRESS ? 'Player 1' : 'Player 2'}`);
    } catch (error) {
      console.error("Error fetching game state:", error);
    }
  };

  // Load game state on component mount
  useEffect(() => {
    refreshGameState();
  }, []);

  // Player 1 makes a guess
  const handlePlayer1Guess = async () => {
    if (currentTurn !== PLAYER_1_ADDRESS) {
      showLog("❌ It's not Player 1's turn!");
      return;
    }

    if (!guessInput || guessInput.length !== 5) {
      showLog("❌ Please enter exactly 5 letters");
      return;
    }

    if (!/^[a-z]+$/i.test(guessInput)) {
      showLog("❌ Please enter only letters (a-z)");
      return;
    }

    try {
      setLogs([]);
      showLog(`Player 1 making guess: "${guessInput.toUpperCase()}" 🎯`);

      await writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: "guess",
        args: [
          PLAYER_1_ADDRESS, // player address
          guessInput.toLowerCase() // guess word
        ],
      });
    } catch (error: unknown) {
      console.error(error);
      showLog("❌ Error occurred during guess submission");
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Player 2 verifies the guess
  const handlePlayer2Verify = async () => {
    if (currentTurn !== PLAYER_1_ADDRESS) {
      showLog("❌ No guess to verify yet! Player 1 needs to make a guess first.");
      return;
    }

    try {
      setLogs([]);
      showLog("Player 2 starting verification process... 🔍");
      
      // Fetch word commitment hashes for the current player (Player 1)
      let hashes = wordCommitmentHashes;
      let hashArrayName = '';
      if (!hashes) {
        showLog("Fetching word commitment hashes from contract... ⏳");
        const result = await fetchWordCommitmentHashes();
        hashes = result.wordCommitmentHashes;
        hashArrayName = result.hashArrayName;
        setWordCommitmentHashes(hashes);
        showLog("Word commitment hashes fetched! ✅");
      }
      
      // Use the guessed word for proof generation
      const guessWord = guessInput.toLowerCase();
      showLog(`Generating proof for guess: "${guessWord.toUpperCase()}" ⏳`);
      
      // Generate the proof using the appropriate word commitment hashes
      const { proof, publicInputs } = await generateProof(showLog, guessWord, hashes, hashArrayName);
      showLog("Proof generated... ✅");

      // Extract results from public inputs (positions 10-14)
      const results: `0x${string}`[] = [];
      for (let i = 10; i < 15; i++) {
        const result = publicInputs[i].startsWith('0x') ? publicInputs[i] : `0x${publicInputs[i]}`;
        results.push(result as `0x${string}`);
      }
      
      console.log("publicInputs:", publicInputs);
      console.log("proof:", uint8ArrayToHex(proof));
      console.log("extracted results:", results);

      // Player 2 submits the verification
      showLog("Player 2 submitting verification... ⏳");

      await writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: "verify_guess",
        args: [
          `0x${uint8ArrayToHex(proof)}`, // proof bytes
          results,                       // results array (bytes32[])
          PLAYER_2_ADDRESS,              // verifier player address (Player 2)
          guessWord                      // guess word string
        ],
      });
    } catch (error: unknown) {
      console.error(error);
      showLog("❌ Error occurred during proof verification");
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Watch for transaction states
  useEffect(() => {
    if (isPending) {
      showLog("Transaction is processing... ⏳");
    }

    if (error) {
      showLog("❌ Transaction failed!");
      setResults("Transaction failed.");
      console.error("Transaction error:", error);
    }
    
    if (isConfirming) {
      showLog("Transaction confirming... ⏳");
    }
    
    if (isConfirmed) {
      showLog("✅ Transaction confirmed!");
      setResults("Transaction succeeded!");
      
      if (hash) {
        showLog(`Transaction hash: ${hash}`);
        console.log("🔗 View on explorer:", `https://sepolia.etherscan.io/tx/${hash}`);
      }

      // Refresh game state after successful transaction
      setTimeout(refreshGameState, 2000);
    }
  }, [isPending, error, isConfirming, isConfirmed, hash]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">🎯 Two-Player Wordle</h1>
      
      {/* Game State Display */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Game State</h2>
        <p><strong>Current Turn:</strong> {currentTurn === PLAYER_1_ADDRESS ? 'Player 1 (Make Guess)' : 
                                          currentTurn === PLAYER_2_ADDRESS ? 'Player 2 (Make Guess)' : 
                                          'Loading...'}</p>
        <p><strong>Player 1:</strong> {PLAYER_1_ADDRESS}</p>
        <p><strong>Player 2:</strong> {PLAYER_2_ADDRESS}</p>
      </div>

      {/* Input for guess */}
      <div className="mb-6">
        <label htmlFor="guess" className="block text-sm font-medium text-gray-700 mb-2">
          Enter 5-letter word:
        </label>
        <input
          type="text"
          id="guess"
          maxLength={5}
          placeholder="Enter 5-letter word"
          value={guessInput}
          onChange={(e) => setGuessInput(e.target.value.toLowerCase())}
          className="w-full px-4 py-3 text-lg text-center uppercase tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ textTransform: 'uppercase' }}
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-4 mb-6">
        <button
          onClick={handlePlayer1Guess}
          disabled={isPending || isConfirming || currentTurn !== PLAYER_1_ADDRESS}
          className="w-full px-6 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming ? 'Processing...' : '🎯 Player 1: Make Guess'}
        </button>

        <button
          onClick={handlePlayer2Verify}
          disabled={isPending || isConfirming || currentTurn !== PLAYER_1_ADDRESS}
          className="w-full px-6 py-3 text-lg font-medium text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming ? 'Processing...' : '✅ Player 2: Verify Guess'}
        </button>

        <button
          onClick={refreshGameState}
          className="w-full px-6 py-3 text-lg font-medium text-gray-700 bg-gray-200 rounded-lg shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          🔄 Refresh Game State
        </button>
      </div>

      {/* Logs and results */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Activity Log</h3>
        <div className="max-h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="mb-1 text-sm">
              {log}
            </div>
          ))}
        </div>
        
        {results && (
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <div className="font-semibold text-blue-800">{results}</div>
          </div>
        )}
      </div>
    </div>
  );
}
