'use client'

// Esta página é um Client Component porque usa hooks do React (useSearchParams).
// useSearchParams() exige um Suspense boundary no Next.js App Router —
// a lógica fica em GameContent e o export default envolve com <Suspense>.

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGame } from '@/hooks/useGame'
import { useStockfish } from '@/hooks/useStockfish'
import { ChessBoard } from '@/components/board/ChessBoard'
import type { BoardTheme } from '@/components/board/ChessBoard'
import type { BotLevel, GameStatus, PieceColor } from '@/types/game.types'
import { buildMovesString } from '@/utils/pgn-builder'
import type { SavedGame } from '@/types/game.types'
import { useStockfishAnalysis } from '@/hooks/useStockfishAnalysis'
import { classifyMoves, computeAccuracy, CLASSIFICATION_META } from '@/utils/move-classifier'
import type { AnalysisResult, MoveClassification } from '@/types/game.types'
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
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const botParam   = (searchParams.get('bot')   ?? 'iniciante') as BotLevel
  const colorParam = (searchParams.get('color') ?? 'white')     as PieceColor

  const skillLevel = SKILL_LEVEL[botParam] ?? 2

  const { fen, makeMove, status, resign, moves } = useGame(colorParam)
  const [resignConfirm, setResignConfirm] = useState(false)

  const [activeTheme, setActiveTheme] = useState<string>(() => {
    if (typeof window === 'undefined') return 'classico'
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return (saved && saved in BOARD_THEMES) ? saved : 'classico'
  })

  // Persiste a partida no localStorage ao fim do jogo
  useEffect(() => {
    if (status === 'playing' || moves.length === 0) return

    const saved: SavedGame = {
      pgn:         buildMovesString(moves),
      botLevel:    botParam,
      playerColor: colorParam,
      result:      status,
      date:        new Date().toISOString(),
      moves,
    }
    localStorage.setItem('chess-dojo:last-game', JSON.stringify(saved))
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const analysisFens = useMemo(
    () => isGameOver ? [INITIAL_FEN, ...moves.map(m => m.fen)] : [],
    [isGameOver, moves]
  )

  const { scores, progress, isAnalyzing } = useStockfishAnalysis({
    fens:     analysisFens,
    movetime: 300,
    enabled:  isGameOver && moves.length > 0,
  })

  const analysisReady = !isAnalyzing && scores.length === analysisFens.length && analysisFens.length > 1
  const evaluations   = analysisReady ? classifyMoves(scores, moves) : []
  const accuracy      = analysisReady ? computeAccuracy(evaluations) : 0

  // Persiste análise no localStorage quando concluída
  useEffect(() => {
    if (!analysisReady || evaluations.length === 0) return
    const result: AnalysisResult = {
      evaluations,
      accuracy,
      date: new Date().toISOString(),
    }
    localStorage.setItem('chess-dojo:last-analysis', JSON.stringify(result))
  }, [analysisReady]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="relative flex min-h-screen items-center justify-center p-8">
      {/* Wrapper: coluna única em mobile, duas colunas em desktop */}
      <div className="flex w-full max-w-[740px] flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-6">

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
        {/* Desktop: ao lado do tabuleiro, mesma altura. Mobile: abaixo (flex-col). */}
        <div className="sm:flex sm:flex-col">
          <MoveHistory moves={moves} />
        </div>
      </div>

      {/* Overlay de fim de jogo */}
      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-neutral-900 px-10 py-8 text-center shadow-2xl w-80">

            {/* Resultado */}
            <p className="text-2xl font-bold text-white">
              {GAME_OVER_MESSAGE[status]}
            </p>

            {/* Estado A: analisando */}
            {isAnalyzing && (
              <div className="w-full rounded-xl bg-neutral-800 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Analisando partida...
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-700">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width:      `${Math.round(progress * 100)}%`,
                      background: 'linear-gradient(90deg, #6B8F71, #EE964B)',
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {scores.length} / {analysisFens.length} posições
                </p>
              </div>
            )}

            {/* Estado B: análise concluída */}
            {analysisReady && (
              <>
                {/* Precisão */}
                <div
                  className="rounded-lg px-6 py-2"
                  style={{ background: '#6B8F7118', border: '1px solid #6B8F7144' }}
                >
                  <span className="text-sm text-neutral-400">Precisão: </span>
                  <span className="text-xl font-black" style={{ color: '#6B8F71' }}>
                    {accuracy}%
                  </span>
                </div>

                {/* Grid de categorias */}
                <div className="w-full rounded-xl bg-neutral-800 px-4 py-3">
                  <div className="grid gap-x-4 gap-y-0.5 text-xs" style={{ gridTemplateColumns: '1fr auto' }}>
                    {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
                      const meta  = CLASSIFICATION_META[key]
                      const count = evaluations.filter(e => e.classification === key).length
                      return (
                        <div key={key} className="contents">
                          <span style={{ color: meta.color }}>{meta.emoji} {meta.label}</span>
                          <span className="text-right font-bold" style={{ color: meta.color }}>{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Botões */}
            <div className="flex w-full flex-col gap-2">
              {analysisReady && (
                <button
                  onClick={() => router.push('/review')}
                  className="w-full rounded-xl py-3 text-sm font-black tracking-wide transition-all hover:opacity-90"
                  style={{ backgroundColor: '#6B8F71', color: '#000' }}
                >
                  📋 Revisão da Partida
                </button>
              )}
              <button
                onClick={() => router.push('/')}
                className="w-full rounded-xl border border-neutral-700 py-3 text-sm font-semibold text-neutral-400 transition-all hover:border-neutral-500 hover:text-white"
              >
                Jogar novamente
              </button>
            </div>

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
