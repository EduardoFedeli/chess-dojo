import { useCallback, useEffect, useRef, useState } from 'react'

type UseStockfishAnalysisOptions = {
  /**
   * Array de N+1 FENs: posição inicial + FEN após cada jogada.
   * Construir com: [initialFen, ...moves.map(m => m.fen)]
   */
  fens: string[]
  /** Milissegundos por posição. Ignorado se `depth` for definido. Padrão: 300 */
  movetime?: number
  /** Depth Stockfish por posição. Se definido, ignora movetime. */
  depth?: number
  /** Só inicia quando true. */
  enabled: boolean
}

type UseStockfishAnalysisReturn = {
  /** N+1 scores em centipawns, perspectiva brancas. Vazio enquanto analisa. */
  scores: number[]
  /** 0–1, atualizado conforme posições são avaliadas. */
  progress: number
  isAnalyzing: boolean
  /** Inicia manualmente. Chame após enabled = true se preferir controle explícito. */
  startAnalysis: () => void
}

/** Extrai o score da última linha "info ... score cp/mate N" recebida do worker. */
function parseScore(line: string, whiteToMove: boolean): number | null {
  const cpMatch = line.match(/score cp (-?\d+)/)
  if (cpMatch) {
    const score = parseInt(cpMatch[1], 10)
    // Score UCI é sempre da perspectiva do lado que joga — normalizar para brancas
    return whiteToMove ? score : -score
  }
  const mateMatch = line.match(/score mate (-?\d+)/)
  if (mateMatch) {
    const mate = parseInt(mateMatch[1], 10)
    // Mate positivo = lado que joga tem mate, negativo = vai ser mateado
    const mateScore = mate > 0 ? 100_000 : -100_000
    return whiteToMove ? mateScore : -mateScore
  }
  return null
}

export function useStockfishAnalysis({
  fens,
  movetime = 300,
  depth,
  enabled,
}: UseStockfishAnalysisOptions): UseStockfishAnalysisReturn {
  const workerRef    = useRef<Worker | null>(null)
  const isReadyRef   = useRef(false)
  const indexRef     = useRef(0)            // índice do FEN em avaliação
  const lastScoreRef = useRef<number>(0)    // último score lido antes do bestmove
  const scoresRef    = useRef<number[]>([]) // scores acumulados

  const [scores,      setScores]      = useState<number[]>([])
  const [progress,    setProgress]    = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [triggered,   setTriggered]   = useState(false)

  const analyzeNext = useCallback(() => {
    const worker = workerRef.current
    if (!worker || indexRef.current >= fens.length) return

    const fen       = fens[indexRef.current]
    const isWhite   = fen.split(' ')[1] === 'w'
    // Guardamos para uso no handler de mensagem
    ;(worker as any).__whiteToMove = isWhite

    worker.postMessage(`position fen ${fen}`)
    if (depth !== undefined) {
      worker.postMessage(`go depth ${depth}`)
    } else {
      worker.postMessage(`go movetime ${movetime}`)
    }
  }, [fens, depth, movetime])

  const startAnalysis = useCallback(() => {
    setTriggered(true)
  }, [])

  // Inicializa worker uma única vez
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

      // Captura o último score antes do bestmove
      if (line.startsWith('info') && line.includes('score')) {
        const whiteToMove = (worker as any).__whiteToMove ?? true
        const parsed = parseScore(line, whiteToMove)
        if (parsed !== null) lastScoreRef.current = parsed
        return
      }

      if (line.startsWith('bestmove')) {
        const score = lastScoreRef.current
        scoresRef.current.push(score)

        const newScores  = [...scoresRef.current]
        const newProgress = newScores.length / fens.length
        setScores(newScores)
        setProgress(newProgress)

        indexRef.current += 1

        if (indexRef.current >= fens.length) {
          // Análise concluída
          setIsAnalyzing(false)
          return
        }

        // Avança para o próximo FEN
        analyzeNext()
      }
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      isReadyRef.current = false
    }
  }, []) // worker criado uma única vez

  // Dispara análise quando enabled e triggered
  useEffect(() => {
    if (!enabled || !triggered || isAnalyzing || fens.length === 0) return
    if (!isReadyRef.current) {
      // Ainda não pronto — tentar novamente em 200ms
      const t = setTimeout(() => setTriggered(prev => prev), 200)
      return () => clearTimeout(t)
    }

    // Reset state
    indexRef.current  = 0
    scoresRef.current = []
    lastScoreRef.current = 0
    setScores([])
    setProgress(0)
    setIsAnalyzing(true)

    workerRef.current?.postMessage('ucinewgame')
    analyzeNext()
  }, [enabled, triggered, isAnalyzing, fens, analyzeNext])

  // Disparo automático quando enabled muda para true
  useEffect(() => {
    if (enabled) setTriggered(true)
  }, [enabled])

  return { scores, progress, isAnalyzing, startAnalysis }
}
