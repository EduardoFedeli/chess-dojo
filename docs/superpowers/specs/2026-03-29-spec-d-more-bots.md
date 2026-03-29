# Spec D — Mais Bots com Dificuldades Distintas

**Date:** 2026-03-29
**Status:** Approved

## Overview

Expandir de 3 para 7 bots com skill levels distintos, estrelas de 1 a 7 (um número único por bot) e uma paleta de cores que vai de verde para vermelho indicando progressão de dificuldade. Avatares placeholder são copiados dos existentes e trocados pelo usuário quando tiver os assets.

---

## Os 7 Bots

| id | name | skillLevel | estrelas | accent | description |
|----|------|-----------|---------|--------|-------------|
| filhote | Filhote | 0 | 1 | `#6B8F71` | Ainda está aprendendo |
| iniciante | Iniciante | 3 | 2 | `#4A9E7A` | Perfeito para começar |
| amador | Amador | 6 | 3 | `#C8A84B` | Começa a entender o jogo |
| intermediario | Intermediário | 10 | 4 | `#EE964B` | Um desafio de verdade |
| avancado | Avançado | 14 | 5 | `#E06B2B` | Joga com consistência |
| guerreiro | Guerreiro | 17 | 6 | `#C0392B` | Poucos erros, muita pressão |
| mestre | Mestre | 20 | 7 | `#813405` | Sem piedade |

A progressão de cores (verde → dourado → laranja → vermelho) reforça visualmente o aumento de dificuldade junto com as estrelas únicas.

---

## Item 1 — Tipo `BotLevel` em `game.types.ts`

**Arquivo:** `frontend/src/types/game.types.ts`

```ts
export type BotLevel = 'filhote' | 'iniciante' | 'amador' | 'intermediario' | 'avancado' | 'guerreiro' | 'mestre'
```

O comentário do `skillLevel` no tipo `Bot` deve ser atualizado:
```ts
  skillLevel: number // 0=filhote | 3=iniciante | 6=amador | 10=intermediario | 14=avancado | 17=guerreiro | 20=mestre
```

---

## Item 2 — Home page (`page.tsx`)

**Arquivo:** `frontend/src/app/page.tsx`

### Array `BOTS`

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

### `BOT_STARS`

Estrelas de 1 a 7 (valor único por bot):
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

### `BOT_ACCENT`

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

### Stars rendering

O JSX atual renderiza 3 estrelas com `[1, 2, 3].map(...)`. Atualizar para 7:

```tsx
{[1, 2, 3, 4, 5, 6, 7].map((n) => (
  <span key={n} style={{ color: n <= stars ? '#EE964B' : '#374151', fontSize: 11 }}>
    ★
  </span>
))}
```

> `fontSize` reduzido de 14 para 11 para caber 7 estrelas no card sem aumentar a largura.

---

## Item 3 — Game page (`game/page.tsx`)

**Arquivo:** `frontend/src/app/game/page.tsx`

### `SKILL_LEVEL`

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

---

## Item 4 — Avatares placeholder

**Diretório:** `frontend/public/bots/`

Copiar arquivos existentes para criar os placeholders:
- `filhote.png` → copiar de `iniciante.png`
- `amador.png` → copiar de `iniciante.png`
- `intermediario.png` → copiar de `guerreiro.png`
- `avancado.png` → copiar de `guerreiro.png`

O usuário substituirá esses arquivos pelos avatares reais quando tiver os assets.

---

## Constraints

- `useStockfish.ts`: não modificado — recebe `skillLevel: number` via prop, agnóstico ao tipo `BotLevel`
- `useGame.ts`: não modificado
- `storage.service.ts`: não modificado
- `review/page.tsx`: não modificado — usa `botLevel` como `string` (campo de `SavedGame`), sem dependência de `BotLevel` type
- Sem mudanças no número de estrelas por cor — a cor do ★ preenchido permanece `#EE964B`
- Um único commit
