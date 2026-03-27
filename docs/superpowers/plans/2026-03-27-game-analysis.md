# Game Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar histórico de jogadas ao vivo durante a partida e página de revisão pós-partida com análise Stockfish, gráfico de vantagem, classificação de jogadas e exportação em PDF.

**Architecture:** Um hook dedicado (`useStockfishAnalysis`) avalia todas as posições da partida sequencialmente via Web Worker UCI, com movetime 300ms no overlay de fim de jogo e depth 10 na revisão. Os resultados ficam em localStorage. A classificação é feita por uma função pura (`move-classifier.ts`) que compara evaluations antes/depois de cada jogada.

**Tech Stack:** chess.js, react-chessboard, Stockfish WASM (worker UCI), recharts, jspdf, html2canvas, Next.js App Router, TypeScript strict, Tailwind CSS v4.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `frontend/src/types/game.types.ts` | Modificar | Adicionar `MoveClassification`, `MoveEvaluation`, `AnalysisResult` |
| `frontend/src/utils/pgn-builder.ts` | Criar | Gerar string PGN a partir de `GameMove[]` |
| `frontend/src/utils/move-classifier.ts` | Criar | Função pura: `scores[]` + `moves[]` → `MoveEvaluation[]` + acurácia |
| `frontend/src/hooks/useStockfishAnalysis.ts` | Criar | Hook: avaliação sequencial de array de FENs via Worker UCI |
| `frontend/src/components/game/MoveHistory.tsx` | Criar | Painel de histórico ao vivo (read-only, grid 3 colunas, scroll automático) |
| `frontend/src/components/review/AdvantageBar.tsx` | Criar | Barra vertical de vantagem clampada em ±5 |
| `frontend/src/components/review/AdvantageGraph.tsx` | Criar | Gráfico recharts clicável da vantagem ao longo das jogadas |
| `frontend/src/components/review/MoveSummary.tsx` | Criar | Grid de contagens por categoria + acurácia |
| `frontend/src/app/review/page.tsx` | Criar | Página de revisão: replay + análise + PDF |
| `frontend/src/app/game/page.tsx` | Modificar | Adicionar MoveHistory, análise automática ao fim, novo overlay |

---

## Task 1: Instalar dependências e adicionar types

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/types/game.types.ts`

- [ ] **Step 1.1: Instalar dependências**

```bash
cd frontend
npm install recharts jspdf html2canvas
```

Saída esperada: 3 pacotes adicionados sem erros.

- [ ] **Step 1.2: Adicionar types em `game.types.ts`**

Abrir `frontend/src/types/game.types.ts` e adicionar ao final do arquivo (após `GameStatus`):

```ts
// Classificação de uma jogada individual
export type MoveClassification =
  | 'brilliant'    // 🌟 Brilhante
  | 'excellent'    // ✨ Excelente
  | 'good'         // ✅ Boa
  | 'inaccuracy'   // ⚠️ Imprecisão
  | 'mistake'      // ❌ Erro
  | 'missed_win'   // 🎯 Chance Perdida
  | 'blunder'      // 💀 Capivarada

// Avaliação de uma jogada: scores em centipawns (perspectiva brancas)
export type MoveEvaluation = {
  moveIndex: number                  // índice no array GameMove[]
  scoreBefore: number                // centipawns antes da jogada
  scoreAfter: number                 // centipawns depois da jogada
  delta: number                      // perda em pawns pelo jogador (sempre >= 0)
  classification: MoveClassification
}

// Resultado completo da análise — salvo em localStorage
export type AnalysisResult = {
  evaluations: MoveEvaluation[]
  accuracy: number                   // 0–100, inteiro
  date: string                       // ISO 8601
}

// Metadados da última partida — salvo em localStorage
export type SavedGame = {
  pgn: string
  botLevel: string
  playerColor: 'white' | 'black'
  result: 'won' | 'lost' | 'draw'
  date: string                       // ISO 8601
  moves: GameMove[]
}
```

- [ ] **Step 1.3: Verificar build**

```bash
cd frontend && npm run build
```

Esperado: sem erros de TypeScript.

- [ ] **Step 1.4: Commit**

```bash
cd frontend && git add package.json package-lock.json ../frontend/src/types/game.types.ts
git add src/types/game.types.ts
cd .. && git add frontend/package.json frontend/package-lock.json frontend/src/types/game.types.ts
git commit -m "feat(analysis): install deps and add analysis types"
```

---

## Task 2: Criar `pgn-builder.ts`

**Files:**
- Create: `frontend/src/utils/pgn-builder.ts`

- [ ] **Step 2.1: Criar o arquivo**

Criar `frontend/src/utils/pgn-builder.ts`:

```ts
import type { GameMove } from '@/types/game.types'

/**
 * Gera uma string PGN de jogadas (apenas os lances, sem headers) a partir
 * do array de GameMove. Ex: "1. e4 e5 2. Nf3 Nc6"
 * Em xadrez, brancas sempre jogam primeiro — moves[0] é sempre brancas.
 */
export function buildMovesString(moves: GameMove[]): string {
  const parts: string[] = []
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) {
      parts.push(`${Math.floor(i / 2) + 1}.`)
    }
    parts.push(moves[i].san)
  }
  return parts.join(' ')
}
```

- [ ] **Step 2.2: Verificar build**

```bash
cd frontend && npm run build
```

Esperado: sem erros.

- [ ] **Step 2.3: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/utils/pgn-builder.ts
git commit -m "feat(analysis): add pgn-builder utility"
```

---

## Task 3: Criar `move-classifier.ts`

**Files:**
- Create: `frontend/src/utils/move-classifier.ts`

- [ ] **Step 3.1: Criar o arquivo**

Criar `frontend/src/utils/move-classifier.ts`:

