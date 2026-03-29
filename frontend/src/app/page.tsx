'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { BotLevel, PieceColor } from '@/types/game.types'
import { BOTS, BOT_STARS, BOT_ACCENT } from '@/data/bots'

export default function Home() {
  const router = useRouter()
  const [selectedBot, setSelectedBot]     = useState<BotLevel | null>(null)
  const [selectedColor, setSelectedColor] = useState<PieceColor | null>(null)

  function handlePlay() {
    if (!selectedBot || !selectedColor) return
    router.push(`/game?bot=${selectedBot}&color=${selectedColor}`)
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-6"
      style={{ color: 'var(--brand-text)' }}
    >
      {/* Header */}
      <div className="text-center">
        <h1
          className="text-5xl font-black tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-text)' }}
        >
          ♟ Chess Guild
        </h1>
        <p className="mt-3 text-base" style={{ color: '#9ca3af' }}>
          Escolha bem seus oponentes nessa guilda
        </p>
      </div>

      {/* Bot cards — grid 3×2 + Mago Ancião */}
      <div className="bot-grid">
        {/* Cards regulares: primeiros 6 bots */}
        {BOTS.filter(bot => bot.level !== 'mestre').map((bot, index) => {
          const isSelected = selectedBot === bot.level
          const accent     = BOT_ACCENT[bot.level]
          const stars      = BOT_STARS[bot.level]
          return (
            <button
              key={bot.id}
              onClick={() => setSelectedBot(bot.level)}
              style={{
                backgroundColor: '#000000',
                borderColor:     isSelected ? accent : 'transparent',
                boxShadow:       isSelected ? `0 0 0 1px ${accent}, 0 0 20px ${accent}33` : undefined,
                outline: 'none',
              }}
              className="relative flex flex-col items-center gap-3 rounded-2xl border-2 pb-4 pt-0 text-center transition-all hover:border-neutral-600"
            >
              {/* Stripe colorida no topo */}
              <div style={{ height: 3, background: accent, width: '100%', borderRadius: '12px 12px 0 0', flexShrink: 0 }} />

              {/* Badge de rank */}
              <div
                className="absolute top-2 right-3 text-[9px] font-bold tracking-widest"
                style={{ color: accent, opacity: 0.65 }}
              >
                {['I','II','III','IV','V','VI'][index]}
              </div>

              {/* Avatar */}
              <div className="overflow-hidden rounded-xl w-24 h-24 md:w-[140px] md:h-[140px]" style={{ background: '#000' }}>
                <Image
                  src={`/bots/${bot.image}`}
                  alt={bot.name}
                  width={140}
                  height={140}
                  className="object-contain w-full h-full"
                />
              </div>

              {/* Nome */}
              <span
                className="text-sm font-bold tracking-wide leading-tight"
                style={{ color: isSelected ? accent : 'var(--brand-text)' }}
              >
                {bot.name}
              </span>

              {/* Estrelas */}
              <div className="flex gap-0.5">
                {[1,2,3,4,5,6,7].map(n => (
                  <span key={n} style={{ color: n <= stars ? '#EE964B' : '#374151', fontSize: 10 }}>★</span>
                ))}
              </div>

              {/* Descrição */}
              <span className="text-xs" style={{ color: '#9ca3af' }}>{bot.description}</span>

              {/* ELO */}
              <span className="text-xs font-semibold" style={{ color: accent }}>
                ⚔ {bot.rating} ELO
              </span>
            </button>
          )
        })}

        {/* Card especial: Mago Ancião — coluna 4, linhas 1-2 */}
        {(() => {
          const mago = BOTS.find(b => b.level === 'mestre')
          const isSelected = selectedBot === 'mestre'
          if (!mago) return null
          return (
            <button
              key={mago.id}
              onClick={() => setSelectedBot('mestre')}
              style={{
                backgroundColor: '#000000',
                borderColor:     '#0047AB',
                boxShadow: isSelected
                  ? '0 0 0 1px #0047AB, 0 0 30px #0047AB66, 0 0 80px #0047AB22, inset 0 0 40px #0047AB08'
                  : '0 0 30px #0047AB44, 0 0 60px #0047AB11',
                outline: 'none',
              }}
              className="mago-card col-span-2 relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 px-4 py-6 text-center transition-all overflow-hidden"
            >
              {/* Efeito de névoa cósmica */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `
                    radial-gradient(1px 1px at 20% 15%, #ffffff44 0%, transparent 100%),
                    radial-gradient(1px 1px at 65% 8%,  #ffffff33 0%, transparent 100%),
                    radial-gradient(1px 1px at 45% 40%, #0047AB55 0%, transparent 100%),
                    radial-gradient(1px 1px at 80% 60%, #ffffff22 0%, transparent 100%),
                    radial-gradient(1px 1px at 10% 70%, #ffffff33 0%, transparent 100%),
                    radial-gradient(150px 120px at 50% 30%, #0047AB0a 0%, transparent 100%)
                  `,
                }}
              />

              {/* Badge de rank */}
              <div
                className="absolute top-3 right-4 text-[10px] font-bold tracking-widest z-10"
                style={{ color: '#0047AB', opacity: 0.8 }}
              >
                VII
              </div>

              {/* Avatar */}
              <div className="relative z-10 overflow-hidden rounded-xl w-[140px] h-[140px] md:w-[160px] md:h-[160px]" style={{ background: '#000' }}>
                <Image
                  src={`/bots/${mago.image}`}
                  alt={mago.name}
                  width={160}
                  height={160}
                  className="object-contain w-full h-full"
                />
              </div>

              {/* Nome */}
              <span
                className="relative z-10 text-xl font-black tracking-widest"
                style={{ color: '#0047AB', textShadow: '0 0 20px #0047AB88' }}
              >
                {mago.name}
              </span>

              {/* Linha divisória */}
              <div
                className="relative z-10 w-4/5"
                style={{ height: 1, background: 'linear-gradient(90deg, transparent, #0047AB66, transparent)' }}
              />

              {/* Estrelas */}
              <div className="relative z-10 flex gap-0.5">
                {[1,2,3,4,5,6,7].map(n => (
                  <span key={n} style={{ color: '#0047AB', fontSize: 14 }}>★</span>
                ))}
              </div>

              {/* Descrição */}
              <span className="relative z-10 text-xs tracking-wide" style={{ color: '#4B7BBE' }}>
                {mago.description}
              </span>

              {/* ELO especial */}
              <span
                className="relative z-10 w-4/5 border-t pt-3 text-base font-black"
                style={{
                  color:         '#0047AB',
                  letterSpacing: '3px',
                  textShadow:    '0 0 16px #0047ABCC',
                  borderColor:   '#0047AB33',
                }}
              >
                ⚔ ELO ??????
              </span>
            </button>
          )
        })()}
      </div>

      {/* Color picker */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm" style={{ color: '#9ca3af' }}>Jogar de:</p>
        <div className="flex gap-3">
          {(['white', 'black'] as PieceColor[]).map((color) => {
            const isSelected = selectedColor === color
            return (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  borderColor: isSelected ? 'var(--brand-green)' : '#374151',
                  backgroundColor: isSelected ? '#6B8F7122' : '#111111',
                  color: isSelected ? 'var(--brand-green)' : '#d1d5db',
                  outline: 'none',
                }}
                className="flex items-center gap-2 rounded-xl border-2 px-6 py-3 text-sm font-semibold transition-all hover:border-neutral-500"
              >
                <span className="text-xl">{color === 'white' ? '♔' : '♚'}</span>
                {color === 'white' ? 'Brancas' : 'Pretas'}
              </button>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handlePlay}
        disabled={!selectedBot || !selectedColor}
        style={{
          backgroundColor: selectedBot && selectedColor ? 'var(--brand-orange)' : '#1f1f1f',
          color: selectedBot && selectedColor ? '#000' : '#4b5563',
          cursor: selectedBot && selectedColor ? 'pointer' : 'not-allowed',
        }}
        className="w-44 rounded-xl py-4 text-base font-black tracking-wide transition-all hover:opacity-90 disabled:opacity-40"
      >
        Jogar →
      </button>
    </main>
  )
}
