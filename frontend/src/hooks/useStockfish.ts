import { useEffect, useRef, useState } from 'react'
import type { GameMove } from '@/types/game.types'

type UseStockfishOptions = {
  skillLevel: number
  fen: string
  makeMove: (from: string, to: string, promotion?: string) => GameMove | null
  enabled: boolean
}

export function useStockfish({ skillLevel, fen, makeMove, enabled }: UseStockfishOptions) {
  const workerRef = useRef<Worker | null>(null)
  const readyRef = useRef(false)
  const [isBotThinking, setIsBotThinking] = useState(false)

  // Inicializa o worker uma única vez na montagem do componente
  useEffect(() => {
    const worker = new Worker('/stockfish-18-lite-single.js')
    workerRef.current = worker

    worker.postMessage('uci')
    worker.postMessage('isready')
    worker.postMessage(`setoption name Skill Level value ${skillLevel}`)
    // UCI_LimitStrength é necessário para que o Skill Level tenha efeito real
    worker.postMessage('setoption name UCI_LimitStrength value true')

    worker.onmessage = (event: MessageEvent<string>) => {
      const line = event.data

      if (line === 'readyok') {
        readyRef.current = true
        return
      }

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ')
        const move = parts[1]

        // 'bestmove (none)' ocorre quando o motor não tem jogadas — o chess.js
        // já terá detectado fim de jogo antes, então apenas ignoramos.
        if (!move || move === '(none)') {
          setIsBotThinking(false)
          return
        }

        const from = move.slice(0, 2)
        const to = move.slice(2, 4)
        const promotion = move.length === 5 ? move[4] : undefined

        makeMove(from, to, promotion)
        setIsBotThinking(false)
      }
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // worker criado apenas uma vez — skillLevel aplicado via setoption no init

  // Dispara quando o FEN muda: se for turno das pretas e o jogo estiver ativo, calcula jogada
  useEffect(() => {
    const isBotTurn = fen.split(' ')[1] === 'b'

    if (!enabled || !isBotTurn || !readyRef.current || !workerRef.current) return

    setIsBotThinking(true)
    workerRef.current.postMessage('ucinewgame')
    workerRef.current.postMessage(`position fen ${fen}`)
    // movetime em ms: tempo que o motor vai calcular antes de responder
    workerRef.current.postMessage('go movetime 500')
  }, [fen, enabled])

  return { isBotThinking }
}
