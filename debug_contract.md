# Contract Logic Bug Analysis

## The Problem
- Account A: `0x627836D7...0e8d6496A` created a game
- Account B: `0x0F0a7067...D8C1d314C` tried to join  
- Got error: "Player 1 already joined" 

## Expected Flow
1. Account A calls `Factory.createGame()` 
2. Factory deploys new `Wordle` contract
3. In Wordle constructor: `player1 = msg.sender` (should be Factory address)
4. Factory stores game info with `player1 = Account A`
5. Account B calls `Factory.joinGame()`
6. Factory validates: `gameInfo.player1 != Account B` ✅ (Account A != Account B)
7. Factory calls `Wordle.joinGame()` with `msg.sender = Account B`
8. Wordle validates: `msg.sender != player1` (Account B != Factory) ✅

## Potential Issues

### Issue 1: Constructor Bug
The Wordle constructor sets `player1 = msg.sender` where `msg.sender` is the Factory.
But we need `player1` to be the actual game creator.

### Issue 2: Data Inconsistency
- Factory thinks `player1 = Account A`
- Wordle thinks `player1 = Factory address`

## Solution
We need to pass the actual player address to the Wordle constructor.