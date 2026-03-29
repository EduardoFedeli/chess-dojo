# UI v1.0 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar o layout de bots para grid 3×2 + Mago Ancião, atualizar cores de Caçador/Cavaleiro, e adicionar sistema global de toggle de fundo (imagem vs gradiente).

**Architecture:** `BackgroundProvider` no layout raiz aplica `data-bg` no `<body>` via CSS; `globals.css` define os dois modos via seletores de atributo. O grid de bots usa CSS Grid com 4 colunas, o Mago Ancião ocupa a coluna 4 em `grid-row: 1 / 3`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, `next/image`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `frontend/src/data/bots.ts` | Modificar | Atualizar `BOT_ACCENT` Caçador e Cavaleiro |
| `frontend/src/contexts/BackgroundContext.tsx` | Criar | Context + Provider + estado do fundo |
| `frontend/src/components/ui/BackgroundToggle.tsx` | Criar | Botão fixo no canto inferior direito |
| `frontend/src/app/globals.css` | Modificar | Seletores `body[data-bg]` para os dois modos |
| `frontend/src/app/layout.tsx` | Modificar | Envolver `{children}` com `BackgroundProvider` |
| `frontend/src/app/game/page.tsx` | Modificar | Remover inline background do `<main>` |
| `frontend/src/app/review/page.tsx` | Modificar | Remover inline background do `<main>` |
| `frontend/src/app/page.tsx` | Modificar | Novo grid CSS + redesign dos cards |

---

## Task 1: Atualizar cores dos bots

**Files:**
- Modify: `frontend/src/data/bots.ts`

- [ ] **Step 1: Atualizar `BOT_ACCENT` em `bots.ts`**

Substituir as entradas `amador` e `intermediario`:

```ts
export const BOT_ACCENT: Record<BotLevel, string> = {
  filhote:       '#6B8F71',
  iniciante:     '#4A9E7A',
  amador:        '#228B22',   // era #C8A84B
  intermediario: '#c8a84b',   // era #EE964B
  avancado:      '#E06B2B',
  guerreiro:     '#C0392B',
  mestre:        '#0047AB',
}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npm run build
```

Expected: zero erros de TypeScript/lint.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/data/bots.ts
git commit -m "feat(bots): atualizar cores Caçador (#228B22) e Cavaleiro (#c8a84b)"
```

---

## Task 2: Criar BackgroundToggle component

**Files:**
- Create: `frontend/src/components/ui/BackgroundToggle.tsx`

> Criamos o Toggle antes do Context para evitar referência circular — o Context importará o Toggle.

- [ ] **Step 1: Criar o arquivo**

```tsx
'use client'

// Importação lazy do context para evitar problema de inicialização circular.
// O context renderiza este componente, e este consome o context.
import { useBackground } from '@/contexts/BackgroundContext'

export function BackgroundToggle() {
  const { bgMode, toggleBg } = useBackground()

  return (
    <button
      onClick={toggleBg}
      title={bgMode === 'gradient' ? 'Mudar para fundo de imagem' : 'Mudar para gradiente escuro'}
      aria-label={bgMode === 'gradient' ? 'Mudar para fundo de imagem' : 'Mudar para gradiente escuro'}
      style={{
        position:     'fixed',
        bottom:       20,
        right:        20,
        zIndex:       50,
        background:   '#111111',
        border:       '1px solid #2a2a2a',
        borderRadius: '10px',
        padding:      '8px 10px',
        fontSize:     '18px',
        cursor:       'pointer',
        lineHeight:   1,
        transition:   'border-color 0.2s',
      }}
      className="hover:border-neutral-500"
    >
      {bgMode === 'gradient' ? '🌄' : '🌫️'}
    </button>
  )
}
```

---

## Task 3: Criar BackgroundContext

**Files:**
- Create: `frontend/src/contexts/BackgroundContext.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { BackgroundToggle } from '@/components/ui/BackgroundToggle'

type BgMode = 'gradient' | 'image'

const STORAGE_KEY = 'chess-dojo:bg-mode'

