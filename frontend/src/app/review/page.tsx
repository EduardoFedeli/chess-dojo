'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChessBoard } from '@/components/board/ChessBoard'
import { AdvantageBar } from '@/components/review/AdvantageBar'
import { AdvantageGraph } from '@/components/review/AdvantageGraph'
import { MoveSummary } from '@/components/review/MoveSummary'
import { PdfExportButton } from '@/components/review/PdfExportButton'
import { useStockfishAnalysis } from '@/hooks/useStockfishAnalysis'
import { classifyMoves, computeAccuracy, CLASSIFICATION_META } from '@/utils/move-classifier'
import type {
  AnalysisResult,
  GameMove,
  MoveClassification,
  SavedGame,
} from '@/types/game.types'
import { usePieceTheme } from '@/hooks/usePieceTheme'

const INITIAL_FEN    = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const STORAGE_GAME   = 'chess-dojo:last-game'
const STORAGE_ANALYSIS = 'chess-dojo:last-analysis'

// Classificações que merecem destaque visual na lista de jogadas.
// Boa e Excelente são omitidas — são jogadas normais e não precisam de badge.
const NOTABLE: Set<MoveClassification> = new Set([
  'brilliant', 'inaccuracy', 'mistake', 'missed_win', 'blunder',
])

// Badge colorido por classificação (só para classificações notáveis)
function MoveBadge({ classification }: { classification: MoveClassification }) {
  const meta = CLASSIFICATION_META[classification]
  return (
    <span
      className="rounded px-1 text-[8px] font-bold"
      style={{ background: `${meta.color}22`, color: meta.color }}
    >
      {meta.emoji}
    </span>
  )
}

