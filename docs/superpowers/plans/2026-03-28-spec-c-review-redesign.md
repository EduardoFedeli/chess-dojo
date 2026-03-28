# Spec C — Review Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o gráfico de linha por área bicolor estilo chess.com, aumentar o tabuleiro na revisão, e adicionar o gráfico + flags de jogadas notáveis ao PDF exportado.

**Architecture:** Três tasks independentes: (1) reescrever `AdvantageGraph.tsx` de `LineChart` para `AreaChart` com dois `Area` e `ReferenceDot`; (2) ajustar fórmula de boardSize e largura do painel em `review/page.tsx` + corrigir grid do `MoveSummary.tsx`; (3) extrair `PdfExportButton` para arquivo próprio e adicionar gráfico desenhado com `doc.lines()` + linhas verticais coloridas nas jogadas notáveis.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Recharts (já instalado), jsPDF (já instalado via `import('jspdf')`)

---

## File Structure

**Modified:**
- `frontend/src/components/review/AdvantageGraph.tsx` — gráfico bicolor (Task 1)
- `frontend/src/app/review/page.tsx` — boardSize maior, painel mais estreito, gráfico mais alto, remoção do PdfExportButton inline, import do novo componente (Tasks 2 e 3)
- `frontend/src/components/review/MoveSummary.tsx` — grid 3 colunas no modo não-compact (Task 2)

**Created:**
- `frontend/src/components/review/PdfExportButton.tsx` — PDF export com gráfico + flags (Task 3)

---

### Task 1: Gráfico bicolor em AdvantageGraph.tsx

**Files:**
- Modify: `frontend/src/components/review/AdvantageGraph.tsx`

- [ ] **Step 1: Substituir o conteúdo inteiro de AdvantageGraph.tsx**

Escreva o arquivo `frontend/src/components/review/AdvantageGraph.tsx` com este conteúdo exato:

```tsx
'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts'

type AdvantageGraphProps = {
  /** N+1 scores em centipawns, perspectiva brancas. */
  scores: number[]
  /** Índice da jogada atualmente exibida no tabuleiro (0 = posição inicial). */
  currentIndex: number
  /** Chamado quando o usuário clica num ponto do gráfico. */
  onMoveClick: (index: number) => void
  /** Altura do gráfico em px. Padrão: 64. */
  height?: number
}

export function AdvantageGraph({ scores, currentIndex, onMoveClick, height = 64 }: AdvantageGraphProps) {
  const data = scores.map((s, i) => {
    const clamped = Math.max(-5, Math.min(5, s / 100))
    return {
      index: i,
      scorePos: Math.max(0, clamped),
      scoreNeg: Math.min(0, clamped),
      score: clamped,
    }
  })

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
        Vantagem
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          onClick={(e) => {
            if (e?.activeIndex != null) onMoveClick(Number(e.activeIndex))
          }}
          style={{ cursor: 'pointer' }}
        >
          <ReferenceLine y={0} stroke="#3a3a3a" strokeWidth={1} />
          <YAxis domain={[-5, 5]} hide />
          <XAxis dataKey="index" hide />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 10 }}
            formatter={(v: unknown) => {
              const n = Number(v)
              if (n === 0) return null
              return [`${n > 0 ? '+' : ''}${n.toFixed(2)}`, 'Vantagem']
            }}
            labelFormatter={(i) => `Jogada ${i}`}
          />
          <Area
            type="monotone"
            dataKey="scorePos"
            baseValue={0}
            fill="#1a1a1a"
            stroke="none"
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="scoreNeg"
            baseValue={0}
            fill="#e5e7eb"
            stroke="none"
            dot={false}
            isAnimationActive={false}
          />
          {data[currentIndex] && (
            <ReferenceDot
              x={currentIndex}
              y={data[currentIndex].score}
              r={4}
              fill="#EE964B"
              stroke="#000"
              strokeWidth={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build e lint**

```bash
cd frontend && npm run build
```
Expected: build passa sem erros TypeScript.

```bash
cd frontend && npm run lint
```
Expected: sem novos erros ou warnings.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/review/AdvantageGraph.tsx
git commit -m "feat(graph): gráfico bicolor estilo chess.com com AreaChart"
```

---

