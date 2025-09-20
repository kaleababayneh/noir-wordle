import { Barretenberg, Fr, UltraHonkBackend } from "@aztec/bb.js";
import { ethers } from "ethers";
import { Noir } from "@noir-lang/noir_js";
import fs from "fs";
import path from "path";
import { checker, asciiToField} from "./wordleCheck";

const circuit = JSON.parse(
    fs.readFileSync(
        path.resolve(__dirname, "../../circuits/target/circuits.json"),
        "utf-8"
    )
);

export default async function generateProof(): Promise<any> {
    const inputs = process.argv.slice(2);
    const bb = await Barretenberg.new();


    const guessLetter1 = inputs[0];
    const guessLetter2 = inputs[1];
    const guessLetter3 = inputs[2];
    const guessLetter4 = inputs[3];
    const guessLetter5 = inputs[4];

    const wordleCommitmentHash1 = inputs[5];
    const wordleCommitmentHash2 = inputs[6];
    const wordleCommitmentHash3 = inputs[7];
    const wordleCommitmentHash4 = inputs[8];
    const wordleCommitmentHash5 = inputs[9];

    // arguments for checker
    const salt = new Fr(0n)
    const userGuess = [guessLetter1, guessLetter2, guessLetter3, guessLetter4, guessLetter5]
    const correctGuess_Commitment = [wordleCommitmentHash1, wordleCommitmentHash2, wordleCommitmentHash3, wordleCommitmentHash4, wordleCommitmentHash5]
    const checkedResult = await checker(salt.toString(), userGuess, correctGuess_Commitment);




}