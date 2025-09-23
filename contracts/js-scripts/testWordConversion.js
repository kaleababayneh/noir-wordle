import { englishWordToField } from './merkleTree.js';

function solidityWordToField(word) {
    let wordAsField = 0n;
    for (let i = 0; i < word.length; i++) {
        wordAsField = wordAsField * 256n + BigInt(word.charCodeAt(i));
    }
    return wordAsField;
}

function jsWordToField(word) {
    let binaryString = "";
    for (let i = 0; i < word.length; i++) {
        binaryString += word.charCodeAt(i).toString(2).padStart(8, "0");
    }
    return BigInt("0b" + binaryString);
}

// Test both conversions
const testWords = ["hello", "world", "zippy"];

console.log("Testing word to field conversions:");
console.log("===================================");

for (const word of testWords) {
    const jsResult = jsWordToField(word);
    const solidityResult = solidityWordToField(word);
    const frResult = englishWordToField(word).toString();
    
    console.log(`\nWord: "${word}"`);
    console.log(`JS binary method: ${jsResult.toString()}`);
    console.log(`Solidity method:  ${solidityResult.toString()}`);
    console.log(`Fr result:        ${frResult}`);
    console.log(`Fr as BigInt:     ${BigInt(frResult).toString()}`);
    console.log(`Match JS==Sol:    ${jsResult === solidityResult}`);
    console.log(`Match JS==Fr:     ${jsResult.toString() === BigInt(frResult).toString()}`);
}