### Task 2: Layout da revisão + fix do MoveSummary

**Files:**
- Modify: `frontend/src/app/review/page.tsx`
- Modify: `frontend/src/components/review/MoveSummary.tsx`

- [ ] **Step 1: Aumentar boardSize em review/page.tsx**

Em `frontend/src/app/review/page.tsx`, localize (linha 67 aprox.):

```ts
    setBoardSize(Math.min(window.innerHeight - 120, 700))
```

Substitua por:

```ts
    setBoardSize(Math.min(window.innerHeight - 80, 800))
```

- [ ] **Step 2: Reduzir largura do painel direito**

Em `frontend/src/app/review/page.tsx`, localize (linha 206 aprox.):

```tsx
        <div className="flex min-h-0 flex-col gap-3" style={{ width: 320, maxWidth: 320, flexShrink: 0 }}>
```

Substitua por:

```tsx
        <div className="flex min-h-0 flex-col gap-3" style={{ width: 280, maxWidth: 280, flexShrink: 0 }}>
```

- [ ] **Step 3: Aumentar altura do gráfico**

Em `frontend/src/app/review/page.tsx`, localize (linha 264 aprox.):

```tsx
                  <AdvantageGraph
                    scores={graphScores}
                    currentIndex={currentIndex}
                    onMoveClick={goTo}
                    height={100}
                  />
```

Substitua por:

```tsx
                  <AdvantageGraph
                    scores={graphScores}
                    currentIndex={currentIndex}
                    onMoveClick={goTo}
                    height={150}
                  />
```

- [ ] **Step 4: Corrigir grid do MoveSummary.tsx (modo não-compact)**

Em `frontend/src/components/review/MoveSummary.tsx`, localize o bloco não-compact (linhas 60–84 aprox.):

```tsx
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
```

Substitua por:

```tsx
      {/* Categorias */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="flex flex-col gap-y-1 text-[11px]">
          {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
            const meta  = CLASSIFICATION_META[key]
            const count = counts[key]
            return (
              <div key={key} className="grid" style={{ gridTemplateColumns: '20px 1fr 24px' }}>
                <span className="text-center leading-none">{meta.emoji}</span>
                <span style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-right font-bold tabular-nums" style={{ color: meta.color }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
```

- [ ] **Step 5: Verificar build e lint**

```bash
cd frontend && npm run build
```
Expected: build passa sem erros.

```bash
cd frontend && npm run lint
```
Expected: sem novos erros.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/review/page.tsx frontend/src/components/review/MoveSummary.tsx
git commit -m "feat(review): tabuleiro maior, painel estreito, gráfico 150px, grid MoveSummary"
```

---

### Task 3: PdfExportButton extraído com gráfico + flags

**Files:**
- Create: `frontend/src/components/review/PdfExportButton.tsx`
- Modify: `frontend/src/app/review/page.tsx`

- [ ] **Step 1: Criar PdfExportButton.tsx**

Crie o arquivo `frontend/src/components/review/PdfExportButton.tsx` com este conteúdo:

```tsx
'use client'

import { useState } from 'react'
import { CLASSIFICATION_META } from '@/utils/move-classifier'
import type { AnalysisResult, MoveClassification, SavedGame } from '@/types/game.types'

const FLAG_CLASSIFICATIONS: MoveClassification[] = ['brilliant', 'missed_win', 'mistake', 'blunder']

const FLAG_COLORS: Record<string, [number, number, number]> = {
  brilliant:  [167, 139, 250],
  missed_win: [248, 113, 113],
  mistake:    [238, 150,  75],
  blunder:    [239,  68,  68],
}

