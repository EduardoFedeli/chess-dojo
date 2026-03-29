# Spec E — Review Visual Polish

## Objetivo

Cinco melhorias visuais e de layout na página de revisão e no PDF exportado:
1. Gráfico de vantagem com fundo escuro e alto contraste
2. Números de jogada no gráfico do PDF
3. Layout da revisão centralizado e expandido
4. Tooltips de categoria em `MoveSummary`
5. Barra de vantagem mais larga

---

## 1. Gráfico de vantagem — AdvantageGraph.tsx

**Problema:** Hotfix anterior mudou `bg-neutral-900` → `bg-neutral-600`, mas o fill escuro (`#404040`) ficava visível demais num fundo médio. Solução anterior sacrificou a estética dark do app.

**Solução:** Voltar ao fundo escuro, mas usar fills de alto contraste e uma borda visível que separa a região preta da escuridão do container.

| Elemento | Antes (hotfix) | Depois |
|---|---|---|
| Container bg | `bg-neutral-600` | `bg-neutral-900` |
| Container border | `border-neutral-700` | `border-neutral-600` (mais visível) |
| `scorePos` fill (brancas ganham) | `#e5e7eb` | `#e8e8e8` (quase branco puro) |
| `scoreNeg` fill (pretas ganham) | `#404040` | `#323232` (cinza escuro distinto do bg) |

Adicionar um elemento `<ReferenceLine y={0} stroke="#555" strokeWidth={1} />` mais visível para separar as regiões.

A borda interna da área do gráfico (dentro do SVG do Recharts) é implementada via `<svg>` wrapper com `outline` ou pelo próprio container com `border`.

---

## 2. Números de jogada no PDF — PdfExportButton.tsx

O gráfico no PDF: `gW = W - 2*M` (~182mm), `gH = 28mm`, `gY` = y atual.

### 2a. Eixo X — números a cada 5 jogadas

Após renderizar flags e linha central, antes de incrementar `y`:

```ts
// Eixo X: ticks a cada 5 jogadas
doc.setFontSize(5).setFont('helvetica', 'normal').setTextColor(120, 120, 120)
doc.setDrawColor(150, 150, 150).setLineWidth(0.2)
const totalMoves = graphScores.length - 1
for (let n = 5; n <= totalMoves; n += 5) {
  const tx = indexToX(n)
  doc.line(tx, gY + gH, tx, gY + gH + 1)          // tick de 1mm
  doc.text(String(n), tx, gY + gH + 3.5, { align: 'center' })
}
```

### 2b. Número acima de cada flag

No loop de flags existente, adicionar texto com o número da jogada:

```ts
result.evaluations.forEach((ev, i) => {
  if (!FLAG_CLASSIFICATIONS.includes(ev.classification)) return
  const color = FLAG_COLORS[ev.classification]
  if (!color) return
  const x = indexToX(i + 1)
  const [r, g, b] = color
  // Linha da flag (já existia)
  doc.setDrawColor(r, g, b).setLineWidth(0.4)
  doc.line(x, gY, x, gY + gH)
  // Número acima da flag (novo)
  doc.setFontSize(5).setFont('helvetica', 'bold').setTextColor(r, g, b)
  doc.text(String(i + 1), x, gY - 1, { align: 'center' })
})
```

### 2c. Espaço extra abaixo do gráfico

```ts
y += gH + 8   // era: y += gH + 4
```

Os 4mm extras acomodam os ticks e texto do eixo X sem colidir com o separador e próximo bloco.

---

## 3. Layout da revisão — review/page.tsx

### Estrutura geral

```
<main style="height: 100vh; overflow: hidden; background: gradiente atual">
  ← Início (botão voltar)

  <div style="max-width: 1100px; margin: 0 auto; padding: 24px; height: calc(100vh - 40px)">
    <div style="display: flex; gap: 24px; height: 100%">

      <!-- COLUNA ESQUERDA: shrink-0, flex-col, justify-center -->
      [AdvantageBar] [Board (N×N)] [Controles: ⏮ ◀ ▶ ⏭] [Score texto +0.4]

      <!-- COLUNA DIREITA: width 420px; flex-col; height 100% -->
      [1. Cabeçalho]
      [2. AdvantageGraph height={140}]
      [3. MoveSummary compact — grid 3 colunas]
      [4. Lista de jogadas — flex-1, overflow-y-auto]
      [5. Botões (Re-analisar + Baixar PDF) — shrink-0 na base]
    </div>
  </div>
</main>
```

### Tamanho do tabuleiro

```ts
// Calcula disponível: altura total - header do back-button (~32px) - padding (48px) - nav+score (56px)
setBoardSize(Math.min(window.innerHeight - 136, 700))
```

