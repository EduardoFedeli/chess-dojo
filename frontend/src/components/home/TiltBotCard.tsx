'use client'

import React, { useRef, useState, useMemo } from 'react'

interface TiltBotCardProps {
  children: React.ReactNode
  accentColor: string
  isSelected: boolean
  className?: string // <-- Adicionamos isso
}

export function TiltBotCard({ children, accentColor, isSelected, className = '' }: TiltBotCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({})

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    const intensity = 20 
    const selectedScale = isSelected ? 'scale(1.06)' : 'scale(1.02)'
    setTiltStyle({
      transform: `perspective(1000px) rotateY(${x * intensity}deg) rotateX(${-y * intensity}deg) ${selectedScale}`,
    })
  }

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: `perspective(1000px) rotateY(0deg) rotateX(0deg) ${isSelected ? 'scale(1.05)' : 'scale(1)'}`,
    })
  }

  const cardBaseStyle = useMemo<React.CSSProperties>(() => ({
    borderColor: isSelected ? accentColor : 'transparent',
    backgroundColor: '#000000',
    boxShadow: isSelected 
      ? `0 0 1px 1px ${accentColor}, 0 0 30px 10px ${accentColor}44, 0 20px 60px ${accentColor}22` 
      : `0 2px 10px #000000`,
    transition: 'transform 0.1s ease-out, box-shadow 0.3s ease, border-color 0.3s ease',
    backfaceVisibility: 'hidden',
    overflow: 'hidden',
    willChange: 'transform',
  }), [isSelected, accentColor])

  const particleBackground = useMemo(() => {
    return isSelected 
      ? `conic-gradient(from 180deg at 50% 50%, ${accentColor}00 0deg, ${accentColor} 180deg, ${accentColor}00 360deg)`
      : 'none';
  }, [accentColor, isSelected]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // Passamos o className aqui e adicionamos h-full para preencher o grid
      className={`relative flex flex-col items-center rounded-2xl border-2 text-center cursor-pointer h-full ${className}`}
      style={{ ...cardBaseStyle, ...tiltStyle }}
    >
      {isSelected && (
        <div 
          className="absolute inset-0 aaa-background-particles z-0 rounded-2xl"
          style={{ backgroundImage: particleBackground, opacity: 0.2 }}
        />
      )}

      {isSelected && (
        <div className="aaa-border-container absolute -inset-[2px] rounded-2xl z-10 p-[2px]">
          <div 
            className="aaa-border-spinner absolute inset-[-30px] md:inset-[-50px]"
            style={{ 
              background: `conic-gradient(from 180deg at 50% 50%, ${accentColor}00 0%, ${accentColor} 50%, ${accentColor}00 100%)` 
            }}
          />
        </div>
      )}

      {/* h-full garante que o conteúdo estique e suma com aquele buraco preto */}
      <div className="relative z-20 w-full h-full flex flex-col items-center">
        {children}
      </div>
    </div>
  )
}