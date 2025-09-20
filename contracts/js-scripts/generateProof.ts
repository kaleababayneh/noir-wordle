import { Barretenberg, Fr, UltraHonkBackend } from "@aztec/bb.js";
import { ethers } from "ethers";
import { Noir } from "@noir-lang/noir_js";
import fs from "fs";
import path from "path";
import { checker} from "./wordleCheck";

const circuit = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, "../../circuits/target/circuits.json"),
        "utf-8"
    )
);

export default async function generateProof(): Promise<any> {
    const inputs = process.argv.slice(2);
    const bb = await Barretenberg.new();
    const salt = new Fr(0n)

    const wordleCommitmentHash1 = inputs[0];
    const wordleCommitmentHash2 = inputs[1];
    const wordleCommitmentHash3 = inputs[2];
    const wordleCommitmentHash4 = inputs[3];
    const wordleCommitmentHash5 = inputs[4];

    const guessLetter1 = inputs[5];
    const guessLetter2 = inputs[6];
    const guessLetter3 = inputs[7];
    const guessLetter4 = inputs[8];
    const guessLetter5 = inputs[9];

  
    const guessLetter1Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter1)])).toString();
    const guessLetter2Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter2)])).toString();
    const guessLetter3Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter3)])).toString();
    const guessLetter4Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter4)])).toString();
    const guessLetter5Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter5)])).toString();
 
    const correctGuess_Commitment = [wordleCommitmentHash1, wordleCommitmentHash2, wordleCommitmentHash3, wordleCommitmentHash4, wordleCommitmentHash5];
    const guessLetter_Commitment = [guessLetter1Hash, guessLetter2Hash, guessLetter3Hash, guessLetter4Hash, guessLetter5Hash];
    
    const checkedResult = await checker(guessLetter_Commitment, correctGuess_Commitment);

    let result = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256[]"],
             [checkedResult]
         );
    process.stdout.write(`${result}\n`);
   // process.stdout.write(`Checked Result: ${checkedResult}\n`);
    // const resultU256 = checkedResult.map(n => BigInt(n));
    //     const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    //     ["uint256[]"],
    //     [resultU256]
    //     );
   // process.stdout.write(`1`);
   // process.stdout.write(`${encoded}\n`);
}


(async () => {
    try {
        await generateProof();
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
})();