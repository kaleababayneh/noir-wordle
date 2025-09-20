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

    const correctLetter1 = inputs[10];
    const correctLetter2 = inputs[11];
    const correctLetter3 = inputs[12];
    const correctLetter4 = inputs[13];
    const correctLetter5 = inputs[14];

  
    const guessLetter1Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter1)])).toString();
    const guessLetter2Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter2)])).toString();
    const guessLetter3Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter3)])).toString();
    const guessLetter4Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter4)])).toString();
    const guessLetter5Hash = (await bb.poseidon2Hash([salt, Fr.fromString(guessLetter5)])).toString();
 
    const correctGuess_Commitment = [wordleCommitmentHash1, wordleCommitmentHash2, wordleCommitmentHash3, wordleCommitmentHash4, wordleCommitmentHash5];
    const guessLetter_Commitment = [guessLetter1Hash, guessLetter2Hash, guessLetter3Hash, guessLetter4Hash, guessLetter5Hash];
    
    const checkedResult = await checker(guessLetter_Commitment, correctGuess_Commitment);
  

    try {

        const noir = new Noir(circuit);
        const honk = new UltraHonkBackend(circuit.bytecode, {
            threads: 1,
        });

        /*
           // commitment hashes for each letter
            first_letter_commitment_hash: pub Field,
            second_letter_commitment_hash: pub Field,
            third_letter_commitment_hash: pub Field,
            fourth_letter_commitment_hash: pub Field,
            fifth_letter_commitment_hash: pub Field,
            // guess result
            first_letter_guess: pub Field,
            second_letter_guess: pub Field,
            third_letter_guess: pub Field,
            fourth_letter_guess: pub Field,
            fifth_letter_guess: pub Field,
            // calculated final result
            calculated_result: pub [u8; 5],
            // private inputs
            first_letter: Field,
            second_letter: Field,
            third_letter: Field,
            fourth_letter: Field,
            fifth_letter: Field,
            salt: Field,
        */
    

        const inputs = {
            // commitment hashes for each letter
            first_letter_commitment_hash: wordleCommitmentHash1,     // ✅ Correct
            second_letter_commitment_hash: wordleCommitmentHash2,    // ✅ Correct
            third_letter_commitment_hash: wordleCommitmentHash3,     // ✅ Correct
            fourth_letter_commitment_hash: wordleCommitmentHash4,    // ✅ Correct
            fifth_letter_commitment_hash: wordleCommitmentHash5,     // ✅ Correct
            // guess result
            first_letter_guess: guessLetter1,                       // ✅ Correct
            second_letter_guess: guessLetter2,                      // ✅ Correct
            third_letter_guess: guessLetter3,                       // ✅ Correct
            fourth_letter_guess: guessLetter4,                      // ✅ Correct
            fifth_letter_guess: guessLetter5,                       // ✅ Correct
            // calculated final result
            calculated_result: checkedResult,                       // ✅ Correct
            // private inputs
            first_letter: correctLetter1,                           // ✅ Correct
            second_letter: correctLetter2,                          // ✅ Correct
            third_letter: correctLetter3,                           // ✅ Correct
            fourth_letter: correctLetter4,                          // ✅ Correct
            fifth_letter: correctLetter5,                           // ✅ Correct
            salt: salt.toString(),                                  // ✅ Correct
        }

        const { witness } = await noir.execute(inputs);
        const originalLog = console.log;
        console.log = function() {};
        const { proof, publicInputs } = await honk.generateProof(witness, {
            keccak: true,
        });
        console.log = originalLog;

        const result = ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes", "bytes32[]"],
            [proof, publicInputs]
        );
        
        await bb.destroy(); 
        return result;

        
    } catch (e) {
        console.error("Error compiling circuit:", e);
        process.exit(1);
    } 
   

}


(
    async () => {
        generateProof().then((result) => {
            console.log(result);
            //console.log("Proof generated successfully");
           //process.stdout.write(result);
           process.exit(0);
        }).catch((error) => {
            console.error(error);
            process.exit(1);
        })
    }
)();