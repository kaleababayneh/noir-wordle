## ZK Wordle

### a peer to peer zero knowledge based wordle game

**ZK Wordle** is a peer-to-peer Wordle game where two players set a secret word for each other to guess and continue playing until one of them correctly guesses the other’s word. The game logic is implemented in both a **Solidity smart contract** and a  **Noir circuit** , making it secure and resistant to tampering or attacks.

Zero-knowledge proofs aren’t just an added feature here — without them, this game wouldn’t be possible. Each player’s secret word, along with its private salt, never leaves their device. This differs from simply hashing a word and committing the hash on-chain, which would still be vulnerable to offline dictionary brute-force attacks. In ZK Wordle, zero-knowledge ensures that a guess can be verified by the word setter as correct or incorrect  **without revealing the actual word** in a real time. More technical details of the implementation are explained below.

---

### Why Zero Knowledge?

Zero-knowledge (ZK) is one of the most fascinating cryptographic techniques to date. It has gained significant attention for solving both **scalability** and **privacy** challenges in Ethereum. While most current use cases focus on scalability, only a small fraction leverage ZK for privacy — and even then, primarily for  **financial transactions** . However, zero-knowledge has far broader potential applications, many of which remain unexplored beyond on-chain finance.

---

### ZK in Gaming

In gaming, some projects already employ ZK, but often only to verify the  **final result** , leaving intermediate steps unverified. This approach works for single-player games where only the outcome matters.  Peer to Peer **Wordle** , however, is different — and in a **peer-to-peer** setting, every step matters. Two players compete while trusting neither the other nor a third party.

In ZK Wordle, zero-knowledge isn’t a “bonus privacy feature” — it’s  **essential** . Without it, hashing words would be insecure or the verification of guesses will be reliant in the honest behavior of the opponent player. Here, each word is hashed together with a  **secret salt** , and both remain private on the player’s device. When a player submits a guess, their opponent generates a **zero-knowledge proof** and verifies it on-chain without leaking any part of their secret word or salt.

---

### Valid Word Verification

Another important rule of Wordle is that guesses must be valid English words — not just any random five letters (yes, you can’t just submit “AEIOU”). To enforce this efficiently, the game uses a **Merkle tree** of hashed valid English words.

* Over **200,000 English words** are hashed and stored in the Merkle tree.
* The **Merkle root** is recorded on the smart contract during deployment.
* When a player makes a guess, they provide the **Merkle proof** (path) for that word.

This ensures that every guess is a legitimate English word without revealing the entire dictionary or increasing on-chain storage.

### Deployment and Next Steps

The game is currently deployed on the Base Sepolia testnet.
👉 Please make sure you are connected to the Base Sepolia network, as wallets like MetaMask may occasionally default to a different chain. Double-check your network selection before playing — it’s important.

The game is fully functional and playable, but it was built primarily as a learning project. As such, the current user experience is minimal. I’m applying for a grant to dedicate more time to development — improving the UI, adding competitive features, and introducing staking or betting mechanics. The goal is to make ZK Wordle not only technically sound but also fun, engaging, and competitive, with time limits and proof-based verification built into the gameplay.

---

✅ **In short:** ZK Wordle reimagines a simple word game as a fully trustless, verifiable peer-to-peer experience. Every guess is provably correct, every word stays private, and the blockchain ensures fairness — all powered by zero-knowledge proofs.
