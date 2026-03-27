'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { Bot, BotLevel, PieceColor } from '@/types/game.types'

const BOTS: Bot[] = [
  { id: 'iniciante', name: 'Iniciante', level: 'iniciante', skillLevel: 2,  description: 'Perfeito para aprender',   },
  { id: 'guerreiro', name: 'Guerreiro', level: 'guerreiro', skillLevel: 10, description: 'Um desafio de verdade',    },
  { id: 'mestre',    name: 'Mestre',    level: 'mestre',    skillLevel: 20, description: 'Sem piedade',              },
]

const BOT_EMOJI: Record<BotLevel, string> = {
  iniciante: '🐣',
  guerreiro: '⚔️',
  mestre:    '🏆',
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-neutral-950 px-6 py-16">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">♟ Chess Dojo</h1>
        <p className="mt-2 text-neutral-400">Escolha seu adversário</p>
      </div>

      {/* Bot cards */}
      <div className="flex flex-col gap-4 sm:flex-row">
        {BOTS.map((bot) => {
          const isSelected = selectedBot === bot.level
          return (
            <button
              key={bot.id}
              onClick={() => setSelectedBot(bot.level)}
              className={[
                'flex w-52 flex-col items-center gap-2 rounded-2xl border-2 px-6 py-8 text-center transition-all',
                isSelected
                  ? 'border-white bg-neutral-800 text-white'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800',
              ].join(' ')}
            >
              <span className="text-4xl">{BOT_EMOJI[bot.level]}</span>
              <span className="text-lg font-semibold">{bot.name}</span>
              <span className="text-sm text-neutral-400">{bot.description}</span>
            </button>
          )
        })}
      </div>

      {/* Color picker */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-neutral-400">Jogar de:</p>
        <div className="flex gap-3">
          {(['white', 'black'] as PieceColor[]).map((color) => {
            const isSelected = selectedColor === color
            return (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={[
                  'flex items-center gap-2 rounded-xl border-2 px-6 py-3 text-sm font-medium transition-all',
                  isSelected
                    ? 'border-white bg-neutral-800 text-white'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500 hover:bg-neutral-800',
                ].join(' ')}
              >
                <span className="text-xl">{color === 'white' ? '♔' : '♚'}</span>
                {color === 'white' ? 'Brancas' : 'Pretas'}
              </button>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={handlePlay}
        disabled={!selectedBot || !selectedColor}
        className="w-40 rounded-xl bg-white py-6 text-base font-semibold text-black hover:bg-neutral-200 disabled:opacity-30"
      >
        Jogar →
      </Button>

    </main>
  )
}
