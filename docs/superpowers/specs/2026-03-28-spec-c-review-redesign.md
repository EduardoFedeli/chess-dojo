# Spec C — Review Page Redesign + PDF com Gráfico

**Date:** 2026-03-28
**Status:** Approved

## Overview

Três melhorias na página de revisão: gráfico de vantagem bicolor estilo chess.com, layout com tabuleiro maior e painel mais compacto, e PDF exportável com o gráfico desenhado + flags nas jogadas notáveis.

---

## Item 1 — Gráfico bicolor (`AdvantageGraph.tsx`)

**Problema:** o gráfico atual usa `LineChart + Line` com uma linha simples branca. Sem preenchimento de área, é difícil ler a dinâmica da partida.

**Solução:** substituir por `AreaChart` com dois `Area` — um para valores positivos (fill escuro) e um para negativos (fill branco), separados pelo eixo zero. Dot ativo via `ReferenceDot`.

**Arquivo:** `frontend/src/components/review/AdvantageGraph.tsx`

```tsx
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts'

// Transformação dos dados:
const data = scores.map((s, i) => {
  const clamped = Math.max(-5, Math.min(5, s / 100))
  return {
    index: i,
    scorePos: Math.max(0, clamped),
    scoreNeg: Math.min(0, clamped),
    score: clamped,
  }
})

// JSX:
<div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
    Vantagem
  </p>
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} onClick={(e) => { if (e?.activeIndex != null) onMoveClick(Number(e.activeIndex)) }} style={{ cursor: 'pointer' }}>
      <ReferenceLine y={0} stroke="#3a3a3a" strokeWidth={1} />
      <YAxis domain={[-5, 5]} hide />
      <XAxis dataKey="index" hide />
      <Tooltip
        contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 10 }}
        formatter={(v) => {
          const n = Number(v)
          return [`${n > 0 ? '+' : ''}${n.toFixed(2)}`, 'Vantagem']
        }}
        labelFormatter={(i) => `Jogada ${i}`}
      />
      <Area type="monotone" dataKey="scorePos" baseValue={0} fill="#1a1a1a" stroke="none" dot={false} isAnimationActive={false} />
      <Area type="monotone" dataKey="scoreNeg" baseValue={0} fill="#e5e7eb" stroke="none" dot={false} isAnimationActive={false} />
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
```

**Tooltip:** o `Tooltip` do Recharts exibirá os dois dataKeys (`scorePos` e `scoreNeg`). Para mostrar apenas o valor relevante, usar o `formatter` para retornar `null` quando o valor for `0`:

```tsx
formatter={(v: unknown) => {
  const n = Number(v)
  if (n === 0) return null
  return [`${n > 0 ? '+' : ''}${n.toFixed(2)}`, 'Vantagem']
}}
```

**Props (sem mudança na interface pública):**
```ts
type AdvantageGraphProps = {
  scores: number[]
  currentIndex: number
  onMoveClick: (index: number) => void
  height?: number  // padrão mantido em 64 — review/page.tsx passa explicitamente 150
}
```

---

## Item 2 — Layout da revisão (`review/page.tsx` + `MoveSummary.tsx`)

### `review/page.tsx`

**Tabuleiro maior:**
```ts
// Antes
setBoardSize(Math.min(window.innerHeight - 120, 700))
// Depois
setBoardSize(Math.min(window.innerHeight - 80, 800))
```

**Painel direito:**
```tsx
// Antes: width: 320
<div className="flex min-h-0 flex-col gap-3" style={{ width: 320, maxWidth: 320, flexShrink: 0 }}>
// Depois: width: 280
<div className="flex min-h-0 flex-col gap-3" style={{ width: 280, maxWidth: 280, flexShrink: 0 }}>
```

**Gráfico mais alto:**
```tsx
// Antes
<AdvantageGraph scores={graphScores} currentIndex={currentIndex} onMoveClick={goTo} height={100} />
// Depois
<AdvantageGraph scores={graphScores} currentIndex={currentIndex} onMoveClick={goTo} height={150} />
```

### `MoveSummary.tsx`

O modo não-compact ainda usa o grid antigo `1fr auto` com `div.contents`. Corrigir para o grid `20px 1fr 24px` (mesmo padrão do popup em `game/page.tsx`):

