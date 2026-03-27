'use client'

// Esta página é um Client Component porque usa hooks do React (useSearchParams).
// useSearchParams() exige um Suspense boundary no Next.js App Router —
// a lógica fica em GameContent e o export default envolve com <Suspense>.

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGame } from '@/hooks/useGame'
import { useStockfish } from '@/hooks/useStockfish'
import { ChessBoard } from '@/components/board/ChessBoard'
import type { BoardTheme } from '@/components/board/ChessBoard'
import { Button } from '@/components/ui/button'
import type { BotLevel, GameStatus, PieceColor } from '@/types/game.types'
import { MoveHistory } from '@/components/game/MoveHistory'

// Gera um "thud" curto via Web Audio API — sem arquivos externos.
// Usa um oscilador de baixa frequência com queda rápida de amplitude.
function playCaptureSound() {
  if (typeof window === 'undefined') return
  const ctx = new AudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12)

  gain.gain.setValueAtTime(0.6, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.15)
  osc.onended = () => ctx.close()
}

const SKILL_LEVEL: Record<BotLevel, number> = {
  iniciante: 2,
  guerreiro: 10,
  mestre: 20,
}

const GAME_OVER_MESSAGE: Record<Exclude<GameStatus, 'playing'>, string> = {
  won:  'Você venceu! 🏆',
  lost: 'Você perdeu 😔',
  draw: 'Empate 🤝',
}

// Temas de tabuleiro: dois quadrados de preview + estilos passados ao Chessboard
const BOARD_THEMES: Record<string, { label: string; theme: BoardTheme }> = {
  classico: {
    label: 'Clássico',
    theme: {
      lightSquareStyle: { backgroundColor: '#F0D9B5' },
      darkSquareStyle:  { backgroundColor: '#B58863' },
    },
  },
  esmeralda: {
    label: 'Esmeralda',
    theme: {
      lightSquareStyle: { backgroundColor: '#FFFFDD' },
      darkSquareStyle:  { backgroundColor: '#6B8F71' },
    },
  },
  noite: {
    label: 'Noite',
    theme: {
      lightSquareStyle: { backgroundColor: '#DEE3E6' },
      darkSquareStyle:  { backgroundColor: '#8CA2AD' },
    },
  },
}

const THEME_STORAGE_KEY = 'chess-board-theme'

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const botParam   = (searchParams.get('bot')   ?? 'iniciante') as BotLevel
  const colorParam = (searchParams.get('color') ?? 'white')     as PieceColor

  const skillLevel = SKILL_LEVEL[botParam] ?? 2

  const { fen, makeMove, status, resign, moves } = useGame(colorParam)
  const [resignConfirm, setResignConfirm] = useState(false)

  const [activeTheme, setActiveTheme] = useState<string>('classico')

  // Carrega o tema salvo no localStorage após a montagem (client-only)
  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved && saved in BOARD_THEMES) setActiveTheme(saved)
  }, [])

  function handleThemeChange(key: string) {
    setActiveTheme(key)
    localStorage.setItem(THEME_STORAGE_KEY, key)
  }

  const { isBotThinking } = useStockfish({
    skillLevel,
    fen,
    makeMove,
    enabled: status === 'playing',
    playerColor: colorParam,
  })

  const isGameOver = status !== 'playing'

  return (
    <main className="relative flex min-h-screen items-center justify-center p-8">
      {/* Wrapper: coluna única em mobile, duas colunas em desktop */}
      <div className="flex w-full max-w-[740px] flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">

        {/* Coluna esquerda: tabuleiro + controles */}
        <div className="flex flex-col gap-4" style={{ maxWidth: 560 }}>
          <ChessBoard
            fen={fen}
            playerColor={colorParam}
            makeMove={makeMove}
            onMove={(move) => { if (move.isCapture) playCaptureSound() }}
            disabled={isBotThinking || isGameOver}
            theme={BOARD_THEMES[activeTheme].theme}
          />

          {/* Linha inferior: seletor de tema (esquerda) + desistir (direita) */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {Object.entries(BOARD_THEMES).map(([key, { label, theme }]) => {
                const isActive = activeTheme === key
                return (
                  <button
                    key={key}
                    title={label}
                    onClick={() => handleThemeChange(key)}
                    className={[
                      'flex overflow-hidden rounded-md border-2 transition-colors',
                      isActive ? 'border-white' : 'border-transparent hover:border-neutral-500',
                    ].join(' ')}
                  >
                    <span className="block h-5 w-5" style={theme.lightSquareStyle} />
                    <span className="block h-5 w-5" style={theme.darkSquareStyle} />
                  </button>
                )
              })}
            </div>

            {!isGameOver && (
              resignConfirm ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-400">Tem certeza?</span>
                  <button
                    onClick={() => { resign(); setResignConfirm(false) }}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setResignConfirm(false)}
                    className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-semibold text-neutral-300 hover:border-neutral-400 hover:text-white"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResignConfirm(true)}
                  className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:border-red-700 hover:text-red-400 transition-colors"
                >
                  Desistir
                </button>
              )
            )}
          </div>
        </div>

        {/* Coluna direita: painel de histórico */}
        {/* Desktop: ao lado do tabuleiro. Mobile: abaixo (ordem natural do flex-col) */}
        <div className="sm:sticky sm:top-8">
          <MoveHistory moves={moves} />
        </div>
      </div>

      {/* Overlay de fim de jogo */}
      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 rounded-2xl bg-neutral-900 px-12 py-10 text-center shadow-2xl">
            <p className="text-3xl font-bold text-white">
              {GAME_OVER_MESSAGE[status]}
            </p>
            <Button
              onClick={() => router.push('/')}
              className="rounded-xl bg-white px-8 py-5 text-base font-semibold text-black hover:bg-neutral-200"
            >
              Jogar novamente
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense>
      <GameContent />
    </Suspense>
  )
}