### Coluna esquerda

```tsx
<div className="flex shrink-0 items-center gap-3">
  {graphScores.length > 0 && <AdvantageBar scoreCp={currentScore} height={boardSize} />}
  <div className="flex flex-col items-center gap-3">
    <div style={{ width: boardSize, height: boardSize }}>
      <ChessBoard ... />
    </div>
    {/* Controles centralizados */}
    <div className="flex gap-2 justify-center">
      {[⏮, ◀, ▶, ⏭].map(...)}
    </div>
    {/* Score numérico */}
    <span className="text-sm font-bold tabular-nums" style={{ color: currentScore >= 0 ? '#6B8F71' : '#f87171' }}>
      {currentScore >= 0 ? '+' : ''}{(currentScore / 100).toFixed(1)}
    </span>
  </div>
</div>
```

### Coluna direita

```tsx
<div className="flex flex-col gap-3 overflow-hidden" style={{ width: 420, flexShrink: 0, height: '100%' }}>
  {/* 1. Cabeçalho */}
  <div className="shrink-0 ..."> data | bot | cor | resultado | jogadas </div>

  {/* 2. Gráfico */}
  {graphScores.length > 0 && (
    <div className="shrink-0">
      <AdvantageGraph scores={graphScores} currentIndex={currentIndex} onMoveClick={goTo} height={140} />
    </div>
  )}

  {/* 3. Precisão + grid de categorias */}
  {activeResult && <div className="shrink-0"><MoveSummary ... compact /></div>}

  {/* 4. Lista de jogadas — flex-1 */}
  {activeResult && (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
      ...lista...
    </div>
  )}

  {/* 5. Botões fixos no rodapé */}
  <div className="flex shrink-0 flex-col gap-2 mt-auto">
    {/* Re-analisar + PdfExportButton */}
  </div>
</div>
```

### MoveSummary compact — grid 3 colunas

No modo `compact`, substituir o flex-wrap linear por grid 3 colunas, aproveitando os 420px do painel:

```tsx
// Linha de precisão
<div className="flex items-center gap-3 mb-2">
  <span className="text-xs text-neutral-400">Precisão</span>
  <span className="text-sm font-black" style={{ color: '#6B8F71' }}>{accuracy}%</span>
</div>
// Grid 3 colunas
<div className="grid gap-x-2 gap-y-1" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
  {classifications.map(key => (
    <span key={key} className="flex items-center gap-1 text-xs tabular-nums" style={{ color: meta.color }}>
      {meta.emoji} <span className="text-neutral-400">{meta.label}</span> <span className="font-bold">{count}</span>
    </span>
  ))}
</div>
```

---

## 4. Tooltips de categoria — MoveSummary.tsx

No modo **não-compact**, cada linha do grid ganha `Tooltip` do shadcn (igual ao popup de fim de jogo em `game/page.tsx`):

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Envolver o bloco de categorias:
<TooltipProvider delayDuration={300}>
  <div className="flex flex-col gap-y-1 text-[11px]">
    {classifications.map((key) => (
      <Tooltip key={key}>
        <TooltipTrigger asChild>
          <div className="grid cursor-help" style={{ gridTemplateColumns: '20px 1fr 24px' }}>
            <span className="text-center leading-none">{meta.emoji}</span>
            <span style={{ color: meta.color }}>{meta.label}</span>
            <span className="text-right font-bold tabular-nums" style={{ color: meta.color }}>{count}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-48">
          <p className="text-xs">{meta.description}</p>
        </TooltipContent>
      </Tooltip>
    ))}
  </div>
</TooltipProvider>
```

O modo `compact` permanece sem tooltip.

---

## 5. Barra de vantagem mais larga — AdvantageBar.tsx

```tsx
// Antes:
style={{ width: 14, height, border: '1px solid #2a2a2a' }}

// Depois:
style={{ width: 24, height, border: '1px solid #2a2a2a' }}
```

Nenhuma outra mudança no componente.

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `frontend/src/components/review/AdvantageGraph.tsx` | Seção 1: bg, fills, border |
| `frontend/src/components/review/PdfExportButton.tsx` | Seção 2: números no eixo X e acima de flags |
| `frontend/src/app/review/page.tsx` | Seção 3: layout centralizado, painel 420px |
| `frontend/src/components/review/MoveSummary.tsx` | Seções 3+4: grid 3 colunas no compact + tooltips no não-compact |
| `frontend/src/components/review/AdvantageBar.tsx` | Seção 5: width 14→24 |

---

## Sem testes automatizados

Verificação via `npm run build` (zero erros TS) + `npm run lint` + inspeção visual no browser.

## Commit

```
feat(review): polish visual — contraste gráfico, layout centralizado, tooltips, barra larga
```
