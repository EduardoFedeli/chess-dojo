'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { BotLevel, PieceColor } from '@/types/game.types'
import { BOTS, BOT_STARS, BOT_ACCENT } from '@/data/bots'
// Importamos o nosso novo wrapper AAA
import { TiltBotCard } from '@/components/home/TiltBotCard'

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
      className="flex min-h-[100dvh] flex-col items-center justify-start md:justify-center gap-4 md:gap-5 px-4 py-6 md:py-2"
      style={{ color: 'var(--brand-text)' }}
    >
      {/* Header + Barra de Controles (Unificado) */}
      <div className="flex flex-col items-center gap-3 md:gap-4 w-full max-w-[1200px]">
        
        {/* Título Centralizado */}
        <div className="text-center">
          <h1
            className="text-4xl font-black tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-text)' }}
          >
            Chess Guild
          </h1>
          <p className="mt-1 text-sm md:text-base" style={{ color: '#9ca3af' }}>
            Escolha bem seus oponentes nessa guilda
          </p>
        </div>

        {/* Controles de Jogo (Cor + Botão de Jogar) */}
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full justify-center">
          <div className="flex items-center gap-3">
            <p className="text-sm font-bold uppercase tracking-widest hidden md:block" style={{ color: '#555' }}>
              Jogar de:
            </p>
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
                  className="flex items-center gap-2 rounded-xl border-2 px-4 py-1.5 md:px-5 md:py-2 text-sm font-semibold transition-all hover:border-neutral-500"
                >
                  <span className="text-lg md:text-xl">{color === 'white' ? '♔' : '♚'}</span>
                  {color === 'white' ? 'Brancas' : 'Pretas'}
                </button>
              )
            })}
          </div>

          <button
            onClick={handlePlay}
            disabled={!selectedBot || !selectedColor}
            style={{
              backgroundColor: selectedBot && selectedColor ? 'var(--brand-orange)' : '#1f1f1f',
              color: selectedBot && selectedColor ? '#000' : '#4b5563',
              cursor: selectedBot && selectedColor ? 'pointer' : 'not-allowed',
            }}
            className="w-full md:w-auto min-w-[160px] rounded-xl px-8 py-2 md:py-2.5 text-sm md:text-base font-black tracking-wide transition-all hover:opacity-90 disabled:opacity-40"
          >
            {selectedBot && selectedColor ? 'Jogar Agora →' : 'Selecione e Jogue'}
          </button>
        </div>
      </div>

      {/* Bot cards — grid 3×2 + Mago Ancião */}
      <div className="bot-grid w-full max-w-[1200px]">
        {/* CARDS REGULARES */}
        {BOTS.filter(bot => bot.level !== 'mestre').map((bot, index) => {
          const isSelected = selectedBot === bot.level
          const accent     = BOT_ACCENT[bot.level]
          const stars      = BOT_STARS[bot.level]
          return (
            <TiltBotCard
              key={bot.id}
              accentColor={accent}
              isSelected={isSelected}
            >
              {/* Adicionado h-full e justify-between para arrumar o buraco preto */}
              <button
                onClick={() => setSelectedBot(bot.level)}
                className="w-full h-full flex flex-col items-center justify-between outline-none pb-3 pt-0"
              >
                <div className="flex flex-col items-center w-full">
                  <div style={{ height: 4, background: accent, width: '100%', borderRadius: '12px 12px 0 0', flexShrink: 0 }} />

                  <div
                    className="absolute top-2 right-3 text-[10px] md:text-xs font-black tracking-widest z-30"
                    style={{ color: accent, opacity: 0.65 }}
                  >
                    {['I','II','III','IV','V','VI'][index]}
                  </div>

                  <div className="overflow-hidden rounded-xl w-24 h-24 md:w-[170px] md:h-[170px] mt-2 md:mt-3 transition-transform duration-300 z-20" style={{ background: '#000' }}>
                    <Image
                      src={`/bots/${bot.image}`}
                      alt={bot.name}
                      width={170}
                      height={170}
                      className="object-contain w-full h-full drop-shadow-lg"
                    />
                  </div>

                  <span
                    className="text-base font-bold tracking-wide leading-tight mt-1 md:mt-2"
                    style={{ color: isSelected ? accent : 'var(--brand-text)' }}
                  >
                    {bot.name}
                  </span>

                  <div className="flex gap-1 md:gap-0.5 mt-1">
                    {[1,2,3,4,5,6,7].map(n => (
                      <span key={n} style={{ color: n <= stars ? '#EE964B' : '#374151', fontSize: 10 }}>★</span>
                    ))}
                  </div>

                  <span className="text-[11px] md:text-xs px-2 mt-1" style={{ color: '#9ca3af' }}>{bot.description}</span>
                </div>

                <span className="text-xs font-black mt-2" style={{ color: accent }}>
                  ⚔ {bot.rating} ELO
                </span>
              </button>
            </TiltBotCard>
          )
        })}

        {/* CARD ESPECIAL: MAGO ANCIÃO */}
        {(() => {
          const mago = BOTS.find(b => b.level === 'mestre')
          const isSelected = selectedBot === 'mestre'
          if (!mago) return null
          return (
            <TiltBotCard
              key={mago.id}
              accentColor={'#0047AB'}
              isSelected={isSelected}
              className="mago-card" // <--- A MÁGICA ESTÁ AQUI! Passamos a classe pro Grid voltar a enxergar ele!
            >
              {/* Adicionado h-full */}
              <button
                onClick={() => setSelectedBot('mestre')}
                className="w-full h-full relative flex flex-col items-center justify-center gap-2 md:gap-3 px-4 py-4 md:py-5 text-center outline-none overflow-hidden"
              >
                <div
                  className="absolute top-3 right-4 text-[10px] md:text-sm font-black tracking-widest z-30"
                  style={{ color: '#0047AB', opacity: 0.8 }}
                >
                  VII
                </div>

                <div className="relative z-20 overflow-hidden rounded-xl w-32 h-32 md:w-[220px] md:h-[220px] transition-transform duration-500" style={{ background: '#000' }}>
                  <Image
                    src={`/bots/${mago.image}`}
                    alt={mago.name}
                    width={220}
                    height={220}
                    className="object-contain w-full h-full drop-shadow-2xl"
                  />
                </div>

                <span
                  className="relative z-20 text-lg md:text-2xl font-black tracking-widest mt-1 md:mt-2"
                  style={{ color: '#0047AB', textShadow: '0 0 20px #0047AB88' }}
                >
                  {mago.name}
                </span>

                <div
                  className="relative z-20 w-4/5 md:my-1"
                  style={{ height: 1, background: 'linear-gradient(90deg, transparent, #0047AB66, transparent)' }}
                />

                <div className="relative z-20 flex gap-1 md:gap-0.5">
                  {[1,2,3,4,5,6,7].map(n => (
                    <span key={n} style={{ color: '#0047AB', fontSize: 14 }}>★</span>
                  ))}
                </div>

                <span className="relative z-20 text-[11px] md:text-xs tracking-wide px-4" style={{ color: '#4B7BBE' }}>
                  {mago.description}
                </span>

                <span
                  className="relative z-20 w-4/5 border-t pt-2 md:pt-3 text-sm md:text-base font-black"
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
            </TiltBotCard>
          )
        })()}
      </div>

    </main>
  )
}