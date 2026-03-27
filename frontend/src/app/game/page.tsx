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
          onMove={() => {}}
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
