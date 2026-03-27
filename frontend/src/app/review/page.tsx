'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChessBoard } from '@/components/board/ChessBoard'
import { AdvantageBar } from '@/components/review/AdvantageBar'
import { AdvantageGraph } from '@/components/review/AdvantageGraph'
import { MoveSummary } from '@/components/review/MoveSummary'
import { useStockfishAnalysis } from '@/hooks/useStockfishAnalysis'
import { classifyMoves, computeAccuracy, CLASSIFICATION_META } from '@/utils/move-classifier'
import type {
  AnalysisResult,
  GameMove,
  MoveClassification,
  SavedGame,
} from '@/types/game.types'

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const STORAGE_GAME     = 'chess-dojo:last-game'
const STORAGE_ANALYSIS = 'chess-dojo:last-analysis'

// Badge colorido por classificação para a lista de jogadas
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

  // --- Estado de replay ---
  const [currentIndex, setCurrentIndex] = useState(0) // 0 = posição inicial

  // --- Estado de análise profunda ---
  const [deepAnalysisEnabled, setDeepAnalysisEnabled] = useState(false)

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
  // Para o gráfico, usamos os scores da análise profunda ou os do cache
  // (cachedResult não guarda scores raw, apenas evaluations — usar scoreBefore/After)
  const graphScores: number[] = activeScores
    ?? (activeResult?.evaluations
        ? [
            activeResult.evaluations[0]?.scoreBefore ?? 0,
            ...activeResult.evaluations.map(e => e.scoreAfter),
          ]
        : [])

  // --- Navegação ---
  const goTo       = useCallback((i: number) => setCurrentIndex(Math.max(0, Math.min(i, moves.length))), [moves.length])
  const goFirst    = useCallback(() => goTo(0), [goTo])
  const goPrev     = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex])
  const goNext     = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex])
  const goLast     = useCallback(() => goTo(moves.length), [goTo, moves.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft')  goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  // FEN atual para o tabuleiro
  const currentFen = currentIndex === 0 ? INITIAL_FEN : moves[currentIndex - 1].fen
  // Score atual para a barra de vantagem
  const currentScore = graphScores[currentIndex] ?? 0

  if (!savedGame) return null

  // Formatar data
  const dateStr = new Date(savedGame.date).toLocaleDateString('pt-BR')

  return (
    <main
      className="min-h-screen p-6 md:p-10"
      style={{ backgroundColor: '#0a0a0a', color: '#e5e7eb' }}
    >
      <div className="mx-auto flex max-w-[900px] flex-col gap-6 md:flex-row md:items-start md:gap-8">

        {/* ESQUERDA: barra de vantagem + tabuleiro + controles */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-start gap-3">
            {/* Barra de vantagem — só com análise */}
            {graphScores.length > 0 && (
              <AdvantageBar scoreCp={currentScore} />
            )}

            {/* Tabuleiro read-only */}
            <div style={{ width: 400 }}>
              <ChessBoard
                fen={currentFen}
                playerColor={savedGame.playerColor}
                makeMove={(_from: string, _to: string) => null}
                onMove={() => {}}
                disabled={true}
              />
            </div>
          </div>

          {/* Controles de navegação */}
          <div className="flex gap-2">
            {[
              { label: '⏮', action: goFirst,  title: 'Início' },
              { label: '◀',  action: goPrev,   title: 'Anterior (←)' },
              { label: '▶',  action: goNext,   title: 'Próximo (→)' },
              { label: '⏭', action: goLast,   title: 'Fim' },
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
        </div>

        {/* DIREITA: painel de análise */}
        <div className="flex flex-1 flex-col gap-4">

          {/* Cabeçalho da partida */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-base font-bold text-white">Revisão da Partida</p>
            <ul className="mt-2 space-y-0.5 text-sm text-neutral-400">
              <li>📅 {dateStr}</li>
              <li>🤖 vs {savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)}</li>
              <li>{savedGame.playerColor === 'white' ? '♔ Brancas' : '♚ Pretas'}</li>
              <li>
                {savedGame.result === 'won'  ? '🏆 Vitória'
                : savedGame.result === 'lost' ? '😔 Derrota'
                : '🤝 Empate'} — {moves.length} jogadas
              </li>
            </ul>
          </div>

          {/* Estado: analisando (profunda) */}
          {isDeepAnalyzing && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
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

          {/* Estado: sem análise — botão "Começar Análise" */}
          {!activeResult && !isDeepAnalyzing && (
            <button
              onClick={() => setDeepAnalysisEnabled(true)}
              className="w-full rounded-xl py-4 text-sm font-black tracking-wide transition-all hover:opacity-90"
              style={{ backgroundColor: '#6B8F71', color: '#000' }}
            >
              Começar Análise
            </button>
          )}

          {/* Estado: análise disponível (cache ou profunda) */}
          {activeResult && !isDeepAnalyzing && (
            <>
              {/* Gráfico */}
              {graphScores.length > 0 && (
                <AdvantageGraph
                  scores={graphScores}
                  currentIndex={currentIndex}
                  onMoveClick={goTo}
                />
              )}

              {/* Resumo */}
              <MoveSummary
                evaluations={activeResult.evaluations}
                accuracy={activeResult.accuracy}
              />

              {/* Lista de jogadas com badges */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  Jogadas
                </p>
                <div
                  className="max-h-64 overflow-y-auto"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  <div className="flex flex-col gap-0.5 text-[11px] font-mono">
                    {moves.reduce<{ white: GameMove; black: GameMove | null; wIdx: number; bIdx: number | null }[]>((rows, move, i) => {
                      if (i % 2 === 0) rows.push({ white: move, black: null, wIdx: i + 1, bIdx: null })
                      else { rows[rows.length - 1].black = move; rows[rows.length - 1].bIdx = i + 1 }
                      return rows
                    }, []).map((row, rowIdx) => {
                      const wEval = activeResult.evaluations[rowIdx * 2]
                      const bEval = activeResult.evaluations[rowIdx * 2 + 1]
                      const wActive = currentIndex === row.wIdx
                      const bActive = currentIndex === (row.bIdx ?? -1)
                      return (
                        <div
                          key={rowIdx}
                          className="grid items-center gap-1"
                          style={{ gridTemplateColumns: '20px 1fr 1fr' }}
                        >
                          <span className="text-neutral-600">{rowIdx + 1}.</span>
                          {/* Brancas */}
                          <button
                            onClick={() => goTo(row.wIdx)}
                            className="flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-neutral-800"
                            style={{ background: wActive ? '#EE964B14' : undefined, color: wActive ? '#EE964B' : '#e5e7eb' }}
                          >
                            {row.white.san}
                            {wEval && <MoveBadge classification={wEval.classification} />}
                          </button>
                          {/* Pretas */}
                          {row.black ? (
                            <button
                              onClick={() => goTo(row.bIdx!)}
                              className="flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-neutral-800"
                              style={{ background: bActive ? '#EE964B14' : undefined, color: bActive ? '#EE964B' : '#9ca3af' }}
                            >
                              {row.black.san}
                              {bEval && <MoveBadge classification={bEval.classification} />}
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

              {/* Re-analisar com depth 10 */}
              {cachedResult && !deepReady && (
                <button
                  onClick={() => setDeepAnalysisEnabled(true)}
                  className="w-full rounded-xl border border-neutral-700 py-2 text-xs text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300"
                >
                  Re-analisar com depth 10 (mais preciso)
                </button>
              )}

              {/* Botão PDF */}
              <PdfExportButton savedGame={savedGame} result={activeResult} scores={graphScores} />
            </>
          )}

        </div>
      </div>
    </main>
  )
}

function PdfExportButton({
  savedGame,
  result,
  scores: _scores,
}: {
  savedGame: SavedGame
  result: AnalysisResult
  scores: number[]
}) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const { default: jsPDF }    = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')

      const el = document.getElementById('pdf-content')
      if (!el) return

      el.style.display = 'block'
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 })
      el.style.display = 'none'

      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })
      const pdfW     = pdf.internal.pageSize.getWidth()
      const pdfH     = (canvas.height * pdfW) / canvas.width
      const imgData  = canvas.toDataURL('image/png')

      // Se o conteúdo for mais alto que uma página, adicionar páginas extras
      const pageH = pdf.internal.pageSize.getHeight()
      if (pdfH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      } else {
        let yOffset = 0
        while (yOffset < pdfH) {
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, pdfH)
          yOffset += pageH
          if (yOffset < pdfH) pdf.addPage()
        }
      }

      const date = new Date(savedGame.date).toISOString().slice(0, 10)
      pdf.save(`chess-dojo-revisao-${date}.pdf`)
    } finally {
      setIsExporting(false)
    }
  }

  const dateStr = new Date(savedGame.date).toLocaleDateString('pt-BR')
  const counts  = (Object.keys(CLASSIFICATION_META) as MoveClassification[]).reduce(
    (acc, key) => { acc[key] = result.evaluations.filter(e => e.classification === key).length; return acc },
    {} as Record<MoveClassification, number>,
  )
  const moves = savedGame.moves

  return (
    <>
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full rounded-xl border border-neutral-700 py-3 text-sm font-semibold text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? 'Gerando PDF...' : '⬇ Baixar Revisão em PDF'}
      </button>

      {/* Elemento capturado pelo html2canvas — oculto na UI normal */}
      <div
        id="pdf-content"
        style={{
          display:    'none',
          position:   'fixed',
          top:        0,
          left:       0,
          width:      700,
          background: '#ffffff',
          color:      '#111111',
          fontFamily: 'system-ui, sans-serif',
          padding:    40,
          zIndex:     -1,
        }}
      >
        {/* Cabeçalho */}
        <div style={{ borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>♟ Chess Dojo — Revisão de Partida</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
            {dateStr} · vs {savedGame.botLevel} ·{' '}
            {savedGame.playerColor === 'white' ? 'Brancas' : 'Pretas'} ·{' '}
            <strong>
              {savedGame.result === 'won' ? 'Vitória' : savedGame.result === 'lost' ? 'Derrota' : 'Empate'}
            </strong>
          </div>
        </div>

        {/* Precisão */}
        <div style={{ background: '#f5f5f5', borderRadius: 6, padding: '8px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Precisão:</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#2d6a4f' }}>{result.accuracy}%</span>
        </div>

        {/* Cards de categorias */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map(key => {
            const meta = CLASSIFICATION_META[key]
            return (
              <div key={key} style={{ background: '#f0f0f0', borderRadius: 6, padding: 8, textAlign: 'center', fontSize: 11 }}>
                <div style={{ fontSize: 18 }}>{meta.emoji}</div>
                <div>{meta.label}</div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{counts[key]}</div>
              </div>
            )
          })}
        </div>

        {/* Gráfico — placeholder */}
        <div id="pdf-graph-placeholder" style={{ background: '#eee', height: 80, borderRadius: 6, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888' }}>
          [gráfico de vantagem]
        </div>

        {/* Lista de jogadas */}
        <div style={{ fontSize: 11, fontFamily: 'monospace', columns: 2, columnGap: 24 }}>
          {moves.map((move, i) => {
            const ev   = result.evaluations[i]
            const meta = ev ? CLASSIFICATION_META[ev.classification] : null
            const num  = i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''
            return (
              <div key={i} style={{ lineHeight: 2, breakInside: 'avoid' }}>
                {num}{move.san} {meta?.emoji ?? ''}
              </div>
            )
          })}
        </div>

        {/* Rodapé */}
        <div style={{ borderTop: '1px solid #ddd', marginTop: 24, paddingTop: 8, fontSize: 10, color: '#999', textAlign: 'center' }}>
          chess-dojo-revisao-{new Date(savedGame.date).toISOString().slice(0, 10)}.pdf · Chess Dojo
        </div>
      </div>
    </>
  )
}

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewContent />
    </Suspense>
  )
}
