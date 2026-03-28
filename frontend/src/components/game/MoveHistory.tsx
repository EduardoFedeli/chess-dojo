'use client'

import { useEffect, useRef } from 'react'
import type { GameMove } from '@/types/game.types'

type MoveHistoryProps = {
  moves: GameMove[]
}

/**
 * Painel de histórico de jogadas ao vivo.
 * Grid 3 colunas: número | brancas | pretas
 * Scroll automático para a última jogada. Read-only.
 * Em desktop (sm+), ocupa toda a altura da coluna do tabuleiro.
 */
export function MoveHistory({ moves }: MoveHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll automático para a última linha quando moves muda
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [moves.length])

  // Agrupa jogadas em pares: [{ white, black }]
  const rows: { white: GameMove; black: GameMove | null }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ white: moves[i], black: moves[i + 1] ?? null })
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
      style={{ padding: '10px 12px' }}
    >
      {/* Cabeçalho — fixo */}
      <p className="mb-2 shrink-0 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
        Jogadas
      </p>

      {/* Lista — scroll interno */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex flex-col gap-[2px] text-[11px]">
          {rows.map((row, idx) => {
            const moveNumber  = idx + 1
            const isLastRow   = idx === rows.length - 1
            const whiteIsLast = isLastRow && row.black === null
            const blackIsLast = isLastRow && row.black !== null

            return (
              <div
                key={moveNumber}
                className="grid items-center gap-1 rounded px-1 py-[2px]"
                style={{ gridTemplateColumns: '20px 1fr 1fr' }}
              >
                {/* Número */}
                <span className="font-mono text-neutral-600">{moveNumber}.</span>

                {/* Jogada brancas */}
                <span
                  className="font-mono"
                  style={{
                    color:            whiteIsLast ? 'var(--brand-orange)' : '#e5e7eb',
                    fontWeight:       whiteIsLast ? 700 : 400,
                    backgroundColor:  whiteIsLast ? '#EE964B14' : 'transparent',
                    borderRadius:     whiteIsLast ? 3 : 0,
                    padding:          whiteIsLast ? '0 3px' : undefined,
                  }}
                >
                  {row.white.san}
                </span>

                {/* Jogada pretas */}
                <span
                  className="font-mono"
                  style={{
                    color:           row.black === null ? '#374151'
                                    : blackIsLast      ? 'var(--brand-orange)'
                                    :                    '#9ca3af',
                    fontWeight:      blackIsLast ? 700 : 400,
                    backgroundColor: blackIsLast ? '#EE964B14' : 'transparent',
                    borderRadius:    blackIsLast ? 3 : 0,
                    padding:         blackIsLast ? '0 3px' : undefined,
                  }}
                >
                  {row.black === null ? '—' : row.black.san}
                </span>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
