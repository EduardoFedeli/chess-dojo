# Spec F — Bot Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear os 7 bots com progressão RPG (Aprendiz→Lendário) e exibir o rating ELO em home, game e review.

**Architecture:** Criar `frontend/src/data/bots.ts` como fonte única de dados dos bots. Adicionar `rating: number` ao tipo `Bot`. Atualizar `page.tsx` para importar de lá. Adicionar lookup por `BotLevel` em `game/page.tsx` e `review/page.tsx` para exibir nome e rating.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, React 19, Tailwind CSS v4.

---

## File Map

| Arquivo | Mudança |
|---|---|
| `frontend/src/types/game.types.ts` | Adicionar `rating: number` ao tipo `Bot` |
| `frontend/src/data/bots.ts` | Criar — fonte única de dados dos bots |
| `frontend/src/app/page.tsx` | Importar de `bots.ts`, adicionar rating nos cards |
| `frontend/src/app/game/page.tsx` | Importar `BOTS`, adicionar header com nome+rating |
| `frontend/src/app/review/page.tsx` | Importar `BOTS`, lookup por ID, rating no cabeçalho |

---

### Task 1: Tipo Bot + arquivo de dados compartilhado

**Files:**
- Modify: `frontend/src/types/game.types.ts`
- Create: `frontend/src/data/bots.ts`

- [ ] **Step 1: Adicionar `rating` ao tipo Bot**

Em `frontend/src/types/game.types.ts`, linha 9–15:

```ts
// ANTES:
export type Bot = {
  id: string
  name: string
  level: BotLevel
  skillLevel: number // 0=filhote | 3=iniciante | 6=amador | 10=intermediario | 14=avancado | 17=guerreiro | 20=mestre
  description: string
}

// DEPOIS:
export type Bot = {
  id: string
  name: string
  level: BotLevel
  skillLevel: number // 0=filhote | 3=iniciante | 6=amador | 10=intermediario | 14=avancado | 17=guerreiro | 20=mestre
  rating: number    // ELO aproximado
  description: string
}
```

- [ ] **Step 2: Criar `frontend/src/data/bots.ts`**

```ts
import type { Bot, BotLevel } from '@/types/game.types'

export const BOTS: Bot[] = [
  { id: 'filhote',       name: 'Aprendiz',  level: 'filhote',       skillLevel: 0,  rating: 600,  description: 'Ainda está aprendendo'       },
  { id: 'iniciante',     name: 'Recruta',   level: 'iniciante',     skillLevel: 3,  rating: 900,  description: 'Perfeito para começar'        },
  { id: 'amador',        name: 'Caçador',   level: 'amador',        skillLevel: 6,  rating: 1200, description: 'Começa a entender o jogo'     },
  { id: 'intermediario', name: 'Cavaleiro', level: 'intermediario', skillLevel: 10, rating: 1500, description: 'Um desafio de verdade'        },
  { id: 'avancado',      name: 'Paladino',  level: 'avancado',      skillLevel: 14, rating: 1800, description: 'Joga com consistência'        },
  { id: 'guerreiro',     name: 'Veterano',  level: 'guerreiro',     skillLevel: 17, rating: 2000, description: 'Poucos erros, muita pressão' },
  { id: 'mestre',        name: 'Lendário',  level: 'mestre',        skillLevel: 20, rating: 2400, description: 'Sem piedade'                 },
]

export const BOT_STARS: Record<BotLevel, number> = {
  filhote:       1,
  iniciante:     2,
  amador:        3,
  intermediario: 4,
  avancado:      5,
  guerreiro:     6,
  mestre:        7,
}

export const BOT_ACCENT: Record<BotLevel, string> = {
  filhote:       '#6B8F71',
  iniciante:     '#4A9E7A',
  amador:        '#C8A84B',
  intermediario: '#EE964B',
  avancado:      '#E06B2B',
  guerreiro:     '#C0392B',
  mestre:        '#813405',
}
```

- [ ] **Step 3: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -15
```

Expected: erros TypeScript em `page.tsx` pois `Bot` agora exige `rating` mas o array local ainda não tem — isso é esperado e será corrigido em Task 2. Qualquer outro erro é bug — corrigir antes de prosseguir.

- [ ] **Step 4: Commit parcial**

```bash
git add frontend/src/types/game.types.ts frontend/src/data/bots.ts
git commit -m "feat(bots): tipo Bot + rating + arquivo de dados compartilhado"
```

---

### Task 2: Home page — importar dados + rating nos cards

**Files:**
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Substituir imports e remover definições locais**

Localizar o topo do arquivo. Atualmente:
```ts
import type { Bot, BotLevel, PieceColor } from '@/types/game.types'