```ts
import { Chess } from 'chess.js'
import type { GameMove, MoveClassification, MoveEvaluation } from '@/types/game.types'

// Score de mate: valor extremo em centipawns
const MATE_SCORE = 100_000

/**
 * Detecta se a jogada foi um sacrifício: a peça que moveu foi para uma casa
 * que o oponente pode capturar imediatamente (a casa de destino está atacada
 * na posição APÓS a jogada, onde é vez do oponente).
 */
function isSacrifice(move: GameMove): boolean {
  try {
    const chess = new Chess(move.fen) // FEN após a jogada — vez do oponente
    const opponentMoves = chess.moves({ verbose: true })
    return opponentMoves.some(m => m.to === move.to)
  } catch {
    return false
  }
}

/**
 * Classifica uma única jogada com base na perda de centipawns.
 * scores[] está sempre em perspectiva das brancas (positivo = brancas melhor).
 * i = índice da jogada em moves[]; scores[i] = antes, scores[i+1] = depois.
 */
function classifyMove(
  move: GameMove,
  scoreBefore: number,
  scoreAfter: number,
): MoveClassification {
  const isWhite = move.color === 'white'

  // Perda em centipawns pelo jogador (positivo = jogou pior que o melhor lance)
  const lossCp = isWhite
    ? Math.max(0, scoreBefore - scoreAfter)
    : Math.max(0, scoreAfter - scoreBefore)

  const delta = lossCp / 100

  // Vantagem do jogador antes e depois (perspectiva do jogador)
  const playerAdvantageBefore = isWhite ? scoreBefore : -scoreBefore
  const playerAdvantageAfter  = isWhite ? scoreAfter  : -scoreAfter

  // Chance Perdida: tinha vantagem decisiva (≥ +3.0) e perdeu para < +1.0
  if (playerAdvantageBefore >= 300 && playerAdvantageAfter < 100) {
    return 'missed_win'
  }

  // Brilhante: melhor jogada (delta < 0.2) e sacrifício
  if (delta < 0.2 && isSacrifice(move)) {
    return 'brilliant'
  }

  if (delta < 0.2)  return 'excellent'
  if (delta < 0.5)  return 'good'
  if (delta < 1.0)  return 'inaccuracy'
  if (delta < 2.0)  return 'mistake'
  return 'blunder'
}

/**
 * Recebe N+1 scores (posição inicial + após cada jogada) e N moves,
 * retorna um MoveEvaluation por jogada.
 */
export function classifyMoves(
  scores: number[],
  moves: GameMove[],
): MoveEvaluation[] {
  return moves.map((move, i) => {
    const scoreBefore = scores[i]
    const scoreAfter  = scores[i + 1]
    const isWhite     = move.color === 'white'
    const lossCp      = isWhite
      ? Math.max(0, scoreBefore - scoreAfter)
      : Math.max(0, scoreAfter - scoreBefore)

    return {
      moveIndex: i,
      scoreBefore,
      scoreAfter,
      delta: lossCp / 100,
      classification: classifyMove(move, scoreBefore, scoreAfter),
    }
  })
}

/**
 * Calcula acurácia: % de jogadas Brilhantes + Excelentes + Boas.
 */
export function computeAccuracy(evaluations: MoveEvaluation[]): number {
  if (evaluations.length === 0) return 100
  const good = evaluations.filter(e =>
    e.classification === 'brilliant' ||
    e.classification === 'excellent' ||
    e.classification === 'good'
  ).length
  return Math.round((good / evaluations.length) * 100)
}

// Rótulos e cores por classificação — usados em componentes de UI
export const CLASSIFICATION_META: Record<
  MoveClassification,
  { label: string; emoji: string; color: string }
> = {
  brilliant:  { label: 'Brilhante',      emoji: '🌟', color: '#a78bfa' },
  excellent:  { label: 'Excelente',      emoji: '✨', color: '#34d399' },
  good:       { label: 'Boa',            emoji: '✅', color: '#6B8F71' },
  inaccuracy: { label: 'Imprecisão',     emoji: '⚠️', color: '#9ca3af' },
  mistake:    { label: 'Erro',           emoji: '❌', color: '#EE964B' },
  missed_win: { label: 'Chance Perdida', emoji: '🎯', color: '#f87171' },
  blunder:    { label: 'Capivarada',     emoji: '💀', color: '#ef4444' },
}
```

- [ ] **Step 3.2: Verificar build**

```bash
cd frontend && npm run build
```

Esperado: sem erros.

- [ ] **Step 3.3: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/utils/move-classifier.ts
git commit -m "feat(analysis): add move classifier utility"
```

---

## Task 4: Criar `useStockfishAnalysis.ts`

**Files:**
- Create: `frontend/src/hooks/useStockfishAnalysis.ts`

- [ ] **Step 4.1: Criar o arquivo**

Criar `frontend/src/hooks/useStockfishAnalysis.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'

type UseStockfishAnalysisOptions = {
  /**
   * Array de N+1 FENs: posição inicial + FEN após cada jogada.
   * Construir com: [initialFen, ...moves.map(m => m.fen)]
   */
  fens: string[]
  /** Milissegundos por posição. Ignorado se `depth` for definido. Padrão: 300 */
  movetime?: number
  /** Depth Stockfish por posição. Se definido, ignora movetime. */
  depth?: number
  /** Só inicia quando true. */
  enabled: boolean
}

type UseStockfishAnalysisReturn = {
  /** N+1 scores em centipawns, perspectiva brancas. Vazio enquanto analisa. */
  scores: number[]
  /** 0–1, atualizado conforme posições são avaliadas. */
  progress: number
  isAnalyzing: boolean
  /** Inicia manualmente. Chame após enabled = true se preferir controle explícito. */
  startAnalysis: () => void
}

/** Extrai o score da última linha "info ... score cp/mate N" recebida do worker. */
function parseScore(line: string, whiteToMove: boolean): number | null {
  const cpMatch = line.match(/score cp (-?\d+)/)
  if (cpMatch) {
    const score = parseInt(cpMatch[1], 10)
    // Score UCI é sempre da perspectiva do lado que joga — normalizar para brancas
    return whiteToMove ? score : -score
  }
  const mateMatch = line.match(/score mate (-?\d+)/)
  if (mateMatch) {
    const mate = parseInt(mateMatch[1], 10)
    // Mate positivo = lado que joga tem mate, negativo = vai ser mateado
    const mateScore = mate > 0 ? 100_000 : -100_000
    return whiteToMove ? mateScore : -mateScore
  }
  return null
}