interface BackgroundContextValue {
  bgMode: BgMode
  toggleBg: () => void
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null)

export function useBackground() {
  const ctx = useContext(BackgroundContext)
  if (!ctx) throw new Error('useBackground must be used within BackgroundProvider')
  return ctx
}

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [bgMode, setBgMode] = useState<BgMode>(() => {
    if (typeof window === 'undefined') return 'gradient'
    return (localStorage.getItem(STORAGE_KEY) as BgMode) ?? 'gradient'
  })

  useEffect(() => {
    document.body.setAttribute('data-bg', bgMode)
    localStorage.setItem(STORAGE_KEY, bgMode)
  }, [bgMode])

  function toggleBg() {
    setBgMode(prev => prev === 'gradient' ? 'image' : 'gradient')
  }

  return (
    <BackgroundContext.Provider value={{ bgMode, toggleBg }}>
      {children}
      <BackgroundToggle />
    </BackgroundContext.Provider>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npm run build
```

Expected: zero erros. Os arquivos existem mas ainda não estão conectados ao layout.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/contexts/BackgroundContext.tsx src/components/ui/BackgroundToggle.tsx
git commit -m "feat(background): criar BackgroundContext e BackgroundToggle"
```

---

## Task 4: Atualizar globals.css

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Substituir o background do `body` em `globals.css`**

Localizar este bloco (linhas 126–140):

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply text-foreground;
    background: radial-gradient(ellipse at 20% 0%, #1a1208 0%, #0d0d0d 45%, #000000 100%);
    background-attachment: fixed;
    min-height: 100vh;
    font-family: var(--font-body), sans-serif;
  }
  html {
    @apply font-sans;
  }
}
```

Substituir por:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply text-foreground;
    min-height: 100vh;
    font-family: var(--font-body), sans-serif;
  }
  /* Gradiente padrão — ativo quando data-bg="gradient" ou antes do JS hidratar */
  body[data-bg="gradient"],
  body:not([data-bg]) {
    background: radial-gradient(ellipse at 20% 0%, #1a1208 0%, #0d0d0d 45%, #000000 100%);
    background-attachment: fixed;
  }
  /* Fundo de imagem */
  body[data-bg="image"] {
    background-image: url('/bots/FundoPC.png');
    background-size: cover;
    background-attachment: fixed;
    background-position: center;
  }
  html {
    @apply font-sans;
  }
}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npm run build
```

Expected: zero erros.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/app/globals.css
git commit -m "feat(background): adicionar seletores data-bg ao globals.css"
```

---

## Task 5: Integrar BackgroundProvider no layout

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Atualizar `layout.tsx`**

Conteúdo completo do arquivo:

```tsx
import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { BackgroundProvider } from '@/contexts/BackgroundContext'
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
  title: 'Chess Guild',
  description: 'Evolua no xadrez com progressão RPG. Jogue contra bots, analise suas partidas e suba de nível.',
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
      <body className="min-h-full flex flex-col">
        <BackgroundProvider>
          {children}
        </BackgroundProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npm run build
```

Expected: zero erros. O toggle já deve aparecer em todas as páginas.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add src/app/layout.tsx
git commit -m "feat(background): integrar BackgroundProvider no layout raiz"
```

---

## Task 6: Remover inline backgrounds de game e review

**Files:**
- Modify: `frontend/src/app/game/page.tsx:209`
- Modify: `frontend/src/app/review/page.tsx:169`

- [ ] **Step 1: Remover background inline de `game/page.tsx`**

Localizar o `<main>` na linha ~209:

```tsx
<main
  className="relative flex h-screen overflow-hidden items-center justify-center p-4"
  style={{ background: 'radial-gradient(ellipse at center, #000000 0%, #0d1a0f 100%)' }}
>
```

Substituir por (remover o `style`):

```tsx
<main
  className="relative flex h-screen overflow-hidden items-center justify-center p-4"
>
```

- [ ] **Step 2: Remover background inline de `review/page.tsx`**

