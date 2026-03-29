# Chess Guild

**Practice chess against AI bots. Analyze every move. Export your review as PDF.**

Chess Guild is a fully client-side chess application built as a portfolio project. There is no backend and no account required — everything runs in the browser, powered by Stockfish 18 WebAssembly.

The core loop is simple: pick a bot, play a game, then review every move with engine-powered analysis. Each move is classified, your accuracy is scored, and you can download a complete PDF report of the session.

## Features

- Play against 7 AI bots with increasing difficulty (ELO 600 → 2400)
- Choose piece color, board theme (5 options), and piece style
- Live move history during the game
- Sound effects for moves, captures, check, and game end
- Post-game analysis with per-move classification powered by Stockfish
- Accuracy score based on engine evaluation
- Advantage graph with notable-move flags
- "Show best move" button in review — displays the engine's suggestion with an arrow and highlight
- Full PDF export of the game review (legend, graph, and annotated move list)
- 100% local — no login, no data sent anywhere

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| UI | React 19, shadcn/ui, Tailwind CSS v4, Radix UI |
| Chess logic | chess.js |
| Board | react-chessboard v5 |
| Engine | Stockfish 18 (WebAssembly, runs in-browser) |
| PDF export | jsPDF |
| Storage | localStorage |
| Deploy | Vercel |

## Getting Started

```bash
# Clone the repository
git clone https://github.com/EduardoFedeli/chess-dojo.git

# Install dependencies and run
cd chess-dojo/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build / type-check
npm run lint    # ESLint
```

## Bot Progression

Seven bots form an RPG-style ladder from beginner to near-master level.

| Bot | Stars | Stockfish Skill | Approx. ELO |
|---|---|---|---|
| Aprendiz | ⭐ | 0 | 600 |
| Escudeiro | ⭐⭐ | 3 | 900 |
| Caçador | ⭐⭐⭐ | 6 | 1200 |
| Cavaleiro | ⭐⭐⭐⭐ | 10 | 1500 |
| Veterano | ⭐⭐⭐⭐⭐ | 14 | 1800 |
| Mestre de Guerra | ⭐⭐⭐⭐⭐⭐ | 17 | 2000 |
| Mago Ancião | ⭐⭐⭐⭐⭐⭐⭐ | 20 | 2400 |

## How the Analysis Works

After the game ends, Stockfish re-evaluates every position in the game at a fixed depth. For each move, the engine computes the centipawn loss relative to the best available continuation and assigns a classification:

| Classification | Meaning |
|---|---|
| Brilhante | Only top move in a critical, non-obvious position |
| Excelente | Best or near-best move; negligible loss |
| Boa | Solid move with minor inaccuracy |
| Imprecisão | Suboptimal; noticeable but not decisive loss |
| Erro | Significant loss of advantage |
| Chance Perdida | Missed a clear winning opportunity |
| Capivarada | Severe blunder; changes the outcome of the game |

Your overall **accuracy score** is derived from the average centipawn loss across all your moves. The advantage graph plots the engine evaluation after each half-move, with flag markers on notable moments. In review mode, clicking any move on the graph or the move list takes you to that position; the "Show best move" button overlays the engine's preferred move as an arrow on the board.

## Project Structure

```
frontend/src/
  app/
    page.tsx              # Home — bot selection
    game/page.tsx         # Live game screen
    review/page.tsx       # Post-game analysis and review
  components/
    board/ChessBoard.tsx
    review/               # AdvantageBar, AdvantageGraph, MoveSummary, PdfExportButton
    game/MoveHistory.tsx
  hooks/
    useGame.ts            # Game state
    useStockfish.ts       # Bot AI
    useStockfishAnalysis.ts # Post-game analysis pipeline
    useBestMove.ts        # Best-move lookup during review
  data/bots.ts            # Single source of truth for bot data
  types/game.types.ts
  utils/                  # move-classifier.ts, pgn-builder.ts, sound.ts
```

## License

MIT
