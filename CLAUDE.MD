# chess-dojo

Aplicação web de xadrez com bots de diferentes níveis e um bot-professor
com feedback via IA (Claude API).

## Stack
- Frontend: Next.js 15, TypeScript, react-chessboard, chess.js, shadcn/ui
- Backend:  Python, FastAPI, python-chess, Stockfish
- IA:       Claude API (claude-sonnet-4-20250514)
- Storage:  localStorage (sem banco de dados no MVP)
- Deploy:   Vercel (frontend) + Railway (backend)

## Como rodar

### Frontend
cd frontend
npm install
cp .env.local.example .env.local   # preencher BACKEND_URL
npm run dev                         # http://localhost:3000

### Backend
cd backend
pip install -r requirements.txt
cp .env.example .env               # preencher ANTHROPIC_API_KEY
uvicorn app.main:app --reload      # http://localhost:8000

## Estrutura de pastas
src/components → componentes React reutilizáveis
src/app        → rotas Next.js (App Router)
src/services   → chamadas ao backend e localStorage
src/hooks      → custom hooks (useGame, useStats, useLocalStorage)
src/types      → tipagens TypeScript
src/utils      → funções utilitárias (pgn-parser, move-classifier)

## Convenções
- Componentes em PascalCase: ChessBoard.tsx, BotCard.tsx
- Funções e variáveis em camelCase: getBotMove(), playerColor
- Arquivos utilitários em kebab-case: pgn-parser.ts
- TypeScript strict: sempre
- Prettier antes de qualquer commit: sempre

## Padrão de commits
feat(escopo): descrição
fix(escopo): descrição
docs(escopo): descrição
chore(escopo): descrição

## Com Claude Code
- Iniciar sessão sempre com /init
- Referenciar arquivos com @src/components/board/ChessBoard.tsx
- Usar /compact quando a sessão estiver longa
- Um objetivo claro por sessão

## O que NÃO mexer sem instrução explícita
- app/api/engine/route.ts (proxy de segurança)
- services/storage.service.ts (risco de perda de dados do usuário)

## Contexto
Desenvolvedor em transição para full stack.
Priorizar clareza e boas práticas acima de performance prematura.
Sempre explicar o porquê das decisões antes do como.
```

---

## Dois endpoints do backend — só isso no MVP
```
POST /move        → recebe FEN + botLevel, retorna a jogada do bot
POST /analyze     → recebe PGN completo, retorna análise completa + resumo do Professor