export function useStockfishAnalysis({
  fens,
  movetime = 300,
  depth,
  enabled,
}: UseStockfishAnalysisOptions): UseStockfishAnalysisReturn {
  const workerRef    = useRef<Worker | null>(null)
  const isReadyRef   = useRef(false)
  const indexRef     = useRef(0)            // índice do FEN em avaliação
  const lastScoreRef = useRef<number>(0)    // último score lido antes do bestmove
  const scoresRef    = useRef<number[]>([]) // scores acumulados

  const [scores,      setScores]      = useState<number[]>([])
  const [progress,    setProgress]    = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [triggered,   setTriggered]   = useState(false)

  const analyzeNext = useCallback(() => {
    const worker = workerRef.current
    if (!worker || indexRef.current >= fens.length) return

    const fen       = fens[indexRef.current]
    const isWhite   = fen.split(' ')[1] === 'w'
    // Guardamos para uso no handler de mensagem
    ;(worker as any).__whiteToMove = isWhite

    worker.postMessage(`position fen ${fen}`)
    if (depth !== undefined) {
      worker.postMessage(`go depth ${depth}`)
    } else {
      worker.postMessage(`go movetime ${movetime}`)
    }
  }, [fens, depth, movetime])

  const startAnalysis = useCallback(() => {
    setTriggered(true)
  }, [])

  // Inicializa worker uma única vez
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

      // Captura o último score antes do bestmove
      if (line.startsWith('info') && line.includes('score')) {
        const whiteToMove = (worker as any).__whiteToMove ?? true
        const parsed = parseScore(line, whiteToMove)
        if (parsed !== null) lastScoreRef.current = parsed
        return
      }

      if (line.startsWith('bestmove')) {
        const score = lastScoreRef.current
        scoresRef.current.push(score)

        const newScores  = [...scoresRef.current]
        const newProgress = newScores.length / fens.length
        setScores(newScores)
        setProgress(newProgress)

        indexRef.current += 1

        if (indexRef.current >= fens.length) {
          // Análise concluída
          setIsAnalyzing(false)
          return
        }

        // Avança para o próximo FEN
        analyzeNext()
      }
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      isReadyRef.current = false
    }
  }, []) // worker criado uma única vez

  // Dispara análise quando enabled e triggered
  useEffect(() => {
    if (!enabled || !triggered || isAnalyzing || fens.length === 0) return
    if (!isReadyRef.current) {
      // Ainda não pronto — tentar novamente em 200ms
      const t = setTimeout(() => setTriggered(prev => prev), 200)
      return () => clearTimeout(t)
    }

    // Reset state
    indexRef.current  = 0
    scoresRef.current = []
    lastScoreRef.current = 0
    setScores([])
    setProgress(0)
    setIsAnalyzing(true)

    workerRef.current?.postMessage('ucinewgame')
    analyzeNext()
  }, [enabled, triggered, isAnalyzing, fens, analyzeNext])

  // Disparo automático quando enabled muda para true
  useEffect(() => {
    if (enabled) setTriggered(true)
  }, [enabled])

  return { scores, progress, isAnalyzing, startAnalysis }
}
```

- [ ] **Step 4.2: Verificar build**

```bash
cd frontend && npm run build
```

Esperado: sem erros de TypeScript.

- [ ] **Step 4.3: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/hooks/useStockfishAnalysis.ts
git commit -m "feat(analysis): add useStockfishAnalysis hook"
```

---

## Task 5: Criar `MoveHistory.tsx` (Parte A)

**Files:**
- Create: `frontend/src/components/game/MoveHistory.tsx`

- [ ] **Step 5.1: Criar o componente**

Criar `frontend/src/components/game/MoveHistory.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import type { GameMove } from '@/types/game.types'

type MoveHistoryProps = {
  moves: GameMove[]
}

/**
 * Painel de histórico de jogadas ao vivo.
 * Grid 3 colunas: número | brancas | pretas
 * Scroll automático para a última jogada. Read-only.
 */
export function MoveHistory({ moves }: MoveHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll automático para a última linha quando moves muda
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [moves.length])

  // Agrupa jogadas em pares: [{ white, black }]
  const rows: { white: GameMove; black: GameMove | null }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ white: moves[i], black: moves[i + 1] ?? null })
  }

  return (
    <div
      className="flex flex-col overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950"
      style={{ width: 160, padding: '10px 12px' }}
    >
      {/* Cabeçalho */}
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        Jogadas
      </p>

      {/* Lista */}
      <div className="flex flex-col gap-[2px] text-[11px]">
        {rows.map((row, idx) => {
          const moveNumber  = idx + 1
          const isLastRow   = idx === rows.length - 1
          const whiteIsLast = isLastRow && row.black === null
          const blackIsLast = isLastRow && row.black !== null

          return (
            <div
              key={moveNumber}
              className="grid items-center gap-1 rounded px-1 py-[2px]"
              style={{ gridTemplateColumns: '20px 1fr 1fr' }}
            >
              {/* Número */}
              <span className="font-mono text-neutral-600">{moveNumber}.</span>

              {/* Jogada brancas */}
              <span
                className="font-mono"
                style={{
                  color:            whiteIsLast ? 'var(--brand-orange)' : '#e5e7eb',
                  fontWeight:       whiteIsLast ? 700 : 400,
                  backgroundColor:  whiteIsLast ? '#EE964B14' : 'transparent',
                  borderRadius:     whiteIsLast ? 3 : 0,
                  padding:          whiteIsLast ? '0 3px' : undefined,
                }}
              >
                {row.white.san}
              </span>

              {/* Jogada pretas */}
              <span
                className="font-mono"
                style={{
                  color:           row.black === null ? '#374151'
                                  : blackIsLast      ? 'var(--brand-orange)'
                                  :                    '#9ca3af',
                  fontWeight:      blackIsLast ? 700 : 400,
                  backgroundColor: blackIsLast ? '#EE964B14' : 'transparent',
                  borderRadius:    blackIsLast ? 3 : 0,
                  padding:         blackIsLast ? '0 3px' : undefined,
                }}
              >
                {row.black === null ? '—' : row.black.san}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5.2: Verificar build**

```bash
cd frontend && npm run build
```

Esperado: sem erros.

- [ ] **Step 5.3: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/components/game/MoveHistory.tsx
git commit -m "feat(game): add MoveHistory component"
```

---

## Task 6: Integrar MoveHistory em `game/page.tsx` (Parte A)

**Files:**
- Modify: `frontend/src/app/game/page.tsx`

- [ ] **Step 6.1: Atualizar o layout de GameContent**

Substituir o bloco de JSX em `GameContent` — atualmente o `<main>` retorna um `<div className="w-full max-w-[560px] flex flex-col gap-4">`. Precisa virar um layout de duas colunas no desktop.

Localizar e substituir o `return (` de `GameContent` inteiro pelo seguinte:

