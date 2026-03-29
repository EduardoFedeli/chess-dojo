# Spec B — UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a fonte Geist por Playfair Display + Inter, corrigir o alinhamento do grid de categorias no popup e adicionar tooltips informativos em cada linha.

**Architecture:** Três mudanças independentes em sequência: (1) troca de fonte via next/font/google + CSS variable; (2) adição do campo `description` em `CLASSIFICATION_META` + instalação do shadcn Tooltip; (3) refatoração do popup para grid 3 colunas + TooltipProvider/Tooltip.

**Tech Stack:** Next.js 16 App Router, next/font/google, shadcn/ui (Tooltip via Radix), Tailwind CSS v4, TypeScript strict

---

## File Structure

**Modified:**
- `frontend/src/app/layout.tsx` — troca Geist por Playfair Display + Inter, expõe variáveis CSS
- `frontend/src/app/globals.css` — adiciona `font-family: var(--font-body)` ao body
- `frontend/src/app/page.tsx` — aplica `--font-display` ao h1
- `frontend/src/utils/move-classifier.ts` — adiciona campo `description` ao tipo e valores de `CLASSIFICATION_META`
- `frontend/src/app/game/page.tsx` — substitui grid do popup por 3 colunas + Tooltip

**Created:**
- `frontend/src/components/ui/tooltip.tsx` — gerado pelo shadcn CLI

---

### Task 1: Trocar fontes em layout.tsx, globals.css e page.tsx

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Substituir Geist por Playfair Display + Inter em layout.tsx**

Substitua o arquivo inteiro `frontend/src/app/layout.tsx` por:

```tsx
import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Adicionar font-family ao body em globals.css**

No bloco `@layer base` de `frontend/src/app/globals.css`, a regra `body` já existe. Adicione `font-family` a ela:

Localize (linhas 131–135 aprox.):
```css
  body {
    @apply text-foreground;
    background: radial-gradient(ellipse at 20% 0%, #1a1208 0%, #0d0d0d 45%, #000000 100%);
    background-attachment: fixed;
    min-height: 100vh;
  }
```

Substitua por:
```css
  body {
    @apply text-foreground;
    background: radial-gradient(ellipse at 20% 0%, #1a1208 0%, #0d0d0d 45%, #000000 100%);
    background-attachment: fixed;
    min-height: 100vh;
    font-family: var(--font-body), sans-serif;
  }
```

- [ ] **Step 3: Aplicar --font-display ao h1 da home em page.tsx**

Em `frontend/src/app/page.tsx`, localize o `<h1>` (linha 43 aprox.):

```tsx
        <h1
          className="text-5xl font-black tracking-tight"
          style={{ color: 'var(--brand-text)' }}
        >
          ♟ Chess Dojo
        </h1>
```

Substitua por:
```tsx
        <h1
          className="text-5xl font-black tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-text)' }}
        >
          ♟ Chess Dojo
        </h1>
```

- [ ] **Step 4: Verificar build e lint**

```bash
cd frontend && npm run build
```
Expected: build passa sem erros de TypeScript ou Next.js.

```bash
cd frontend && npm run lint
```
Expected: sem warnings ou erros.

- [ ] **Step 5: Verificar visualmente**

```bash
cd frontend && npm run dev
```

Abrir `http://localhost:3000` e confirmar:
- O título "♟ Chess Dojo" usa uma fonte serif elegante (Playfair Display)
- O corpo do texto (botões, descrições) usa Inter (sans-serif limpa, diferente da Geist)
- Não há fallback para fonte genérica visível

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/app/layout.tsx src/app/globals.css src/app/page.tsx
git commit -m "feat(font): substituir Geist por Playfair Display + Inter"
```

---

### Task 2: Adicionar descriptions em CLASSIFICATION_META + instalar shadcn Tooltip

**Files:**
- Modify: `frontend/src/utils/move-classifier.ts`
- Create: `frontend/src/components/ui/tooltip.tsx` (via shadcn CLI)

- [ ] **Step 1: Instalar o componente Tooltip via shadcn**

```bash
cd frontend && npx shadcn@latest add tooltip
```

Expected: cria `frontend/src/components/ui/tooltip.tsx` sem erros.

- [ ] **Step 2: Adicionar campo description ao tipo e valores de CLASSIFICATION_META**

Em `frontend/src/utils/move-classifier.ts`, localize o bloco `CLASSIFICATION_META` (linhas 98–109 aprox.):

```ts
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

Substitua por:
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

- [ ] **Step 3: Verificar TypeScript**

```bash
cd frontend && npm run build
```
Expected: build passa. O campo `description` não é usado ainda em nenhum componente, mas o tipo está correto.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/utils/move-classifier.ts src/components/ui/tooltip.tsx
git commit -m "feat(tooltip): instalar shadcn tooltip + descriptions em CLASSIFICATION_META"
```

---

### Task 3: Refatorar popup — grid 3 colunas + TooltipProvider/Tooltip

**Files:**
- Modify: `frontend/src/app/game/page.tsx`

- [ ] **Step 1: Adicionar imports de Tooltip em game/page.tsx**

No bloco de imports de `frontend/src/app/game/page.tsx`, após o import do Dialog (linha 28 aprox.):

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
```

Adicione logo abaixo:
```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
```

- [ ] **Step 2: Substituir o grid de categorias pelo novo grid com Tooltip**

Em `frontend/src/app/game/page.tsx`, localize o bloco "Grid de categorias" (linhas 324–338 aprox.):

```tsx
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
```

Substitua por:
```tsx
                {/* Grid de categorias com tooltip */}
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

- [ ] **Step 3: Verificar TypeScript e lint**

```bash
cd frontend && npm run build
```
Expected: sem erros TypeScript. Todos os imports resolvem.

```bash
cd frontend && npm run lint
```
Expected: sem warnings novos.

- [ ] **Step 4: Verificar visualmente**

```bash
cd frontend && npm run dev
```

Jogar uma partida até o fim e confirmar no popup de resultado:
- Emojis alinhados na coluna esquerda (20px)
- Labels com cor certa na coluna do meio
- Contagens alinhadas à direita (24px) com `tabular-nums`
- Ao passar o mouse sobre qualquer linha, tooltip aparece à esquerda após ~300ms
- Tooltip mostra definição + threshold da categoria

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/app/game/page.tsx
git commit -m "feat(popup): grid 3 colunas + tooltips nas categorias de jogada"
```
