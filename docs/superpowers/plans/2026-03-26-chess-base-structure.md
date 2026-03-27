# Chess Base Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the frontend to a `src/`-organized layout and build the foundational chess game: types, `useGame` hook, `ChessBoard` component, and `/game` route.

**Architecture:** The `Chess` instance (chess.js) lives in a `useGame` hook at the page level — `ChessBoard` is a display-only component that receives `fen` and `makeMove` as props. This separation allows the bot to call `makeMove` from the page without touching the board component.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, chess.js, react-chessboard, Tailwind CSS v4, shadcn/ui.

> **Note on tests:** No test runner is configured in this project (`CLAUDE.md`: "Não há backend, não há testes automatizados configurados no momento"). TDD steps are omitted. Verify correctness by running the dev server and manually testing.

---

## Files Touched

| Action | Path | Responsibility |
|---|---|---|
| Move | `frontend/app/` → `frontend/src/app/` | Next.js App Router |
| Move | `frontend/components/` → `frontend/src/components/` | shadcn/ui components |
| Move | `frontend/lib/` → `frontend/src/lib/` | Shared utilities |
| Modify | `frontend/tsconfig.json` | Update `@/*` path alias |
| Modify | `frontend/components.json` | Update CSS path for shadcn CLI |
| Create | `frontend/src/types/game.types.ts` | All shared TypeScript types |
| Create | `frontend/src/hooks/useGame.ts` | Chess game state management |
| Create | `frontend/src/components/board/ChessBoard.tsx` | Board UI component |
| Create | `frontend/src/app/game/page.tsx` | `/game` route |

---

### Task 1: Migrate to `src/` structure

**Files:**
- Move: `frontend/app/` → `frontend/src/app/`
- Move: `frontend/components/` → `frontend/src/components/`
- Move: `frontend/lib/` → `frontend/src/lib/`
- Modify: `frontend/tsconfig.json`
- Modify: `frontend/components.json`

- [ ] **Step 1: Move existing directories into `src/`**

Run from `frontend/`:
```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo/frontend"
mkdir -p src
mv app src/
mv components src/
mv lib src/
```

- [ ] **Step 2: Update `tsconfig.json` path alias**

In `frontend/tsconfig.json`, change the `paths` entry from `./*` to `./src/*`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Update `components.json` CSS path**

In `frontend/components.json`, update the `tailwind.css` path from `app/globals.css` to `src/app/globals.css`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

- [ ] **Step 4: Verify the build still passes**

Run from `frontend/`:
```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo/frontend"
npm run build
```

Expected: build completes with no errors. Next.js auto-detects `src/app/` and picks it up.

- [ ] **Step 5: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo"
git add frontend/src/ frontend/tsconfig.json frontend/components.json
git status
git commit -m "chore(frontend): migrate to src/ directory structure"
```

---

### Task 2: Create game types

**Files:**
- Create: `frontend/src/types/game.types.ts`

- [ ] **Step 1: Create the types file**

Create `frontend/src/types/game.types.ts`:

```ts
// Cor do jogador — alinha com os valores esperados pelo react-chessboard
export type PieceColor = 'white' | 'black'

// Nível do bot — nome semântico para a UI; skillLevel é o valor enviado ao Stockfish
export type BotLevel = 'iniciante' | 'guerreiro' | 'mestre'

export type Bot = {
  id: string
  name: string
  level: BotLevel
  skillLevel: number // 2 = iniciante | 10 = guerreiro | 20 = mestre
  description: string
}

// GameMove carrega tudo que análise pós-jogo e integração com Stockfish precisam.
// O FEN por jogada permite reconstruir qualquer posição sem depender do histórico completo.
export type GameMove = {
  from: string       // casa de origem, ex: 'e2'
  to: string         // casa de destino, ex: 'e4'
  san: string        // notação algébrica padrão: 'e4', 'Nf3', 'O-O'
  fen: string        // FEN do tabuleiro APÓS esta jogada ser executada
  piece: string      // tipo da peça: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
  color: PieceColor
  isCapture: boolean
  isCheck: boolean
  isCheckmate: boolean
  promotion?: string // peça de promoção se houver: 'q' | 'r' | 'b' | 'n'
}

