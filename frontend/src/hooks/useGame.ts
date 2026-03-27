import { useCallback, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { GameMove, GameStatus, PieceColor } from '@/types/game.types'

type UseGameReturn = {
  fen: string
  moves: GameMove[]
  status: GameStatus
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  resign: () => void
  reset: () => void
}

export function useGame(playerColor: PieceColor): UseGameReturn {
  // useRef mantém a instância Chess estável entre renders sem causar re-renders
  // ao ser mutada — só os dados derivados (fen, moves, status) ficam em useState.
  const chessRef = useRef(new Chess())

  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [moves, setMoves] = useState<GameMove[]>([])
  const [status, setStatus] = useState<GameStatus>('playing')
  const [isResigned, setIsResigned] = useState(false)

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string): GameMove | null => {
      const chess = chessRef.current

      // chess.js 1.x lança exceção para jogadas ilegais — o try/catch é a guarda correta.
      // O promotion padrão 'q' (rainha) funciona para movimentos normais e é ignorado
      // pelo chess.js em peças que não são peões. Promoção via UI será implementada depois.
      let result
      try {
        result = chess.move({ from, to, promotion: promotion ?? 'q' })
      } catch {
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
    },
    [playerColor]
  )

  const resign = useCallback(() => {
    setIsResigned(true)
  }, [])

  const reset = useCallback(() => {
    chessRef.current = new Chess()
    setFen(chessRef.current.fen())
    setMoves([])
    setStatus('playing')
    setIsResigned(false)
  }, [])

  // isResigned sobrescreve o status derivado do chess.js
  const finalStatus: GameStatus = isResigned ? 'lost' : status

  return { fen, moves, status: finalStatus, makeMove, resign, reset }
}

// Separado para clareza: determina o status da partida do ponto de vista do jogador.
function deriveStatus(chess: Chess, playerColor: PieceColor): GameStatus {
  if (!chess.isGameOver()) return 'playing'
  if (chess.isDraw()) return 'draw'

  // isCheckmate() = true significa que o lado que VAI jogar perdeu
  // chess.turn() retorna a cor que está para jogar — esse lado está em xeque-mate
  const loserColor = chess.turn() === 'w' ? 'white' : 'black'
  if (loserColor === playerColor) return 'lost'
  return 'won'
}
