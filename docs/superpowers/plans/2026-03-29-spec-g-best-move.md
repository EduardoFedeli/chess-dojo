# Spec G — Best Move in Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar botão "Ver melhor lance" na tela de revisão que consulta o Stockfish e exibe seta + highlight no tabuleiro.

**Architecture:** Novo hook `useBestMove` encapsula um Worker Stockfish para consultas únicas por posição. `ChessBoard` ganha duas novas props (`arrows` e `squareStylesOverride`). `review/page.tsx` orquestra o botão e passa os dados visuais ao tabuleiro. Limpar ao navegar é feito interceptando `goTo`.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, React 19, react-chessboard v5, Stockfish WebAssembly (Web Worker).

---

## File Map

| Arquivo | Mudança |
|---|---|
| `frontend/src/hooks/useBestMove.ts` | Criar — hook para consulta única ao Stockfish |
| `frontend/src/components/board/ChessBoard.tsx` | Adicionar props `arrows` e `squareStylesOverride` |
| `frontend/src/app/review/page.tsx` | Integrar hook, botão, highlight e seta |

---

### Task 1: Hook `useBestMove`

**Files:**
- Create: `frontend/src/hooks/useBestMove.ts`

- [ ] **Step 1: Criar `frontend/src/hooks/useBestMove.ts`**

