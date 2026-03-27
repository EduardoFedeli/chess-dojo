'use client'

type AdvantageBarProps = {
  /** Score atual em centipawns, perspectiva brancas. Positivo = brancas melhor. */
  scoreCp: number
  /** Altura da barra em px. Padrão: 400 para acompanhar tabuleiro. */
  height?: number
}

/** Barra vertical de vantagem. Preto no topo, branco na base. Clampada em ±500cp. */
export function AdvantageBar({ scoreCp, height = 400 }: AdvantageBarProps) {
  const clamped     = Math.max(-500, Math.min(500, scoreCp))
  // whitePercent: 0% = tudo preto, 50% = igual, 100% = tudo branco
  const whitePercent = ((clamped + 500) / 1000) * 100
  const blackPercent = 100 - whitePercent

  const displayScore = Math.abs(scoreCp / 100).toFixed(1)
  const prefix       = scoreCp > 0 ? '+' : scoreCp < 0 ? '−' : ''

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        className="relative overflow-hidden rounded"
        style={{ width: 14, height, border: '1px solid #2a2a2a' }}
      >
        {/* Porção preta (topo) */}
        <div style={{ height: `${blackPercent}%`, background: '#222' }} />
        {/* Porção branca (base) */}
        <div style={{ height: `${whitePercent}%`, background: '#e5e7eb' }} />
      </div>
      <span
        className="text-[10px] font-bold tabular-nums"
        style={{ color: scoreCp >= 0 ? '#6B8F71' : '#f87171' }}
      >
        {prefix}{displayScore}
      </span>
    </div>
  )
}
