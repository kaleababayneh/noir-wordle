# 🐛 Contract Bug Fix Summary

## The Problem
**Issue**: Users getting "Player 1 already joined" error when trying to join games created by different addresses.

**Root Cause**: The Wordle contract constructor was setting `player1 = msg.sender`, but when called from the Factory, `msg.sender` was the Factory contract address, not the actual game creator.

**Result**: 
- Factory thought `player1 = actual user address`
- Wordle contract thought `player1 = factory contract address`
- Data inconsistency led to validation errors

## The Solution
**Approach**: Modified both contracts so that both players join via the `joinGame()` function instead of setting player1 in the constructor.

### Changes Made:

#### 1. Wordle.sol
- **Before**: Constructor took commitment hashes and set `player1 = msg.sender`
- **After**: Constructor only takes verifier, both players join via `joinGame()`
- **New Logic**: First caller becomes player1, second caller becomes player2

#### 2. WordleGameFactory.sol  
- **Before**: Created Wordle with commitment hashes, player1 set in constructor
- **After**: Creates empty Wordle, then creator calls `joinGame()` to become player1
- **Benefit**: Factory and Wordle contracts stay in sync

#### 3. Updated Tests & Scripts
- Fixed all constructor calls to match new signature
- Updated deploy scripts to call `joinGame()` after creation

## Deployment
- **New Factory Address**: `0x67003A136C73711432516F2ee6Ccfa2f78524b2c`
- **Previous Address**: `0xCd8fb938e0Df888eF1a7FEe14223B5CCaF35ac0b` (deprecated)
- **Status**: Deployed to Sepolia testnet ✅

## Expected Behavior Now
1. User A creates game → Wordle contract has `player1 = User A`
2. User B joins game → Wordle contract has `player2 = User B` 
3. Factory and Wordle data stay synchronized
4. No more "Player 1 already joined" errors for different users!

## Testing
Ready to test with two different wallet addresses:
- Create game with Account A
- Join game with Account B  
- Should work without errors! 🎉