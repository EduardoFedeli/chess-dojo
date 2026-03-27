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
  const [isReady,   setIsReady]   = useState(false)
  const indexRef     = useRef(0)            // índice do FEN em avaliação
  const lastScoreRef = useRef<number>(0)    // último score lido antes do bestmove
  const scoresRef    = useRef<number[]>([]) // scores acumulados

  const [scores,      setScores]      = useState<number[]>([])
  const [progress,    setProgress]    = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [triggered,   setTriggered]   = useState(false)

  // Ref mantida em sincronia com o prop fens durante cada render.
  // Permite que o onmessage do worker (closure estática) leia sempre a lista
  // de FENs mais recente, sem precisar recriar o handler.
  const fensRef = useRef<string[]>(fens)
  fensRef.current = fens

  // analyzeNextRef: atualizado a cada render para que o onmessage do worker
  // chame a versão mais recente (com depth/movetime atuais) sem recriar o handler.
  const analyzeNextRef = useRef<() => void>(() => {})
  analyzeNextRef.current = () => {
    const worker = workerRef.current
    if (!worker || indexRef.current >= fensRef.current.length) return

    const fen     = fensRef.current[indexRef.current]
    const isWhite = fen.split(' ')[1] === 'w'
    ;(worker as Worker & { __whiteToMove?: boolean }).__whiteToMove = isWhite

    worker.postMessage(`position fen ${fen}`)
    if (depth !== undefined) {
      worker.postMessage(`go depth ${depth}`)
    } else {
      worker.postMessage(`go movetime ${movetime}`)
    }
  }

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
        setIsReady(true)
        return
      }

      // Captura o último score antes do bestmove
      if (line.startsWith('info') && line.includes('score')) {
        const whiteToMove = (worker as Worker & { __whiteToMove?: boolean }).__whiteToMove ?? true
        const parsed = parseScore(line, whiteToMove)
        if (parsed !== null) lastScoreRef.current = parsed
        return
      }

      if (line.startsWith('bestmove')) {
        const score = lastScoreRef.current
        scoresRef.current.push(score)

        const newScores = [...scoresRef.current]
        const total     = fensRef.current.length // sempre o valor mais recente via ref
        setScores(newScores)
        setProgress(total > 0 ? newScores.length / total : 0)

        indexRef.current += 1

        if (indexRef.current >= total) {
          // Análise concluída — reseta triggered para evitar loop de reinício
          setIsAnalyzing(false)
          setTriggered(false)
          return
        }

        // Avança para o próximo FEN via ref (sem stale closure)
        analyzeNextRef.current()
      }
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      isReadyRef.current = false
      setIsReady(false)
    }
  }, []) // worker criado uma única vez

  // Dispara análise quando enabled e triggered
  useEffect(() => {
    if (!enabled || !triggered || isAnalyzing) return
    if (fensRef.current.length === 0) return
    if (!isReadyRef.current) return // re-dispara quando isReady mudar

    // Reset state before starting a new analysis run
    indexRef.current     = 0
    scoresRef.current    = []
    lastScoreRef.current = 0
    setScores([])        // eslint-disable-line react-hooks/set-state-in-effect
    setProgress(0)       // eslint-disable-line react-hooks/set-state-in-effect
    setIsAnalyzing(true) // eslint-disable-line react-hooks/set-state-in-effect

    workerRef.current?.postMessage('ucinewgame')
    analyzeNextRef.current()
  // fens e analyzeNext removidos das deps: usamos refs para ler sempre o valor atual
  }, [enabled, triggered, isAnalyzing, isReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Disparo automático quando enabled muda para true
  useEffect(() => {
    if (enabled) setTriggered(true) // eslint-disable-line react-hooks/set-state-in-effect
  }, [enabled])

  return { scores, progress, isAnalyzing, startAnalysis }
}
