# Spec E — Review Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cinco melhorias visuais na revisão de partida: alto contraste no gráfico, layout centralizado 1100px com painel 420px, tooltips de categoria, barra de vantagem mais larga, e números de jogada no PDF.

**Architecture:** Todas as mudanças são em componentes React e no gerador de PDF. Sem novos arquivos. Sem lógica de análise ou Stockfish tocada. Verificação por `npm run build` + `npm run lint` + inspeção visual.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, React 19, Tailwind CSS v4, Recharts, jsPDF, shadcn/ui Tooltip.

---

## File Map

| Arquivo | Mudanças |
|---|---|
| `frontend/src/components/review/AdvantageGraph.tsx` | Task 1: bg escuro, fills contraste, borda visível |
| `frontend/src/components/review/AdvantageBar.tsx` | Task 2: width 14→24 |
| `frontend/src/components/review/MoveSummary.tsx` | Task 3: compact grid 3-col + tooltips non-compact |
| `frontend/src/app/review/page.tsx` | Task 4: layout centralizado, painel 420px |
| `frontend/src/components/review/PdfExportButton.tsx` | Task 5: números no eixo X + sobre flags |

---

### Task 1: AdvantageGraph — alto contraste

**Files:**
- Modify: `frontend/src/components/review/AdvantageGraph.tsx`

O arquivo atual tem `bg-neutral-600` (hotfix) e fills `#e5e7eb` / `#404040`. A mudança volta para fundo escuro com fills de maior contraste e linha central mais visível.

- [ ] **Step 1: Ler o arquivo**

```bash
# Conferir estado atual antes de editar
head -10 frontend/src/components/review/AdvantageGraph.tsx
```

- [ ] **Step 2: Aplicar as 3 mudanças de cor**

Arquivo: `frontend/src/components/review/AdvantageGraph.tsx`

**Mudança A** — container (linha ~31):
```tsx
// ANTES:
<div className="rounded-lg border border-neutral-700 bg-neutral-600 p-3">
// DEPOIS:
<div className="rounded-lg border border-neutral-600 bg-neutral-900 p-3">
```

**Mudança B** — fill scorePos (linha ~58):
```tsx
// ANTES:
fill="#e5e7eb"
// DEPOIS:
fill="#e8e8e8"
```

**Mudança C** — fill scoreNeg (linha ~68):
```tsx
// ANTES:
fill="#404040"
// DEPOIS:
fill="#323232"
```

**Mudança D** — ReferenceLine mais visível (linha ~74):
```tsx
// ANTES:
<ReferenceLine y={0} stroke="#3a3a3a" strokeWidth={1} />
// DEPOIS:
<ReferenceLine y={0} stroke="#555555" strokeWidth={1} />
```

- [ ] **Step 3: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/review/AdvantageGraph.tsx
git commit -m "fix(graph): alto contraste — bg neutral-900, fills #e8e8e8/#323232, borda visível"
```

---

### Task 2: AdvantageBar — largura 24px

**Files:**
- Modify: `frontend/src/components/review/AdvantageBar.tsx`

- [ ] **Step 1: Aplicar mudança**

Arquivo: `frontend/src/components/review/AdvantageBar.tsx`, linha ~24:

```tsx
// ANTES:
style={{ width: 14, height, border: '1px solid #2a2a2a' }}
// DEPOIS:
style={{ width: 24, height, border: '1px solid #2a2a2a' }}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/review/AdvantageBar.tsx
git commit -m "feat(review): barra de vantagem width 14→24px"
```

---

### Task 3: MoveSummary — grid compacto + tooltips

**Files:**
- Modify: `frontend/src/components/review/MoveSummary.tsx`

Duas mudanças independentes no mesmo arquivo:
1. Modo `compact`: layout muda de `flex-wrap` para grid 3 colunas
2. Modo não-compact: adicionar `Tooltip` shadcn em cada linha de categoria

- [ ] **Step 1: Reescrever o arquivo completo**

Substituir `frontend/src/components/review/MoveSummary.tsx` pelo conteúdo abaixo:

```tsx
'use client'

import { CLASSIFICATION_META } from '@/utils/move-classifier'
import type { MoveClassification, MoveEvaluation } from '@/types/game.types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type MoveSummaryProps = {
  evaluations: MoveEvaluation[]
  accuracy: number
  /** compact: grid 3 colunas com precisão + ícones de categoria */
  compact?: boolean
}