Localizar o `<main>` na linha ~169:

```tsx
<main
  className="overflow-hidden"
  style={{
    height: '100vh',
    color: '#e5e7eb',
    background: 'radial-gradient(ellipse at center, #000000 0%, #0d1a0f 100%)',
  }}
>
```

Substituir por (remover apenas a linha `background`, manter `height` e `color`):

```tsx
<main
  className="overflow-hidden"
  style={{
    height: '100vh',
    color: '#e5e7eb',
  }}
>
```

- [ ] **Step 3: Verificar build**

```bash
cd frontend && npm run build
```

Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/app/game/page.tsx src/app/review/page.tsx
git commit -m "feat(background): remover inline backgrounds de game e review"
```

---

## Task 7: Redesign do grid de bots na home

**Files:**
- Modify: `frontend/src/app/page.tsx`

Esta task substitui **apenas** a seção de cards de bots. O restante da página (header, color picker, CTA) permanece intacto.

- [ ] **Step 1: Substituir a seção de cards em `page.tsx`**

Localizar este bloco (linha ~38):

```tsx
{/* Bot cards */}
<div className="flex flex-col gap-4 sm:flex-row">
  {BOTS.map((bot) => {
    ...
  })}
</div>
```

Substituir por:

```tsx
{/* Bot cards — grid 3×2 + Mago Ancião */}
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 220px) 260px',
    gridTemplateRows: 'repeat(2, 1fr)',
    gap: '16px',
  }}
