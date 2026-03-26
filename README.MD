# ♟️ chess-dojo

Aplicação web de xadrez com bots de diferentes níveis e um bot-professor
com feedback em tempo real powered by Claude API (Anthropic).

## Tecnologias

- **Frontend:** Next.js 15, TypeScript, react-chessboard, chess.js, shadcn/ui
- **Backend:** Python, FastAPI, python-chess, Stockfish
- **IA:** Claude API (claude-sonnet-4-20250514)
- **Storage:** localStorage

## Como rodar

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Bots disponíveis

| Bot | Nível | Descrição |
|-----|-------|-----------|
| 🐣 Iniciante | Fácil | Comete erros, ideal para aprender |
| ⚔️ Guerreiro | Médio | Jogo sólido com falhas ocasionais |
| 🏆 Mestre | Difícil | Pune cada erro sem piedade |
| 🎓 Professor | Adaptativo | Joga e te ensina ao mesmo tempo |