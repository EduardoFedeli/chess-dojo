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
      className="flex min-h-screen flex-col items-center justify-center gap-14 px-6 py-16"
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

      {/* Bot cards */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {BOTS.map((bot) => {
          const isSelected = selectedBot === bot.level
          const accent     = BOT_ACCENT[bot.level]
          const stars      = BOT_STARS[bot.level]
          return (
            <button
              key={bot.id}
              onClick={() => setSelectedBot(bot.level)}
              style={{
                borderColor:     isSelected ? accent : 'transparent',
                boxShadow:       isSelected ? `0 0 0 1px ${accent}, 0 0 20px ${accent}33` : undefined,
                backgroundColor: isSelected ? `${accent}18` : '#111111',
                outline: 'none',
              }}
              className="relative flex w-64 flex-col items-center gap-3 rounded-2xl border-2 px-5 pb-5 pt-3 text-center transition-all hover:border-neutral-600"
            >
              {/* Accent stripe */}
              <div style={{ height: 3, background: accent, width: 'calc(100% + 40px)', marginTop: -12, marginBottom: 4, borderRadius: '10px 10px 0 0' }} />
              {/* Rank badge */}
              <div
                className="absolute top-2 right-3 text-[10px] font-bold tracking-widest"
                style={{ color: accent, opacity: 0.7 }}
              >
                {['I','II','III','IV','V','VI','VII'][BOTS.indexOf(bot)]}
              </div>
              {/* Avatar */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  width: 120, height: 120,
                  boxShadow: isSelected ? `0 0 16px ${accent}66` : '0 2px 12px rgba(0,0,0,0.6)',
                }}
              >
                <Image
                  src={`/bots/${bot.image}`}
                  alt={bot.name}
                  width={120}
                  height={120}
                  className="object-cover"
                />
              </div>

              {/* Name */}
              <div className="flex min-h-[2.5rem] w-full items-center justify-center">
                <span
                  className="text-base font-bold tracking-wide leading-tight text-center"
                  style={{ color: isSelected ? accent : 'var(--brand-text)' }}
                >
                  {bot.name}
                </span>
              </div>

              {/* Stars */}
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <span key={n} style={{ color: n <= stars ? '#EE964B' : '#374151', fontSize: 11 }}>
                    ★
                  </span>
                ))}
              </div>

              {/* Description */}
              <span className="text-xs whitespace-nowrap" style={{ color: '#9ca3af' }}>
                {bot.description}
              </span>

              {/* Rating */}
              <span className="text-xs font-semibold" style={{ color: accent }}>
                ⚔ {bot.rating} ELO
              </span>
            </button>
          )
        })}
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