```ts
import { useEffect, useRef, useState } from 'react'

type BestMove = { from: string; to: string }

type UseBestMoveReturn = {
  bestMove: BestMove | null
  isLoading: boolean
  query: (fen: string) => void
  clear: () => void
}

export function useBestMove(): UseBestMoveReturn {
  const workerRef    = useRef<Worker | null>(null)
  const isReadyRef   = useRef(false)
  const [bestMove,   setBestMove]   = useState<BestMove | null>(null)
  const [isLoading,  setIsLoading]  = useState(false)

  useEffect(() => {
    const worker = new Worker('/stockfish-18-lite-single.js')
    workerRef.current = worker

    worker.postMessage('uci')
    worker.postMessage('isready')

    worker.onmessage = (event: MessageEvent<string>) => {
      const line = event.data

      if (line === 'readyok') {
        isReadyRef.current = true
        return
      }

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ')
        const move  = parts[1]
        if (!move || move === '(none)') {
          setBestMove(null)
        } else {
          setBestMove({ from: move.slice(0, 2), to: move.slice(2, 4) })
        }
        setIsLoading(false)
      }
    }

    return () => {
      worker.terminate()
      workerRef.current  = null
      isReadyRef.current = false
    }
  }, [])

  function query(fen: string) {
    if (!workerRef.current || !isReadyRef.current) return
    setBestMove(null)
    setIsLoading(true)
    workerRef.current.postMessage('ucinewgame')
    workerRef.current.postMessage(`position fen ${fen}`)
    workerRef.current.postMessage('go movetime 800')
  }

  function clear() {
    setBestMove(null)
    setIsLoading(false)
  }

  return { bestMove, isLoading, query, clear }
}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: zero erros TypeScript. O hook exportado não é usado ainda — isso é esperado.

- [ ] **Step 3: Commit parcial**

```bash
git add frontend/src/hooks/useBestMove.ts
git commit -m "feat(review): hook useBestMove — consulta única ao Stockfish"
```

---

### Task 2: ChessBoard — props `arrows` e `squareStylesOverride`

**Files:**
- Modify: `frontend/src/components/board/ChessBoard.tsx`

O componente atual já aceita `squareStyles` internamente (xeque, seleção, movimentos válidos). Precisamos adicionar:
- `squareStylesOverride`: mergeado sobre os estilos internos, para o highlight do melhor lance
- `arrows`: passado como `customArrows` ao react-chessboard v5

- [ ] **Step 1: Adicionar as props ao tipo `ChessBoardProps`**

Localizar (após a prop `animationDuration?`):
```ts
  animationDuration?: number
}
```

Substituir por:
```ts
  animationDuration?: number
  /** Estilos extras mergeados sobre os highlights internos (xeque, seleção). */
  squareStylesOverride?: Record<string, React.CSSProperties>
  /** Setas customizadas: array de [from, to]. */
  arrows?: [string, string][]
}
```

- [ ] **Step 2: Receber as novas props na função `ChessBoard`**

Localizar:
```ts
export function ChessBoard({
  fen,
  playerColor,
  makeMove,
  onMove,
  disabled = false,
  theme,
  customPieces,
  animationDuration = 300,
}: ChessBoardProps) {
```

Substituir por:
```ts
export function ChessBoard({
  fen,
  playerColor,
  makeMove,
  onMove,
  disabled = false,
  theme,
  customPieces,
  animationDuration = 300,
  squareStylesOverride,
  arrows,
}: ChessBoardProps) {
```

- [ ] **Step 3: Mergear `squareStylesOverride` no final do build de `squareStyles`**

Localizar (logo antes do `return`):
```ts
  for (const [sq, { isCapture }] of Object.entries(validSquares)) {
    squareStyles[sq] = isCapture ? HIGHLIGHT_CAPTURE : HIGHLIGHT_MOVE
  }

  // react-chessboard v5 recebe todas as opções num único prop `options`
  return (
```

Substituir por:
```ts
  for (const [sq, { isCapture }] of Object.entries(validSquares)) {
    squareStyles[sq] = isCapture ? HIGHLIGHT_CAPTURE : HIGHLIGHT_MOVE
  }
  if (squareStylesOverride) {
    Object.assign(squareStyles, squareStylesOverride)
  }

  // react-chessboard v5 recebe todas as opções num único prop `options`
  return (
```

- [ ] **Step 4: Passar `arrows` como `customArrows` ao Chessboard**

Localizar dentro de `options={{...}}`:
```tsx
          ...(customPieces            && { pieces: customPieces }),
```

Substituir por:
```tsx
          ...(customPieces            && { pieces: customPieces }),
          ...(arrows && arrows.length > 0 && { customArrows: arrows as [string, string][] }),
```

- [ ] **Step 5: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: zero erros TypeScript.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/board/ChessBoard.tsx
git commit -m "feat(board): props arrows e squareStylesOverride no ChessBoard"
```

---

### Task 3: Review page — botão + integração

**Files:**
- Modify: `frontend/src/app/review/page.tsx`

- [ ] **Step 1: Adicionar import do hook**

No topo do arquivo, junto aos outros imports (após `import { usePieceTheme } from '@/hooks/usePieceTheme'`):
```ts
import { useBestMove } from '@/hooks/useBestMove'
```

- [ ] **Step 2: Instanciar o hook dentro de `ReviewContent`**

Localizar, dentro de `ReviewContent`, após:
```ts
  const { customPieces } = usePieceTheme()
```

Adicionar:
```ts
  const { bestMove, isLoading: isBestMoveLoading, query: queryBestMove, clear: clearBestMove } = useBestMove()
```

- [ ] **Step 3: Interceptar `goTo` para limpar o melhor lance ao navegar**

Localizar:
```ts
  const goTo    = useCallback((i: number) => setCurrentIndex(Math.max(0, Math.min(i, moves.length))), [moves.length])
```

Substituir por:
```ts
  const goTo    = useCallback((i: number) => {
    clearBestMove()
    setCurrentIndex(Math.max(0, Math.min(i, moves.length)))
  }, [moves.length, clearBestMove])
```

- [ ] **Step 4: Calcular `bestMoveSquareStyles`**

Localizar (após `if (!savedGame) return null`, antes de `const dateStr`):
```ts
  const dateStr   = new Date(savedGame.date).toLocaleDateString('pt-BR')
```

Adicionar logo antes:
```ts
  const bestMoveSquareStyles: Record<string, React.CSSProperties> = bestMove
    ? {
        [bestMove.from]: { background: 'rgba(255, 255, 0, 0.5)' },
        [bestMove.to]:   { background: 'rgba(0, 200, 100, 0.5)' },
      }
    : {}
```

- [ ] **Step 5: Passar `squareStylesOverride` e `arrows` ao `ChessBoard`**

Localizar o componente `<ChessBoard>` dentro de `ReviewContent`:
```tsx
              <ChessBoard
                fen={currentFen}
                playerColor={savedGame.playerColor}
                makeMove={(_from: string, _to: string) => null}
                onMove={() => {}}
                disabled={true}
                customPieces={customPieces}
              />
```

Substituir por:
```tsx
              <ChessBoard
                fen={currentFen}
                playerColor={savedGame.playerColor}
                makeMove={(_from: string, _to: string) => null}
                onMove={() => {}}
                disabled={true}
                customPieces={customPieces}
                squareStylesOverride={bestMoveSquareStyles}
                arrows={bestMove ? [[bestMove.from, bestMove.to]] : []}
              />
```

- [ ] **Step 6: Adicionar o botão no rodapé da coluna direita**

Localizar o bloco `{/* 5. Botões fixos no rodapé da coluna */}`:
```tsx
              {/* 5. Botões fixos no rodapé da coluna */}
              <div className="flex shrink-0 flex-col gap-2">
                {cachedResult && !deepReady && (
```

Substituir por:
```tsx
              {/* 5. Botões fixos no rodapé da coluna */}
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  onClick={() => {
                    if (bestMove) {
                      clearBestMove()
                    } else {
                      queryBestMove(currentFen)
                    }
                  }}
                  disabled={isBestMoveLoading}
                  className="w-full rounded-xl border border-neutral-700 py-2 text-xs text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300 disabled:opacity-40"
                >
                  {isBestMoveLoading ? 'Calculando...' : bestMove ? 'Limpar lance' : 'Ver melhor lance ⚡'}
                </button>
                {cachedResult && !deepReady && (
```

- [ ] **Step 7: Verificar build + lint**

```bash
cd frontend && npm run build 2>&1 | tail -15
cd frontend && npm run lint 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`, zero erros TypeScript, zero erros de lint novos.

- [ ] **Step 8: Commit + Push**

```bash
git add frontend/src/app/review/page.tsx
git commit -m "feat(review): botão Ver melhor lance com seta e highlight no tabuleiro"
git push
```
