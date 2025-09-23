import { loadTreeFromFile, englishWordToField } from './merkleTree.js';
import { writeFileSync } from 'fs';

async function generateSolidityTestData() {
    try {
        const tree = loadTreeFromFile('merkle-tree.json');
        console.log(`🌳 Loaded tree with ${tree.totalLeaves} words`);
        
        // Test words - mix of common and uncommon words
        const testWords = [
            "hello", "world", "about", "house", "water", 
            "light", "right", "sound", "small", "great",
            "zippy", "jazzy", "fizzy", "dizzy", "fuzzy"
        ];
        
        const testData = [];
        
        for (const word of testWords) {
            const wordFielded = englishWordToField(word).toString();
            const index = tree.getIndex(wordFielded);
            
            if (index !== -1) {
                const proof = tree.proof(index);
                
                testData.push({
                    word: word,
                    wordField: wordFielded,
                    index: index,
                    root: proof.root,
                    pathElements: proof.pathElements,
                    pathIndices: proof.pathIndices,
                    leaf: proof.leaf
                });
                
                console.log(`✅ "${word}" found at index ${index}`);
            } else {
                console.log(`❌ "${word}" not found in dictionary`);
            }
        }
        
        // Generate invalid test cases
        const invalidWords = ["invalid", "notword", "fakewrd", "badword"];
        const invalidTestData = [];
        
        for (const word of invalidWords) {
            const wordFielded = englishWordToField(word).toString();
            const index = tree.getIndex(wordFielded);
            
            invalidTestData.push({
                word: word,
                wordField: wordFielded,
                isValid: index !== -1
            });
        }
        
        // Save to JSON for easy importing in tests
        const testDataFile = {
            merkleRoot: tree.root(),
            totalLeaves: tree.totalLeaves,
            validWords: testData,
            invalidWords: invalidTestData,
            generatedAt: new Date().toISOString()
        };
        
        writeFileSync('solidity-test-data.json', JSON.stringify(testDataFile, null, 2));
        console.log(`\n💾 Test data saved to solidity-test-data.json`);
        console.log(`📊 Generated ${testData.length} valid word tests`);
        console.log(`📊 Generated ${invalidTestData.length} invalid word tests`);
        
        // Generate Solidity test code snippet
        const solidityCode = generateSolidityTestCode(testData[0]); // Use first valid word as example
        writeFileSync('solidity-test-snippet.sol', solidityCode);
        console.log(`📝 Solidity test snippet saved to solidity-test-snippet.sol`);
        
    } catch (error) {
        console.error('Error generating test data:', error);
    }
}

function generateSolidityTestCode(testCase) {
    const pathElementsStr = testCase.pathElements.map(p => `hex"${p.slice(2)}"`).join(', ');
    const pathIndicesStr = testCase.pathIndices.join(', ');
    
    return `// Auto-generated test for word: "${testCase.word}"
function testValidGuess_${testCase.word}() public {
    // Setup players
    address player1 = address(0x1);
    address player2 = address(0x2);
    
    // Join game with dummy commitments
    bytes32[] memory commitments1 = new bytes32[](5);
    bytes32[] memory commitments2 = new bytes32[](5);
    for(uint i = 0; i < 5; i++) {
        commitments1[i] = bytes32(uint256(i + 1));
        commitments2[i] = bytes32(uint256(i + 6));
    }
    
    wordle.joinGame(player1, commitments1);
    wordle.joinGame(player2, commitments2);
    
    // Prepare Merkle proof for "${testCase.word}"
    bytes32[] memory pathElements = new bytes32[](${testCase.pathElements.length});
    pathElements[0] = ${pathElementsStr.split(', ')[0]};
    pathElements[1] = ${pathElementsStr.split(', ')[1]};
    // ... continue for all ${testCase.pathElements.length} elements
    
    uint8[] memory pathIndices = new uint8[](${testCase.pathIndices.length});
    pathIndices[0] = ${pathIndicesStr.split(', ')[0]};
    pathIndices[1] = ${pathIndicesStr.split(', ')[1]};
    // ... continue for all ${testCase.pathIndices.length} indices
    
    // Test the guess
    vm.prank(player1);
    wordle.guess("${testCase.word}", pathElements, pathIndices);
    
    // Verify state
    assertEq(wordle.last_guess(), "${testCase.word}");
    assertEq(wordle.guesser_attempts(), 1);
}`;
}

generateSolidityTestData();