'use client'

// 'use client' é obrigatório: react-chessboard usa eventos do browser (drag & drop)
// e não é compatível com Server Components.

import { Chessboard } from 'react-chessboard'
import type { GameMove, PieceColor } from '@/types/game.types'

type ChessBoardProps = {
  fen: string
  playerColor: PieceColor
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  onMove: (move: GameMove) => void
  // disabled bloqueia interação: usado durante turno do bot ou fim de jogo
  disabled?: boolean
}

export function ChessBoard({
  fen,
  playerColor,
  makeMove,
  onMove,
  disabled = false,
}: ChessBoardProps) {
  // onPieceDrop é o handler principal do react-chessboard.
  // Retornar false reverte a peça à posição original (jogada ilegal).
  // Retornar true confirma a jogada e atualiza o tabuleiro.
  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string
    targetSquare: string | null
  }): boolean {
    if (disabled || !targetSquare) return false

    const move = makeMove(sourceSquare, targetSquare)
    if (!move) return false

    onMove(move)
    return true
  }

  return (
    <Chessboard
      options={{
        position: fen,
        boardOrientation: playerColor,
        onPieceDrop: handlePieceDrop,
        allowDragging: !disabled,
      }}
    />
  )
}
