# Frontend Components

This folder contains all the React components for the ZK Wordle frontend, organized into modular, reusable pieces.

## Component Structure

### Main Components
- **`TwoPlayerGame.tsx`** - Main game orchestrator component
- **`ConnectWallet.tsx`** - Wallet connection interface

### Modular Game Components
- **`GameStatus.tsx`** - Displays game statistics (attempts, status, winner)
- **`PlayerSection.tsx`** - Individual player interface (guess input, verify button)
- **`GuessHistory.tsx`** - Shows history of all guesses with color-coded results
- **`ActivityLog.tsx`** - Real-time activity feed with game events

### Custom Hooks
- **`../hooks/useGameState.ts`** - Manages contract state and event listening

## Component Benefits

### Before Refactoring
- **1 large file** (500+ lines)
- **Repetitive code** for Player 1 & Player 2 sections
- **Hard to maintain** and test individual features
- **Mixed concerns** (UI, state management, contract interactions)

### After Refactoring
- **Modular components** - each with single responsibility
- **Reusable** - `PlayerSection` used for both players
- **Easier testing** - can test components in isolation
- **Better organization** - clear separation of concerns
- **Maintainable** - changes are localized to specific components

## Usage

```tsx
import { TwoPlayerGame, GameStatus, PlayerSection } from './components';

// Use the main orchestrator
<TwoPlayerGame />

// Or use individual components
<GameStatus {...gameStatusProps} />
<PlayerSection playerNumber={1} {...playerProps} />
```

## Props Interface

Each component has well-defined TypeScript interfaces for props, making them predictable and type-safe:

- `GameStatus` - displays game statistics
- `PlayerSection` - handles player interactions  
- `GuessHistory` - shows game history
- `ActivityLog` - displays real-time events
- `useGameState` - provides contract state management

This modular approach makes the codebase more maintainable and allows for easier feature additions!
