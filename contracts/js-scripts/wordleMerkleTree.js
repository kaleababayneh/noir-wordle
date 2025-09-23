import { loadTreeFromFile, englishWordToField } from './merkleTree.js';
import { Barretenberg, Fr } from '@aztec/bb.js';


function getMerkleProof(word, tree) {
    const wordFielded = englishWordToField(word).toString();
    const index = tree.getIndex(wordFielded);
    
    if (index === -1) {
        return null; // Word not found
    }
    
    const proof = tree.proof(index);
    return {
        pathElements: proof.pathElements,
        pathIndices: proof.pathIndices,
        leaf: proof.leaf,
        root: proof.root,
        index: index
    };
}

async function computeMerkleRootFromProof(leaf, pathElements, pathIndices) {
    const bb = await Barretenberg.new();
    
    let currentHash = leaf;
    for (let i = 0; i < pathElements.length; i++) {
        const pathElement = pathElements[i];
        const isLeft = pathIndices[i] === 0;
        
        const [left, right] = isLeft 
            ? [currentHash, pathElement] 
            : [pathElement, currentHash];
        
        const frLeft = Fr.fromString(left);
        const frRight = Fr.fromString(right);
        
        currentHash = (await bb.poseidon2Hash([frLeft, frRight])).toString();
    }
    
    await bb.destroy();
    return currentHash;
}

async function main() {
    try {
        // Load the saved tree
        const tree = loadTreeFromFile('merkle-tree.json');
        
        console.log(`🌳 Loaded tree with root: ${tree.root()}`);
        console.log(`📊 Total leaves: ${tree.totalLeaves}`);
        
        // Test with a word
        const testWord = "zippy"; // Change this to test different words
        
        // Get Merkle proof for the word
        const proof = getMerkleProof(testWord, tree);
    
        if (proof) {
          
            // Compute root from proof to verify
            const computedRoot = await computeMerkleRootFromProof(proof.leaf, proof.pathElements, proof.pathIndices);
            console.log('🔍 Original root:', proof.root);
            console.log('🔍 Computed root:', computedRoot);
            
        } else {
            console.log(`❌ "${testWord}" not found in tree`);
        }
        
    } catch (error) {
        console.error('Error loading tree:', error.message);
    }
}

main();