import { Chess } from 'chess.js'
import type { GameMove, MoveClassification, MoveEvaluation } from '@/types/game.types'

/**
 * Detecta se a jogada foi um sacrifício: a peça que moveu foi para uma casa
 * que o oponente pode capturar imediatamente (a casa de destino está atacada
 * na posição APÓS a jogada, onde é vez do oponente).
 */
function isSacrifice(move: GameMove): boolean {
  try {
    const chess = new Chess(move.fen) // FEN após a jogada — vez do oponente
    const opponentMoves = chess.moves({ verbose: true })
    return opponentMoves.some(m => m.to === move.to)
  } catch {
    return false
  }
}

/**
 * Classifica uma única jogada com base na perda de centipawns.
 * scores[] está sempre em perspectiva das brancas (positivo = brancas melhor).
 */
function classifyMove(
  move: GameMove,
  scoreBefore: number,
  scoreAfter: number,
): MoveClassification {
  const isWhite = move.color === 'white'

  // Perda em centipawns pelo jogador (positivo = jogou pior que o melhor lance)
  const lossCp = isWhite
    ? Math.max(0, scoreBefore - scoreAfter)
    : Math.max(0, scoreAfter - scoreBefore)

  const delta = lossCp / 100

  // Vantagem do jogador antes e depois (perspectiva do jogador)
  const playerAdvantageBefore = isWhite ? scoreBefore : -scoreBefore
  const playerAdvantageAfter  = isWhite ? scoreAfter  : -scoreAfter

  // Chance Perdida: tinha vantagem decisiva (≥ +3.0) e perdeu para < +1.0
  if (playerAdvantageBefore >= 300 && playerAdvantageAfter < 100) {
    return 'missed_win'
  }

  // Brilhante: melhor jogada (delta < 0.2) e sacrifício
  if (delta < 0.2 && isSacrifice(move)) {
    return 'brilliant'
  }

  if (delta < 0.2)  return 'excellent'
  if (delta < 0.5)  return 'good'
  if (delta < 1.0)  return 'inaccuracy'
  if (delta < 2.0)  return 'mistake'
  return 'blunder'
}

/**
 * Recebe N+1 scores (posição inicial + após cada jogada) e N moves,
 * retorna um MoveEvaluation por jogada.
 */
export function classifyMoves(
  scores: number[],
  moves: GameMove[],
): MoveEvaluation[] {
  return moves.map((move, i) => {
    const scoreBefore = scores[i]
    const scoreAfter  = scores[i + 1]
    const isWhite     = move.color === 'white'
    const lossCp      = isWhite
      ? Math.max(0, scoreBefore - scoreAfter)
      : Math.max(0, scoreAfter - scoreBefore)

    return {
      moveIndex: i,
      scoreBefore,
      scoreAfter,
      delta: lossCp / 100,
      classification: classifyMove(move, scoreBefore, scoreAfter),
    }
  })
}

/**
 * Calcula acurácia: % de jogadas Brilhantes + Excelentes + Boas.
 */
export function computeAccuracy(evaluations: MoveEvaluation[]): number {
  if (evaluations.length === 0) return 100
  const good = evaluations.filter(e =>
    e.classification === 'brilliant' ||
    e.classification === 'excellent' ||
    e.classification === 'good'
  ).length
  return Math.round((good / evaluations.length) * 100)
}

// Rótulos e cores por classificação — usados em componentes de UI
export const CLASSIFICATION_META: Record<
  MoveClassification,
  { label: string; emoji: string; color: string }
> = {
  brilliant:  { label: 'Brilhante',      emoji: '🌟', color: '#a78bfa' },
  excellent:  { label: 'Excelente',      emoji: '✨', color: '#34d399' },
  good:       { label: 'Boa',            emoji: '✅', color: '#6B8F71' },
  inaccuracy: { label: 'Imprecisão',     emoji: '⚠️', color: '#9ca3af' },
  mistake:    { label: 'Erro',           emoji: '❌', color: '#EE964B' },
  missed_win: { label: 'Chance Perdida', emoji: '🎯', color: '#f87171' },
  blunder:    { label: 'Capivarada',     emoji: '💀', color: '#ef4444' },
}
