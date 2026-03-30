'use client'

import { CLASSIFICATION_META } from '@/utils/move-classifier'
import type { MoveClassification, MoveEvaluation } from '@/types/game.types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type MoveSummaryProps = {
  evaluations: MoveEvaluation[]
  accuracy: number
  /** compact: grid 3 colunas com precisão + ícones de categoria */
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
      <div className="flex flex-col gap-3">
        {/* Linha de precisão com fontes maiores */}
        <div className="flex items-center gap-4 border-b border-neutral-800/40 pb-3">
          <span className="text-sm font-semibold tracking-wide text-neutral-400">Precisão</span>
          <span className="text-xl font-black" style={{ color: '#6B8F71' }}>{accuracy}%</span>
        </div>
        
        {/* Grid 3 colunas com fontes maiores e respiro */}
        <div className="grid gap-x-4 gap-y-2.5" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
            const meta  = CLASSIFICATION_META[key]
            const count = counts[key]
            return (
              <span
                key={key}
                className="flex items-center gap-1.5 tabular-nums"
                title={meta.label}
              >
                <span className="text-sm">{meta.emoji}</span>
                <span className="truncate text-xs text-neutral-300" style={{ color: meta.color }}>{meta.label}</span>
                <span className="ml-auto text-sm font-bold" style={{ color: meta.color }}>{count}</span>
              </span>
            )
          })}
        </div>
      </div>
    )
  }

  // Fallback (versão de 1 coluna). Mantido por segurança se algum outro lugar do app usar.
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

      {/* Categorias com tooltip */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
        <TooltipProvider delayDuration={300}>
          <div className="flex flex-col gap-y-1 text-[11px]">
            {(Object.keys(CLASSIFICATION_META) as MoveClassification[]).map((key) => {
              const meta  = CLASSIFICATION_META[key]
              const count = counts[key]
              return (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div
                      className="grid cursor-help"
                      style={{ gridTemplateColumns: '20px 1fr 24px' }}
                    >
                      <span className="text-center leading-none">{meta.emoji}</span>
                      <span style={{ color: meta.color }}>{meta.label}</span>
                      <span
                        className="text-right font-bold tabular-nums"
                        style={{ color: meta.color }}
                      >
                        {count}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-48 bg-neutral-900 border-neutral-800 text-white">
                    <p className="text-xs">{meta.description}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}