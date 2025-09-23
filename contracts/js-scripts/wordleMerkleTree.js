import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const words = require('an-array-of-english-words');
import { Barretenberg, Fr } from '@aztec/bb.js';
import { merkleTree, PoseidonTree } from './merkleTree.js';

// Filter words to get valid Wordle words (5 letters, no special characters)
const WORDLE_WORDS = words.filter((w) => 
  w.length === 5 && 
  !w.includes("'") && 
  !w.includes("-") && 
  !w.includes(" ") &&
  /^[a-z]+$/.test(w)  // Only lowercase letters
);

console.log(`📝 Found ${WORDLE_WORDS.length} valid Wordle words`);

// Function to convert a word to hashed field elements (matching your testWordleCheck.ts approach)
async function wordToHashedFieldElements(word) {
  const bb = await Barretenberg.new();
  const salt = new Fr(0n);
  const hashedLetters = [];
  
  // Convert each character: ASCII -> Field -> Hash (same as testWordleCheck.ts)
  for (let i = 0; i < word.length; i++) {
    const charCode = word.charCodeAt(i);
    const charField = new Fr(BigInt(charCode));
    const hashedChar = (await bb.poseidon2Hash([salt, charField])).toString();
    hashedLetters.push(hashedChar);
  }
  
  await bb.destroy();
  return hashedLetters;
}

// Function to create a single identifier for a word (combine all hashed letters)
async function wordToFieldElement(word) {
  const hashedLetters = await wordToHashedFieldElements(word);
  
  // Combine all 5 hashed letters into a single identifier
  // We'll just use the first hashed letter as the leaf value for simplicity
  // In a real implementation, you might want to hash all 5 together
  return hashedLetters[0];
}

// Create Merkle tree of all valid Wordle words
async function createWordleMerkleTree() {
  console.log('🌳 Creating Merkle tree of Wordle words...');
  
  // Convert all words to field elements
  const wordFieldElements = [];
  for (const word of WORDLE_WORDS.slice(0, 100)) { // Use first 100 words for demo
    const fieldElement = await wordToFieldElement(word);
    wordFieldElements.push(fieldElement);
    console.log(`   ${word} -> ${fieldElement.slice(0, 20)}...`);
  }
  
  // Create the Merkle tree
  const tree = await merkleTree(wordFieldElements);
  const root = tree.root();
  
  console.log(`✅ Merkle tree created with root: ${root}`);
  console.log(`📊 Tree contains ${tree.totalLeaves} words`);
  
  return { tree, words: WORDLE_WORDS.slice(0, 100), wordFieldElements };
}

// Generate a proof that a specific word is in the Wordle dictionary
async function proveWordInDictionary(tree, words, wordFieldElements, targetWord) {
  console.log(`\n🔍 Generating proof for word: "${targetWord}"`);
  
  // Find the word in our list
  const wordIndex = words.findIndex(w => w.toLowerCase() === targetWord.toLowerCase());
  
  if (wordIndex === -1) {
    throw new Error(`Word "${targetWord}" not found in dictionary`);
  }
  
  // Get the field element for this word
  const wordFieldElement = wordFieldElements[wordIndex];
  
  // Generate Merkle proof
  const proof = tree.proof(wordIndex);
  
  // Also generate the hashed letters for this word (useful for Wordle verification)
  const hashedLetters = await wordToHashedFieldElements(targetWord);
  
  console.log(`✅ Proof generated for "${targetWord}":`);
  console.log(`   Word index: ${wordIndex}`);
  console.log(`   Word field element: ${wordFieldElement.slice(0, 20)}...`);
  console.log(`   Hashed letters: [${hashedLetters.map(h => h.slice(0, 10) + '...').join(', ')}]`);
  console.log(`   Root: ${proof.root.slice(0, 20)}...`);
  console.log(`   Path length: ${proof.pathElements.length}`);
  console.log(`   Path indices: [${proof.pathIndices.join(', ')}]`);
  
  return { ...proof, hashedLetters };
}