/** Cards de totais por categoria + acurácia. Usado no painel de revisão. */
export function MoveSummary({ evaluations, accuracy, compact = false }: MoveSummaryProps) {
  const counts = (Object.keys(CLASSIFICATION_META) as MoveClassification[]).reduce(
    (acc, key) => {
      acc[key] = evaluations.filter(e => e.classification === key).length
      return acc
    },
    {} as Record<MoveClassification, number>,
  )

  if (compact) {
    return (
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: '#171717', border: '1px solid #262626' }}
      >
        {/* Linha de precisão */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-neutral-400">Precisão</span>
          <span className="text-sm font-black" style={{ color: '#6B8F71' }}>{accuracy}%</span>
        </div>
        {/* Grid 3 colunas — 7 classificações ficam em 3+3+1 */}
        <div className="grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
            const meta  = CLASSIFICATION_META[key]
            const count = counts[key]
            return (
              <span
                key={key}
                className="flex items-center gap-1 text-xs tabular-nums"
                style={{ color: meta.color }}
                title={meta.label}
              >
                <span>{meta.emoji}</span>
                <span className="text-neutral-400 truncate text-[10px]">{meta.label}</span>
                <span className="font-bold">{count}</span>
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Precisão */}
      <div
        className="flex items-center justify-between rounded-lg px-4 py-2"
        style={{ background: '#6B8F7118', border: '1px solid #6B8F7144' }}
      >
        <span className="text-sm text-neutral-400">Precisão</span>
        <span className="text-xl font-black" style={{ color: '#6B8F71' }}>
          {accuracy}%
        </span>
      </div>

      {/* Categorias com tooltip */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col gap-y-1 text-[11px]">
            {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
              const meta  = CLASSIFICATION_META[key]
              const count = counts[key]
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div
                      className="grid cursor-help"
                      style={{ gridTemplateColumns: '20px 1fr 24px' }}
                    >
                      <span className="text-center leading-none">{meta.emoji}</span>
                      <span style={{ color: meta.color }}>{meta.label}</span>
                      <span
                        className="text-right font-bold tabular-nums"
                        style={{ color: meta.color }}
                      >
                        {count}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-48">
                    <p className="text-xs">{meta.description}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully` sem erros TypeScript.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/review/MoveSummary.tsx
git commit -m "feat(review): MoveSummary compact em grid 3-col + tooltips no modo expandido"
```

---

### Task 4: Review page — layout centralizado

**Files:**
- Modify: `frontend/src/app/review/page.tsx`

Esta é a maior mudança. O JSX do `ReviewContent` é reestruturado para:
- Container `max-width: 1100px, margin: 0 auto`
- Coluna esquerda: `AdvantageBar` + tabuleiro + controles centralizados + score texto
- Coluna direita: 420px, flex-col 100% altura, lista de jogadas com scroll interno, botões fixos no rodapé

- [ ] **Step 1: Atualizar o cálculo do boardSize**

No `useEffect` do `boardSize` (linha ~67–69):

```tsx
// ANTES:
setBoardSize(Math.min(window.innerHeight - 80, 800))

// DEPOIS:
setBoardSize(Math.min(window.innerHeight - 140, 700))
```

O `-140` acomoda: back-button row (~48px) + nav controls (~44px) + score text (~24px) + gaps (~24px).

- [ ] **Step 2: Reescrever o bloco return de ReviewContent**

Substituir o bloco `return (...)` de `ReviewContent` (a partir da linha `return (` até o último `)`  antes do `}`) pelo código abaixo.

> Atenção: manter todas as variáveis e handlers já definidos acima do return — apenas o JSX muda.

```tsx
  if (!savedGame) return null

  const dateStr  = new Date(savedGame.date).toLocaleDateString('pt-BR')
  const botName  = savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)
  const scoreDisplay = currentScore === 0
    ? '0.0'
    : `${currentScore > 0 ? '+' : ''}${(currentScore / 100).toFixed(1)}`

  return (
    <main
      className="overflow-hidden"
      style={{
        height: '100vh',
        color: '#e5e7eb',
        background: 'radial-gradient(ellipse at center, #000000 0%, #0d1a0f 100%)',
      }}
    >
      {/* Botão voltar */}
      <div style={{ padding: '12px 24px' }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-200"
        >
          ← Início
        </button>
      </div>

      {/* Container centralizado */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 24px',
          height: 'calc(100vh - 48px)',
          display: 'flex',
          gap: 24,
        }}
      >
        {/* COLUNA ESQUERDA: barra de vantagem + tabuleiro + controles + score */}
        <div className="flex shrink-0 items-center gap-3">
          {graphScores.length > 0 && (
            <AdvantageBar scoreCp={currentScore} height={boardSize} />
          )}
          <div className="flex flex-col items-center gap-3">
            {/* Tabuleiro read-only */}
            <div style={{ width: boardSize, height: boardSize }}>
              <ChessBoard
                fen={currentFen}
                playerColor={savedGame.playerColor}
                makeMove={(_from: string, _to: string) => null}
                onMove={() => {}}
                disabled={true}
                customPieces={customPieces}
              />
            </div>

            {/* Controles de navegação — centralizados */}
            <div className="flex justify-center gap-2">
              {[
                { label: '⏮', action: goFirst, title: 'Início' },
                { label: '◀',  action: goPrev,  title: 'Anterior (←)' },
                { label: '▶',  action: goNext,  title: 'Próximo (→)' },
                { label: '⏭', action: goLast,  title: 'Fim' },
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

            {/* Score numérico atual */}
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: currentScore >= 0 ? '#6B8F71' : '#f87171' }}
            >
              {scoreDisplay}
            </span>
          </div>
        </div>

        {/* COLUNA DIREITA: 420px, flex-col, 100% altura */}
        <div
          className="flex flex-col gap-3 min-h-0"
          style={{ width: 420, flexShrink: 0, height: '100%' }}
        >
          {/* 1. Cabeçalho */}
          <div className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-sm font-bold text-white">Revisão da Partida</span>
              <span className="text-xs text-neutral-500">📅 {dateStr}</span>
              <span className="text-xs text-neutral-500">🤖 vs {botName}</span>
              <span className="text-xs text-neutral-500">
                {savedGame.playerColor === 'white' ? '♔ Brancas' : '♚ Pretas'}
              </span>
              <span className="text-xs text-neutral-500">
                {savedGame.result === 'won'  ? '🏆 Vitória'
                : savedGame.result === 'lost' ? '😔 Derrota'
                : '🤝 Empate'}
              </span>
              <span className="text-xs text-neutral-600">{moves.length} jogadas</span>
            </div>
          </div>

          {/* Estado: analisando (profunda) */}
          {isDeepAnalyzing && (
            <div className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
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

          {/* Estado: sem análise */}
          {!activeResult && !isDeepAnalyzing && (
            <button
              onClick={() => setDeepAnalysisEnabled(true)}
              className="shrink-0 w-full rounded-xl py-4 text-sm font-black tracking-wide transition-all hover:opacity-90"
              style={{ backgroundColor: '#6B8F71', color: '#000' }}
            >
              Começar Análise
            </button>
          )}

          {/* Estado: análise disponível */}
          {activeResult && !isDeepAnalyzing && (
            <>
              {/* 2. Gráfico compacto */}
              {graphScores.length > 0 && (
                <div className="shrink-0">
                  <AdvantageGraph
                    scores={graphScores}
                    currentIndex={currentIndex}
                    onMoveClick={goTo}
                    height={140}
                  />
                </div>
              )}

              {/* 3. Resumo — grid compacto 3 colunas */}
              <div className="shrink-0">
                <MoveSummary
                  evaluations={activeResult.evaluations}
                  accuracy={playerAccuracy ?? activeResult.accuracy}
                  compact
                />
              </div>

              {/* 4. Lista de jogadas — flex-1, scroll interno */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                <p className="shrink-0 px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Jogadas
                </p>
                <div className="flex-1 overflow-y-auto px-4 pb-3" style={{ scrollbarWidth: 'thin' }}>
                  <div className="flex flex-col gap-0.5 text-[11px] font-mono">
                    {moves.reduce<{ white: GameMove; black: GameMove | null; wIdx: number; bIdx: number | null }[]>((rows, move, i) => {
                      if (i % 2 === 0) rows.push({ white: move, black: null, wIdx: i + 1, bIdx: null })
                      else { rows[rows.length - 1].black = move; rows[rows.length - 1].bIdx = i + 1 }
                      return rows
                    }, []).map((row, rowIdx) => {
                      const wEval   = activeResult.evaluations[rowIdx * 2]
                      const bEval   = activeResult.evaluations[rowIdx * 2 + 1]
                      const wActive = currentIndex === row.wIdx
                      const bActive = currentIndex === (row.bIdx ?? -1)
                      const showWBadge = wEval && row.white.color === savedGame.playerColor && NOTABLE.has(wEval.classification)
                      const showBBadge = bEval && row.black?.color === savedGame.playerColor && NOTABLE.has(bEval.classification)
                      return (
                        <div
                          key={rowIdx}
                          className="grid items-center gap-1"
                          style={{ gridTemplateColumns: '20px 1fr 1fr' }}
                        >
                          <span className="text-neutral-600">{rowIdx + 1}.</span>
                          <button
                            onClick={() => goTo(row.wIdx)}
                            className="flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-neutral-800"
                            style={{ background: wActive ? '#EE964B14' : undefined, color: wActive ? '#EE964B' : '#e5e7eb' }}
                          >
                            {row.white.san}
                            {showWBadge && <MoveBadge classification={wEval.classification} />}
                          </button>
                          {row.black ? (
                            <button
                              onClick={() => goTo(row.bIdx!)}
                              className="flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-neutral-800"
                              style={{ background: bActive ? '#EE964B14' : undefined, color: bActive ? '#EE964B' : '#9ca3af' }}
                            >
                              {row.black.san}
                              {showBBadge && <MoveBadge classification={bEval!.classification} />}
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

              {/* 5. Botões fixos no rodapé da coluna */}
              <div className="flex shrink-0 flex-col gap-2">
                {cachedResult && !deepReady && (
                  <button
                    onClick={() => setDeepAnalysisEnabled(true)}
                    className="w-full rounded-xl border border-neutral-700 py-2 text-xs text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                  >
                    Re-analisar com depth 10 (mais preciso)
                  </button>
                )}
                <PdfExportButton
                  savedGame={savedGame}
                  result={activeResult}
                  playerAccuracy={playerAccuracy ?? activeResult.accuracy}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
```

- [ ] **Step 3: Verificar build sem erros**

```bash
cd frontend && npm run build 2>&1 | tail -15
```

Expected: `✓ Compiled successfully` com zero erros TypeScript. Se houver erro, ler output completo e corrigir antes de continuar.

- [ ] **Step 4: Verificar lint**

```bash
cd frontend && npm run lint 2>&1 | tail -10
```

Expected: nenhum erro novo nos arquivos tocados.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/review/page.tsx
git commit -m "feat(review): layout centralizado — max-width 1100px, painel 420px, score abaixo de nav"
```

---

### Task 5: PdfExportButton — números de jogada no PDF

**Files:**
- Modify: `frontend/src/components/review/PdfExportButton.tsx`

Duas adições dentro de `handleExport`, ambas na seção do gráfico.

- [ ] **Step 1: Modificar o loop de flags para adicionar número acima**

Localizar o bloco `// Flags: linhas verticais coloridas` (linhas ~108–116):

```ts
// ANTES:
result.evaluations.forEach((ev, i) => {
  if (!FLAG_CLASSIFICATIONS.includes(ev.classification)) return
  const color = FLAG_COLORS[ev.classification]
  if (!color) return
  const x = indexToX(i + 1)
  const [r, g, b] = color
  doc.setDrawColor(r, g, b).setLineWidth(0.4)
  doc.line(x, gY, x, gY + gH)
})
```

Substituir por:

```ts
// Flags: linhas verticais coloridas + número da jogada acima
result.evaluations.forEach((ev, i) => {
  if (!FLAG_CLASSIFICATIONS.includes(ev.classification)) return
  const color = FLAG_COLORS[ev.classification]
  if (!color) return
  const x = indexToX(i + 1)
  const [r, g, b] = color
  doc.setDrawColor(r, g, b).setLineWidth(0.4)
  doc.line(x, gY, x, gY + gH)
  // Número da jogada acima da flag
  doc.setFontSize(5).setFont('helvetica', 'bold').setTextColor(r, g, b)
  doc.text(String(i + 1), x, gY - 1, { align: 'center' })
})
```

- [ ] **Step 2: Adicionar eixo X com ticks a cada 5 jogadas**

Localizar a linha `// Linha central (y=0)` (linha ~118). Inserir o bloco de eixo X **antes** dessa linha:

```ts
// Eixo X: ticks a cada 5 jogadas abaixo do gráfico
doc.setFontSize(5).setFont('helvetica', 'normal').setTextColor(120, 120, 120)
doc.setDrawColor(150, 150, 150).setLineWidth(0.2)
const totalMoves = graphScores.length - 1
for (let n = 5; n <= totalMoves; n += 5) {
  const tx = indexToX(n)
  doc.line(tx, gY + gH, tx, gY + gH + 1)
  doc.text(String(n), tx, gY + gH + 3.5, { align: 'center' })
}
```

- [ ] **Step 3: Ampliar o espaço após o gráfico**

Localizar `y += gH + 4` (linha ~126):

```ts
// ANTES:
y += gH + 4
// DEPOIS:
y += gH + 8
```

- [ ] **Step 4: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit + Push**

```bash
git add frontend/src/components/review/PdfExportButton.tsx
git commit -m "feat(pdf): números de jogada no eixo X e acima de cada flag"
git push
```
