'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { BackgroundToggle } from '@/components/ui/BackgroundToggle'

type BgMode = 'gradient' | 'image'

const STORAGE_KEY = 'chess-dojo:bg-mode'

interface BackgroundContextValue {
  bgMode: BgMode
  toggleBg: () => void
}

const BackgroundContext = createContext<BackgroundContextValue | null>(null)

export function useBackground() {
  const ctx = useContext(BackgroundContext)
  if (!ctx) throw new Error('useBackground must be used within BackgroundProvider')
  return ctx
}

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [bgMode, setBgMode] = useState<BgMode>(() => {
    if (typeof window === 'undefined') return 'gradient'
    return (localStorage.getItem(STORAGE_KEY) as BgMode) ?? 'gradient'
  })

  useEffect(() => {
    document.body.setAttribute('data-bg', bgMode)
    localStorage.setItem(STORAGE_KEY, bgMode)
  }, [bgMode])

  function toggleBg() {
    setBgMode(prev => prev === 'gradient' ? 'image' : 'gradient')
  }

  return (
    <BackgroundContext.Provider value={{ bgMode, toggleBg }}>
      {children}
      <BackgroundToggle />
    </BackgroundContext.Provider>
  )
}
