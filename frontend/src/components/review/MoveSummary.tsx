'use client'

import { CLASSIFICATION_META } from '@/utils/move-classifier'
import type { MoveClassification, MoveEvaluation } from '@/types/game.types'

type MoveSummaryProps = {
  evaluations: MoveEvaluation[]
  accuracy: number
}

/** Cards de totais por categoria + acurácia. Usado no painel de revisão. */
export function MoveSummary({ evaluations, accuracy }: MoveSummaryProps) {
  const counts = (Object.keys(CLASSIFICATION_META) as MoveClassification[]).reduce(
    (acc, key) => {
      acc[key] = evaluations.filter(e => e.classification === key).length
      return acc
    },
    {} as Record<MoveClassification, number>,
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Precisão */}
      <div
        className="flex items-center justify-between rounded-lg px-4 py-2"
        style={{ background: '#6B8F7118', border: '1px solid #6B8F7144' }}
      >
        <span className="text-sm text-neutral-400">Precisão</span>
        <span className="text-xl font-black" style={{ color: '#6B8F71' }}>
          {accuracy}%
        </span>
      </div>

      {/* Categorias */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
        <div
          className="grid gap-x-4 gap-y-1 text-[11px]"
          style={{ gridTemplateColumns: '1fr auto' }}
        >
          {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
            const meta  = CLASSIFICATION_META[key]
            const count = counts[key]
            return (
              <div key={key} className="contents">
                <span style={{ color: meta.color }}>
                  {meta.emoji} {meta.label}
                </span>
                <span
                  className="text-right font-bold tabular-nums"
                  style={{ color: meta.color }}
                >
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
