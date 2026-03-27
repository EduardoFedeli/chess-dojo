'use client'

// 'use client' é obrigatório: react-chessboard usa eventos do browser (drag & drop)
// e não é compatível com Server Components.

import { useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard'
import type { GameMove, PieceColor } from '@/types/game.types'

type ChessBoardProps = {
  fen: string
  playerColor: PieceColor
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  onMove: (move: GameMove) => void
  // disabled bloqueia interação: usado durante turno do bot ou fim de jogo
  disabled?: boolean
}

// Estilos de highlight reutilizados em squareStyles
const HIGHLIGHT_MOVE     = { background: 'radial-gradient(circle, rgba(0,0,0,0.18) 25%, transparent 25%)' }
const HIGHLIGHT_CAPTURE  = { background: 'radial-gradient(circle, rgba(220,38,38,0.35) 50%, transparent 52%)' }
const HIGHLIGHT_SELECTED = { background: 'rgba(255, 255, 0, 0.4)' }
const HIGHLIGHT_CHECK    = { background: 'rgba(220, 38, 38, 0.55)' }

// Retorna a casa do rei da cor que está em xeque, ou null se não houver xeque.
function getCheckedKingSquare(fen: string): string | null {
  const chess = new Chess(fen)
  if (!chess.inCheck()) return null

  const turn = chess.turn() // cor que está para jogar e está em xeque
  const board = chess.board()
  for (const row of board) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === turn) {
        return cell.square
      }
    }
  }
  return null
}

export function ChessBoard({
  fen,
  playerColor,
  makeMove,
  onMove,
  disabled = false,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [validSquares, setValidSquares] = useState<Record<string, { isCapture: boolean }>>({})

  function clearHighlights() {
    setSelectedSquare(null)
    setValidSquares({})
  }

  function handleSquareClick({ square }: SquareHandlerArgs) {
    if (disabled) return

    // Se clicou numa casa válida para mover a peça selecionada, tenta a jogada
    if (selectedSquare && validSquares[square] !== undefined) {
      const move = makeMove(selectedSquare, square)
      clearHighlights()
      if (move) onMove(move)
      return
    }

    // Calcula os movimentos válidos a partir da casa clicada
    const chess = new Chess(fen)
    const moves = chess.moves({ square: square as Parameters<typeof chess.moves>[0]['square'], verbose: true })

    if (moves.length === 0) {
      clearHighlights()
      return
    }

    const newValidSquares: Record<string, { isCapture: boolean }> = {}
    for (const m of moves) {
      newValidSquares[m.to] = { isCapture: !!m.captured }
    }

    setSelectedSquare(square)
    setValidSquares(newValidSquares)
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (disabled || !targetSquare) return false

    const move = makeMove(sourceSquare, targetSquare)
    clearHighlights()
    if (!move) return false

    onMove(move)
    return true
  }

  // Monta o mapa de estilos por casa para o react-chessboard
  const squareStyles: Record<string, React.CSSProperties> = {}

  const checkedSquare = getCheckedKingSquare(fen)
  if (checkedSquare) {
    squareStyles[checkedSquare] = HIGHLIGHT_CHECK
  }
  if (selectedSquare) {
    squareStyles[selectedSquare] = HIGHLIGHT_SELECTED
  }
  for (const [sq, { isCapture }] of Object.entries(validSquares)) {
    squareStyles[sq] = isCapture ? HIGHLIGHT_CAPTURE : HIGHLIGHT_MOVE
  }

  // react-chessboard v5 recebe todas as opções num único prop `options`
  return (
    <Chessboard
      options={{
        position: fen,
        boardOrientation: playerColor,
        onPieceDrop: handlePieceDrop,
        onSquareClick: handleSquareClick,
        allowDragging: !disabled,
        squareStyles,
      }}
    />
  )
}
