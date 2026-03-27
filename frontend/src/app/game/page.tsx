'use client'

// Esta página é um Client Component porque usa o hook useGame (que usa useState/useRef).
// Em Next.js App Router, hooks do React só funcionam em Client Components.

import { useGame } from '@/hooks/useGame'
import { useStockfish } from '@/hooks/useStockfish'
import { ChessBoard } from '@/components/board/ChessBoard'

export default function GamePage() {
  const { fen, makeMove, status } = useGame('white')

  const { isBotThinking } = useStockfish({
    skillLevel: 2,
    fen,
    makeMove,
    enabled: status === 'playing',
  })

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-[560px]">
        <ChessBoard
          fen={fen}
          playerColor="white"
          makeMove={makeMove}
          onMove={() => {}}
          disabled={isBotThinking || status !== 'playing'}
        />
      </div>
    </main>
  )
}
