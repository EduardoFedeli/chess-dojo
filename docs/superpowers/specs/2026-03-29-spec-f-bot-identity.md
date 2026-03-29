# Spec F — Bot Identity (Nomes RPG + Rating ELO)

## Objetivo

Renomear todos os 7 bots com uma progressão de RPG clássico e exibir o rating ELO de cada bot em três telas: home, partida e revisão.

---

## Dados dos bots

### Nomes e ratings

| ID (interno, imutável) | Nome exibido | Skill | Rating | Estrelas | Accent |
|---|---|---|---|---|---|
| filhote | Aprendiz | 0 | 600 | 1★ | #6B8F71 |
| iniciante | Recruta | 3 | 900 | 2★ | #4A9E7A |
| amador | Caçador | 6 | 1200 | 3★ | #C8A84B |
| intermediario | Cavaleiro | 10 | 1500 | 4★ | #EE964B |
| avancado | Paladino | 14 | 1800 | 5★ | #E06B2B |
| guerreiro | Veterano | 17 | 2000 | 6★ | #C0392B |
| mestre | Lendário | 20 | 2400 | 7★ | #813405 |

Os IDs internos **não mudam** — são usados em URLs, localStorage e no tipo `BotLevel`. Apenas o campo `name` e o novo campo `rating` mudam.

### Arquivo compartilhado — `frontend/src/data/bots.ts` (novo)

Centraliza a definição dos bots para que `page.tsx`, `game/page.tsx` e `review/page.tsx` não dupliquem dados.

```ts
import type { Bot } from '@/types/game.types'

export const BOTS: Bot[] = [
  { id: 'filhote',       name: 'Aprendiz',   level: 'filhote',       skillLevel: 0,  rating: 600,  description: 'Ainda está aprendendo'       },
  { id: 'iniciante',     name: 'Recruta',     level: 'iniciante',     skillLevel: 3,  rating: 900,  description: 'Perfeito para começar'        },
  { id: 'amador',        name: 'Caçador',     level: 'amador',        skillLevel: 6,  rating: 1200, description: 'Começa a entender o jogo'     },
  { id: 'intermediario', name: 'Cavaleiro',   level: 'intermediario', skillLevel: 10, rating: 1500, description: 'Um desafio de verdade'        },
  { id: 'avancado',      name: 'Paladino',    level: 'avancado',      skillLevel: 14, rating: 1800, description: 'Joga com consistência'        },
  { id: 'guerreiro',     name: 'Veterano',    level: 'guerreiro',     skillLevel: 17, rating: 2000, description: 'Poucos erros, muita pressão' },
  { id: 'mestre',        name: 'Lendário',    level: 'mestre',        skillLevel: 20, rating: 2400, description: 'Sem piedade'                 },
]

export const BOT_STARS: Record<string, number> = {
  filhote: 1, iniciante: 2, amador: 3, intermediario: 4,
  avancado: 5, guerreiro: 6, mestre: 7,
}

export const BOT_ACCENT: Record<string, string> = {
  filhote:       '#6B8F71',
  iniciante:     '#4A9E7A',
  amador:        '#C8A84B',
  intermediario: '#EE964B',
  avancado:      '#E06B2B',
  guerreiro:     '#C0392B',
  mestre:        '#813405',
}
```

---

## Tipo `Bot` — `game.types.ts`

Adicionar campo `rating`:

```ts
export type Bot = {
  id: string
  name: string
  level: BotLevel
  skillLevel: number
  rating: number   // ← novo
  description: string
}
```

---

## Home page — `page.tsx`

- Remover a definição local de `BOTS`, `BOT_STARS`, `BOT_ACCENT`
- Importar de `@/data/bots`
- No card de cada bot, adicionar abaixo da `description`:

```tsx
<p className="text-xs mt-1" style={{ color: accent }}>⚔ {bot.rating} ELO</p>
```

---

## Game page — `game/page.tsx`

- Importar `BOTS` de `@/data/bots`
- Fazer lookup do bot atual: `const currentBot = BOTS.find(b => b.level === botParam)`
- Adicionar header acima do `MoveHistory`:

O wrapper do painel direito precisa virar `flex-col` para acomodar o header sem cortar o `MoveHistory`:

```tsx
{/* wrapper atual: <div style={{ width: 280, height: boardSize, flexShrink: 0 }}> */}
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

`MoveHistory` fica dentro de um `flex-1 min-h-0` para continuar ocupando o espaço restante com scroll interno.

---

## Review page — `review/page.tsx`

- Importar `BOTS` de `@/data/bots`
- Substituir a geração de `botName`:

```ts
// ANTES:
const botName = savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)

// DEPOIS:
const reviewBot  = BOTS.find(b => b.id === savedGame.botLevel)
const botName    = reviewBot?.name ?? savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)
const botRating  = reviewBot?.rating
```

- No cabeçalho da revisão, substituir `🤖 vs {botName}` por:

```tsx
<span className="text-xs text-neutral-500">
  🤖 vs {botName}{botRating ? ` (${botRating} ELO)` : ''}
</span>
```

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `frontend/src/types/game.types.ts` | Adicionar `rating: number` ao tipo `Bot` |
| `frontend/src/data/bots.ts` | Novo — fonte única de dados dos bots |
| `frontend/src/app/page.tsx` | Importar de `bots.ts`, mostrar rating no card |
| `frontend/src/app/game/page.tsx` | Importar `BOTS`, header com nome + rating acima de MoveHistory |
| `frontend/src/app/review/page.tsx` | Lookup por ID, mostrar rating no cabeçalho |

---

## Verificação

```bash
cd frontend && npm run build   # zero erros TypeScript
cd frontend && npm run lint    # zero erros novos
```

## Commit

```
feat(bots): nomes RPG + rating ELO — Aprendiz→Lendário, exibição em home/game/review
```
