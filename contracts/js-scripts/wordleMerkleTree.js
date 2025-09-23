import { loadTreeFromFile, englishWordToField } from './merkleTree.js';
import { Barretenberg, Fr } from '@aztec/bb.js';

(async () => {
    try {
        // Load the saved tree
        const tree = loadTreeFromFile('merkle-tree-fast.json');
        
        console.log(`🌳 Loaded tree with root: ${tree.root()}`);
        console.log(`📊 Total leaves: ${tree.totalLeaves}`);
        
        // Test with a word
        const testWord = "zymic";
        const wordFielded = englishWordToField(testWord).toString();
        const index = tree.getIndex(wordFielded);


        const pathElements = tree.proof(index).pathElements;
        //console.log('Path Elements:', pathElements);
        const pathIndices = tree.proof(index).pathIndices;
        //console.log('Path Indices:', pathIndices);

        // compute root from proof && path elements
        if (index !== -1) {
            const proof = tree.proof(index);
           
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
            console.log("computed root:", currentHash);
        }
        
        if (index !== -1) {
            console.log('🔍 Proof generated successfully');
        } else {
            console.log(`❌ "${testWord}" not found in tree`);
        }
        
    } catch (error) {
        console.error('Error loading tree:', error.message);
    }
})();