export type GameStatus = 'playing' | 'won' | 'lost' | 'draw'

export type Game = {
  id: string
  botId: string
  playerColor: PieceColor
  moves: GameMove[]
  status: GameStatus
  startedAt: string  // ISO 8601
  endedAt?: string   // ISO 8601 — ausente enquanto a partida está em andamento
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo/frontend"
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo"
git add frontend/src/types/game.types.ts
git commit -m "feat(types): add game domain types"
```

---

### Task 3: Create `useGame` hook

**Files:**
- Create: `frontend/src/hooks/useGame.ts`

- [ ] **Step 1: Create the hook**

Create `frontend/src/hooks/useGame.ts`:

```ts
import { useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { GameMove, GameStatus, PieceColor } from '@/types/game.types'

type UseGameReturn = {
  fen: string
  moves: GameMove[]
  status: GameStatus
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  reset: () => void
}

export function useGame(playerColor: PieceColor): UseGameReturn {
  // useRef mantém a instância Chess estável entre renders sem causar re-renders
  // ao ser mutada — só os dados derivados (fen, moves, status) ficam em useState.
  const chessRef = useRef(new Chess())

  const [fen, setFen] = useState(chessRef.current.fen())
  const [moves, setMoves] = useState<GameMove[]>([])
  const [status, setStatus] = useState<GameStatus>('playing')

  function makeMove(
    from: string,
    to: string,
    promotion?: string
  ): GameMove | null {
    const chess = chessRef.current

    // chess.move() retorna null para jogadas ilegais sem lançar exceção
    // quando usamos { strict: false } (padrão do chess.js v1+)
    let result
    try {
      result = chess.move({ from, to, promotion: promotion ?? 'q' })
    } catch {
      // chess.js lança erro em algumas versões para jogadas ilegais
      return null
    }

    if (!result) return null

    const gameMove: GameMove = {
      from: result.from,
      to: result.to,
      san: result.san,
      fen: chess.fen(), // FEN capturado APÓS a jogada
      piece: result.piece,
      color: result.color === 'w' ? 'white' : 'black',
      isCapture: result.captured !== undefined,
      isCheck: chess.inCheck(),
      isCheckmate: chess.isCheckmate(),
      promotion: result.promotion,
    }

    // Forma funcional evita stale closure: garante que sempre acumulamos
    // sobre o estado mais recente, mesmo que makeMove seja chamado rapidamente.
    setMoves(prev => [...prev, gameMove])
    setFen(chess.fen())
    setStatus(deriveStatus(chess, playerColor))

    return gameMove
  }

  function reset() {
    chessRef.current = new Chess()
    setFen(chessRef.current.fen())
    setMoves([])
    setStatus('playing')
  }

  return { fen, moves, status, makeMove, reset }
}

// Separado para clareza: determina o status da partida do ponto de vista do jogador.
function deriveStatus(chess: Chess, playerColor: PieceColor): GameStatus {
  if (!chess.isGameOver()) return 'playing'
  if (chess.isDraw()) return 'draw'

  // isCheckmate() = true significa que o lado que VAI jogar perdeu
  const loserColor = chess.turn() === 'w' ? 'white' : 'black'
  if (loserColor === playerColor) return 'lost'
  return 'won'
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo/frontend"
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo"
git add frontend/src/hooks/useGame.ts
git commit -m "feat(hooks): add useGame hook for chess state management"
```

---

### Task 4: Create `ChessBoard` component

**Files:**
- Create: `frontend/src/components/board/ChessBoard.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/board/ChessBoard.tsx`:

```tsx
'use client'

// 'use client' é obrigatório: react-chessboard usa eventos do browser (drag & drop)
// e não é compatível com Server Components.

import { Chessboard } from 'react-chessboard'
import type { GameMove, PieceColor } from '@/types/game.types'

type ChessBoardProps = {
  fen: string
  playerColor: PieceColor
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  onMove: (move: GameMove) => void
  // disabled bloqueia interação: usado durante turno do bot ou fim de jogo
  disabled?: boolean
}

export function ChessBoard({
  fen,
  playerColor,
  makeMove,
  onMove,
  disabled = false,
}: ChessBoardProps) {
  // onPieceDrop é o handler principal do react-chessboard.
  // Retornar false reverte a peça à posição original (jogada ilegal).
  // Retornar true confirma a jogada e atualiza o tabuleiro.
  function handlePieceDrop(
    sourceSquare: string,
    targetSquare: string
  ): boolean {
    if (disabled) return false

    const move = makeMove(sourceSquare, targetSquare)
    if (!move) return false

    onMove(move)
    return true
  }

  return (
    <Chessboard
      position={fen}
      boardOrientation={playerColor}
      onPieceDrop={handlePieceDrop}
      arePiecesDraggable={!disabled}
    />
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo/frontend"
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo"
git add frontend/src/components/board/ChessBoard.tsx
git commit -m "feat(components): add ChessBoard display component"
```

---

### Task 5: Create `/game` page

**Files:**
- Create: `frontend/src/app/game/page.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/app/game/page.tsx`:

```tsx
'use client'

// Esta página é um Client Component porque usa o hook useGame (que usa useState/useRef).
// Em Next.js App Router, hooks do React só funcionam em Client Components.

import { useGame } from '@/hooks/useGame'
import { ChessBoard } from '@/components/board/ChessBoard'
import type { GameMove } from '@/types/game.types'

export default function GamePage() {
  const { fen, makeMove, status } = useGame('white')

  // Placeholder: aqui o bot responderá à jogada do jogador na próxima iteração.
  function handleMove(move: GameMove) {
    console.log('Jogada registrada:', move.san, '| FEN:', move.fen)
    console.log('Status:', status)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-[560px]">
        <ChessBoard
          fen={fen}
          playerColor="white"
          makeMove={makeMove}
          onMove={handleMove}
          disabled={status !== 'playing'}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript and build**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo/frontend"
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 3: Smoke test no browser**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo/frontend"
npm run dev
```

Acesse `http://localhost:3000/game`. Verifique:
- Tabuleiro aparece com peças brancas embaixo
- Arrastando peça branca para casa válida: peça move
- Arrastando para casa inválida: peça volta à origem
- Console mostra `Jogada registrada:` com SAN e FEN

- [ ] **Step 4: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo"
git add frontend/src/app/game/
git commit -m "feat(game): add /game page with ChessBoard and useGame integration"
```

---

### Task 6: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md to reflect `src/` structure is now live**

In the root `CLAUDE.md`, update the "Estrutura de pastas" section to remove the "criar conforme necessidade" notes for directories that now exist:

```markdown
## Estrutura de pastas

\```
frontend/src/
  app/            → rotas Next.js App Router (layout.tsx, page.tsx, globals.css)
  components/
    ui/           → componentes shadcn/ui (PascalCase)
    board/        → componentes do tabuleiro (ChessBoard.tsx)
  hooks/          → custom hooks (useGame.ts)
  lib/            → utilitários compartilhados (cn() em utils.ts)
  types/          → tipagens TypeScript (game.types.ts)
  services/       → storage.service.ts (NÃO modificar sem instrução explícita) — criar conforme necessidade
  utils/          → funções puras (kebab-case: pgn-parser.ts) — criar conforme necessidade
\```

Path alias `@/*` aponta para `frontend/src/` (ex: `@/components/board/ChessBoard`, `@/hooks/useGame`).
```

- [ ] **Step 2: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo"
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect src/ structure"
```
