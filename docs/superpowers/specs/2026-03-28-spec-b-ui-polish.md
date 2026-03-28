# Spec B — UI Polish: Fonte + Popup

**Date:** 2026-03-28
**Status:** Approved

## Overview

Duas melhorias visuais independentes: troca de fonte para dar personalidade ao site, e refinamento do popup de resultado com alinhamento correto e tooltips informativos nas categorias de jogada.

---

## Item 1 — Fonte: Playfair Display + Inter

**Objetivo:** substituir a fonte padrão Geist (genérica) por uma combinação elegante que remete ao xadrez clássico.

**Escolha:**
- **Playfair Display** (serif elegante) → títulos de display
- **Inter** (sans-serif limpa) → corpo de texto em todo o app

**Arquivos modificados:**

### `frontend/src/app/layout.tsx`
- Remover `Geist` e `Geist_Mono`
- Importar `Playfair_Display` e `Inter` de `next/font/google`
- Expor como variáveis CSS `--font-display` e `--font-body`
- Atualizar `metadata.title` e `metadata.description` para valores do projeto

```ts
import { Playfair_Display, Inter } from 'next/font/google'

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Chess Dojo',
  description: 'Jogue xadrez contra bots e melhore sua precisão.',
}
```

HTML className: `${playfair.variable} ${inter.variable} h-full antialiased`

### `frontend/src/app/globals.css`
Adicionar ao início do arquivo (após os imports existentes):
```css
body {
  font-family: var(--font-body), sans-serif;
}
```

### `frontend/src/app/page.tsx`
Aplicar `--font-display` ao `h1` da home:
```tsx
<h1
  className="text-5xl font-black tracking-tight"
  style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-text)' }}
>
  ♟ Chess Dojo
</h1>
```

> Nenhuma outra ocorrência de título no app precisa de Playfair — a fonte elegante aparece apenas no display principal da home. Todo o restante herda Inter via `body`.

---

## Item 2 — Alinhamento do popup de resultado

**Problema:** o grid atual usa `gridTemplateColumns: '1fr auto'`, colocando emoji e label na mesma célula. Emojis de largura variável causam desalinhamento visual dos labels.

**Solução:** grid de 3 colunas fixas.

**Arquivo:** `frontend/src/app/game/page.tsx`

```tsx
// Antes
<div className="grid gap-x-4 gap-y-0.5 text-xs" style={{ gridTemplateColumns: '1fr auto' }}>
  <span style={{ color: meta.color }}>{meta.emoji} {meta.label}</span>
  <span className="text-right font-bold" style={{ color: meta.color }}>{count}</span>
</div>

// Depois
<div className="grid gap-y-1 text-xs" style={{ gridTemplateColumns: '20px 1fr 24px' }}>
  <span className="text-center leading-none">{meta.emoji}</span>
  <span style={{ color: meta.color }}>{meta.label}</span>
  <span className="text-right font-bold tabular-nums" style={{ color: meta.color }}>{count}</span>
</div>
```

- Coluna 1 (20px): emoji centralizado
- Coluna 2 (1fr): label com cor da categoria
- Coluna 3 (24px): contagem com `tabular-nums` para não variar largura entre 0–99

O `<div className="contents">` wrapper que existia é removido — as três células ficam direto no grid pai.

---

## Item 3 — Tooltip de categoria

**Objetivo:** ao passar o mouse sobre qualquer linha de categoria no popup, exibir definição + threshold técnico.

### `frontend/src/utils/move-classifier.ts`

Adicionar campo `description: string` ao tipo de `CLASSIFICATION_META` e preencher cada entrada:

```ts
export const CLASSIFICATION_META: Record<
  MoveClassification,
  { label: string; emoji: string; color: string; description: string }
> = {
  brilliant:  { label: 'Brilhante',      emoji: '🌟', color: '#a78bfa', description: 'Lance sacrificial extraordinário. Perda ≤ 0cp com sacrifício detectado.' },
  excellent:  { label: 'Excelente',      emoji: '✨', color: '#34d399', description: 'Melhor ou quase melhor lance disponível. Perda ≤ 10cp.' },
  good:       { label: 'Boa',            emoji: '✅', color: '#6B8F71', description: 'Jogada sólida e confiável. Perda ≤ 25cp.' },
  inaccuracy: { label: 'Imprecisão',     emoji: '⚠️', color: '#9ca3af', description: 'Imprecisão leve — existia algo melhor. Perda 25–100cp.' },
  mistake:    { label: 'Erro',           emoji: '❌', color: '#EE964B', description: 'Erro claro que piora a posição. Perda 100–300cp.' },
  missed_win: { label: 'Chance Perdida', emoji: '🎯', color: '#f87171', description: 'Havia uma vitória disponível e foi desperdiçada. Perda > 150cp com vantagem prévia.' },
  blunder:    { label: 'Capivarada',     emoji: '💀', color: '#ef4444', description: 'Erro grave que entrega vantagem decisiva. Perda > 300cp.' },
}
```

### `frontend/src/components/ui/tooltip.tsx`

Instalar via shadcn:
```bash
cd frontend && npx shadcn@latest add tooltip
```

### `frontend/src/app/game/page.tsx`

Importar e usar `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` de `@/components/ui/tooltip`.

Envolver o grid de categorias com `<TooltipProvider>`. Cada linha vira um `<Tooltip>`:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// No JSX do popup (substituindo o grid atual):
<TooltipProvider delayDuration={300}>
  <div className="w-full rounded-xl bg-neutral-800 px-4 py-3">
    <div className="flex flex-col gap-y-1 text-xs">
      {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
        const meta  = CLASSIFICATION_META[key]
        const count = evaluations.filter(e => e.classification === key).length
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div
                className="grid cursor-help"
                style={{ gridTemplateColumns: '20px 1fr 24px' }}
              >
                <span className="text-center leading-none">{meta.emoji}</span>
                <span style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-right font-bold tabular-nums" style={{ color: meta.color }}>{count}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-48">
              <p className="text-xs">{meta.description}</p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  </div>
</TooltipProvider>
```

> `delayDuration={300}` evita tooltip disparar ao rolar o mouse rapidamente pela lista.

---

## Constraints

- `useGame.ts`: não modificado
- `useStockfish.ts`: não modificado
- `storage.service.ts`: não modificado
- Sem alterações em `review/page.tsx` — o popup de resultado existe só em `game/page.tsx`
- Um commit por item
