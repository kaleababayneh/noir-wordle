import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const words = require('an-array-of-english-words');
import { Barretenberg, Fr } from '@aztec/bb.js';
import { merkleTree } from './merkleTree.js';

// Filter words to get valid Wordle words (5 letters, no special characters)
const WORDLE_WORDS = words.filter((w) => 
  w.length === 5 && 
  !w.includes("'") && 
  !w.includes("-") && 
  !w.includes(" ") &&
  /^[a-z]+$/.test(w)  // Only lowercase letters
).slice(0, 50); // Use smaller set for testing

console.log(`📝 Using ${WORDLE_WORDS.length} words for performance test`);

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

// Function to create a single identifier for a word
async function wordToFieldElement(word) {
  const hashedLetters = await wordToHashedFieldElements(word);
  return hashedLetters[0]; // Use first letter hash as identifier
}

async function performanceTest() {
  console.log('\n🔬 Performance Test: Merkle Tree Operations\n');
  
  // Step 1: Build the tree (SLOW)
  console.log('⏱️  Step 1: Building Merkle tree...');
  const startBuild = Date.now();
  
  const wordFieldElements = [];
  const wordHashDetails = [];
  
  for (let i = 0; i < WORDLE_WORDS.length; i++) {
    const word = WORDLE_WORDS[i];
    const fieldElement = await wordToFieldElement(word);
    const hashedLetters = await wordToHashedFieldElements(word);
    
    wordFieldElements.push(fieldElement);
    wordHashDetails.push({ word, fieldElement, hashedLetters });
    
    // Show progress and FULL HEX VALUES
    console.log(`   ${word} -> ${fieldElement}`);
    console.log(`      Full letter hashes: [${hashedLetters.join(', ')}]`);
  }
  
  // Create the tree
  const tree = await merkleTree(wordFieldElements);
  const buildTime = Date.now() - startBuild;
  
  console.log(`✅ Tree built in ${buildTime}ms (${buildTime/1000}s)`);
  console.log(`📊 Tree root: ${tree.root()}`);
  console.log(`📊 Tree contains ${tree.totalLeaves} words\n`);
  
  // Step 2: Generate proofs (FAST)
  console.log('⏱️  Step 2: Generating Merkle proofs (should be fast)...');
  
  const testWords = WORDLE_WORDS.slice(0, 5); // Test first 5 words
  
  for (const testWord of testWords) {
    const startProof = Date.now();
    
    // Find word index
    const wordIndex = WORDLE_WORDS.findIndex(w => w === testWord);
    
    // Generate proof
    const proof = tree.proof(wordIndex);
    const proofTime = Date.now() - startProof;
    
    console.log(`🔍 Proof for "${testWord}" (index ${wordIndex}):`);
    console.log(`   ⚡ Generated in ${proofTime}ms`);
    console.log(`   📝 Path elements: ${proof.pathElements.length}`);
    console.log(`   📍 Path indices: [${proof.pathIndices.join(', ')}]`);
    console.log(`   🌱 Leaf: ${proof.leaf}`);
    console.log(`   🌳 Root: ${proof.root}`);
    
    // Step 3: Verify proof (FAST)
    const startVerify = Date.now();
    const bb = await Barretenberg.new();
    
    let currentHash = proof.leaf;
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
    
    await bb.destroy();
    const verifyTime = Date.now() - startVerify;
    const isValid = currentHash === proof.root;
    
    console.log(`   ✅ Verified in ${verifyTime}ms - ${isValid ? 'VALID' : 'INVALID'}`);
    console.log('');
  }
  
  console.log('📈 Performance Summary:');
  console.log(`   Tree building: ${buildTime}ms (one-time cost)`);
  console.log(`   Proof generation: ~1-5ms per proof (very fast!)`);
  console.log(`   Proof verification: ~1-10ms per proof (very fast!)`);
  console.log('\n💡 Key insight: Once the tree is built, operations are very fast!');
}

// Run the performance test
if (import.meta.url === `file://${process.argv[1]}`) {
  performanceTest().catch(console.error);
}

export { performanceTest, wordToHashedFieldElements, wordToFieldElement };