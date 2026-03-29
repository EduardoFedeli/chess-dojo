import { useEffect, useRef, useState } from 'react'

type BestMove = { from: string; to: string }

type UseBestMoveReturn = {
  bestMove: BestMove | null
  isLoading: boolean
  query: (fen: string) => void
  clear: () => void
}

export function useBestMove(): UseBestMoveReturn {
  const workerRef    = useRef<Worker | null>(null)
  const isReadyRef   = useRef(false)
  const [bestMove,   setBestMove]   = useState<BestMove | null>(null)
  const [isLoading,  setIsLoading]  = useState(false)

  useEffect(() => {
    const worker = new Worker('/stockfish-18-lite-single.js')
    workerRef.current = worker

    worker.postMessage('uci')
    worker.postMessage('isready')

    worker.onmessage = (event: MessageEvent<string>) => {
      const line = event.data

      if (line === 'readyok') {
        isReadyRef.current = true
        return
      }

      if (line.startsWith('bestmove')) {
        const parts = line.split(' ')
        const move  = parts[1]
        if (!move || move === '(none)') {
          setBestMove(null)
        } else {
          setBestMove({ from: move.slice(0, 2), to: move.slice(2, 4) })
        }
        setIsLoading(false)
      }
    }

    return () => {
      worker.terminate()
      workerRef.current  = null
      isReadyRef.current = false
    }
  }, [])

  function query(fen: string) {
    if (!workerRef.current || !isReadyRef.current) return
    setBestMove(null)
    setIsLoading(true)
    workerRef.current.postMessage('ucinewgame')
    workerRef.current.postMessage(`position fen ${fen}`)
    workerRef.current.postMessage('go movetime 800')
  }

  function clear() {
    setBestMove(null)
    setIsLoading(false)
  }

  return { bestMove, isLoading, query, clear }
}
