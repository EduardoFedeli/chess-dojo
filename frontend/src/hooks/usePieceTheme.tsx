import React, { useMemo, useState } from 'react'

const PIECE_KEYS = [
  'wP', 'wN', 'wB', 'wR', 'wQ', 'wK',
  'bP', 'bN', 'bB', 'bR', 'bQ', 'bK',
] as const

type PieceKey = typeof PIECE_KEYS[number]
type PieceComponent = ({ squareWidth }: { squareWidth: number }) => React.ReactElement
type CustomPieces = Record<PieceKey, PieceComponent>

export const PIECE_THEMES: Record<string, string> = {
  cburnett:  'Lichess',
  alpha:     'Alpha',
  staunty:   'Staunty',
  horsey:    'Horsey',
  pixel:     'Pixel',
  maestro:   'Maestro',
  tatiana:   'Tatiana',
  chess7:    'Chess 7',
  california:'California',
  cardinal:  'Cardinal',
  companion: 'Companion',
  fresca:    'Fresca',
  gioco:     'Gioco',
  kosal:     'Kosal',
  leipzig:   'Leipzig',
  merida:    'Merida',
  mpchess:   'MPChess',
  pirouetti: 'Pirouetti',
  shapes:    'Shapes',
  spatial:   'Spatial',
}

const PIECE_THEME_KEY = 'chess-dojo:piece-theme'
const DEFAULT_THEME = 'cburnett'

function buildPieces(theme: string): CustomPieces {
  return Object.fromEntries(
    PIECE_KEYS.map((key) => [
      key,
      function PieceImg({ squareWidth }: { squareWidth: number }) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/piece/${theme}/${key}.svg`}
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

/** Hook que gerencia o estilo de peças ativo e retorna o customPieces para react-chessboard. */
export function usePieceTheme() {
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME
    const saved = localStorage.getItem(PIECE_THEME_KEY)
    return (saved && saved in PIECE_THEMES) ? saved : DEFAULT_THEME
  })

  const customPieces = useMemo(() => buildPieces(activeTheme), [activeTheme])

  function setTheme(theme: string) {
    setActiveTheme(theme)
    localStorage.setItem(PIECE_THEME_KEY, theme)
  }

  return { customPieces, activeTheme, setTheme }
}
