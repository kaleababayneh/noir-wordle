import { Barretenberg, Fr, UltraHonkBackend } from "@aztec/bb.js";


export async function checker(guessHash: string[], wordHash: string[]): Promise<any> {
    const bb = await Barretenberg.new();

    let result: number[] = [0, 0, 0, 0, 0]; // 0 = absent, 1 = present, 2 = correct
    const hashed_guess: string[] = guessHash;

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
    //result = [1, 1, 1, 1, 1];
    // process.stdout.write(`${result[0]}`);
    // process.stdout.write(`${result[1]}`);
    // process.stdout.write(`${result[2]}`);
    // process.stdout.write(`${result[3]}`);
    // process.stdout.write(`${result[4]}`);
    await bb.destroy(); // Clean up Barretenberg worker
    return result;
}