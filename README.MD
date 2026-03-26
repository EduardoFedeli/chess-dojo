# ♟️ chess-dojo

Aplicação web de xadrez com bots de diferentes níveis e análise de partidas powered by Stockfish.
Projeto desenvolvido para estudo e portfólio, com foco em boas práticas e código limpo.

## Tecnologias

- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Xadrez:** chess.js + react-chessboard
- **Engine:** Stockfish (WebAssembly — roda direto no navegador)
- **Storage:** localStorage (sem banco de dados)
- **Deploy:** Vercel

## Funcionalidades

- Tabuleiro interativo com validação de jogadas
- 3 bots com níveis reais de dificuldade via Stockfish
- Análise pós-partida com classificação de cada jogada
- Estatísticas de desempenho (acurácia, blunders, vitórias)
- Histórico de partidas com replay
- Temas de tabuleiro customizáveis
- 100% client-side — sem backend, sem servidor

## Bots disponíveis

| Bot | Nível Stockfish | Descrição |
|-----|----------------|-----------|
| 🐣 Iniciante | 1–3 | Comete erros, ideal para aprender os fundamentos |
| ⚔️ Guerreiro | 8–10 | Jogo sólido com falhas ocasionais |
| 🏆 Mestre | 18–20 | Pune cada erro sem piedade |

## Classificação de jogadas

Após cada partida, o Stockfish analisa suas jogadas e classifica cada uma:

| Classificação | Descrição |
|---|---|
| ✨ Excelente | Melhor jogada possível na posição |
| ✅ Boa | Jogada sólida, mantém a vantagem |
| ⚠️ Imprecisão | Jogada razoável mas existe algo melhor |
| ❌ Erro | Jogada ruim, perde vantagem significativa |
| 💀 Blunder | Erro grave, muda o resultado da partida |

## Como rodar localmente

```bash
# Clone o repositório
git clone https://github.com/EduardoFedeli/chess-dojo.git
cd chess-dojo/frontend

# Instale as dependências
npm install

# Rode em desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Estrutura do projeto

```
frontend/
├── src/
│   ├── app/                  # Rotas (Next.js App Router)
│   │   ├── page.tsx          # Home — seleção de bot
│   │   ├── game/             # Tela do jogo ao vivo
│   │   ├── review/[gameId]/  # Revisão e análise de partida
│   │   ├── stats/            # Estatísticas do jogador
│   │   ├── history/          # Histórico de partidas
│   │   └── settings/         # Configurações e temas
│   ├── components/
│   │   ├── board/            # Tabuleiro, relógio, histórico de jogadas
│   │   ├── bots/             # Cards e avatares dos bots
│   │   ├── review/           # Slider de replay, badges de classificação
│   │   └── ui/               # Componentes shadcn/ui
│   ├── hooks/                # useGame, useLocalStorage, useStats
│   ├── services/             # storage.service.ts
│   ├── types/                # Tipagens TypeScript
│   └── utils/                # pgn-parser, move-classifier
```

## Decisões técnicas

**Por que só frontend?**
Stockfish roda via WebAssembly direto no navegador — não precisa de servidor para processar jogadas ou análise. Isso elimina custos de hospedagem de backend e torna o projeto mais simples de manter.

**Por que localStorage?**
Sem sistema de login, o localStorage é suficiente para persistir histórico e estatísticas. A limitação (dados presos no navegador) é aceitável para o escopo do projeto.

**Por que Next.js e não React puro?**
Facilidade de deploy no Vercel, estrutura de rotas organizada e possibilidade de adicionar funcionalidades server-side no futuro sem mudar a stack.

## Roadmap futuro

- [ ] Bot Professor com feedback via IA (Claude API)
- [ ] Sistema de login com persistência em nuvem
- [ ] Puzzles táticos
- [ ] Modo multiplayer local

## Licença

MIT