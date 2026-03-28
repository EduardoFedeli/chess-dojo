'use client'

// 'use client' é obrigatório: react-chessboard usa eventos do browser (drag & drop)
// e não é compatível com Server Components.

import { useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs, PieceHandlerArgs, SquareHandlerArgs } from 'react-chessboard'
import type { GameMove, PieceColor } from '@/types/game.types'

export type BoardTheme = {
  darkSquareStyle: React.CSSProperties
  lightSquareStyle: React.CSSProperties
}

type ChessBoardProps = {
  fen: string
  playerColor: PieceColor
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  onMove: (move: GameMove) => void
  // disabled bloqueia interação: usado durante turno do bot ou fim de jogo
  disabled?: boolean
  theme?: BoardTheme
  customPieces?: Record<string, ({ squareWidth }: { squareWidth: number }) => React.ReactElement>
}

type PendingPromotion = { from: string; to: string; color: 'w' | 'b' }

const PROMOTION_PIECES: { piece: string; white: string; black: string; label: string }[] = [
  { piece: 'q', white: '♕', black: '♛', label: 'Rainha' },
  { piece: 'r', white: '♖', black: '♜', label: 'Torre' },
  { piece: 'b', white: '♗', black: '♝', label: 'Bispo' },
  { piece: 'n', white: '♘', black: '♞', label: 'Cavalo' },
]

function checkPawnPromotion(fen: string, from: string, to: string): 'w' | 'b' | null {
  const chess = new Chess(fen)
  const piece = chess.get(from as Parameters<typeof chess.get>[0])
  if (!piece || piece.type !== 'p') return null
  const toRank = to[1]
  if (piece.color === 'w' && toRank === '8') return 'w'
  if (piece.color === 'b' && toRank === '1') return 'b'
  return null
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

  const turn = chess.turn()
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

// Retorna o mapa de casas válidas para mover a partir de `square`.
function computeValidSquares(fen: string, square: string): Record<string, { isCapture: boolean }> {
  const chess = new Chess(fen)
  const moves = chess.moves({ square: square as Parameters<typeof chess.moves>[0]['square'], verbose: true })
  const result: Record<string, { isCapture: boolean }> = {}
  for (const m of moves) {
    result[m.to] = { isCapture: !!m.captured }
  }
  return result
}

export function ChessBoard({
  fen,
  playerColor,
  makeMove,
  onMove,
  disabled = false,
  theme,
  customPieces,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [validSquares, setValidSquares] = useState<Record<string, { isCapture: boolean }>>({})
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  function clearHighlights() {
    setSelectedSquare(null)
    setValidSquares({})
  }

  // Centraliza a lógica de highlight — usada tanto no clique quanto no drag.
  function showHighlights(square: string) {
    const moves = computeValidSquares(fen, square)
    if (Object.keys(moves).length === 0) {
      clearHighlights()
      return
    }
    setSelectedSquare(square)
    setValidSquares(moves)
  }

  function handleSquareClick({ square }: SquareHandlerArgs) {
    if (disabled || pendingPromotion) return

    // Se clicou numa casa válida para mover a peça selecionada, tenta a jogada
    if (selectedSquare && validSquares[square] !== undefined) {
      const promoColor = checkPawnPromotion(fen, selectedSquare, square)
      if (promoColor) {
        clearHighlights()
        setPendingPromotion({ from: selectedSquare, to: square, color: promoColor })
        return
      }
      const move = makeMove(selectedSquare, square)
      clearHighlights()
      if (move) onMove(move)
      return
    }

    showHighlights(square)
  }

  // Ao começar a arrastar, exibe imediatamente as casas válidas.
  function handlePieceDrag({ square }: PieceHandlerArgs) {
    if (disabled || pendingPromotion || !square) return
    showHighlights(square)
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    // Limpa highlights sempre — inclusive quando o drag é cancelado (targetSquare null)
    clearHighlights()
    if (disabled || pendingPromotion || !targetSquare) return false

    const promoColor = checkPawnPromotion(fen, sourceSquare, targetSquare)
    if (promoColor) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare, color: promoColor })
      return true // peão fica na casa destino enquanto o modal não fecha
    }

    const move = makeMove(sourceSquare, targetSquare)
    if (!move) return false

    onMove(move)
    return true
  }

  function handlePromotion(piece: string) {
    if (!pendingPromotion) return
    const move = makeMove(pendingPromotion.from, pendingPromotion.to, piece)
    setPendingPromotion(null)
    if (move) onMove(move)
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
    <div className="relative">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: playerColor,
          onPieceDrop: handlePieceDrop,
          onPieceDrag: handlePieceDrag,
          onSquareClick: handleSquareClick,
          allowDragging: !disabled && !pendingPromotion,
          squareStyles,
          ...(theme?.darkSquareStyle  && { darkSquareStyle:  theme.darkSquareStyle  }),
          ...(theme?.lightSquareStyle && { lightSquareStyle: theme.lightSquareStyle }),
          ...(customPieces            && { customPieces }),
        }}
      />

      {/* Modal de promoção: aparece sobre o tabuleiro quando um peão chega à última fileira */}
      {pendingPromotion && (
        <div className="absolute inset-0 flex items-center justify-center rounded" style={{ background: 'rgba(0,0,0,0.72)' }}>
          <div className="flex flex-col items-center gap-3 rounded-xl px-5 py-4 shadow-2xl" style={{ background: '#171717', border: '1px solid #3a3a3a' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              Promover peão
            </p>
            <div className="flex gap-2">
              {PROMOTION_PIECES.map(({ piece, white, black, label }) => (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  title={label}
                  className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-3xl transition-colors"
                  style={{ background: '#262626', border: '1px solid #404040', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#262626')}
                >
                  {pendingPromotion.color === 'w' ? white : black}
                  <span className="text-[10px]" style={{ color: '#6b7280' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
