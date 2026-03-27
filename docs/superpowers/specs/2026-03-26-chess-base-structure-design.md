# Chess Base Structure Design

**Date:** 2026-03-26
**Status:** Approved

## Overview

Create the foundational chess game structure: TypeScript types, a `useGame` hook managing chess.js state, a `ChessBoard` display component, and a `/game` route. Simultaneously migrate the project from a flat `frontend/` layout to a `src/`-organized structure.

## Migration: `src/` Directory

Move existing files before adding new ones:

| From | To |
|---|---|
| `frontend/app/` | `frontend/src/app/` |
| `frontend/components/` | `frontend/src/components/` |
| `frontend/lib/` | `frontend/src/lib/` |

Update `tsconfig.json` path alias:
```json
"paths": { "@/*": ["./src/*"] }
```

Next.js detects `src/app/` automatically — no extra config needed.

## Types (`src/types/game.types.ts`)

```ts
type PieceColor = 'white' | 'black'

type BotLevel = 'iniciante' | 'guerreiro' | 'mestre'

type Bot = {
  id: string
  name: string
  level: BotLevel
  skillLevel: number   // 2 | 10 | 20 — valor enviado ao Stockfish
  description: string
}

type GameMove = {
  from: string
  to: string
  san: string           // notação algébrica: 'e4', 'Nf3', 'O-O'
  fen: string           // FEN do tabuleiro APÓS a jogada
  piece: string         // 'p', 'n', 'b', 'r', 'q', 'k'
  color: PieceColor
  isCapture: boolean
  isCheck: boolean
  isCheckmate: boolean
  promotion?: string
}

type Game = {
  id: string
  botId: string
  playerColor: PieceColor
  moves: GameMove[]
  status: 'playing' | 'won' | 'lost' | 'draw'
  startedAt: string     // ISO 8601
  endedAt?: string
}
```

All types exported. `GameMove` carries enough data for post-game analysis (SAN + FEN per move) and Stockfish integration without future changes.

## Hook: `useGame` (`src/hooks/useGame.ts`)

Single source of truth for game state. The only file that imports chess.js.

```ts
type UseGameReturn = {
  fen: string
  moves: GameMove[]
  status: Game['status']
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  reset: () => void
}

export function useGame(playerColor: PieceColor): UseGameReturn
```

**Internal design:**
- `Chess` instance lives in `useRef` — stable reference, no re-render on mutation
- `fen` and `moves` in `useState` — these drive UI re-renders
- `makeMove()` calls `chess.move({ from, to, promotion })`: returns `null` for illegal moves, constructs and returns a `GameMove` for legal ones
- Game-over detection via `chess.isGameOver()`, `chess.isCheckmate()`, `chess.isDraw()` after each move — updates `status`

## Component: `ChessBoard` (`src/components/board/ChessBoard.tsx`)

Display-only component. Does not import chess.js. Receives all state and logic via props.

```ts
type ChessBoardProps = {
  fen: string
  playerColor: PieceColor
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  onMove: (move: GameMove) => void
  disabled?: boolean
}
```

**Move flow:**
1. User drags piece → `react-chessboard` fires `onPieceDrop(from, to)`
2. Component calls `makeMove(from, to)`
3. If `null` → illegal, return `false` from `onPieceDrop` (react-chessboard reverts the piece)
4. If `GameMove` → call `onMove(gameMove)`, return `true`

**react-chessboard props used:**
- `position={fen}`
- `boardOrientation={playerColor}`
- `onPieceDrop`
- `arePiecesDraggable={!disabled}`

## Page: `src/app/game/page.tsx`

Composes `useGame` and `ChessBoard`. The `handleMove` function is a placeholder — bot response logic will be added here in a future iteration.

```ts
export default function GamePage() {
  const { fen, makeMove, moves, status } = useGame('white')

  function handleMove(move: GameMove) {
    // Bot will respond here in the next iteration
    console.log('Jogada:', move.san, '| Status:', status)
  }

  return (
    <main>
      <ChessBoard
        fen={fen}
        playerColor="white"
        makeMove={makeMove}
        onMove={handleMove}
      />
    </main>
  )
}
```

## Final File Structure

```
frontend/src/
  app/
    layout.tsx, page.tsx, globals.css  (moved)
    game/page.tsx                      (new)
  components/
    ui/button.tsx                      (moved)
    board/ChessBoard.tsx               (new)
  hooks/
    useGame.ts                         (new)
  lib/utils.ts                         (moved)
  types/
    game.types.ts                      (new)
```

## Out of Scope

- Bot integration (Stockfish) — next iteration
- Promotion UI — `makeMove` accepts `promotion` param but UI picker not implemented
- Game persistence (localStorage) — `storage.service.ts` will handle this later
- Post-game analysis view
