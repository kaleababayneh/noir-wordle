import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { abi } from "../abi/abi.ts";
import { WORDLE_CONTRACT_ADDRESS } from "../constant.ts";
import { generateProof, fetchWordCommitmentHashes } from "../utils/generateProof.ts";


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

export default function Input() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState("");
  const [wordCommitmentHashes, setWordCommitmentHashes] = useState<string[] | null>(null);
  const { address } = useAccount();
  
  if (!address) {
    throw new Error(
      "Address is undefined. Please ensure the user is connected."
    );
  }

  const showLog = (content: string): void => {
    setLogs((prevLogs) => [...prevLogs, content]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLogs([]);
    setResults("");

    try {
      const guessInput = (document.getElementById("guess") as HTMLInputElement)
        .value.trim().toLowerCase();
      
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
      
      showLog(`Processing guess: "${guessInput.toUpperCase()}" 🔍`);
      
      // Fetch word commitment hashes if not already cached
      let hashes = wordCommitmentHashes;
      if (!hashes) {
        showLog("Fetching word commitment hashes from contract... ⏳");
        hashes = await fetchWordCommitmentHashes();
        setWordCommitmentHashes(hashes);
        showLog("Word commitment hashes fetched! ✅");
      }
      
      // Step 4: Call your proof generator with the user's guess
      const { proof, publicInputs } = await generateProof(showLog, guessInput, hashes);
      console.log("passed step 4");
      showLog("Proof generated... ✅");

     
      // Step 5: Extract results from public inputs (positions 10-14)
      const results: `0x${string}`[] = [];
      for (let i = 10; i < 15; i++) {
        // Ensure results are properly formatted as hex strings
        const result = publicInputs[i].startsWith('0x') ? publicInputs[i] : `0x${publicInputs[i]}`;
        results.push(result as `0x${string}`);
      }
      
      console.log("publicInputs:", publicInputs);
      console.log("proof:", uint8ArrayToHex(proof));
      console.log("extracted results:", results);

      // Step 6: Send the proof to your contract
      showLog("Submitting transaction... ⏳");

      await writeContract({
        address: WORDLE_CONTRACT_ADDRESS,
        abi: abi,
        functionName: "verify_guess",
        args: [
          `0x${uint8ArrayToHex(proof)}`, // proof bytes
          results,                       // results array (bytes32[])
          "",                       // verifier player address
          guessInput                     // guess word string
        ],
      });
    } catch (error: unknown) {
      // Catch and log any other errors
      console.error(error);
      showLog("❌ Error occurred during proof generation or transaction");
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
      showLog("You got it right! ✅");
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
    <div>
      <p className="text-center text-gray-600 mb-6">
        Can you guess the secret word?
      </p>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <input
          type="text"
          id="guess"
          maxLength={5}
          placeholder="Enter 5-letter word"
          value="peace"
          className="w-full px-6 py-4 text-lg text-gray-700 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-center uppercase tracking-widest"
          style={{ textTransform: 'uppercase' }}
          onInput={(e) => {
            const target = e.target as HTMLInputElement;
            // Only allow letters and convert to uppercase
            target.value = target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
          }}
        />
        <button
          type="submit"
          id="submit"
          className="w-full px-6 py-4 text-lg font-medium text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending || isConfirming}
        >
          {isPending || isConfirming ? 'Processing...' : 'Submit Guess'}
        </button>
      </form>

      {/* Logs and results */}
      <div id="logs" className="mt-4 text-gray-700">
        {logs.map((log, index) => (
          <div key={index} className="mb-2">
            {log}
          </div>
        ))}
      </div>

      <div id="results" className="mt-4 text-gray-700">
        {results && <div className="font-semibold">{results}</div>}
      </div>
    </div>
  );
}
