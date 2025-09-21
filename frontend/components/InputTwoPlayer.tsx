import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { abi } from "../abi/abi.ts";
import { WORDLE_CONTRACT_ADDRESS } from "../constant.ts";
import { generateProof, fetchWordCommitmentHashes } from "../utils/generateProof.ts";

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

export default function InputTwoPlayer() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState("");
  const [wordCommitmentHashes, setWordCommitmentHashes] = useState<string[] | null>(null);
  const [guessInput, setGuessInput] = useState("peace");
  const { address } = useAccount();
  
  if (!address) {
    throw new Error(
      "Address is undefined. Please ensure the user is connected."
    );
  }

  const showLog = (content: string): void => {
    setLogs((prevLogs) => [...prevLogs, content]);
  };

  // Player 1 submits a guess
  const handlePlayer1Guess = async () => {
    setLogs([]);
    setResults("");

    try {
      // Validate input length
      if (guessInput.length !== 5) {
        showLog("❌ Please enter exactly 5 letters");
        setResults("Invalid input: word must be exactly 5 letters long");
        return;
      }
      
      // Validate input contains only letters
      if (!/^[a-z]+$/.test(guessInput)) {
        showLog("❌ Please enter only letters (a-z)");
        setResults("Invalid input: only letters are allowed");
        return;
      }
      
      showLog(`🎮 Player 1 submitting guess: "${guessInput.toUpperCase()}" 🔍`);

      await writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: "guess",
        args: [
          PLAYER_1_ADDRESS,     // player address
          guessInput            // guess word string
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
    setLogs([]);
    setResults("");

    try {
      showLog(`🔍 Player 2 verifying guess: "${guessInput.toUpperCase()}" 🔍`);
      
      // Fetch word commitment hashes if not already cached
      let hashes = wordCommitmentHashes;
      if (!hashes) {
        showLog("Fetching word commitment hashes from contract... ⏳");
        hashes = await fetchWordCommitmentHashes();
        setWordCommitmentHashes(hashes);
        showLog("Word commitment hashes fetched! ✅");
      }
      
      // Generate proof for the guess
      const { proof, publicInputs } = await generateProof(showLog, guessInput, hashes);
      showLog("Proof generated... ✅");

      // Extract results from public inputs (positions 10-14)
      const resultsArray: `0x${string}`[] = [];
      for (let i = 10; i < 15; i++) {
        // Ensure results are properly formatted as hex strings
        const result = publicInputs[i].startsWith('0x') ? publicInputs[i] : `0x${publicInputs[i]}`;
        resultsArray.push(result as `0x${string}`);
      }
      
      console.log("publicInputs:", publicInputs);
      console.log("proof:", uint8ArrayToHex(proof));
      console.log("extracted results:", resultsArray);

      // Submit verification transaction
      showLog("Submitting verification transaction... ⏳");

      await writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: "verify_guess",
        args: [
          `0x${uint8ArrayToHex(proof)}`, // proof bytes
          resultsArray,                  // results array (bytes32[])
          PLAYER_2_ADDRESS,              // verifier player address
          guessInput                     // guess word string
        ],
      });

    } catch (error: unknown) {
      console.error(error);
      showLog("❌ Error occurred during proof generation or verification");
      setResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Watch for pending, success, or error states from wagmi
  useEffect(() => {
    if (isPending) {
      showLog("Transaction is processing... ⏳");
      console.log("Transaction pending with hash:", hash);
    }

    if (error) {
      showLog("Oh no! Something went wrong. 😞");
      setResults("Transaction failed.");
      console.error("Transaction error:", error);
    }
    
    if (isConfirming) {
      showLog("Transaction in progress... ⏳");
      console.log("Transaction confirming with hash:", hash);
    }
    
    // If transaction is successful (status 1)
    if (isConfirmed) {
      showLog("Transaction succeeded! ✅");
      setResults("Transaction succeeded!");
      console.log("✅ Transaction confirmed successfully!");
      console.log("📝 Transaction hash:", hash);
      
      // Log additional transaction details if available
      if (hash) {
        showLog(`Transaction hash: ${hash}`);
        console.log("🔗 View on explorer:", `https://sepolia.etherscan.io/tx/${hash}`);
      }
    }
  }, [isPending, error, isConfirming, isConfirmed, hash]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Two-Player Wordle Game
        </h2>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Game Flow:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Player 1 submits a guess to the blockchain</li>
            <li>2. Player 2 generates a ZK proof and verifies the guess</li>
          </ol>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="guess" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your 5-letter guess:
            </label>
            <input
              type="text"
              id="guess"
              maxLength={5}
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value.toLowerCase())}
              placeholder="Enter 5-letter word"
              className="w-full px-6 py-4 text-lg text-gray-700 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center uppercase tracking-widest"
              style={{ textTransform: 'uppercase' }}
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                // Only allow letters and convert to lowercase
                const value = target.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
                setGuessInput(value);
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">👤 Player 1</h3>
              <p className="text-xs text-green-600 mb-3">
                Address: {PLAYER_1_ADDRESS.slice(0, 6)}...{PLAYER_1_ADDRESS.slice(-4)}
              </p>
              <button
                onClick={handlePlayer1Guess}
                disabled={isPending || isConfirming}
                className="w-full px-4 py-3 text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? 'Processing...' : 'Submit Guess'}
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">🔍 Player 2</h3>
              <p className="text-xs text-blue-600 mb-3">
                Address: {PLAYER_2_ADDRESS.slice(0, 6)}...{PLAYER_2_ADDRESS.slice(-4)}
              </p>
              <button
                onClick={handlePlayer2Verify}
                disabled={isPending || isConfirming}
                className="w-full px-4 py-3 text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? 'Processing...' : 'Verify Guess (ZK Proof)'}
              </button>
            </div>
          </div>
        </div>

        {/* Logs and results */}
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 mb-2">Transaction Logs:</h3>
          <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-2 text-sm">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {results && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="font-semibold text-yellow-800">{results}</div>
          </div>
        )}
      </div>
    </div>
  );
}