// Verify a Merkle proof
async function verifyWordProof(proof, word, root) {
  console.log(`\n🔐 Verifying proof for word: "${word}"`);
  
  const bb = await Barretenberg.new();
  let currentHash = proof.leaf;
  
  // Traverse up the tree using the proof
  for (let i = 0; i < proof.pathElements.length; i++) {
    const pathElement = proof.pathElements[i];
    const isLeft = proof.pathIndices[i] === 0;
    
    const [left, right] = isLeft 
      ? [currentHash, pathElement] 
      : [pathElement, currentHash];
    
    const frLeft = Fr.fromString(left);
    const frRight = Fr.fromString(right);
    currentHash = (await bb.poseidon2Hash([frLeft, frRight])).toString();
  }
  
  const isValid = currentHash === root;
  console.log(`${isValid ? '✅' : '❌'} Proof verification: ${isValid ? 'VALID' : 'INVALID'}`);
  console.log(`   Computed root: ${currentHash.slice(0, 20)}...`);
  console.log(`   Expected root: ${root.slice(0, 20)}...`);
  
  return isValid;
}

// Main demo function
async function demo() {
  try {
    console.log('🎯 Wordle Merkle Tree Demo\n');
    
    // Create the tree
    const { tree, words: wordList, wordFieldElements } = await createWordleMerkleTree();
    const root = tree.root();
    
    // Test with a few words
    const testWords = ['hello', 'world', 'words', 'apple'];
    
    for (const testWord of testWords) {
      try {
        // Generate proof
        const proof = await proveWordInDictionary(tree, wordList, wordFieldElements, testWord);
        
        // Verify proof
        await verifyWordProof(proof, testWord, root);
        
        console.log('\n' + '='.repeat(50));
      } catch (error) {
        console.log(`❌ Error with word "${testWord}": ${error.message}\n`);
      }
    }
    
    // Demo Wordle checking
    console.log('\n� Wordle Checking Demo:');
    const secretWord = 'apple';
    const guesses = ['hello', 'apple', 'apply'];
    
    for (const guess of guesses) {
      await checkWordleGuess(guess, secretWord);
    }
    
    console.log('\n�🎉 Demo completed!');
    console.log('\n💡 Use cases for Wordle Merkle Tree:');
    console.log('   • Prove a guess is a valid English word without revealing the dictionary');
    console.log('   • Implement word validation in zero-knowledge circuits');
    console.log('   • Create privacy-preserving word games');
    console.log('   • Verify word validity on-chain with minimal storage');
    console.log('   • Generate ZK proofs for Wordle game verification');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Wordle checker function (same logic as your testWordleCheck.ts)
async function checkWordleGuess(guessWord, secretWord) {
  console.log(`\n🎯 Checking guess "${guessWord}" against secret "${secretWord}"`);
  
  const guessHashes = await wordToHashedFieldElements(guessWord);
  const secretHashes = await wordToHashedFieldElements(secretWord);
  
  const result = [0, 0, 0, 0, 0]; // 0 = absent, 1 = present, 2 = correct
  
  for (let i = 0; i < 5; i++) {
    if (guessHashes[i] === secretHashes[i]) {
      result[i] = 2; // correct position
    } else if (secretHashes.includes(guessHashes[i])) {
      result[i] = 1; // present but wrong position
    } else {
      result[i] = 0; // absent
    }
  }
  
  console.log(`   Guess hashes: [${guessHashes.map(h => h.slice(0, 10) + '...').join(', ')}]`);
  console.log(`   Secret hashes: [${secretHashes.map(h => h.slice(0, 10) + '...').join(', ')}]`);
  console.log(`   Result: [${result.join(', ')}] (0=absent, 1=present, 2=correct)`);
  
  return { result, guessHashes, secretHashes };
}

// Export functions for use in other files
export { 
  createWordleMerkleTree, 
  proveWordInDictionary, 
  verifyWordProof, 
  wordToFieldElement,
  wordToHashedFieldElements,
  checkWordleGuess,
  WORDLE_WORDS 
};

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demo();
}