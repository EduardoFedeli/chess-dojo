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
frontend/
  app/           → rotas Next.js App Router (layout.tsx, page.tsx, globals.css)
  src/           → será criado conforme o projeto cresce:
    components/  → componentes React (PascalCase: ChessBoard.tsx, BotCard.tsx)
    hooks/       → custom hooks (useGame, useStats, useLocalStorage)
    services/    → storage.service.ts (NÃO modificar sem instrução explícita)
    types/       → tipagens TypeScript
    utils/       → funções puras (kebab-case: pgn-parser.ts, move-classifier.ts)
```

> Atenção: o diretório `src/` ainda não existe — o projeto está no início. Criar conforme necessidade.

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

## O que NÃO mexer sem instrução explícita

- `frontend/src/services/storage.service.ts` — risco de perda de dados do usuário
- `frontend/.env.local`

## Aviso sobre Next.js

Este projeto usa Next.js 16 com React 19 — versões com breaking changes em relação ao que pode estar no training data. Consultar `node_modules/next/dist/docs/` em caso de dúvida sobre APIs ou convenções.

## Contexto do desenvolvedor

Desenvolvedor em transição para full stack. Priorizar clareza e boas práticas acima de performance prematura. Sempre explicar o porquê das decisões antes do como.