export function PdfExportButton({
  savedGame,
  result,
  playerAccuracy,
}: {
  savedGame: SavedGame
  result: AnalysisResult
  playerAccuracy: number
}) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const W = 210, H = 297, M = 14
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      let y = M

      function ensureSpace(needed: number) {
        if (y + needed > H - M) { doc.addPage(); y = M }
      }

      const dateStr    = new Date(savedGame.date).toLocaleDateString('pt-BR')
      const resultText = savedGame.result === 'won' ? 'Vitoria' : savedGame.result === 'lost' ? 'Derrota' : 'Empate'
      const colorText  = savedGame.playerColor === 'white' ? 'Brancas' : 'Pretas'
      const botName    = savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)
      const moves      = savedGame.moves

      // ── Cabeçalho ────────────────────────────────────────────────────────────
      doc.setFontSize(15).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
      doc.text('Chess Dojo - Revisao de Partida', M, y); y += 7

      doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100, 100, 100)
      doc.text(`${dateStr}  vs ${botName}  ${colorText}  ${resultText}  ${moves.length} jogadas`, M, y); y += 4

      doc.setDrawColor(180, 180, 180).line(M, y, W - M, y); y += 6

      // ── Gráfico de vantagem ───────────────────────────────────────────────────
      const graphScores: number[] = [
        result.evaluations[0]?.scoreBefore ?? 0,
        ...result.evaluations.map(e => e.scoreAfter),
      ]

      const gW   = W - 2 * M
      const gH   = 28
      const gX   = M
      const gY   = y
      const midY = gY + gH / 2

      function scoreToY(cp: number): number {
        const clamped = Math.max(-500, Math.min(500, cp))
        return midY - (clamped / 500) * (gH / 2)
      }

      function indexToX(i: number): number {
        return gX + (i / Math.max(graphScores.length - 1, 1)) * gW
      }

      function fillPolygon(pts: [number, number][], r: number, g: number, b: number) {
        if (pts.length < 2) return
        const segs: [number, number][] = pts.slice(1).map(([x2, y2], i) => {
          const [x1, y1] = pts[i]
          return [x2 - x1, y2 - y1] as [number, number]
        })
        doc.setFillColor(r, g, b)
        doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'F', true)
      }

      // Fundo cinza claro
      doc.setFillColor(240, 240, 240)
      doc.rect(gX, gY, gW, gH, 'F')

      // Polígono positivo (acima de zero) — cinza escuro
      const posPoints: [number, number][] = [[gX, midY]]
      graphScores.forEach((cp, i) => {
        posPoints.push([indexToX(i), Math.min(scoreToY(cp), midY)])
      })
      posPoints.push([gX + gW, midY])
      fillPolygon(posPoints, 30, 30, 30)

      // Polígono negativo (abaixo de zero) — branco
      const negPoints: [number, number][] = [[gX, midY]]
      graphScores.forEach((cp, i) => {
        negPoints.push([indexToX(i), Math.max(scoreToY(cp), midY)])
      })
      negPoints.push([gX + gW, midY])
      fillPolygon(negPoints, 255, 255, 255)

      // Flags: linhas verticais coloridas nas jogadas notáveis
      result.evaluations.forEach((ev, i) => {
        if (!FLAG_CLASSIFICATIONS.includes(ev.classification)) return
        const x = indexToX(i + 1)
        const [r, g, b] = FLAG_COLORS[ev.classification]
        doc.setDrawColor(r, g, b).setLineWidth(0.4)
        doc.line(x, gY, x, gY + gH)
      })

      // Linha central (y=0)
      doc.setDrawColor(100, 100, 100).setLineWidth(0.2)
      doc.line(gX, midY, gX + gW, midY)

      // Borda do gráfico
      doc.setDrawColor(180, 180, 180).setLineWidth(0.3)
      doc.rect(gX, gY, gW, gH)

      y += gH + 4

      doc.setDrawColor(180, 180, 180).line(M, y, W - M, y); y += 6

      // ── Precisão do jogador ───────────────────────────────────────────────────
      doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
      doc.text('Precisao do jogador:', M, y)
      doc.setTextColor(45, 106, 79)
      doc.text(`${playerAccuracy}%`, M + 47, y); y += 8

      // ── Contagem de classificações ────────────────────────────────────────────
      const classKeys = Object.keys(CLASSIFICATION_META) as MoveClassification[]
      const counts    = classKeys.reduce((acc, key) => {
        acc[key] = result.evaluations.filter(e => e.classification === key).length
        return acc
      }, {} as Record<MoveClassification, number>)

      const cols  = 4
      const cellW = (W - M * 2) / cols
      classKeys.forEach((key, i) => {
        const col = i % cols, row = Math.floor(i / cols)
        const x = M + col * cellW, cy = y + row * 10
        ensureSpace(12)
        doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(90, 90, 90)
        doc.text(CLASSIFICATION_META[key].label, x, cy)
        doc.setFont('helvetica', 'bold').setTextColor(0, 0, 0)
        doc.text(String(counts[key]), x, cy + 4)
      })
      y += Math.ceil(classKeys.length / cols) * 10 + 4

      doc.setDrawColor(180, 180, 180).line(M, y, W - M, y); y += 6

      // ── Lista de jogadas (duas colunas) ───────────────────────────────────────
      doc.setFontSize(8).setFont('helvetica', 'normal')
      const colW = (W - M * 2) / 2
      const rowH = 5
      const numW = 8

      for (let i = 0; i < moves.length; i += 2) {
        ensureSpace(rowH)

        const wMove = moves[i]
        const bMove = moves[i + 1]
        const wEval = result.evaluations[i]
        const bEval = result.evaluations[i + 1]
        const pairNum = Math.floor(i / 2) + 1

        doc.setTextColor(140, 140, 140)
        doc.text(`${pairNum}.`, M, y)

        doc.setTextColor(0, 0, 0)
        doc.text(wMove.san, M + numW, y)
        if (wEval) {
          doc.setTextColor(100, 100, 100).setFontSize(6)
          doc.text(CLASSIFICATION_META[wEval.classification].label, M + numW + 10, y)
          doc.setFontSize(8)
        }

        if (bMove) {
          doc.setTextColor(60, 60, 60)
          doc.text(bMove.san, M + colW, y)
          if (bEval) {
            doc.setTextColor(100, 100, 100).setFontSize(6)
            doc.text(CLASSIFICATION_META[bEval.classification].label, M + colW + 10, y)
            doc.setFontSize(8)
          }
        }

        y += rowH
      }

      // ── Rodapé ───────────────────────────────────────────────────────────────
      ensureSpace(10)
      doc.setDrawColor(200, 200, 200).line(M, y + 4, W - M, y + 4); y += 8
      doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(160, 160, 160)
      doc.text(`Chess Dojo  -  ${dateStr}`, W / 2, y, { align: 'center' })

      // ── Salvar ───────────────────────────────────────────────────────────────
      const date = new Date(savedGame.date).toISOString().slice(0, 10)
      doc.save(`chess-dojo-revisao-${date}.pdf`)

    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="w-full rounded-xl border border-neutral-700 py-3 text-sm font-semibold text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isExporting ? 'Gerando PDF...' : '⬇ Baixar Revisão em PDF'}
    </button>
  )
}
```

- [ ] **Step 2: Substituir o uso de PdfExportButton em review/page.tsx**

Em `frontend/src/app/review/page.tsx`:

**2a. Adicionar o import** no bloco de imports existente (após os outros imports de componentes `review/`):

```tsx
import { PdfExportButton } from '@/components/review/PdfExportButton'
```

**2b. Remover a função `PdfExportButton`** do final do arquivo. A função começa em:
```tsx
// Gera PDF com jsPDF puro (sem html2canvas) para evitar erros de parse de
// cores CSS modernas (oklch/lab) usadas pelo Tailwind v4.
function PdfExportButton({
```
e vai até a chave `}` antes de `export default function ReviewPage()`.

Após a remoção, o arquivo deve terminar assim:
```tsx
export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewContent />
    </Suspense>
  )
}
```

O uso de `<PdfExportButton ... />` dentro de `ReviewContent` **não muda** — continua igual, pois o nome e as props são os mesmos.

- [ ] **Step 3: Verificar build e lint**

```bash
cd frontend && npm run build
```
Expected: build passa, sem erros TypeScript. Se aparecer erro de tipo em `doc.lines()`, verifique se o tipo dos segmentos é `[number, number][]` — o TypeScript pode inferir `number[][]`. Se necessário, use cast explícito: `segs as unknown as Parameters<typeof doc.lines>[0]`.

```bash
cd frontend && npm run lint
```
Expected: sem novos erros. O `eslint-disable-next-line @next/next/no-img-element` não é necessário aqui pois não há `<img>` no novo arquivo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/review/PdfExportButton.tsx frontend/src/app/review/page.tsx
git commit -m "feat(pdf): gráfico bicolor + flags de jogadas notáveis no PDF exportado"
```