>
  {/* Cards regulares: primeiros 6 bots */}
  {BOTS.filter(bot => bot.level !== 'mestre').map((bot, index) => {
    const isSelected = selectedBot === bot.level
    const accent     = BOT_ACCENT[bot.level]
    const stars      = BOT_STARS[bot.level]
    return (
      <button
        key={bot.id}
        onClick={() => setSelectedBot(bot.level)}
        style={{
          backgroundColor: '#000000',
          borderColor:     isSelected ? accent : 'transparent',
          boxShadow:       isSelected ? `0 0 0 1px ${accent}, 0 0 20px ${accent}33` : undefined,
          outline: 'none',
        }}
        className="relative flex flex-col items-center gap-3 rounded-2xl border-2 pb-4 pt-0 text-center transition-all hover:border-neutral-600"
      >
        {/* Stripe colorida no topo */}
        <div style={{ height: 3, background: accent, width: '100%', borderRadius: '12px 12px 0 0', flexShrink: 0 }} />

        {/* Badge de rank */}
        <div
          className="absolute top-2 right-3 text-[9px] font-bold tracking-widest"
          style={{ color: accent, opacity: 0.65 }}
        >
          {['I','II','III','IV','V','VI'][index]}
        </div>

        {/* Avatar */}
        <div className="overflow-hidden rounded-xl" style={{ width: 160, height: 160, background: '#000' }}>
          <Image
            src={`/bots/${bot.image}`}
            alt={bot.name}
            width={160}
            height={160}
            className="object-contain"
          />
        </div>

        {/* Nome */}
        <span
          className="text-sm font-bold tracking-wide leading-tight"
          style={{ color: isSelected ? accent : 'var(--brand-text)' }}
        >
          {bot.name}
        </span>

        {/* Estrelas */}
        <div className="flex gap-0.5">
          {[1,2,3,4,5,6,7].map(n => (
            <span key={n} style={{ color: n <= stars ? '#EE964B' : '#374151', fontSize: 10 }}>★</span>
          ))}
        </div>

        {/* Descrição */}
        <span className="text-xs" style={{ color: '#9ca3af' }}>{bot.description}</span>

        {/* ELO */}
        <span className="text-xs font-semibold" style={{ color: accent }}>
          ⚔ {bot.rating} ELO
        </span>
      </button>
    )
  })}

  {/* Card especial: Mago Ancião — coluna 4, linhas 1-2 */}
  {(() => {
    const mago      = BOTS.find(b => b.level === 'mestre')!
    const isSelected = selectedBot === 'mestre'
    return (
      <button
        key={mago.id}
        onClick={() => setSelectedBot('mestre')}
        style={{
          gridColumn:      '4',
          gridRow:         '1 / 3',
          backgroundColor: '#000000',
          borderColor:     '#0047AB',
          boxShadow: isSelected
            ? '0 0 0 1px #0047AB, 0 0 30px #0047AB66, 0 0 80px #0047AB22, inset 0 0 40px #0047AB08'
            : '0 0 30px #0047AB44, 0 0 60px #0047AB11',
          outline: 'none',
        }}
        className="relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 px-4 py-6 text-center transition-all overflow-hidden"
      >
        {/* Efeito de névoa cósmica */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(1px 1px at 20% 15%, #ffffff44 0%, transparent 100%),
              radial-gradient(1px 1px at 65% 8%,  #ffffff33 0%, transparent 100%),
              radial-gradient(1px 1px at 45% 40%, #0047AB55 0%, transparent 100%),
              radial-gradient(1px 1px at 80% 60%, #ffffff22 0%, transparent 100%),
              radial-gradient(1px 1px at 10% 70%, #ffffff33 0%, transparent 100%),
              radial-gradient(150px 120px at 50% 30%, #0047AB0a 0%, transparent 100%)
            `,
          }}
        />

        {/* Badge de rank */}
        <div
          className="absolute top-3 right-4 text-[10px] font-bold tracking-widest z-10"
          style={{ color: '#0047AB', opacity: 0.8 }}
        >
          VII
        </div>

        {/* Avatar */}
        <div className="relative z-10 overflow-hidden rounded-xl" style={{ width: 200, height: 200, background: '#000', boxShadow: '0 0 24px #0047AB44' }}>
          <Image
            src={`/bots/${mago.image}`}
            alt={mago.name}
            width={200}
            height={200}
            className="object-contain"
          />
        </div>

        {/* Nome */}
        <span
          className="relative z-10 text-xl font-black tracking-widest"
          style={{ color: '#0047AB', textShadow: '0 0 20px #0047AB88' }}
        >
          {mago.name}
        </span>

        {/* Linha divisória */}
        <div
          className="relative z-10 w-4/5"
          style={{ height: 1, background: 'linear-gradient(90deg, transparent, #0047AB66, transparent)' }}
        />

        {/* Estrelas */}
        <div className="relative z-10 flex gap-0.5">
          {[1,2,3,4,5,6,7].map(n => (
            <span key={n} style={{ color: '#0047AB', fontSize: 14 }}>★</span>
          ))}
        </div>

        {/* Descrição */}
        <span className="relative z-10 text-xs tracking-wide" style={{ color: '#4B7BBE' }}>
          {mago.description}
        </span>

        {/* ELO especial */}
        <span
          className="relative z-10 w-4/5 border-t pt-3 text-base font-black"
          style={{
            color:       '#0047AB',
            letterSpacing: '3px',
            textShadow:  '0 0 16px #0047ABCC',
            borderColor: '#0047AB33',
          }}
        >
          ⚔ ELO ??????
        </span>
      </button>
    )
  })()}
</div>
```

- [ ] **Step 2: Verificar build**

```bash
cd frontend && npm run build
```

Expected: zero erros de TypeScript e lint.

- [ ] **Step 3: Verificar visualmente**

```bash
cd frontend && npm run dev
```

Abrir `http://localhost:3000` e conferir:
- Grid 3×2 com Mago Ancião na coluna direita cobrindo as 2 linhas
- Caçador com borda/ELO em verde `#228B22`
- Cavaleiro com borda/ELO em bronze `#c8a84b`
- Cards em fundo preto
- Botão 🌫️ / 🌄 fixo no canto inferior direito
- Toggle funciona e persiste após recarregar a página
- Fundo correto em `/game` e `/review`

- [ ] **Step 4: Commit**

```bash
cd frontend && git add src/app/page.tsx
git commit -m "feat(home): grid 3x2 + card especial Mago Ancião"
```

- [ ] **Step 5: Push**

```bash
git push
```
