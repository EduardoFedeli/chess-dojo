'use client'

// Esta página é um Client Component porque usa o hook useGame (que usa useState/useRef).
// Em Next.js App Router, hooks do React só funcionam em Client Components.

import { useGame } from '@/hooks/useGame'
import { ChessBoard } from '@/components/board/ChessBoard'
import type { GameMove } from '@/types/game.types'

export default function GamePage() {
  const { fen, makeMove, status } = useGame('white')

  // Placeholder: aqui o bot responderá à jogada do jogador na próxima iteração.
  function handleMove(move: GameMove) {
    console.log('Jogada registrada:', move.san, '| FEN:', move.fen)
    console.log('Status:', status)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-[560px]">
        <ChessBoard
          fen={fen}
          playerColor="white"
          makeMove={makeMove}
          onMove={handleMove}
          disabled={status !== 'playing'}
        />
      </div>
    </main>
  )
}
