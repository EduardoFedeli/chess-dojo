# Home Page — Bot Selection Design

**Date:** 2026-03-26

## Overview

Replace the default Next.js `src/app/page.tsx` with a bot-selection screen. The player picks a bot and a color, then navigates to `/game` with those choices encoded as searchParams.

## Files changed

| File | Change |
|------|--------|
| `src/app/page.tsx` | Full replacement — bot selection UI |
| `src/app/game/page.tsx` | Read searchParams, dynamic skillLevel + playerColor |
| `src/hooks/useStockfish.ts` | Add `playerColor` param to detect bot turn correctly |

## Home page (`src/app/page.tsx`)

- `'use client'` — needs `useState` for selections and `useRouter` for navigation
- State: `selectedBot: BotLevel | null`, `selectedColor: PieceColor | null`
- Bots defined as a constant array using the `Bot` type from `@/types/game.types`
- Layout: dark background, centered, 3 bot cards + color toggle + Jogar button
- Bot cards: emoji, name, description; selected state = highlighted border
- Color toggle: two buttons (♔ Brancas / ♚ Pretas)
- "Jogar" button disabled until both bot and color are selected
- Navigation: `router.push('/game?bot=iniciante&color=white')`

## Game page (`src/app/game/page.tsx`)

- `useSearchParams()` to read `bot` and `color` params
- Fallback defaults: `bot=iniciante` (skillLevel 2), `color=white`
- `skillLevel` lookup: `{ iniciante: 2, guerreiro: 10, mestre: 20 }`
- Pass `playerColor` to both `useGame` and `useStockfish`

## useStockfish change

- Add `playerColor: PieceColor` to options
- Bot turn detection: `fen.split(' ')[1] === (playerColor === 'white' ? 'b' : 'w')`
- Replaces the hardcoded `=== 'b'` check

## URL format

`/game?bot=iniciante&color=white`
`/game?bot=guerreiro&color=black`
`/game?bot=mestre&color=white`
