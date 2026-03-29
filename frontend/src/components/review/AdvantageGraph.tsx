'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts'

type AdvantageGraphProps = {
  /** N+1 scores em centipawns, perspectiva brancas. */
  scores: number[]
  /** Índice da jogada atualmente exibida no tabuleiro (0 = posição inicial). */
  currentIndex: number
  /** Chamado quando o usuário clica num ponto do gráfico. */
  onMoveClick: (index: number) => void
  /** Altura do gráfico em px. Padrão: 64. */
  height?: number
}

export function AdvantageGraph({ scores, currentIndex, onMoveClick, height = 64 }: AdvantageGraphProps) {
  const data = scores.map((s, i) => {
    const clamped = Math.max(-5, Math.min(5, s / 100))
    return {
      index: i,
      scorePos: Math.max(0, clamped),
      scoreNeg: Math.min(0, clamped),
      score: clamped,
    }
  })

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-600 p-3">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
        Vantagem
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          onClick={(e) => {
            if (e?.activeIndex != null) onMoveClick(Number(e.activeIndex))
          }}
          style={{ cursor: 'pointer' }}
        >
          <YAxis domain={[-5, 5]} hide />
          <XAxis dataKey="index" hide />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 10 }}
            formatter={(v: unknown) => {
              const n = Number(v)
              if (n === 0) return null
              return [`${n > 0 ? '+' : ''}${n.toFixed(2)}`, 'Vantagem']
            }}
            labelFormatter={(i) => `Jogada ${i}`}
          />
          <Area
            type="monotone"
            dataKey="scorePos"
            baseValue={0}
            fill="#e5e7eb"
            stroke="none"
            dot={false}
            isAnimationActive={false}
            name="Brancas"
          />
          <Area
            type="monotone"
            dataKey="scoreNeg"
            baseValue={0}
            fill="#404040"
            stroke="none"
            dot={false}
            isAnimationActive={false}
            name="Pretas"
          />
          <ReferenceLine y={0} stroke="#3a3a3a" strokeWidth={1} />
          {data[currentIndex] && (
            <ReferenceDot
              x={currentIndex}
              y={data[currentIndex].score}
              r={4}
              fill="#EE964B"
              stroke="#000"
              strokeWidth={1}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
