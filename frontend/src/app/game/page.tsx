'use client'

// Esta página é um Client Component porque usa hooks do React (useSearchParams).
// useSearchParams() exige um Suspense boundary no Next.js App Router —
// a lógica fica em GameContent e o export default envolve com <Suspense>.

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGame } from '@/hooks/useGame'
import { useStockfish } from '@/hooks/useStockfish'
import { ChessBoard } from '@/components/board/ChessBoard'
import { Button } from '@/components/ui/button'
import type { BotLevel, GameStatus, PieceColor } from '@/types/game.types'

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

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const botParam   = (searchParams.get('bot')   ?? 'iniciante') as BotLevel
  const colorParam = (searchParams.get('color') ?? 'white')     as PieceColor

  const skillLevel = SKILL_LEVEL[botParam] ?? 2

  const { fen, makeMove, status, resign } = useGame(colorParam)
  const [resignConfirm, setResignConfirm] = useState(false)

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
      <div className="w-full max-w-[560px] flex flex-col gap-4">
        <ChessBoard
          fen={fen}
          playerColor={colorParam}
          makeMove={makeMove}
          onMove={(move) => { if (move.isCapture) playCaptureSound() }}
          disabled={isBotThinking || isGameOver}
        />

        {/* Botão de desistir — só visível durante a partida */}
        {!isGameOver && (
          <div className="flex justify-end">
            {resignConfirm ? (
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
            )}
          </div>
        )}
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