```tsx
// Antes
<div className="grid gap-x-4 gap-y-1 text-[11px]" style={{ gridTemplateColumns: '1fr auto' }}>
  {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
    const meta  = CLASSIFICATION_META[key]
    const count = counts[key]
    return (
      <div key={key} className="contents">
        <span style={{ color: meta.color }}>{meta.emoji} {meta.label}</span>
        <span className="text-right font-bold tabular-nums" style={{ color: meta.color }}>{count}</span>
      </div>
    )
  })}
</div>

// Depois
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
```

---

## Item 3 — PDF com gráfico + flags

### Extração do componente

`PdfExportButton` sai de `review/page.tsx` para um arquivo próprio:

**Criar:** `frontend/src/components/review/PdfExportButton.tsx`

```tsx
'use client'

import { useState } from 'react'
import { CLASSIFICATION_META } from '@/utils/move-classifier'
import type { AnalysisResult, MoveClassification, SavedGame } from '@/types/game.types'

const FLAG_CLASSIFICATIONS: MoveClassification[] = ['brilliant', 'missed_win', 'mistake', 'blunder']

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
      // ... lógica de geração do PDF (movida de review/page.tsx + adição do gráfico)
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

**Remover de `review/page.tsx`:** a função `PdfExportButton` e importar do novo arquivo.

### Gráfico no PDF

Inserido após o separador do cabeçalho (antes da lista de precisão).

**Scores para o gráfico** — reconstruídos a partir de `result.evaluations` dentro de `handleExport`:
```ts
const graphScores: number[] = [
  result.evaluations[0]?.scoreBefore ?? 0,
  ...result.evaluations.map(e => e.scoreAfter),
]
```

**Desenho do gráfico:**

```ts
// Dimensões
const gW = W - 2 * M          // 182mm — largura do gráfico
const gH = 28                  // altura em mm
const gX = M                   // início X
const gY = y                   // início Y atual
const midY = gY + gH / 2       // linha do meio (score = 0)

// Mapeia score (centipawns) para coordenada Y no PDF
function scoreToY(cp: number): number {
  const clamped = Math.max(-500, Math.min(500, cp))
  return midY - (clamped / 500) * (gH / 2)
}

// Mapeia índice para coordenada X
function indexToX(i: number): number {
  return gX + (i / (graphScores.length - 1)) * gW
}

// Helper: desenha polígono preenchido usando doc.lines()
// points: array de [x, y] absolutos — o polígono é fechado automaticamente
function fillPolygon(points: [number, number][], r: number, g: number, b: number) {
  if (points.length < 2) return
  const segs = points.slice(1).map(([x2, y2], i) => {
    const [x1, y1] = points[i]
    return [x2 - x1, y2 - y1] as [number, number]
  })
  doc.setFillColor(r, g, b)
  doc.lines(segs, points[0][0], points[0][1], [1, 1], 'F', true)
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

// Linha central (y=0)
doc.setDrawColor(100, 100, 100).setLineWidth(0.2)
doc.line(gX, midY, gX + gW, midY)

// Borda do gráfico
doc.setDrawColor(180, 180, 180).setLineWidth(0.3)
doc.rect(gX, gY, gW, gH)

y += gH + 4
```

### Flags no PDF

Após o gráfico ser desenhado, mas antes de avançar `y`:

```ts
// Flags: linha vertical colorida + emoji abaixo do gráfico
const flagColors: Record<string, [number, number, number]> = {
  brilliant:  [167, 139, 250],  // #a78bfa
  missed_win: [248, 113, 113],  // #f87171
  mistake:    [238, 150,  75],  // #EE964B
  blunder:    [239,  68,  68],  // #ef4444
}

result.evaluations.forEach((ev, i) => {
  if (!FLAG_CLASSIFICATIONS.includes(ev.classification)) return
  const x = indexToX(i + 1)  // i+1 porque scores[0] é posição inicial, scores[i+1] é após jogada i
  const [r, g, b] = flagColors[ev.classification]
  doc.setDrawColor(r, g, b).setLineWidth(0.4)
  doc.line(x, gY, x, gY + gH)
})
```

---

## Constraints

- `useGame.ts`: não modificado
- `useStockfish.ts`: não modificado
- `storage.service.ts`: não modificado
- `AdvantageBar.tsx`: não modificado
- `MoveHistory.tsx`: não modificado
- Interface pública de `AdvantageGraph` não muda (mesmas props, mesmo import path)
- Um commit por item
