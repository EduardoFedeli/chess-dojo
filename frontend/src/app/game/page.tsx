'use client'

// Esta página é um Client Component porque usa hooks do React (useSearchParams).
// useSearchParams() exige um Suspense boundary no Next.js App Router —
// a lógica fica em GameContent e o export default envolve com <Suspense>.

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useGame } from '@/hooks/useGame'
import { useStockfish } from '@/hooks/useStockfish'
import { ChessBoard } from '@/components/board/ChessBoard'
import type { BotLevel, PieceColor } from '@/types/game.types'

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

function GameContent() {
  const searchParams = useSearchParams()

  const botParam = (searchParams.get('bot') ?? 'iniciante') as BotLevel
  const colorParam = (searchParams.get('color') ?? 'white') as PieceColor

  const skillLevel = SKILL_LEVEL[botParam] ?? 2

  const { fen, makeMove, status } = useGame(colorParam)

  const { isBotThinking } = useStockfish({
    skillLevel,
    fen,
    makeMove,
    enabled: status === 'playing',
    playerColor: colorParam,
  })

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-[560px]">
        <ChessBoard
          fen={fen}
          playerColor={colorParam}
          makeMove={makeMove}
          onMove={(move) => { if (move.isCapture) playCaptureSound() }}
          disabled={isBotThinking || status !== 'playing'}
        />
      </div>
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
