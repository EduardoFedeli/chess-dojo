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
