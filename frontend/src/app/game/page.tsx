'use client'

// Esta página é um Client Component porque usa hooks do React (useSearchParams).
// useSearchParams() exige um Suspense boundary no Next.js App Router —
// a lógica fica em GameContent e o export default envolve com <Suspense>.

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useGame } from '@/hooks/useGame'
import { useStockfish } from '@/hooks/useStockfish'
import { ChessBoard } from '@/components/board/ChessBoard'
import type { BoardTheme } from '@/components/board/ChessBoard'
import type { BotLevel, GameStatus, PieceColor } from '@/types/game.types'
import { buildMovesString } from '@/utils/pgn-builder'
import type { SavedGame } from '@/types/game.types'
import { useStockfishAnalysis } from '@/hooks/useStockfishAnalysis'
import { classifyMoves, computeAccuracy, CLASSIFICATION_META } from '@/utils/move-classifier'
import type { AnalysisResult, MoveClassification } from '@/types/game.types'
import { MoveHistory } from '@/components/game/MoveHistory'
import { usePieceTheme, PIECE_THEMES } from '@/hooks/usePieceTheme'
import { playMoveSound, playCaptureSound, playCheckSound, playGameEndSound } from '@/utils/sound'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BOTS } from '@/data/bots'


const SKILL_LEVEL: Record<BotLevel, number> = {
  filhote:       0,
  iniciante:     3,
  amador:        6,
  intermediario: 10,
  avancado:      14,
  guerreiro:     17,
  mestre:        20,
}

const GAME_OVER_MESSAGE: Record<Exclude<GameStatus, 'playing'>, string> = {
  won:  'Você venceu! 🏆',
  lost: 'Você perdeu 😔',
  draw: 'Empate 🤝',
}

// Temas de tabuleiro: dois quadrados de preview + estilos passados ao Chessboard
const BOARD_THEMES: Record<string, { label: string; theme: BoardTheme }> = {
  classico:  { label: 'Clássico',  theme: { lightSquareStyle: { backgroundColor: '#F0D9B5' }, darkSquareStyle: { backgroundColor: '#B58863' } } },
  esmeralda: { label: 'Esmeralda', theme: { lightSquareStyle: { backgroundColor: '#FFFFDD' }, darkSquareStyle: { backgroundColor: '#6B8F71' } } },
  noite:     { label: 'Noite',     theme: { lightSquareStyle: { backgroundColor: '#DEE3E6' }, darkSquareStyle: { backgroundColor: '#8CA2AD' } } },
  marrom:    { label: 'Marrom',    theme: { lightSquareStyle: { backgroundColor: '#EDD6A1' }, darkSquareStyle: { backgroundColor: '#813405' } } },
  ardosia:   { label: 'Ardósia',   theme: { lightSquareStyle: { backgroundColor: '#C8C9C5' }, darkSquareStyle: { backgroundColor: '#4A4A4A' } } },
}

const THEME_STORAGE_KEY = 'chess-dojo:board-theme'
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// --- INÍCIO: LÓGICA DE PEÇAS CAPTURADAS ---
const PIECE_UNICODE: Record<string, { white: string; black: string }> = {
  p: { white: '♙', black: '♟' },
  n: { white: '♘', black: '♞' },
  b: { white: '♗', black: '♝' },
  r: { white: '♖', black: '♜' },
  q: { white: '♕', black: '♛' },
}

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 }
const INITIAL_COUNTS: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 }

function calculateCaptures(fen: string) {
  const boardStr = fen.split(' ')[0]
  const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } }

  for (const char of boardStr) {
    if (char >= 'a' && char <= 'z') counts.b[char as keyof typeof counts.b]++
    else if (char >= 'A' && char <= 'Z') counts.w[char.toLowerCase() as keyof typeof counts.w]++
  }

  const capturedByWhite: string[] = [] 
  const capturedByBlack: string[] = [] 
  let whiteScore = 0
  let blackScore = 0

  for (const p of Object.keys(PIECE_VALUES)) {
    const key = p as keyof typeof counts.w
    const val = PIECE_VALUES[p]
    
    for (let i = 0; i < INITIAL_COUNTS[key] - counts.b[key]; i++) capturedByWhite.push(p)
    for (let i = 0; i < INITIAL_COUNTS[key] - counts.w[key]; i++) capturedByBlack.push(p)

    whiteScore += counts.w[key] * val
    blackScore += counts.b[key] * val
  }

  const order = ['p', 'n', 'b', 'r', 'q']
  capturedByWhite.sort((a, b) => order.indexOf(a) - order.indexOf(b))
  capturedByBlack.sort((a, b) => order.indexOf(a) - order.indexOf(b))

  const diff = whiteScore - blackScore

  return {
    capturedByWhite,
    capturedByBlack,
    whiteAdvantage: diff > 0 ? diff : 0,
    blackAdvantage: diff < 0 ? -diff : 0,
  }
}

