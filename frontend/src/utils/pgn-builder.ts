import type { GameMove } from '@/types/game.types'

/**
 * Gera uma string PGN de jogadas (apenas os lances, sem headers) a partir
 * do array de GameMove. Ex: "1. e4 e5 2. Nf3 Nc6"
 * Em xadrez, brancas sempre jogam primeiro — moves[0] é sempre brancas.
 */
export function buildMovesString(moves: GameMove[]): string {
  const parts: string[] = []
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) {
      parts.push(`${Math.floor(i / 2) + 1}.`)
    }
    parts.push(moves[i].san)
  }
  return parts.join(' ')
}
