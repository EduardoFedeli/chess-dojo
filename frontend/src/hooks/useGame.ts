import { useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { GameMove, GameStatus, PieceColor } from '@/types/game.types'

type UseGameReturn = {
  fen: string
  moves: GameMove[]
  status: GameStatus
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  reset: () => void
}

export function useGame(playerColor: PieceColor): UseGameReturn {
  // useRef mantém a instância Chess estável entre renders sem causar re-renders
  // ao ser mutada — só os dados derivados (fen, moves, status) ficam em useState.
  const chessRef = useRef(new Chess())

  const [fen, setFen] = useState(chessRef.current.fen())
  const [moves, setMoves] = useState<GameMove[]>([])
  const [status, setStatus] = useState<GameStatus>('playing')

  function makeMove(
    from: string,
    to: string,
    promotion?: string
  ): GameMove | null {
    const chess = chessRef.current

    // chess.move() retorna null para jogadas ilegais sem lançar exceção
    // quando usamos { strict: false } (padrão do chess.js v1+)
    let result
    try {
      result = chess.move({ from, to, promotion: promotion ?? 'q' })
    } catch {
      // chess.js lança erro em algumas versões para jogadas ilegais
      return null
    }

    if (!result) return null

    const gameMove: GameMove = {
      from: result.from,
      to: result.to,
      san: result.san,
      fen: chess.fen(), // FEN capturado APÓS a jogada
      piece: result.piece,
      color: result.color === 'w' ? 'white' : 'black',
      isCapture: result.captured !== undefined,
      isCheck: chess.inCheck(),
      isCheckmate: chess.isCheckmate(),
      promotion: result.promotion,
    }

    // Forma funcional evita stale closure: garante que sempre acumulamos
    // sobre o estado mais recente, mesmo que makeMove seja chamado rapidamente.
    setMoves(prev => [...prev, gameMove])
    setFen(chess.fen())
    setStatus(deriveStatus(chess, playerColor))

    return gameMove
  }

  function reset() {
    chessRef.current = new Chess()
    setFen(chessRef.current.fen())
    setMoves([])
    setStatus('playing')
  }

  return { fen, moves, status, makeMove, reset }
}

// Separado para clareza: determina o status da partida do ponto de vista do jogador.
function deriveStatus(chess: Chess, playerColor: PieceColor): GameStatus {
  if (!chess.isGameOver()) return 'playing'
  if (chess.isDraw()) return 'draw'

  // isCheckmate() = true significa que o lado que VAI jogar perdeu
  const loserColor = chess.turn() === 'w' ? 'white' : 'black'
  if (loserColor === playerColor) return 'lost'
  return 'won'
}
