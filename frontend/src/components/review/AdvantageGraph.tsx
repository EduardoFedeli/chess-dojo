'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

type AdvantageGraphProps = {
  /** N+1 scores em centipawns, perspectiva brancas. */
  scores: number[]
  /** Índice da jogada atualmente exibida no tabuleiro (0 = posição inicial). */
  currentIndex: number
  /** Chamado quando o usuário clica num ponto do gráfico. */
  onMoveClick: (index: number) => void
}

export function AdvantageGraph({ scores, currentIndex, onMoveClick }: AdvantageGraphProps) {
  const data = scores.map((s, i) => ({
    index: i,
    score: Math.max(-5, Math.min(5, s / 100)), // clamp ±5 pawns
  }))

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
        Vantagem
      </p>
      <ResponsiveContainer width="100%" height={64}>
        <LineChart
          data={data}
          onClick={(e) => {
            if (e?.activeIndex != null) {
              onMoveClick(Number(e.activeIndex))
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <ReferenceLine y={0} stroke="#2a2a2a" strokeWidth={1} />
          <YAxis domain={[-5, 5]} hide />
          <XAxis dataKey="index" hide />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', fontSize: 10 }}
            formatter={(v) => {
              const n = Number(v)
              return [`${n > 0 ? '+' : ''}${n.toFixed(2)}`, 'Vantagem']
            }}
            labelFormatter={(i) => `Jogada ${i}`}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#e5e7eb"
            strokeWidth={1.5}
            dot={(props) => {
              const isActive = props.index === currentIndex
              if (!isActive) return <g key={props.index} />
              return (
                <circle
                  key={props.index}
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill="#EE964B"
                  stroke="#000"
                  strokeWidth={1}
                />
              )
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