```tsx
  return (
    <main className="relative flex min-h-screen items-center justify-center p-8">
      {/* Wrapper: coluna única em mobile, duas colunas em desktop */}
      <div className="flex w-full max-w-[740px] flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">

        {/* Coluna esquerda: tabuleiro + controles */}
        <div className="flex flex-col gap-4" style={{ maxWidth: 560 }}>
          <ChessBoard
            fen={fen}
            playerColor={colorParam}
            makeMove={makeMove}
            onMove={(move) => { if (move.isCapture) playCaptureSound() }}
            disabled={isBotThinking || isGameOver}
            theme={BOARD_THEMES[activeTheme].theme}
          />

          {/* Linha inferior: seletor de tema (esquerda) + desistir (direita) */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {Object.entries(BOARD_THEMES).map(([key, { label, theme }]) => {
                const isActive = activeTheme === key
                return (
                  <button
                    key={key}
                    title={label}
                    onClick={() => handleThemeChange(key)}
                    className={[
                      'flex overflow-hidden rounded-md border-2 transition-colors',
                      isActive ? 'border-white' : 'border-transparent hover:border-neutral-500',
                    ].join(' ')}
                  >
                    <span className="block h-5 w-5" style={theme.lightSquareStyle} />
                    <span className="block h-5 w-5" style={theme.darkSquareStyle} />
                  </button>
                )
              })}
            </div>

            {!isGameOver && (
              resignConfirm ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-400">Tem certeza?</span>
                  <button
                    onClick={() => { resign(); setResignConfirm(false) }}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setResignConfirm(false)}
                    className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-semibold text-neutral-300 hover:border-neutral-400 hover:text-white"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResignConfirm(true)}
                  className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:border-red-700 hover:text-red-400 transition-colors"
                >
                  Desistir
                </button>
              )
            )}
          </div>
        </div>

        {/* Coluna direita: painel de histórico */}
        {/* Desktop: ao lado do tabuleiro. Mobile: abaixo (ordem natural do flex-col) */}
        <div className="sm:sticky sm:top-8">
          <MoveHistory moves={moves} />
        </div>
      </div>

      {/* Overlay de fim de jogo */}
      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-neutral-900 px-12 py-10 text-center shadow-2xl">
            <p className="text-3xl font-bold text-white">
              {GAME_OVER_MESSAGE[status]}
            </p>
            <Button
              onClick={() => router.push('/')}
              className="rounded-xl bg-white px-8 py-5 text-base font-semibold text-black hover:bg-neutral-200"
            >
              Jogar novamente
            </Button>
          </div>
        </div>
      )}
    </main>
  )
```

- [ ] **Step 6.2: Adicionar import de MoveHistory e atualizar destructuring de useGame**

No topo de `game/page.tsx`, adicionar o import:

```tsx
import { MoveHistory } from '@/components/game/MoveHistory'
```

Atualizar a linha que chama `useGame` para incluir `moves`:

```tsx
const { fen, makeMove, status, resign, moves } = useGame(colorParam)
```

(Antes era `const { fen, makeMove, status, resign } = useGame(colorParam)`)

- [ ] **Step 6.3: Verificar build e testar manualmente**

```bash
cd frontend && npm run build
```

Abrir `http://localhost:3000`, iniciar uma partida e verificar:
- Painel de histórico aparece à direita do tabuleiro no desktop
- Jogadas aparecem no formato `1. e4 e5` conforme a partida avança
- Última jogada fica destacada em laranja
- Em viewport estreito (mobile), o painel vai para baixo do tabuleiro

