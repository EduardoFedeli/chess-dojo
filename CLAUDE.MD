# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Arquitetura

Aplicação 100% client-side de xadrez contra bots powered by Stockfish WebAssembly. Sem backend.

- **Stack:** Next.js 16 (App Router), TypeScript strict, React 19
- **Xadrez:** chess.js (lógica) + react-chessboard (UI) + stockfish (engine WASM, roda no navegador)
- **UI:** shadcn/ui + Tailwind CSS v4 + radix-ui + lucide-react
- **Storage:** localStorage
- **Deploy:** Vercel

## Comandos

Todo trabalho é dentro de `frontend/`:

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run build    # verificar erros de build
npm run lint     # ESLint
```

Não há backend, não há testes automatizados configurados no momento.

## Estrutura de pastas

```
frontend/src/
  app/
    layout.tsx, page.tsx, globals.css  → raiz da app
    game/page.tsx                      → rota /game (tabuleiro interativo)
  components/
    ui/           → componentes shadcn/ui (PascalCase)
    board/        → ChessBoard.tsx (display-only, não importa chess.js)
  hooks/
    useGame.ts    → estado da partida (única importação de chess.js)
  lib/
    utils.ts      → cn() para Tailwind
  types/
    game.types.ts → PieceColor, BotLevel, Bot, GameMove, GameStatus, Game
  services/       → storage.service.ts (NÃO modificar sem instrução explícita) — criar conforme necessidade
  utils/          → funções puras (kebab-case: pgn-parser.ts) — criar conforme necessidade
```

Path alias `@/*` aponta para `frontend/src/` (ex: `@/hooks/useGame`, `@/components/board/ChessBoard`).

## react-chessboard v5

Esta versão tem API diferente da v4. O componente recebe todas as opções num único prop `options`:
```tsx
<Chessboard options={{ position, boardOrientation, onPieceDrop, allowDragging }} />
```
`onPieceDrop` recebe `{ piece, sourceSquare, targetSquare: string | null }` — não `(from, to)` como na v4.

## Bots

Três níveis via Stockfish skill level:
- Iniciante: skill level 2
- Guerreiro: skill level 10
- Mestre: skill level 20

## Convenções

- Componentes: PascalCase
- Funções/variáveis: camelCase
- Arquivos utilitários: kebab-case
- TypeScript strict sempre
- Rodar Prettier antes de qualquer commit

## Padrão de commits

```
feat(escopo): descrição
fix(escopo): descrição
docs(escopo): descrição
chore(escopo): descrição
```
"Sempre ao finalizar uma implementação com sucesso, fazer commit e push 
seguindo o padrão: feat(escopo): descrição"

## O que NÃO mexer sem instrução explícita

- `frontend/services/storage.service.ts` — risco de perda de dados do usuário
- `frontend/.env.local`

## Aviso sobre Next.js

Este projeto usa Next.js 16 com React 19 — versões com breaking changes em relação ao que pode estar no training data. Consultar `node_modules/next/dist/docs/` em caso de dúvida sobre APIs ou convenções.

