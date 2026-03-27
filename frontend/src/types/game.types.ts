import type { PieceSymbol } from 'chess.js'

// Cor do jogador — alinha com os valores esperados pelo react-chessboard
export type PieceColor = 'white' | 'black'

// Nível do bot — nome semântico para a UI; skillLevel é o valor enviado ao Stockfish
export type BotLevel = 'iniciante' | 'guerreiro' | 'mestre'

export type Bot = {
  id: string
  name: string
  level: BotLevel
  skillLevel: number // 2 = iniciante | 10 = guerreiro | 20 = mestre
  description: string
}

// GameMove carrega tudo que análise pós-jogo e integração com Stockfish precisam.
// O FEN por jogada permite reconstruir qualquer posição sem depender do histórico completo.
export type GameMove = {
  from: string       // casa de origem, ex: 'e2'
  to: string         // casa de destino, ex: 'e4'
  san: string        // notação algébrica padrão: 'e4', 'Nf3', 'O-O'
  fen: string        // FEN do tabuleiro APÓS esta jogada ser executada
  piece: PieceSymbol // tipo da peça: 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
  color: PieceColor
  isCapture: boolean
  isCheck: boolean
  isCheckmate: boolean
  promotion?: PieceSymbol // peça de promoção se houver: 'q' | 'r' | 'b' | 'n'
}

export type GameStatus = 'playing' | 'won' | 'lost' | 'draw'

export type Game = {
  id: string
  botId: string
  playerColor: PieceColor
  moves: GameMove[]
  status: GameStatus
  startedAt: string  // ISO 8601
  endedAt?: string   // ISO 8601 — ausente enquanto a partida está em andamento
}

// Classificação de uma jogada individual
export type MoveClassification =
  | 'brilliant'    // 🌟 Brilhante
  | 'excellent'    // ✨ Excelente
  | 'good'         // ✅ Boa
  | 'inaccuracy'   // ⚠️ Imprecisão
  | 'mistake'      // ❌ Erro
  | 'missed_win'   // 🎯 Chance Perdida
  | 'blunder'      // 💀 Capivarada

// Avaliação de uma jogada: scores em centipawns (perspectiva brancas)
export type MoveEvaluation = {
  moveIndex: number                  // índice no array GameMove[]
  scoreBefore: number                // centipawns antes da jogada
  scoreAfter: number                 // centipawns depois da jogada
  delta: number                      // perda em pawns pelo jogador (sempre >= 0)
  classification: MoveClassification
}

// Resultado completo da análise — salvo em localStorage
export type AnalysisResult = {
  evaluations: MoveEvaluation[]
  accuracy: number                   // 0–100, inteiro
  date: string                       // ISO 8601
}

// Metadados da última partida — salvo em localStorage
export type SavedGame = {
  pgn: string
  botLevel: string
  playerColor: PieceColor
  result: Exclude<GameStatus, 'playing'>
  date: string                       // ISO 8601
  moves: GameMove[]
}
