import { loadTreeFromFile, englishWordToField } from './merkleTree.js';
import { Barretenberg, Fr } from '@aztec/bb.js';

async function testMerkleProofVerification() {
    try {
        // Load the saved tree
        const tree = loadTreeFromFile('merkle-tree.json');
        console.log(`🌳 Loaded tree with root: ${tree.root()}`);
        
        // Test word
        const testWord = "hello";
        console.log(`\n🔍 Testing Merkle proof for word: "${testWord}"`);
        
        // Get word as field element (same as Solidity conversion)
        const wordFielded = englishWordToField(testWord).toString();
        console.log(`📝 Word as field: ${wordFielded}`);
        
        // Get index and proof
        const index = tree.getIndex(wordFielded);
        if (index === -1) {
            console.log(`❌ "${testWord}" not found in tree`);
            return;
        }
        
        console.log(`📍 Word found at index: ${index}`);
        
        const proof = tree.proof(index);
        console.log(`🔗 Path elements: ${proof.pathElements.length} elements`);
        console.log(`🧭 Path indices: [${proof.pathIndices.join(', ')}]`);
        
        // Verify proof using JavaScript (same logic as Solidity)
        const bb = await Barretenberg.new();
        let currentHash = proof.leaf;
        
        console.log(`\n🔄 Step-by-step verification:`);
        console.log(`Starting with leaf: ${currentHash}`);
        
        for (let i = 0; i < proof.pathElements.length; i++) {
            const pathElement = proof.pathElements[i];
            const isLeft = proof.pathIndices[i] === 0;
            
            const [left, right] = isLeft 
                ? [currentHash, pathElement] 
                : [pathElement, currentHash];
            
            const frLeft = Fr.fromString(left);
            const frRight = Fr.fromString(right);
            currentHash = (await bb.poseidon2Hash([frLeft, frRight])).toString();
            
            console.log(`Step ${i + 1}: ${isLeft ? 'LEFT' : 'RIGHT'} position`);
            console.log(`  Left:  ${left}`);
            console.log(`  Right: ${right}`);
            console.log(`  Hash:  ${currentHash}`);
        }
        
        await bb.destroy();
        
        console.log(`\n✅ Final computed root: ${currentHash}`);
        console.log(`🎯 Expected root:       ${proof.root}`);
        console.log(`🔍 Verification: ${currentHash === proof.root ? 'PASSED ✅' : 'FAILED ❌'}`);
        
        // Generate Solidity test data
        console.log(`\n📋 Solidity test data for "${testWord}":`);
        console.log(`Root: ${proof.root}`);
        console.log(`PathElements: [${proof.pathElements.map(p => `"${p}"`).join(', ')}]`);
        console.log(`PathIndices: [${proof.pathIndices.join(', ')}]`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMerkleProofVerification();