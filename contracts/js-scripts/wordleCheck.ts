import { Barretenberg, Fr, UltraHonkBackend } from "@aztec/bb.js";
import {  toUtf8Bytes } from "ethers";
import { Noir } from "@noir-lang/noir_js";
import fs from "fs";
import path from "path";
import { keccak256 } from "js-sha3";

const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617; // Prime field order


async function checker(salt: string, guess: string[], wordHash: string[]): Promise<any> {
    const bb = await Barretenberg.new()

    const result: number[] = [0, 0, 0, 0, 0]; // 0 = absent, 1 = present, 2 = correct
    const hashed_guess: string[] = guess;

    for (let i = 0; i < 5; i++) {

        if (hashed_guess[i] === wordHash[i]) {
            result[i] = 2; // correct
        }
        else if (wordHash.includes(hashed_guess[i])) {
            result[i] = 1; // present
        }
        else {
            result[i] = 0; // absent
        }
    }
    await bb.destroy(); // Clean up Barretenberg worker
    return result;
}



function asciiToField(word: string): Fr {
    let wordToHex = '0x';
    for (let i = 0; i < word.length; i++) {
        const charCode = word.charCodeAt(i);
        wordToHex += charCode.toString(16)
    }

    const wordBigInt = BigInt(wordToHex);
    return new Fr(wordBigInt);
}

(async () => {
    
    const bb = await Barretenberg.new();
    const salt = new Fr(0n); // Using a fixed salt for demonstration; in practice, use a random salt
    console.log("Salt:", salt.toString());

    const guess = "apple";
    const guessArray = guess.split("");


    for (let i = 0; i < guess.length; i++) {
        const wordField = asciiToField(guess[i]);
        const hashed_guess = (await bb.poseidon2Hash([salt, wordField])).toString();
        guessArray[i] = hashed_guess;
    }


    const wordHash = [
        '0x1ba83d0d530a2a7784ac08f73f5507550c851552f170a6685068d3f78d29b920',
        '0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70',
        '0x1ee63ae23fba3b1af0e30baa89b79e00193935ea9b9543f62b78f0b6385efd70',
        '0x0ed3294f4ba676f67296d5dcccdbe7dff01975032dda4c15eb3e732c77aa5cad',
        '0x2bb35e499f8cb77c333df64bf07dbf52885c27b5c26eb83654dc956f44aeba00'
    ]

    console.log("Guess Array:", guessArray);
    console.log("Word Hash:", wordHash);

    const result = await checker(salt.toString(), guessArray, wordHash);
    console.log("Result:", result);


    await bb.destroy();
    console.log("Done");
})().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});