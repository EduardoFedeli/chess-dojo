'use client'

// 'use client' é obrigatório: react-chessboard usa eventos do browser (drag & drop)
// e não é compatível com Server Components.

import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs } from 'react-chessboard'
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
  // react-chessboard v5 passa { piece, sourceSquare, targetSquare } ao handler.
  // targetSquare é null quando a peça é solta fora do tabuleiro.
  // Retornar false reverte a peça à posição original.
  // Retornar true confirma a jogada.
  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean {
    if (disabled || !targetSquare) return false

    // Promoção: useGame.makeMove padrão é rainha quando nenhum argumento é passado.
    // UI de seleção de peça será implementada em iteração futura.
    const move = makeMove(sourceSquare, targetSquare)
    if (!move) return false

    onMove(move)
    return true
  }

  // react-chessboard v5 recebe todas as opções num único prop `options`
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
