'use client'

import { CLASSIFICATION_META } from '@/utils/move-classifier'
import type { MoveClassification, MoveEvaluation } from '@/types/game.types'

type MoveSummaryProps = {
  evaluations: MoveEvaluation[]
  accuracy: number
  /** compact: linha horizontal com precisão + ícones de categoria em linha */
  compact?: boolean
}

/** Cards de totais por categoria + acurácia. Usado no painel de revisão. */
export function MoveSummary({ evaluations, accuracy, compact = false }: MoveSummaryProps) {
  const counts = (Object.keys(CLASSIFICATION_META) as MoveClassification[]).reduce(
    (acc, key) => {
      acc[key] = evaluations.filter(e => e.classification === key).length
      return acc
    },
    {} as Record<MoveClassification, number>,
  )

  if (compact) {
    return (
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-4 py-2"
        style={{ background: '#171717', border: '1px solid #262626' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-neutral-400">Precisão</span>
          <span className="text-sm font-black" style={{ color: '#6B8F71' }}>{accuracy}%</span>
        </div>
        <div className="h-3 w-px bg-neutral-700 hidden sm:block" />
        {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
          const meta  = CLASSIFICATION_META[key]
          const count = counts[key]
          return (
            <span key={key} className="text-xs tabular-nums" style={{ color: meta.color }} title={meta.label}>
              {meta.emoji} {count}
            </span>
          )
        })}
      </div>
    )
  }

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
        <div className="flex flex-col gap-y-1 text-[11px]">
          {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
            const meta  = CLASSIFICATION_META[key]
            const count = counts[key]
            return (
              <div key={key} className="grid" style={{ gridTemplateColumns: '20px 1fr 24px' }}>
                <span className="text-center leading-none">{meta.emoji}</span>
                <span style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-right font-bold tabular-nums" style={{ color: meta.color }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
