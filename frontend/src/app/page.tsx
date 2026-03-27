'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Bot, BotLevel, PieceColor } from '@/types/game.types'

const BOTS: Bot[] = [
  { id: 'iniciante', name: 'Iniciante', level: 'iniciante', skillLevel: 2,  description: 'Perfeito para aprender'  },
  { id: 'guerreiro', name: 'Guerreiro', level: 'guerreiro', skillLevel: 10, description: 'Um desafio de verdade'   },
  { id: 'mestre',    name: 'Mestre',    level: 'mestre',    skillLevel: 20, description: 'Sem piedade'             },
]

const BOT_EMOJI: Record<BotLevel, string> = {
  iniciante: '🐣',
  guerreiro: '⚔️',
  mestre:    '🏆',
}

// Cor da borda de destaque por bot — usa a paleta do projeto
const BOT_ACCENT: Record<BotLevel, string> = {
  iniciante: '#6B8F71',  // verde
  guerreiro: '#EE964B',  // laranja
  mestre:    '#813405',  // marrom
}

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
          style={{ color: 'var(--brand-text)' }}
        >
          ♟ Chess Dojo
        </h1>
        <p className="mt-3 text-base" style={{ color: '#9ca3af' }}>
          Escolha seu adversário e jogue
        </p>
      </div>

      {/* Bot cards */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {BOTS.map((bot) => {
          const isSelected = selectedBot === bot.level
          const accent = BOT_ACCENT[bot.level]
          return (
            <button
              key={bot.id}
              onClick={() => setSelectedBot(bot.level)}
              style={{
                borderColor: isSelected ? accent : 'transparent',
                boxShadow: isSelected ? `0 0 0 1px ${accent}, 0 0 20px ${accent}33` : undefined,
                backgroundColor: isSelected ? `${accent}18` : '#111111',
                outline: 'none',
              }}
              className="flex w-52 flex-col items-center gap-2 rounded-2xl border-2 px-6 py-8 text-center transition-all hover:border-neutral-600"
            >
              <span className="text-4xl">{BOT_EMOJI[bot.level]}</span>
              <span
                className="text-lg font-bold tracking-wide"
                style={{ color: isSelected ? accent : 'var(--brand-text)' }}
              >
                {bot.name}
              </span>
              <span className="text-sm" style={{ color: '#9ca3af' }}>
                {bot.description}
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
