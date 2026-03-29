# Spec D — Mais Bots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand from 3 to 7 bots with distinct skill levels, unique star counts (1–7), and a green→red color palette.

**Architecture:** Four surgical changes — extend the `BotLevel` union type, update the home page data/rendering, update the game page skill map, and copy placeholder avatar PNGs. No new files needed. The spec requires a single commit covering all four changes.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, React 19, Tailwind CSS v4. No automated tests — verification is `npm run build` + `npm run lint`.

---

### Task 1: Extend `BotLevel` type in `game.types.ts`

**Files:**
- Modify: `frontend/src/types/game.types.ts:7-14`

- [ ] **Step 1: Open the file**

Read `frontend/src/types/game.types.ts`. The current content at lines 7–14 is:
```ts
// Nível do bot — nome semântico para a UI; skillLevel é o valor enviado ao Stockfish
export type BotLevel = 'iniciante' | 'guerreiro' | 'mestre'

export type Bot = {
  id: string
  name: string
  level: BotLevel
  skillLevel: number // 2 = iniciante | 10 = guerreiro | 20 = mestre
  description: string
}
```

- [ ] **Step 2: Replace the type and comment**

Replace those lines with:
```ts
// Nível do bot — nome semântico para a UI; skillLevel é o valor enviado ao Stockfish
export type BotLevel = 'filhote' | 'iniciante' | 'amador' | 'intermediario' | 'avancado' | 'guerreiro' | 'mestre'

export type Bot = {
  id: string
  name: string
  level: BotLevel
  skillLevel: number // 0=filhote | 3=iniciante | 6=amador | 10=intermediario | 14=avancado | 17=guerreiro | 20=mestre
  description: string
}
```

- [ ] **Step 3: Verify build still compiles**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: build errors because `BOT_STARS`, `BOT_ACCENT`, and `SKILL_LEVEL` still reference only 3 keys — that is intentional at this stage. The TypeScript error confirms the type is extended and the records need updating (handled in Tasks 2 and 3).

> If the build passes with zero errors here, double-check that strict mode is on and the records are typed as `Record<BotLevel, ...>`.

---

### Task 2: Update home page (`page.tsx`)

**Files:**
- Modify: `frontend/src/app/page.tsx:8-25` (BOTS array, BOT_STARS, BOT_ACCENT)
- Modify: `frontend/src/app/page.tsx:99-103` (stars rendering)

- [ ] **Step 1: Replace `BOTS` array**

Current lines 8–12:
```ts
const BOTS: Bot[] = [
  { id: 'iniciante', name: 'Iniciante', level: 'iniciante', skillLevel: 2,  description: 'Perfeito para aprender'  },
  { id: 'guerreiro', name: 'Guerreiro', level: 'guerreiro', skillLevel: 10, description: 'Um desafio de verdade'   },
  { id: 'mestre',    name: 'Mestre',    level: 'mestre',    skillLevel: 20, description: 'Sem piedade'             },
]
```

Replace with:
```ts
const BOTS: Bot[] = [
  { id: 'filhote',       name: 'Filhote',       level: 'filhote',       skillLevel: 0,  description: 'Ainda está aprendendo'       },
  { id: 'iniciante',     name: 'Iniciante',     level: 'iniciante',     skillLevel: 3,  description: 'Perfeito para começar'        },
  { id: 'amador',        name: 'Amador',        level: 'amador',        skillLevel: 6,  description: 'Começa a entender o jogo'     },
  { id: 'intermediario', name: 'Intermediário', level: 'intermediario', skillLevel: 10, description: 'Um desafio de verdade'        },
  { id: 'avancado',      name: 'Avançado',      level: 'avancado',      skillLevel: 14, description: 'Joga com consistência'        },
  { id: 'guerreiro',     name: 'Guerreiro',     level: 'guerreiro',     skillLevel: 17, description: 'Poucos erros, muita pressão' },
  { id: 'mestre',        name: 'Mestre',        level: 'mestre',        skillLevel: 20, description: 'Sem piedade'                 },
]
```

- [ ] **Step 2: Replace `BOT_STARS`**

Current lines 14–19:
```ts
const BOT_STARS: Record<BotLevel, number> = {
  iniciante: 1,
  guerreiro: 2,
  mestre:    3,
}
```

Replace with:
```ts
const BOT_STARS: Record<BotLevel, number> = {
  filhote:       1,
  iniciante:     2,
  amador:        3,
  intermediario: 4,
  avancado:      5,
  guerreiro:     6,
  mestre:        7,
}
```

