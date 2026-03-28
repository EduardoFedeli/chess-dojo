# Design & UX Overhaul — Chess Dojo

**Date:** 2026-03-28
**Status:** Approved

## Overview

Complete visual and UX redesign of the chess-dojo app. Seven independent items implemented as separate commits. No backend changes. No changes to Stockfish logic.

**Palette:** `#000000` bg · `#FFFBFC` text · `#6B8F71` green · `#813405` brown · `#EE964B` orange
**Assets:** `/public/bots/{iniciante,guerreiro,mestre}.png` · `/public/pieces/cburnett/{wP,wN,wB,wR,wQ,wK,bP,bN,bB,bR,bQ,bK}.svg`

---

## Item 1 — Bot Avatars on Home Page

**File:** `src/app/page.tsx`

Redesign bot cards to use real avatar images:

- `next/image` renders each bot avatar at **80×80px**, `rounded-full`, with a subtle drop-shadow
- Card layout: avatar top-center, bot name below, difficulty indicator (1–3 filled stars), short description
- Difficulty stars: Iniciante = 1 star, Guerreiro = 2 stars, Mestre = 3 stars (color `#EE964B`)
- **Selected card:** `border-2` in `#EE964B` + glow `box-shadow: 0 0 20px #EE964B33` + tinted background `#EE964B18`
- Page background: subtle radial gradient using project palette (already in globals.css body)
- Cards remain `w-52` with `rounded-2xl`

---

## Item 2 — Lichess cburnett Custom Pieces

**New file:** `src/hooks/usePieceTheme.ts`
**Modified:** `src/components/board/ChessBoard.tsx`

Hook manages which piece style is active and returns the `customPieces` object expected by react-chessboard v5.

### usePieceTheme.ts

```ts
// Piece keys react-chessboard expects: wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK
// Each value: React component receiving { squareWidth: number }
// Renders <img src="/pieces/cburnett/{key}.svg" width={squareWidth} height={squareWidth} />
// Default theme: 'cburnett'
// localStorage key: 'chess-dojo:piece-theme'
```

Returns: `{ customPieces, activeTheme, setTheme }`

### ChessBoard.tsx changes

- Add optional prop `customPieces?: Record<string, ({ squareWidth }: { squareWidth: number }) => JSX.Element>`
- Pass to `options.customPieces` in the `<Chessboard>` component

---

## Item 3 — Game Page: Board as Protagonist

**File:** `src/app/game/page.tsx`

Replace fixed `500px` sizes with dynamic sizing:

### Layout

```
<main> h-screen overflow-hidden, radial-gradient(#000 center, #0d1a0f edges)
  <div> CSS Grid: [board-col] [right-panel 280px], gap-6, items-start, centered
    Left col:
      Board container: size = min(calc(100vh - 120px), 700px), always square
      Below board: theme previews (left) + resign button (right)
    Right col: 280px fixed, h = same as board, overflow-y-auto (MoveHistory)
```

### Board sizing strategy

Use a CSS custom property or inline style computed once:
```ts
const boardSize = Math.min(window.innerHeight - 120, 700)
```
Set on mount via `useState` + `useEffect` (SSR-safe). Pass as `style={{ width: boardSize, height: boardSize }}` to the board container. `ChessBoard` itself uses `width: '100%'` internally via react-chessboard's container.

> react-chessboard v5 sizes itself to its container by default — no explicit size prop needed if the container is sized correctly.

---

## Item 4 — Expanded Board Themes (5 options)

**File:** `src/app/game/page.tsx`

Add two themes to the existing three:

| Key | Label | Light | Dark |
|-----|-------|-------|------|
| `classico` | Clássico | `#F0D9B5` | `#B58863` |
| `esmeralda` | Esmeralda | `#FFFFDD` | `#6B8F71` |
| `noite` | Noite | `#DEE3E6` | `#8CA2AD` |
| `marrom` | Marrom | `#EDD6A1` | `#813405` |
| `ardosia` | Ardósia | `#C8C9C5` | `#4A4A4A` |

**Storage key:** Update from `chess-board-theme` → `chess-dojo:board-theme` (consistent with project namespace).

**Preview:** Each theme shown as two adjacent `20×20px` squares (light + dark), clickable, `border-2 border-white` when active.

---

## Item 5 — Move & Game Sounds (Web Audio API)

**New file:** `src/utils/sound.ts`
**Modified:** `src/app/game/page.tsx`

### sound.ts exports

```ts
export function playMoveSound(): void    // short soft tone ~80ms, 440Hz triangle
export function playCaptureSound(): void // lower thud ~150ms, 120→40Hz sine (existing logic)
export function playCheckSound(): void   // alert tone ~200ms, 880Hz with slight detune
export function playGameEndSound(): void // 3-note sequence: 523→659→784Hz, 120ms each
```

All functions: check `localStorage.getItem('chess-dojo:sound-enabled') !== 'false'` before playing. Return early if sound is disabled or `typeof window === 'undefined'`.

### Integration in game/page.tsx

Remove the inline `playCaptureSound` function (now in utils).

```ts
// In onMove callback:
playMoveSound()                          // always
if (move.isCapture) playCaptureSound()   // additionally on capture

// useEffect watching moves (last move):
if (lastMove.isCheck && !lastMove.isCheckmate) playCheckSound()

// useEffect watching status:
if (status !== 'playing') playGameEndSound()
```

Sound enabled state: read from localStorage on mount, managed as `useState<boolean>`. Toggled in the settings modal (Item 7).

---

## Item 6 — Review Page: Rebalanced Layout

**File:** `src/app/review/page.tsx`

Apply same sizing approach as Item 3:

- `<main>` → `h-screen overflow-hidden`
- Board container: same `min(calc(100vh - 120px), 700px)` formula
- Right panel: `max-w-[320px]` with `flex-1`
- `AdvantageGraph`: fixed `height={100}` (currently uses default — confirm component accepts height prop or wrap in fixed container)
- Move list: already `flex-1 overflow-y-auto` — verify it respects the available height after graph + summary
- `AdvantageBar` left of board: height matches board dynamically

---

## Item 7 — Settings Modal

**File:** `src/app/game/page.tsx`
**New component:** shadcn/ui Dialog (install: `npx shadcn@latest add dialog`)

### Trigger

`Settings` icon (lucide-react, already available) in the top-right corner of game page. Positioned `absolute top-4 right-4`.

### Modal content

```
Dialog title: "Configurações"
Section 1 — Tema do tabuleiro
  5 theme previews (2×2 squares) with label below, clickable
  Active theme has orange border
Section 2 — Som
  Toggle switch (shadcn Switch or simple checkbox) labeled "Sons de movimento"
  Persists to localStorage 'chess-dojo:sound-enabled'
Section 3 — (futuro) Peças  [shown as disabled/greyed out placeholder]
```

Sound toggle reads/writes `chess-dojo:sound-enabled`. The same state is used by `sound.ts` functions.

---

## Constraints

- `useGame.ts`: not modified
- `useStockfish.ts`: not modified
- `storage.service.ts`: not modified
- `ChessBoard.tsx`: only additions (new optional props), no behavior changes
- Each item = one git commit
- Push after all 7 commits