// O componente que desenha a fileira de pecinhas
function CapturedPiecesRow({ pieces, pieceColor, advantage }: { pieces: string[], pieceColor: 'white'|'black', advantage: number }) {
  if (pieces.length === 0 && advantage === 0) return null
  return (
    <div className="flex items-center gap-1.5 mt-1.5 h-5 overflow-hidden">
      <div className="flex -space-x-1">
        {pieces.map((p, i) => (
          <span 
            key={i} 
            className="text-lg leading-none drop-shadow-md"
            style={{ color: pieceColor === 'white' ? '#e5e7eb' : '#1f2937' }}
          >
            {PIECE_UNICODE[p][pieceColor]}
          </span>
        ))}
      </div>
      {advantage > 0 && <span className="text-xs font-bold text-neutral-400 ml-1">+{advantage}</span>}
    </div>
  )
}
// --- FIM: LÓGICA DE PEÇAS CAPTURADAS ---

function GameContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const botParam   = (searchParams.get('bot')   ?? 'iniciante') as BotLevel
  const colorParam = (searchParams.get('color') ?? 'white')     as PieceColor

  const skillLevel = SKILL_LEVEL[botParam] ?? 2
  const currentBot = BOTS.find(b => b.level === botParam) ?? null

  const { fen, makeMove, status, resign, moves } = useGame(colorParam)

  // Ativando o cálculo de capturas em tempo real
  const captureData = useMemo(() => calculateCaptures(fen), [fen])
  const playerCaptures  = colorParam === 'white' ? captureData.capturedByWhite : captureData.capturedByBlack
  const botCaptures     = colorParam === 'white' ? captureData.capturedByBlack : captureData.capturedByWhite
  const playerAdvantage = colorParam === 'white' ? captureData.whiteAdvantage : captureData.blackAdvantage
  const botAdvantage    = colorParam === 'white' ? captureData.blackAdvantage : captureData.whiteAdvantage
  const [resignConfirm, setResignConfirm] = useState(false)

  const [boardSize, setBoardSize] = useState(500)
  useEffect(() => {
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      // Desconta exatamente 32px (que é o padding p-4 do container)
      setBoardSize(window.innerWidth - 32)
    } else {
      setBoardSize(Math.min(window.innerHeight - 120, 700))
    }
  }, [])

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('chess-dojo:sound-enabled') !== 'false'
  })

  function handleSoundToggle() {
    const next = !soundEnabled
    setSoundEnabled(next)
    localStorage.setItem('chess-dojo:sound-enabled', String(next))
  }

  const [settingsOpen, setSettingsOpen] = useState(false)

  const [activeTheme, setActiveTheme] = useState<string>(() => {
    if (typeof window === 'undefined') return 'classico'
    // Migra da chave anterior 'chess-board-theme' se a nova ainda não existir
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
      ?? localStorage.getItem('chess-board-theme')
    return (saved && saved in BOARD_THEMES) ? saved : 'classico'
  })

  // Persiste a partida no localStorage ao fim do jogo
  useEffect(() => {
    if (status === 'playing' || moves.length === 0) return

    const saved: SavedGame = {
      pgn:         buildMovesString(moves),
      botLevel:    botParam,
      playerColor: colorParam,
      result:      status,
      date:        new Date().toISOString(),
      moves,
    }
    localStorage.setItem('chess-dojo:last-game', JSON.stringify(saved))
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleThemeChange(key: string) {
    setActiveTheme(key)
    localStorage.setItem(THEME_STORAGE_KEY, key)
  }

  const { customPieces, activeTheme: activePieceTheme, setTheme: setPieceTheme } = usePieceTheme()

  const { isBotThinking } = useStockfish({
    skillLevel,
    fen,
    makeMove,
    enabled: status === 'playing',
    playerColor: colorParam,
  })

  const isGameOver = status !== 'playing'

  const [overlayVisible, setOverlayVisible] = useState(false)

  useEffect(() => {
    if (!isGameOver) { setOverlayVisible(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    const lastColor = moves[moves.length - 1]?.color
    const botFinished = lastColor && lastColor !== colorParam
    if (botFinished) {
      const t = setTimeout(() => setOverlayVisible(true), 500)
      return () => clearTimeout(t)
    }
    setOverlayVisible(true)
  }, [isGameOver]) // eslint-disable-line react-hooks/exhaustive-deps

  const lastMoveColor = moves[moves.length - 1]?.color
  const animDuration  = lastMoveColor && lastMoveColor !== colorParam ? 400 : 300

  const analysisFens = useMemo(
    () => isGameOver ? [INITIAL_FEN, ...moves.map(m => m.fen)] : [],
    [isGameOver, moves]
  )

  const { scores, progress, isAnalyzing } = useStockfishAnalysis({
    fens:     analysisFens,
    movetime: 300,
    enabled:  isGameOver && moves.length > 0,
  })

  const analysisReady = !isAnalyzing && scores.length === analysisFens.length && analysisFens.length > 1
  const evaluations   = analysisReady ? classifyMoves(scores, moves) : []
  const accuracy      = analysisReady ? computeAccuracy(evaluations) : 0

  // Persiste análise no localStorage quando concluída
  useEffect(() => {
    if (!analysisReady || evaluations.length === 0) return
    const result: AnalysisResult = {
      evaluations,
      accuracy,
      date: new Date().toISOString(),
    }
    localStorage.setItem('chess-dojo:last-analysis', JSON.stringify(result))
  }, [analysisReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // Som de xeque: dispara quando a última jogada é xeque mas não xeque-mate
  useEffect(() => {
    const last = moves[moves.length - 1]
    if (last?.isCheck && !last.isCheckmate) playCheckSound()
  }, [moves])

  // Som de fim de jogo: dispara uma vez quando o status muda para fora de 'playing'
  useEffect(() => {
    if (status !== 'playing') playGameEndSound()
  }, [status])

  // Som do bot: detecta quando o último lance é do bot e toca o som adequado
  useEffect(() => {
    const last = moves[moves.length - 1]
    if (!last || last.color === colorParam) return
    if (last.isCapture) playCaptureSound()
    else playMoveSound()
  }, [moves]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="relative flex min-h-[100dvh] w-screen flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-4 md:h-[100dvh] md:flex-row md:overflow-hidden">
      {/* Wrapper: tabuleiro + painel lado a lado no desktop, coluna no mobile */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-6 w-full md:w-auto">

        {/* Coluna esquerda: tabuleiro + controles */}
        <div className="flex flex-col gap-2 md:gap-4 mx-auto md:mx-0" style={{ width: boardSize, flexShrink: 0 }}>
          
          {/* --- HEADER DO BOT (VISÍVEL APENAS NO MOBILE) --- */}
          {currentBot && (
            <div className="flex flex-col md:hidden px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">⚔ {currentBot.name}</span>
                <span className="text-[10px] font-bold text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded">
                  {currentBot.rating}
                </span>
              </div>
              <CapturedPiecesRow 
                pieces={botCaptures} 
                pieceColor={colorParam === 'white' ? 'white' : 'black'} 
                advantage={botAdvantage} 
              />
            </div>
          )}

          {/* TABULEIRO */}
          <div style={{ width: boardSize, height: boardSize }}>
            <ChessBoard
              fen={fen}
              playerColor={colorParam}
              makeMove={makeMove}
              onMove={(move) => {
                if (move.isCapture) playCaptureSound()
                else playMoveSound()
              }}
              disabled={isBotThinking || isGameOver}
              theme={BOARD_THEMES[activeTheme].theme}
              customPieces={customPieces}
              animationDuration={animDuration}
            />
          </div>

          {/* --- HEADER DO JOGADOR (VISÍVEL APENAS NO MOBILE) --- */}
          <div className="flex flex-col md:hidden px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">♟ Você</span>
            </div>
            <CapturedPiecesRow 
              pieces={playerCaptures} 
              pieceColor={colorParam === 'white' ? 'black' : 'white'} 
              advantage={playerAdvantage} 
            />
          </div>

          {/* Linha inferior: seletor de tema (esquerda) + desistir (direita) */}

          {/* Linha inferior: seletor de tema (esquerda) + desistir (direita) */}
          {/* Usamos flex-wrap para que, se apertar muito, o botão de desistir vá para baixo */}
          <div className="flex flex-wrap items-center justify-between gap-y-3 mt-1">
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(BOARD_THEMES).map(([key, { label, theme }]) => {
                const isActive = activeTheme === key
                return (
                  <button
                    key={key}
                    title={label}
                    onClick={() => handleThemeChange(key)}
                    className={[
                      'flex overflow-hidden rounded-md border-2 transition-colors',
                      isActive ? 'border-white' : 'border-transparent hover:border-neutral-500',
                    ].join(' ')}
                  >
                    <span className="block h-5 w-5" style={theme.lightSquareStyle} />
                    <span className="block h-5 w-5" style={theme.darkSquareStyle} />
                  </button>
                )
              })}
              <button
                onClick={() => setSettingsOpen(true)}
                className="rounded-md border border-neutral-700 p-1 text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white"
                title="Configurações"
              >
                <Settings size={14} />
              </button>
            </div>

            {!isGameOver && (
              resignConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm text-neutral-400">Certeza?</span>
                  <button
                    onClick={() => { resign(); setResignConfirm(false) }}
                    className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 md:px-4 md:py-2 md:text-sm"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setResignConfirm(false)}
                    className="rounded-lg border border-neutral-600 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-neutral-400 hover:text-white md:px-4 md:py-2 md:text-sm"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResignConfirm(true)}
                  className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:border-red-700 hover:text-red-400 md:px-4 md:py-2 md:text-sm"
                >
                  Desistir
                </button>
              )
            )}
          </div>
        </div>

        {/* Coluna direita: bot info + histórico + player info */}
        <div className="hidden md:flex flex-col gap-3 w-full md:w-auto md:flex-shrink-0" style={{ height: boardSize }}>
          
          {/* Header do Bot (Em cima) */}
          {currentBot && (
            <div className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">⚔ {currentBot.name}</span>
                <span className="text-xs font-bold text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded">
                  {currentBot.rating} ELO
                </span>
              </div>
              <CapturedPiecesRow 
                pieces={botCaptures} 
                pieceColor={colorParam === 'white' ? 'white' : 'black'} 
                advantage={botAdvantage} 
              />
            </div>
          )}

          {/* Histórico de Jogadas (No meio) */}
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden shadow-sm border border-neutral-800 bg-neutral-950">
            <MoveHistory moves={moves} />
          </div>

          {/* Header do Jogador (Embaixo) */}
          <div className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">♟ Você</span>
            </div>
            <CapturedPiecesRow 
              pieces={playerCaptures} 
              pieceColor={colorParam === 'white' ? 'black' : 'white'} 
              advantage={playerAdvantage} 
            />
          </div>

        </div>
      </div>

      {/* Overlay de fim de jogo */}
      {overlayVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          {/* w-[92%] para caber bem no mobile, max-w-md no mobile e max-w-lg no PC para ficar grandão */}
          <div className="flex flex-col items-center gap-5 md:gap-6 rounded-2xl bg-neutral-900 px-6 py-8 md:px-12 md:py-10 text-center shadow-2xl w-[92%] max-w-md md:max-w-lg">

            {/* Resultado */}
            <p className="text-2xl font-bold text-white">
              {GAME_OVER_MESSAGE[status as Exclude<GameStatus, 'playing'>]}
            </p>

            {/* Estado A: analisando */}
            {isAnalyzing && (
              <div className="w-full rounded-xl bg-neutral-800 px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Analisando partida...
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-700">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width:      `${Math.round(progress * 100)}%`,
                      background: 'linear-gradient(90deg, #6B8F71, #EE964B)',
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {scores.length} / {analysisFens.length} posições
                </p>
              </div>
            )}

            {/* Estado B: análise concluída */}
            {analysisReady && (
              <>
                {/* Precisão */}
                <div
                  className="rounded-lg px-6 py-2"
                  style={{ background: '#6B8F7118', border: '1px solid #6B8F7144' }}
                >
                  <span className="text-sm text-neutral-400">Precisão: </span>
                  <span className="text-xl font-black" style={{ color: '#6B8F71' }}>
                    {accuracy}%
                  </span>
                </div>

                {/* Grid de categorias com tooltip */}
                <TooltipProvider delayDuration={300}>
                  <div className="w-full rounded-xl bg-neutral-800 px-4 py-3">
                    <div className="flex flex-col gap-y-1 text-xs">
                      {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
                        const meta  = CLASSIFICATION_META[key]
                        const count = evaluations.filter(e => e.classification === key).length
                        return (
                          <Tooltip key={key}>
                            <TooltipTrigger asChild>
                              <div
                                className="grid cursor-help"
                                style={{ gridTemplateColumns: '20px 1fr 24px' }}
                              >
                                <span className="text-center leading-none">{meta.emoji}</span>
                                <span style={{ color: meta.color }}>{meta.label}</span>
                                <span className="text-right font-bold tabular-nums" style={{ color: meta.color }}>{count}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-48">
                              <p className="text-xs">{meta.description}</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                  </div>
                </TooltipProvider>
              </>
            )}

            {/* Botões */}
            <div className="flex w-full flex-col gap-2">
              {analysisReady && (
                <button
                  onClick={() => router.push('/review')}
                  className="w-full rounded-xl py-3 text-sm font-black tracking-wide transition-all hover:opacity-90"
                  style={{ backgroundColor: '#6B8F71', color: '#000' }}
                >
                  📋 Revisão da Partida
                </button>
              )}
              <button
                onClick={() => router.push('/')}
                className="w-full rounded-xl border border-neutral-700 py-3 text-sm font-semibold text-neutral-400 transition-all hover:border-neutral-500 hover:text-white"
              >
                Jogar novamente
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Modal de configurações */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          className="w-[92%] sm:max-w-md md:max-w-lg rounded-xl"
          style={{ background: '#111', border: '1px solid #2a2a2a', color: '#e5e7eb' }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: '#FFFBFC' }}>Configurações</DialogTitle>
          </DialogHeader>

          {/* Tema do tabuleiro */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Tema do tabuleiro
            </p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(BOARD_THEMES).map(([key, { label, theme }]) => {
                const isActive = activeTheme === key
                return (
                  <button
                    key={key}
                    title={label}
                    onClick={() => { handleThemeChange(key); setSettingsOpen(false) }}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="flex overflow-hidden rounded border-2 transition-colors"
                      style={{ borderColor: isActive ? '#EE964B' : 'transparent' }}
                    >
                      <span className="block h-6 w-6" style={theme.lightSquareStyle} />
                      <span className="block h-6 w-6" style={theme.darkSquareStyle} />
                    </div>
                    <span className="text-[9px] text-neutral-500">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Som */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-800 px-4 py-3">
            <span className="text-sm text-neutral-300">Sons de movimento</span>
            <button
              onClick={handleSoundToggle}
              className="flex h-6 w-11 items-center rounded-full border transition-colors"
              style={{
                backgroundColor: soundEnabled ? '#EE964B' : '#2a2a2a',
                borderColor:     soundEnabled ? '#EE964B' : '#444',
              }}
              aria-label={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
            >
              <span
                className="block h-5 w-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: soundEnabled ? 'translateX(20px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          {/* Estilo de peças */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Estilo de peças
            </p>
            <div className="flex flex-wrap gap-2 max-h-64 md:max-h-80 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {Object.entries(PIECE_THEMES).map(([key, label]) => {
                const isActive = activePieceTheme === key
                return (
                  <button
                    key={key}
                    title={label}
                    onClick={() => setPieceTheme(key)}
                    className="flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors"
                    style={{
                      border: `2px solid ${isActive ? '#EE964B' : 'transparent'}`,
                      background: isActive ? '#EE964B18' : '#1a1a1a',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/piece/${key}/wK.svg`} width={32} height={32} alt={label} draggable={false} />
                    <span className="text-[8px] text-neutral-400">{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