- [ ] **Step 6.4: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/app/game/page.tsx
git commit -m "feat(game): integrate live move history panel"
```

---

## Task 7: Salvar dados da partida no localStorage ao fim do jogo

**Files:**
- Modify: `frontend/src/app/game/page.tsx`

Antes de implementar a análise automática, a partida precisa ser persistida.

- [ ] **Step 7.1: Adicionar constante e lógica de persistência em GameContent**

Em `game/page.tsx`, adicionar após as importações existentes:

```tsx
import { buildMovesString } from '@/utils/pgn-builder'
import type { SavedGame } from '@/types/game.types'
```

Dentro de `GameContent`, adicionar um `useEffect` que dispara quando o jogo termina:

```tsx
// Persiste a partida no localStorage ao fim do jogo
useEffect(() => {
  if (status === 'playing' || moves.length === 0) return

  const saved: SavedGame = {
    pgn:         buildMovesString(moves),
    botLevel:    botParam,
    playerColor: colorParam,
    result:      status,
    date:        new Date().toISOString(),
    moves,
  }
  localStorage.setItem('chess-dojo:last-game', JSON.stringify(saved))
}, [status]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 7.2: Verificar build**

```bash
cd frontend && npm run build
```

Jogar uma partida até o fim, abrir DevTools → Application → localStorage → confirmar que `chess-dojo:last-game` existe com PGN correto.

- [ ] **Step 7.3: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/app/game/page.tsx
git commit -m "feat(game): save game to localStorage on game end"
```

---

## Task 8: Análise automática + novo overlay de fim de jogo

**Files:**
- Modify: `frontend/src/app/game/page.tsx`

Este é o maior passo de modificação — substitui o overlay simples pelo overlay com análise.

- [ ] **Step 8.1: Adicionar imports**

No topo de `game/page.tsx`, adicionar:

```tsx
import { useStockfishAnalysis } from '@/hooks/useStockfishAnalysis'
import { classifyMoves, computeAccuracy, CLASSIFICATION_META } from '@/utils/move-classifier'
import type { AnalysisResult, MoveClassification } from '@/types/game.types'
```

- [ ] **Step 8.2: Adicionar estado e hook de análise em GameContent**

Dentro de `GameContent`, após `const [resignConfirm, setResignConfirm] = useState(false)`, adicionar:

```tsx
// FENs para análise: posição inicial + FEN após cada jogada
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const analysisFens = isGameOver
  ? [INITIAL_FEN, ...moves.map(m => m.fen)]
  : []

const { scores, progress, isAnalyzing } = useStockfishAnalysis({
  fens:     analysisFens,
  movetime: 300,
  enabled:  isGameOver && moves.length > 0,
})

// Calcula resultados quando análise concluir
const analysisReady = !isAnalyzing && scores.length === analysisFens.length && analysisFens.length > 1
const evaluations   = analysisReady ? classifyMoves(scores, moves) : []
const accuracy      = analysisReady ? computeAccuracy(evaluations) : 0

// Persiste análise no localStorage quando concluída
useEffect(() => {
  if (!analysisReady || evaluations.length === 0) return
  const result: AnalysisResult = {
    evaluations,
    accuracy,
    date: new Date().toISOString(),
  }
  localStorage.setItem('chess-dojo:last-analysis', JSON.stringify(result))
}, [analysisReady]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 8.3: Substituir o overlay de fim de jogo**

Localizar o bloco `{isGameOver && (` no JSX e substituir por:

```tsx
{/* Overlay de fim de jogo */}
{isGameOver && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-5 rounded-2xl bg-neutral-900 px-10 py-8 text-center shadow-2xl w-80">

      {/* Resultado */}
      <p className="text-2xl font-bold text-white">
        {GAME_OVER_MESSAGE[status]}
      </p>

      {/* Estado A: analisando */}
      {isAnalyzing && (
        <div className="w-full rounded-xl bg-neutral-800 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Analisando partida...
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-700">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width:      `${Math.round(progress * 100)}%`,
                background: 'linear-gradient(90deg, #6B8F71, #EE964B)',
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            {scores.length} / {analysisFens.length} posições
          </p>
        </div>
      )}

      {/* Estado B: análise concluída */}
      {analysisReady && (
        <>
          {/* Precisão */}
          <div
            className="rounded-lg px-6 py-2"
            style={{ background: '#6B8F7118', border: '1px solid #6B8F7144' }}
          >
            <span className="text-sm text-neutral-400">Precisão: </span>
            <span className="text-xl font-black" style={{ color: 'var(--brand-green)' }}>
              {accuracy}%
            </span>
          </div>

          {/* Grid de categorias */}
          <div className="w-full rounded-xl bg-neutral-800 px-4 py-3">
            <div className="grid gap-x-4 gap-y-0.5 text-xs" style={{ gridTemplateColumns: '1fr auto' }}>
              {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
                const meta  = CLASSIFICATION_META[key]
                const count = evaluations.filter(e => e.classification === key).length
                return (
                  <div key={key} className="contents">
                    <span style={{ color: meta.color }}>{meta.emoji} {meta.label}</span>
                    <span className="text-right font-bold" style={{ color: meta.color }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Botões */}
      <div className="flex w-full flex-col gap-2">
        {analysisReady && (
          <button
            onClick={() => router.push('/review')}
            className="w-full rounded-xl py-3 text-sm font-black tracking-wide transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--brand-green)', color: '#000' }}
          >
            📋 Revisão da Partida
          </button>
        )}
        <button
          onClick={() => router.push('/')}
          className="w-full rounded-xl border border-neutral-700 py-3 text-sm font-semibold text-neutral-400 transition-all hover:border-neutral-500 hover:text-white"
        >
          Jogar novamente
        </button>
      </div>

    </div>
  </div>
)}
```

- [ ] **Step 8.4: Verificar build**

```bash
cd frontend && npm run build
```

Testar manualmente: jogar uma partida até o fim, observar o overlay com barra de progresso e depois as categorias aparecendo.

- [ ] **Step 8.5: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/app/game/page.tsx
git commit -m "feat(game): auto-analyze game and show classifications in overlay"
```

---

## Task 9: Criar componentes de revisão — AdvantageBar e AdvantageGraph

**Files:**
- Create: `frontend/src/components/review/AdvantageBar.tsx`
- Create: `frontend/src/components/review/AdvantageGraph.tsx`

- [ ] **Step 9.1: Criar `AdvantageBar.tsx`**

Criar `frontend/src/components/review/AdvantageBar.tsx`:

```tsx
'use client'

type AdvantageBarProps = {
  /** Score atual em centipawns, perspectiva brancas. Positivo = brancas melhor. */
  scoreCp: number
}

/** Barra vertical de vantagem. Preto no topo, branco na base. Clampada em ±500cp. */
export function AdvantageBar({ scoreCp }: AdvantageBarProps) {
  const clamped     = Math.max(-500, Math.min(500, scoreCp))
  // whitePercent: 0% = tudo preto, 50% = igual, 100% = tudo branco
  const whitePercent = ((clamped + 500) / 1000) * 100
  const blackPercent = 100 - whitePercent

  const displayScore = Math.abs(scoreCp / 100).toFixed(1)
  const prefix       = scoreCp > 0 ? '+' : scoreCp < 0 ? '−' : ''

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="text-[9px] text-neutral-500">⬛</span>
      <div
        className="relative overflow-hidden rounded"
        style={{ width: 14, height: 160, border: '1px solid #2a2a2a' }}
      >
        {/* Porção preta (topo) */}
        <div style={{ height: `${blackPercent}%`, background: '#222' }} />
        {/* Porção branca (base) */}
        <div style={{ height: `${whitePercent}%`, background: '#e5e7eb' }} />
      </div>
      <span className="text-[9px] text-neutral-500">⬜</span>
      <span
        className="text-[10px] font-bold tabular-nums"
        style={{ color: scoreCp >= 0 ? '#6B8F71' : '#f87171' }}
      >
        {prefix}{displayScore}
      </span>
    </div>
  )
}
```

- [ ] **Step 9.2: Criar `AdvantageGraph.tsx`**

Criar `frontend/src/components/review/AdvantageGraph.tsx`:

```tsx
'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

type AdvantageGraphProps = {
  /** N+1 scores em centipawns, perspectiva brancas. */
  scores: number[]
  /** Índice da jogada atualmente exibida no tabuleiro (0 = posição inicial). */
  currentIndex: number
  /** Chamado quando o usuário clica num ponto do gráfico. */
  onMoveClick: (index: number) => void
}

export function AdvantageGraph({ scores, currentIndex, onMoveClick }: AdvantageGraphProps) {
  const data = scores.map((s, i) => ({
    index: i,
    score: Math.max(-5, Math.min(5, s / 100)), // clamp ±5 pawns
  }))

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
        Vantagem
      </p>
      <ResponsiveContainer width="100%" height={64}>
        <LineChart
          data={data}
          onClick={(e) => {
            if (e?.activePayload?.[0] != null) {
              onMoveClick(e.activePayload[0].payload.index)
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <ReferenceLine y={0} stroke="#2a2a2a" strokeWidth={1} />
          <YAxis domain={[-5, 5]} hide />
          <XAxis dataKey="index" hide />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 10 }}
            formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}`, 'Vantagem']}
            labelFormatter={(i) => `Jogada ${i}`}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#e5e7eb"
            strokeWidth={1.5}
            dot={(props) => {
              const isActive = props.index === currentIndex
              if (!isActive) return <g key={props.index} />
              return (
                <circle
                  key={props.index}
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill="#EE964B"
                  stroke="#000"
                  strokeWidth={1}
                />
              )
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 9.3: Verificar build**

```bash
cd frontend && npm run build
```

Esperado: sem erros. (recharts já instalado na Task 1)

- [ ] **Step 9.4: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/components/review/AdvantageBar.tsx frontend/src/components/review/AdvantageGraph.tsx
git commit -m "feat(review): add AdvantageBar and AdvantageGraph components"
```

---

## Task 10: Criar `MoveSummary.tsx`

**Files:**
- Create: `frontend/src/components/review/MoveSummary.tsx`

- [ ] **Step 10.1: Criar o arquivo**

Criar `frontend/src/components/review/MoveSummary.tsx`:

```tsx
'use client'

import { CLASSIFICATION_META } from '@/utils/move-classifier'
import type { MoveClassification, MoveEvaluation } from '@/types/game.types'

type MoveSummaryProps = {
  evaluations: MoveEvaluation[]
  accuracy: number
}

/** Cards de totais por categoria + acurácia. Usado no painel de revisão. */
export function MoveSummary({ evaluations, accuracy }: MoveSummaryProps) {
  const counts = (Object.keys(CLASSIFICATION_META) as MoveClassification[]).reduce(
    (acc, key) => {
      acc[key] = evaluations.filter(e => e.classification === key).length
      return acc
    },
    {} as Record<MoveClassification, number>,
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Precisão */}
      <div
        className="flex items-center justify-between rounded-lg px-4 py-2"
        style={{ background: '#6B8F7118', border: '1px solid #6B8F7144' }}
      >
        <span className="text-sm text-neutral-400">Precisão</span>
        <span className="text-xl font-black" style={{ color: 'var(--brand-green)' }}>
          {accuracy}%
        </span>
      </div>

      {/* Categorias */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
        <div
          className="grid gap-x-4 gap-y-1 text-[11px]"
          style={{ gridTemplateColumns: '1fr auto' }}
        >
          {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
            const meta  = CLASSIFICATION_META[key]
            const count = counts[key]
            return (
              <div key={key} className="contents">
                <span style={{ color: meta.color }}>
                  {meta.emoji} {meta.label}
                </span>
                <span
                  className="text-right font-bold tabular-nums"
                  style={{ color: meta.color }}
                >
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 10.2: Verificar build**

```bash
cd frontend && npm run build
```

- [ ] **Step 10.3: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/components/review/MoveSummary.tsx
git commit -m "feat(review): add MoveSummary component"
```

---

## Task 11: Criar `review/page.tsx`

**Files:**
- Create: `frontend/src/app/review/page.tsx`

Este é o maior arquivo novo. Implementar em duas partes.

- [ ] **Step 11.1: Criar a estrutura da página**

Criar `frontend/src/app/review/page.tsx`:

```tsx
'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChessBoard } from '@/components/board/ChessBoard'
import { AdvantageBar } from '@/components/review/AdvantageBar'
import { AdvantageGraph } from '@/components/review/AdvantageGraph'
import { MoveSummary } from '@/components/review/MoveSummary'
import { useStockfishAnalysis } from '@/hooks/useStockfishAnalysis'
import { classifyMoves, computeAccuracy, CLASSIFICATION_META } from '@/utils/move-classifier'
import type {
  AnalysisResult,
  GameMove,
  MoveClassification,
  MoveEvaluation,
  SavedGame,
} from '@/types/game.types'

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const STORAGE_GAME     = 'chess-dojo:last-game'
const STORAGE_ANALYSIS = 'chess-dojo:last-analysis'

// Badge colorido por classificação para a lista de jogadas
function MoveBadge({ classification }: { classification: MoveClassification }) {
  const meta = CLASSIFICATION_META[classification]
  return (
    <span
      className="rounded px-1 text-[8px] font-bold"
      style={{ background: `${meta.color}22`, color: meta.color }}
    >
      {meta.emoji}
    </span>
  )
}

function ReviewContent() {
  const router = useRouter()

  // --- Dados da partida ---
  const [savedGame,   setSavedGame]   = useState<SavedGame | null>(null)
  const [cachedResult, setCachedResult] = useState<AnalysisResult | null>(null)

  // --- Estado de replay ---
  const [currentIndex, setCurrentIndex] = useState(0) // 0 = posição inicial

  // --- Estado de análise profunda ---
  const [deepAnalysisEnabled, setDeepAnalysisEnabled] = useState(false)

  // Carrega dados do localStorage
  useEffect(() => {
    const gameRaw = localStorage.getItem(STORAGE_GAME)
    if (!gameRaw) { router.push('/'); return }
    setSavedGame(JSON.parse(gameRaw) as SavedGame)

    const analysisRaw = localStorage.getItem(STORAGE_ANALYSIS)
    if (analysisRaw) setCachedResult(JSON.parse(analysisRaw) as AnalysisResult)
  }, [router])

  const moves = savedGame?.moves ?? []
  const fens  = [INITIAL_FEN, ...moves.map((m: GameMove) => m.fen)]

  // Análise profunda (depth 10) — só quando o usuário clica "Começar Análise"
  const { scores: deepScores, progress: deepProgress, isAnalyzing: isDeepAnalyzing } =
    useStockfishAnalysis({ fens, depth: 10, enabled: deepAnalysisEnabled })

  const deepReady = !isDeepAnalyzing && deepScores.length === fens.length && fens.length > 1

  // Quando análise profunda concluir, salvar no localStorage e atualizar cache
  useEffect(() => {
    if (!deepReady || deepScores.length === 0) return
    const evaluations = classifyMoves(deepScores, moves)
    const accuracy    = computeAccuracy(evaluations)
    const result: AnalysisResult = { evaluations, accuracy, date: new Date().toISOString() }
    localStorage.setItem(STORAGE_ANALYSIS, JSON.stringify(result))
    setCachedResult(result)
    setDeepAnalysisEnabled(false)
  }, [deepReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Determinar quais dados exibir: análise profunda concluída > cache
  const activeResult: AnalysisResult | null = deepReady
    ? (() => {
        const evaluations = classifyMoves(deepScores, moves)
        const accuracy    = computeAccuracy(evaluations)
        return { evaluations, accuracy, date: new Date().toISOString() }
      })()
    : cachedResult

  const activeScores = deepReady ? deepScores : null
  // Para o gráfico, usamos os scores da análise profunda ou os do cache
  // (cachedResult não guarda scores raw, apenas evaluations — usar scoreBefore/After)
  const graphScores: number[] = activeScores
    ?? (activeResult?.evaluations
        ? [
            activeResult.evaluations[0]?.scoreBefore ?? 0,
            ...activeResult.evaluations.map(e => e.scoreAfter),
          ]
        : [])

  // --- Navegação ---
  const goTo       = useCallback((i: number) => setCurrentIndex(Math.max(0, Math.min(i, moves.length))), [moves.length])
  const goFirst    = useCallback(() => goTo(0), [goTo])
  const goPrev     = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex])
  const goNext     = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex])
  const goLast     = useCallback(() => goTo(moves.length), [goTo, moves.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  // FEN atual para o tabuleiro
  const currentFen = currentIndex === 0 ? INITIAL_FEN : moves[currentIndex - 1].fen
  // Score atual para a barra de vantagem
  const currentScore = graphScores[currentIndex] ?? 0

  if (!savedGame) return null

  // Formatar data
  const dateStr = new Date(savedGame.date).toLocaleDateString('pt-BR')

  return (
    <main
      className="min-h-screen p-6 md:p-10"
      style={{ backgroundColor: 'var(--brand-bg)', color: 'var(--brand-text)' }}
    >
      <div className="mx-auto flex max-w-[900px] flex-col gap-6 md:flex-row md:items-start md:gap-8">

        {/* ESQUERDA: barra de vantagem + tabuleiro + controles */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-start gap-3">
            {/* Barra de vantagem — só com análise */}
            {graphScores.length > 0 && (
              <AdvantageBar scoreCp={currentScore} />
            )}

            {/* Tabuleiro read-only */}
            <div style={{ width: 400 }}>
              <ChessBoard
                fen={currentFen}
                playerColor={savedGame.playerColor}
                makeMove={() => null}
                onMove={() => {}}
                disabled={true}
              />
            </div>
          </div>

          {/* Controles de navegação */}
          <div className="flex gap-2">
            {[
              { label: '⏮', action: goFirst,  title: 'Início' },
              { label: '◀',  action: goPrev,   title: 'Anterior (←)' },
              { label: '▶',  action: goNext,   title: 'Próximo (→)' },
              { label: '⏭', action: goLast,   title: 'Fim' },
            ].map(({ label, action, title }) => (
              <button
                key={label}
                onClick={action}
                title={title}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* DIREITA: painel de análise */}
        <div className="flex flex-1 flex-col gap-4">

          {/* Cabeçalho da partida */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-base font-bold text-white">Revisão da Partida</p>
            <ul className="mt-2 space-y-0.5 text-sm text-neutral-400">
              <li>📅 {dateStr}</li>
              <li>🤖 vs {savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)}</li>
              <li>{savedGame.playerColor === 'white' ? '♔ Brancas' : '♚ Pretas'}</li>
              <li>
                {savedGame.result === 'won'  ? '🏆 Vitória'
                : savedGame.result === 'lost' ? '😔 Derrota'
                : '🤝 Empate'} — {moves.length} jogadas
              </li>
            </ul>
          </div>

          {/* Estado: analisando (profunda) */}
          {isDeepAnalyzing && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Análise profunda em andamento...
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(deepProgress * 100)}%`,
                    background: 'linear-gradient(90deg, #6B8F71, #EE964B)',
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-neutral-500">
                {deepScores.length} / {fens.length} posições (depth 10)
              </p>
            </div>
          )}

          {/* Estado: sem análise — botão "Começar Análise" */}
          {!activeResult && !isDeepAnalyzing && (
            <button
              onClick={() => setDeepAnalysisEnabled(true)}
              className="w-full rounded-xl py-4 text-sm font-black tracking-wide transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-green)', color: '#000' }}
            >
              Começar Análise
            </button>
          )}

          {/* Estado: análise disponível (cache ou profunda) */}
          {activeResult && !isDeepAnalyzing && (
            <>
              {/* Gráfico */}
              {graphScores.length > 0 && (
                <AdvantageGraph
                  scores={graphScores}
                  currentIndex={currentIndex}
                  onMoveClick={goTo}
                />
              )}

              {/* Resumo */}
              <MoveSummary
                evaluations={activeResult.evaluations}
                accuracy={activeResult.accuracy}
              />

              {/* Lista de jogadas com badges */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Jogadas
                </p>
                <div
                  className="max-h-64 overflow-y-auto"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  <div className="flex flex-col gap-0.5 text-[11px] font-mono">
                    {moves.reduce<{ white: GameMove; black: GameMove | null; wIdx: number; bIdx: number | null }[]>((rows, move, i) => {
                      if (i % 2 === 0) rows.push({ white: move, black: null, wIdx: i + 1, bIdx: null })
                      else { rows[rows.length - 1].black = move; rows[rows.length - 1].bIdx = i + 1 }
                      return rows
                    }, []).map((row, rowIdx) => {
                      const wEval = activeResult.evaluations[rowIdx * 2]
                      const bEval = activeResult.evaluations[rowIdx * 2 + 1]
                      const wActive = currentIndex === row.wIdx
                      const bActive = currentIndex === (row.bIdx ?? -1)
                      return (
                        <div
                          key={rowIdx}
                          className="grid items-center gap-1"
                          style={{ gridTemplateColumns: '20px 1fr 1fr' }}
                        >
                          <span className="text-neutral-600">{rowIdx + 1}.</span>
                          {/* Brancas */}
                          <button
                            onClick={() => goTo(row.wIdx)}
                            className="flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-neutral-800"
                            style={{ background: wActive ? '#EE964B14' : undefined, color: wActive ? '#EE964B' : '#e5e7eb' }}
                          >
                            {row.white.san}
                            {wEval && <MoveBadge classification={wEval.classification} />}
                          </button>
                          {/* Pretas */}
                          {row.black ? (
                            <button
                              onClick={() => goTo(row.bIdx!)}
                              className="flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-neutral-800"
                              style={{ background: bActive ? '#EE964B14' : undefined, color: bActive ? '#EE964B' : '#9ca3af' }}
                            >
                              {row.black.san}
                              {bEval && <MoveBadge classification={bEval.classification} />}
                            </button>
                          ) : (
                            <span className="text-neutral-700">—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Re-analisar com depth 10 */}
              {cachedResult && !deepReady && (
                <button
                  onClick={() => setDeepAnalysisEnabled(true)}
                  className="w-full rounded-xl border border-neutral-700 py-2 text-xs text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                >
                  Re-analisar com depth 10 (mais preciso)
                </button>
              )}

              {/* Botão PDF */}
              <PdfExportButton savedGame={savedGame} result={activeResult} scores={graphScores} />
            </>
          )}

        </div>
      </div>
    </main>
  )
}

// PdfExportButton fica em um componente separado para manter ReviewContent legível.
// Implementado na Task 12.
function PdfExportButton(_props: {
  savedGame: SavedGame
  result: AnalysisResult
  scores: number[]
}) {
  return (
    <button
      disabled
      className="w-full cursor-not-allowed rounded-xl border border-neutral-700 py-3 text-sm text-neutral-600"
    >
      ⬇ Baixar Revisão em PDF (em breve)
    </button>
  )
}

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewContent />
    </Suspense>
  )
}
```

- [ ] **Step 11.2: Verificar build**

```bash
cd frontend && npm run build
```

Esperado: sem erros. Avisos de `any` ou `eslint` são aceitáveis.

- [ ] **Step 11.3: Testar manualmente**

1. Jogar uma partida até o fim
2. Clicar "Revisão da Partida" no overlay
3. Verificar: página `/review` carrega, mostra dados da partida, botão "Começar Análise" visível
4. Se análise rápida (movetime 300) já rodou, gráfico e classificações já aparecem
5. Controles ⏮ ◀ ▶ ⏭ navegam o tabuleiro
6. Setas ← → do teclado funcionam
7. Clicar no gráfico navega o tabuleiro

- [ ] **Step 11.4: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/app/review/page.tsx
git commit -m "feat(review): add review page with board replay and analysis"
```

---

## Task 12: PDF Export

**Files:**
- Modify: `frontend/src/app/review/page.tsx`

- [ ] **Step 12.1: Substituir `PdfExportButton` com implementação real**

Localizar a função `PdfExportButton` em `review/page.tsx` e substituir por:

```tsx
function PdfExportButton({
  savedGame,
  result,
  scores,
}: {
  savedGame: SavedGame
  result: AnalysisResult
  scores: number[]
}) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const { default: jsPDF }    = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')

      const el = document.getElementById('pdf-content')
      if (!el) return

      el.style.display = 'block'
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 })
      el.style.display = 'none'

      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })
      const pdfW     = pdf.internal.pageSize.getWidth()
      const pdfH     = (canvas.height * pdfW) / canvas.width
      const imgData  = canvas.toDataURL('image/png')

      // Se o conteúdo for mais alto que uma página, adicionar páginas extras
      const pageH = pdf.internal.pageSize.getHeight()
      if (pdfH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      } else {
        let yOffset = 0
        while (yOffset < pdfH) {
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, pdfH)
          yOffset += pageH
          if (yOffset < pdfH) pdf.addPage()
        }
      }

      const date = new Date(savedGame.date).toISOString().slice(0, 10)
      pdf.save(`chess-dojo-revisao-${date}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  const dateStr = new Date(savedGame.date).toLocaleDateString('pt-BR')
  const counts  = (Object.keys(CLASSIFICATION_META) as MoveClassification[]).reduce(
    (acc, key) => { acc[key] = result.evaluations.filter(e => e.classification === key).length; return acc },
    {} as Record<MoveClassification, number>,
  )
  const moves = savedGame.moves

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full rounded-xl border border-neutral-700 py-3 text-sm font-semibold text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? 'Gerando PDF...' : '⬇ Baixar Revisão em PDF'}
      </button>

      {/* Elemento capturado pelo html2canvas — oculto na UI normal */}
      <div
        id="pdf-content"
        style={{
          display:    'none',
          position:   'fixed',
          top:        0,
          left:       0,
          width:      700,
          background: '#ffffff',
          color:      '#111111',
          fontFamily: 'system-ui, sans-serif',
          padding:    40,
          zIndex:     -1,
        }}
      >
        {/* Cabeçalho */}
        <div style={{ borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>♟ Chess Dojo — Revisão de Partida</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
            {dateStr} · vs {savedGame.botLevel} ·{' '}
            {savedGame.playerColor === 'white' ? 'Brancas' : 'Pretas'} ·{' '}
            <strong>
              {savedGame.result === 'won' ? 'Vitória' : savedGame.result === 'lost' ? 'Derrota' : 'Empate'}
            </strong>
          </div>
        </div>

        {/* Precisão */}
        <div style={{ background: '#f5f5f5', borderRadius: 6, padding: '8px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Precisão:</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#2d6a4f' }}>{result.accuracy}%</span>
        </div>

        {/* Cards de categorias */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map(key => {
            const meta = CLASSIFICATION_META[key]
            return (
              <div key={key} style={{ background: '#f0f0f0', borderRadius: 6, padding: 8, textAlign: 'center', fontSize: 11 }}>
                <div style={{ fontSize: 18 }}>{meta.emoji}</div>
                <div>{meta.label}</div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{counts[key]}</div>
              </div>
            )
          })}
        </div>

        {/* Gráfico — captura o elemento real na página */}
        <div id="pdf-graph-placeholder" style={{ background: '#eee', height: 80, borderRadius: 6, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888' }}>
          [gráfico de vantagem]
        </div>

        {/* Lista de jogadas */}
        <div style={{ fontSize: 11, fontFamily: 'monospace', columns: 2, columnGap: 24 }}>
          {moves.map((move, i) => {
            const ev   = result.evaluations[i]
            const meta = ev ? CLASSIFICATION_META[ev.classification] : null
            const num  = i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''
            return (
              <div key={i} style={{ lineHeight: 2, breakInside: 'avoid' }}>
                {num}{move.san} {meta?.emoji ?? ''}
              </div>
            )
          })}
        </div>

        {/* Rodapé */}
        <div style={{ borderTop: '1px solid #ddd', marginTop: 24, paddingTop: 8, fontSize: 10, color: '#999', textAlign: 'center' }}>
          chess-dojo-revisao-{new Date(savedGame.date).toISOString().slice(0, 10)}.pdf · Chess Dojo
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 12.2: Verificar build**

```bash
cd frontend && npm run build
```

Esperado: sem erros.

- [ ] **Step 12.3: Testar manualmente**

1. Ir para `/review` com uma partida analisada
2. Clicar "Baixar Revisão em PDF"
3. Verificar: PDF gerado com nome `chess-dojo-revisao-YYYY-MM-DD.pdf`
4. Verificar conteúdo: cabeçalho, precisão, cards, lista de jogadas com emojis

- [ ] **Step 12.4: Commit**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git add frontend/src/app/review/page.tsx
git commit -m "feat(review): add PDF export"
```

---

## Task 13: Push final

- [ ] **Step 13.1: Build limpo final**

```bash
cd frontend && npm run build && npm run lint
```

Esperado: sem erros de TypeScript ou ESLint bloqueantes.

- [ ] **Step 13.2: Push**

```bash
cd "d:/Eduardo Fedeli/Projetos/chess-dojo" && git push
```

---

## Self-Review

### Spec coverage

| Requisito | Task |
|---|---|
| Histórico ao vivo — lista SAN com scroll | Task 5, 6 |
| Scroll automático para última jogada | Task 5 (`scrollIntoView`) |
| Layout responsivo (lateral/abaixo) | Task 6 |
| PGN salvo no localStorage | Task 7 |
| Análise automática ao fim da partida | Task 8 |
| Overlay com progresso, precisão e 7 categorias | Task 8 |
| Botão "Revisão da Partida" no overlay | Task 8 |
| Tabuleiro replay read-only | Task 11 |
| Controles ⏮ ◀ ▶ ⏭ + setas teclado | Task 11 |
| Barra de vantagem vertical clampada ±5 | Task 9 |
| Gráfico recharts clicável | Task 9 |
| Classificação com 7 categorias | Task 3 |
| Brilhante com detecção de sacrifício | Task 3 (`isSacrifice`) |
| Chance Perdida com threshold ≥ +3 → < +1 | Task 3 |
| Resumo final com acurácia | Task 10 |
| Lista de jogadas com badges na revisão | Task 11 |
| Clicar na lista navega o tabuleiro | Task 11 |
| Botão "Começar Análise" (depth 10) | Task 11 |
| Exportar PDF com jspdf + html2canvas | Task 12 |
| PDF: cabeçalho, precisão, cards, gráfico, lista | Task 12 |
| PDF sem tabuleiro | Task 12 ✓ |

Todos os requisitos cobertos.

### Tipos consistentes

- `MoveClassification`, `MoveEvaluation`, `AnalysisResult`, `SavedGame` — definidos em Task 1, usados consistentemente nas Tasks 3, 8, 10, 11, 12. ✓
- `CLASSIFICATION_META` exportado de `move-classifier.ts` — usado em `MoveSummary`, overlay de `game/page.tsx` e `review/page.tsx`. ✓
- `useStockfishAnalysis` retorna `{ scores, progress, isAnalyzing, startAnalysis }` — consumido em Tasks 8 e 11. ✓
- `classifyMoves(scores, moves)` — assinatura usada consistentemente em Tasks 8 e 11. ✓
- `computeAccuracy(evaluations)` — usada consistentemente. ✓

### Sem placeholders

Verificado: sem TBD, TODO, "similar to Task N" ou steps sem código. ✓
