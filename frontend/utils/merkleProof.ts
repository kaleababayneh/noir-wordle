// Browser-compatible Merkle tree utilities for frontend
import merkleTreeData from './merkle-tree.json';

// Convert word to field element (same as Solidity implementation)
export function englishWordToField(word: string): string {
  let wordAsField = 0n;
  for (let i = 0; i < word.length; i++) {
    wordAsField = wordAsField * 256n + BigInt(word.charCodeAt(i));
  }
  return '0x' + wordAsField.toString(16).padStart(64, '0');
}

// Simple Merkle tree class for proof generation
export class PoseidonTree {
  levels: number;
  totalLeaves: number;
  zeros: string[];
  storage: Map<string, string>;

  constructor(jsonData: any) {
    this.levels = jsonData.levels;
    this.totalLeaves = jsonData.totalLeaves;
    this.zeros = jsonData.zeros;
    this.storage = new Map(Object.entries(jsonData.storage));
  }

  static indexToKey(level: number, index: number): string {
    return `${level}-${index}`;
  }

  getIndex(leaf: string): number {
    for (const [key, value] of this.storage.entries()) {
      if (value === leaf && key.startsWith('0-')) {
        return parseInt(key.split('-')[1]);
      }
    }
    return -1;
  }

  root(): string {
    return this.storage.get(PoseidonTree.indexToKey(this.levels, 0)) || this.zeros[this.levels];
  }

  proof(index: number): {
    root: string;
    pathElements: string[];
    pathIndices: number[];
    leaf: string;
  } {
    const leaf = this.storage.get(PoseidonTree.indexToKey(0, index));
    if (!leaf) throw new Error("leaf not found");

    const pathElements: string[] = [];
    const pathIndices: number[] = [];

    this.traverse(index, (level: number, currentIndex: number, siblingIndex: number) => {
      const sibling = this.storage.get(PoseidonTree.indexToKey(level, siblingIndex)) || this.zeros[level];
      pathElements.push(sibling);
      pathIndices.push(currentIndex % 2);
    });

    return {
      root: this.root(),
      pathElements,
      pathIndices,
      leaf,
    };
  }

  traverse(index: number, fn: (level: number, currentIndex: number, siblingIndex: number) => void): void {
    let currentIndex = index;
    for (let level = 0; level < this.levels; level++) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      fn(level, currentIndex, siblingIndex);
      currentIndex = Math.floor(currentIndex / 2);
    }
  }
}

// Load the tree from the JSON data
export function loadMerkleTree(): PoseidonTree {
  return new PoseidonTree(merkleTreeData);
}

// Generate Merkle proof for a word
export function generateMerkleProof(word: string): {
  pathElements: string[];
  pathIndices: number[];
  leaf: string;
  root: string;
  index: number;
} | null {
  const tree = loadMerkleTree();
  const wordFielded = englishWordToField(word);
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

// Validate that a word exists in the dictionary
export function isWordInDictionary(word: string): boolean {
  const tree = loadMerkleTree();
  const wordFielded = englishWordToField(word);
  return tree.getIndex(wordFielded) !== -1;
}

// Convert path indices from numbers to uint8 array format expected by Solidity
export function formatPathIndicesForSolidity(pathIndices: number[]): number[] {
  return pathIndices.map(index => index); // Already numbers, just ensure they're in the right format
}