import React, { useMemo } from 'react'

const PIECE_KEYS = [
  'wP', 'wN', 'wB', 'wR', 'wQ', 'wK',
  'bP', 'bN', 'bB', 'bR', 'bQ', 'bK',
] as const

type PieceKey = typeof PIECE_KEYS[number]
type PieceComponent = ({ squareWidth }: { squareWidth: number }) => React.ReactElement
type CustomPieces = Record<PieceKey, PieceComponent>

function buildCburnettPieces(): CustomPieces {
  return Object.fromEntries(
    PIECE_KEYS.map((key) => [
      key,
      function CburnettPiece({ squareWidth }: { squareWidth: number }) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/pieces/cburnett/${key}.svg`}
            width={squareWidth}
            height={squareWidth}
            alt={key}
            draggable={false}
            style={{ userSelect: 'none' }}
          />
        )
      },
    ])
  ) as CustomPieces
}

/** Returns a stable customPieces object for react-chessboard using Lichess cburnett SVGs. */
export function usePieceTheme() {
  const customPieces = useMemo(() => buildCburnettPieces(), [])
  return { customPieces }
}