- [ ] **Step 3: Replace `BOT_ACCENT`**

Current lines 21–25:
```ts
const BOT_ACCENT: Record<BotLevel, string> = {
  iniciante: '#6B8F71',
  guerreiro: '#EE964B',
  mestre:    '#813405',
}
```

Replace with:
```ts
const BOT_ACCENT: Record<BotLevel, string> = {
  filhote:       '#6B8F71',
  iniciante:     '#4A9E7A',
  amador:        '#C8A84B',
  intermediario: '#EE964B',
  avancado:      '#E06B2B',
  guerreiro:     '#C0392B',
  mestre:        '#813405',
}
```

- [ ] **Step 4: Update stars rendering**

Find this block (around line 99):
```tsx
{[1, 2, 3].map((n) => (
  <span key={n} style={{ color: n <= stars ? '#EE964B' : '#374151', fontSize: 14 }}>
    ★
  </span>
))}
```

Replace with:
```tsx
{[1, 2, 3, 4, 5, 6, 7].map((n) => (
  <span key={n} style={{ color: n <= stars ? '#EE964B' : '#374151', fontSize: 11 }}>
    ★
  </span>
))}
```

Note: `fontSize` drops from 14 → 11 so 7 stars fit in the card without widening it.

- [ ] **Step 5: Verify build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: still fails on `SKILL_LEVEL` in `game/page.tsx` (Task 3 not done yet). Any other error here is a bug — fix before proceeding.

---

### Task 3: Update `SKILL_LEVEL` in `game/page.tsx`

**Files:**
- Modify: `frontend/src/app/game/page.tsx:37-41`

- [ ] **Step 1: Replace `SKILL_LEVEL`**

Current lines 37–41:
```ts
const SKILL_LEVEL: Record<BotLevel, number> = {
  iniciante: 2,
  guerreiro: 10,
  mestre: 20,
}
```

Replace with:
```ts
const SKILL_LEVEL: Record<BotLevel, number> = {
  filhote:       0,
  iniciante:     3,
  amador:        6,
  intermediario: 10,
  avancado:      14,
  guerreiro:     17,
  mestre:        20,
}
```

- [ ] **Step 2: Verify clean build**

```bash
cd frontend && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with zero TypeScript errors. If there are errors, read the full output and fix them.

- [ ] **Step 3: Verify lint**

```bash
cd frontend && npm run lint 2>&1 | tail -20
```

Expected: `✔ No ESLint warnings or errors`.

---

### Task 4: Copy placeholder avatar PNGs

**Files:**
- Create (copy): `frontend/public/bots/filhote.png`
- Create (copy): `frontend/public/bots/amador.png`
- Create (copy): `frontend/public/bots/intermediario.png`
- Create (copy): `frontend/public/bots/avancado.png`

The user will replace these with real assets later. Until then, re-use existing bot images as placeholders.

- [ ] **Step 1: Check existing files**

```bash
ls frontend/public/bots/
```

Expected: `guerreiro.png  iniciante.png  mestre.png` (the three original files).

- [ ] **Step 2: Copy placeholders**

```bash
cp frontend/public/bots/iniciante.png frontend/public/bots/filhote.png
cp frontend/public/bots/iniciante.png frontend/public/bots/amador.png
cp frontend/public/bots/guerreiro.png frontend/public/bots/intermediario.png
cp frontend/public/bots/guerreiro.png frontend/public/bots/avancado.png
```

- [ ] **Step 3: Verify all 7 files exist**

```bash
ls frontend/public/bots/
```

Expected: `amador.png  avancado.png  filhote.png  guerreiro.png  iniciante.png  intermediario.png  mestre.png`

---

### Task 5: Commit

- [ ] **Step 1: Final build + lint check**

```bash
cd frontend && npm run build 2>&1 | tail -5 && npm run lint 2>&1 | tail -5
```

Expected: clean build and zero lint warnings.

- [ ] **Step 2: Stage all changed files**

```bash
git add frontend/src/types/game.types.ts \
        frontend/src/app/page.tsx \
        frontend/src/app/game/page.tsx \
        frontend/public/bots/filhote.png \
        frontend/public/bots/amador.png \
        frontend/public/bots/intermediario.png \
        frontend/public/bots/avancado.png
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(bots): expand de 3 para 7 bots com skill levels e paleta verde→vermelho"
```

- [ ] **Step 4: Push**

```bash
git push
```