function ReviewContent() {
  const router = useRouter()

  // --- Dados da partida — lidos do localStorage na inicialização (client-only) ---
  const [savedGame] = useState<SavedGame | null>(() => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_GAME)
    return raw ? (JSON.parse(raw) as SavedGame) : null
  })
  const [cachedResult, setCachedResult] = useState<AnalysisResult | null>(() => {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem(STORAGE_ANALYSIS)
    return raw ? (JSON.parse(raw) as AnalysisResult) : null
  })

  const { customPieces } = usePieceTheme()

  // --- Estado de replay ---
  const [currentIndex, setCurrentIndex] = useState(0) // 0 = posição inicial

  // --- Estado de análise profunda ---
  const [deepAnalysisEnabled, setDeepAnalysisEnabled] = useState(false)

  const [boardSize, setBoardSize] = useState(500)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBoardSize(Math.min(window.innerHeight - 140, 700))
  }, [])

  // Redireciona para home se não houver partida salva
  useEffect(() => {
    if (!savedGame) router.push('/')
  }, [savedGame, router])

  const moves = savedGame?.moves ?? []
  const fens  = [INITIAL_FEN, ...moves.map((m: GameMove) => m.fen)]

  // Análise profunda (depth 10) — só quando o usuário clica "Começar Análise"
  const { scores: deepScores, progress: deepProgress, isAnalyzing: isDeepAnalyzing } =
    useStockfishAnalysis({ fens, depth: 10, enabled: deepAnalysisEnabled })

  const deepReady = !isDeepAnalyzing && deepScores.length === fens.length && fens.length > 1

  // Quando análise profunda concluir, salvar no localStorage e atualizar cache
  useEffect(() => {
    if (!deepReady || deepScores.length === 0) return
    const evaluations = classifyMoves(deepScores, moves)
    const accuracy    = computeAccuracy(evaluations)
    const result: AnalysisResult = { evaluations, accuracy, date: new Date().toISOString() }
    localStorage.setItem(STORAGE_ANALYSIS, JSON.stringify(result))
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCachedResult(result)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeepAnalysisEnabled(false)
  }, [deepReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Determinar quais dados exibir: análise profunda concluída > cache
  const activeResult: AnalysisResult | null = deepReady
    ? (() => {
        const evaluations = classifyMoves(deepScores, moves)
        const accuracy    = computeAccuracy(evaluations)
        return { evaluations, accuracy, date: new Date().toISOString() }
      })()
    : cachedResult

  const activeScores = deepReady ? deepScores : null
  const graphScores: number[] = activeScores
    ?? (activeResult?.evaluations
        ? [
            activeResult.evaluations[0]?.scoreBefore ?? 0,
            ...activeResult.evaluations.map(e => e.scoreAfter),
          ]
        : [])

  // Precisão apenas das jogadas do jogador
  const playerAccuracy = activeResult
    ? computeAccuracy(
        activeResult.evaluations.filter((_, i) => moves[i]?.color === savedGame?.playerColor)
      )
    : null

  // --- Navegação ---
  const goTo    = useCallback((i: number) => setCurrentIndex(Math.max(0, Math.min(i, moves.length))), [moves.length])
  const goFirst = useCallback(() => goTo(0), [goTo])
  const goPrev  = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex])
  const goNext  = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex])
  const goLast  = useCallback(() => goTo(moves.length), [goTo, moves.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  // FEN atual para o tabuleiro
  const currentFen   = currentIndex === 0 ? INITIAL_FEN : moves[currentIndex - 1].fen
  // Score atual para a barra de vantagem
  const currentScore = graphScores[currentIndex] ?? 0

  if (!savedGame) return null

  const dateStr = new Date(savedGame.date).toLocaleDateString('pt-BR')
  const botName = savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)
  const scoreDisplay = currentScore === 0
    ? '0.0'
    : `${currentScore > 0 ? '+' : ''}${(currentScore / 100).toFixed(1)}`

  return (
    <main
      className="overflow-hidden"
      style={{
        height: '100vh',
        color: '#e5e7eb',
        background: 'radial-gradient(ellipse at center, #000000 0%, #0d1a0f 100%)',
      }}
    >
      {/* Botão voltar */}
      <div style={{ padding: '12px 24px' }}>
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-200"
        >
          ← Início
        </button>
      </div>

      {/* Container centralizado */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 24px',
          height: 'calc(100vh - 48px)',
          display: 'flex',
          gap: 24,
        }}
      >
        {/* COLUNA ESQUERDA: barra de vantagem + tabuleiro + controles + score */}
        <div className="flex shrink-0 items-center gap-3">
          {graphScores.length > 0 && (
            <AdvantageBar scoreCp={currentScore} height={boardSize} />
          )}
          <div className="flex flex-col items-center gap-3">
            {/* Tabuleiro read-only */}
            <div style={{ width: boardSize, height: boardSize }}>
              <ChessBoard
                fen={currentFen}
                playerColor={savedGame.playerColor}
                makeMove={(_from: string, _to: string) => null}
                onMove={() => {}}
                disabled={true}
                customPieces={customPieces}
              />
            </div>

            {/* Controles de navegação — centralizados */}
            <div className="flex justify-center gap-2">
              {[
                { label: '⏮', action: goFirst, title: 'Início' },
                { label: '◀',  action: goPrev,  title: 'Anterior (←)' },
                { label: '▶',  action: goNext,  title: 'Próximo (→)' },
                { label: '⏭', action: goLast,  title: 'Fim' },
              ].map(({ label, action, title }) => (
                <button
                  key={label}
                  onClick={action}
                  title={title}
                  className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Score numérico atual */}
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: currentScore >= 0 ? '#6B8F71' : '#f87171' }}
            >
              {scoreDisplay}
            </span>
          </div>
        </div>

        {/* COLUNA DIREITA: 420px, flex-col, 100% altura */}
        <div
          className="flex flex-col gap-3 min-h-0"
          style={{ width: 420, flexShrink: 0, height: '100%' }}
        >
          {/* 1. Cabeçalho */}
          <div className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-sm font-bold text-white">Revisão da Partida</span>
              <span className="text-xs text-neutral-500">📅 {dateStr}</span>
              <span className="text-xs text-neutral-500">🤖 vs {botName}</span>
              <span className="text-xs text-neutral-500">
                {savedGame.playerColor === 'white' ? '♔ Brancas' : '♚ Pretas'}
              </span>
              <span className="text-xs text-neutral-500">
                {savedGame.result === 'won'  ? '🏆 Vitória'
                : savedGame.result === 'lost' ? '😔 Derrota'
                : '🤝 Empate'}
              </span>
              <span className="text-xs text-neutral-600">{moves.length} jogadas</span>
            </div>
          </div>

          {/* Estado: analisando (profunda) */}
          {isDeepAnalyzing && (
            <div className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Análise profunda em andamento...
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(deepProgress * 100)}%`,
                    background: 'linear-gradient(90deg, #6B8F71, #EE964B)',
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs text-neutral-500">
                {deepScores.length} / {fens.length} posições (depth 10)
              </p>
            </div>
          )}

          {/* Estado: sem análise */}
          {!activeResult && !isDeepAnalyzing && (
            <button
              onClick={() => setDeepAnalysisEnabled(true)}
              className="shrink-0 w-full rounded-xl py-4 text-sm font-black tracking-wide transition-all hover:opacity-90"
              style={{ backgroundColor: '#6B8F71', color: '#000' }}
            >
              Começar Análise
            </button>
          )}

          {/* Estado: análise disponível */}
          {activeResult && !isDeepAnalyzing && (
            <>
              {/* 2. Gráfico compacto */}
              {graphScores.length > 0 && (
                <div className="shrink-0">
                  <AdvantageGraph
                    scores={graphScores}
                    currentIndex={currentIndex}
                    onMoveClick={goTo}
                    height={140}
                  />
                </div>
              )}

              {/* 3. Resumo — grid compacto 3 colunas */}
              <div className="shrink-0">
                <MoveSummary
                  evaluations={activeResult.evaluations}
                  accuracy={playerAccuracy ?? activeResult.accuracy}
                  compact
                />
              </div>

              {/* 4. Lista de jogadas — flex-1, scroll interno */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
                <p className="shrink-0 px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Jogadas
                </p>
                <div className="flex-1 overflow-y-auto px-4 pb-3" style={{ scrollbarWidth: 'thin' }}>
                  <div className="flex flex-col gap-0.5 text-[11px] font-mono">
                    {moves.reduce<{ white: GameMove; black: GameMove | null; wIdx: number; bIdx: number | null }[]>((rows, move, i) => {
                      if (i % 2 === 0) rows.push({ white: move, black: null, wIdx: i + 1, bIdx: null })
                      else { rows[rows.length - 1].black = move; rows[rows.length - 1].bIdx = i + 1 }
                      return rows
                    }, []).map((row, rowIdx) => {
                      const wEval   = activeResult.evaluations[rowIdx * 2]
                      const bEval   = activeResult.evaluations[rowIdx * 2 + 1]
                      const wActive = currentIndex === row.wIdx
                      const bActive = currentIndex === (row.bIdx ?? -1)
                      const showWBadge = wEval && row.white.color === savedGame.playerColor && NOTABLE.has(wEval.classification)
                      const showBBadge = bEval && row.black?.color === savedGame.playerColor && NOTABLE.has(bEval.classification)
                      return (
                        <div
                          key={rowIdx}
                          className="grid items-center gap-1"
                          style={{ gridTemplateColumns: '20px 1fr 1fr' }}
                        >
                          <span className="text-neutral-600">{rowIdx + 1}.</span>
                          <button
                            onClick={() => goTo(row.wIdx)}
                            className="flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-neutral-800"
                            style={{ background: wActive ? '#EE964B14' : undefined, color: wActive ? '#EE964B' : '#e5e7eb' }}
                          >
                            {row.white.san}
                            {showWBadge && <MoveBadge classification={wEval.classification} />}
                          </button>
                          {row.black ? (
                            <button
                              onClick={() => goTo(row.bIdx!)}
                              className="flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-neutral-800"
                              style={{ background: bActive ? '#EE964B14' : undefined, color: bActive ? '#EE964B' : '#9ca3af' }}
                            >
                              {row.black.san}
                              {showBBadge && <MoveBadge classification={bEval!.classification} />}
                            </button>
                          ) : (
                            <span className="text-neutral-700">—</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* 5. Botões fixos no rodapé da coluna */}
              <div className="flex shrink-0 flex-col gap-2">
                {cachedResult && !deepReady && (
                  <button
                    onClick={() => setDeepAnalysisEnabled(true)}
                    className="w-full rounded-xl border border-neutral-700 py-2 text-xs text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                  >
                    Re-analisar com depth 10 (mais preciso)
                  </button>
                )}
                <PdfExportButton
                  savedGame={savedGame}
                  result={activeResult}
                  playerAccuracy={playerAccuracy ?? activeResult.accuracy}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewContent />
    </Suspense>
  )
}