const BOTS: Bot[] = [ ... ]        // linhas 8–16
const BOT_STARS: Record<...> = ... // linhas 18–26
const BOT_ACCENT: Record<...> = ... // linhas 28–36
```

Substituir pela importação do arquivo compartilhado (manter import de `BotLevel` e `PieceColor` pois são usados no componente):

```ts
import type { BotLevel, PieceColor } from '@/types/game.types'
import { BOTS, BOT_STARS, BOT_ACCENT } from '@/data/bots'
```

Remover completamente os blocos `const BOTS`, `const BOT_STARS`, `const BOT_ACCENT` (linhas 8–36).

- [ ] **Step 2: Adicionar rating no card do bot**

No JSX do card, após o bloco `{/* Description */}` (linha ~118–121):

```tsx
{/* Description */}
<span className="text-sm" style={{ color: '#9ca3af' }}>
  {bot.description}
</span>
```

Adicionar logo abaixo:
```tsx
{/* Rating */}
<span className="text-xs font-semibold" style={{ color: accent }}>
  ⚔ {bot.rating} ELO
</span>
```

- [ ] **Step 3: Verificar build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: pode ainda ter erro em `game/page.tsx` se o `SKILL_LEVEL` usa `BotLevel` — mas `page.tsx` em si deve compilar limpo. Qualquer erro originado em `page.tsx` deve ser corrigido agora.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(home): importar bots de data/bots.ts + rating ELO nos cards"
```

---

### Task 3: Game page — header com nome e rating do bot

**Files:**
- Modify: `frontend/src/app/game/page.tsx`

- [ ] **Step 1: Adicionar import de BOTS**

No topo do arquivo, junto aos outros imports:
```ts
import { BOTS } from '@/data/bots'
```

- [ ] **Step 2: Adicionar lookup do bot atual**

Dentro de `GameContent`, após a linha:
```ts
const skillLevel = SKILL_LEVEL[botParam] ?? 2
```

Adicionar:
```ts
const currentBot = BOTS.find(b => b.level === botParam) ?? null
```

- [ ] **Step 3: Atualizar o painel direito**

Localizar o bloco do painel direito (atualmente `<div style={{ width: 280, height: boardSize, flexShrink: 0 }}><MoveHistory moves={moves} /></div>`):

```tsx
{/* ANTES: */}
{/* Coluna direita: painel de histórico — altura igual ao tabuleiro, scroll interno */}
<div style={{ width: 280, height: boardSize, flexShrink: 0 }}>
  <MoveHistory moves={moves} />
</div>

{/* DEPOIS: */}
{/* Coluna direita: bot info + histórico */}
<div className="flex flex-col gap-2" style={{ width: 280, height: boardSize, flexShrink: 0 }}>
  {currentBot && (
    <div className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2">
      <span className="text-sm font-semibold text-white">⚔ {currentBot.name}</span>
      <span className="ml-2 text-xs text-neutral-500">{currentBot.rating} ELO</span>
    </div>
  )}
  <div className="flex-1 min-h-0">
    <MoveHistory moves={moves} />
  </div>
</div>
```

- [ ] **Step 4: Verificar build + lint**

```bash
cd frontend && npm run build 2>&1 | tail -10
cd frontend && npm run lint 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`, zero erros TS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/game/page.tsx
git commit -m "feat(game): header com nome e rating do bot acima do histórico"
```

---

### Task 4: Review page — nome e rating no cabeçalho

**Files:**
- Modify: `frontend/src/app/review/page.tsx`

- [ ] **Step 1: Adicionar import de BOTS**

No topo do arquivo, junto aos outros imports:
```ts
import { BOTS } from '@/data/bots'
```

- [ ] **Step 2: Substituir geração de botName**

Localizar (dentro de `ReviewContent`, após `if (!savedGame) return null`):
```ts
const dateStr = new Date(savedGame.date).toLocaleDateString('pt-BR')
const botName = savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)
```

Substituir por:
```ts
const dateStr   = new Date(savedGame.date).toLocaleDateString('pt-BR')
const reviewBot = BOTS.find(b => b.id === savedGame.botLevel)
const botName   = reviewBot?.name ?? savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)
const botRating = reviewBot?.rating
```

- [ ] **Step 3: Atualizar o span do bot no cabeçalho**

Localizar:
```tsx
<span className="text-xs text-neutral-500">🤖 vs {botName}</span>
```

Substituir por:
```tsx
<span className="text-xs text-neutral-500">
  🤖 vs {botName}{botRating ? ` (${botRating} ELO)` : ''}
</span>
```

- [ ] **Step 4: Verificar build + lint**

```bash
cd frontend && npm run build 2>&1 | tail -10
cd frontend && npm run lint 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`, zero erros novos.

- [ ] **Step 5: Commit + Push**

```bash
git add frontend/src/app/review/page.tsx
git commit -m "feat(review): bot name lookup + rating ELO no cabeçalho"
git push
```
