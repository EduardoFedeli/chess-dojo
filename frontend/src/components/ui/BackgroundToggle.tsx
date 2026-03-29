'use client'

// Importação lazy do context para evitar problema de inicialização circular.
// O context renderiza este componente, e este consome o context.
import { useBackground } from '@/contexts/BackgroundContext'

export function BackgroundToggle() {
  const { bgMode, toggleBg } = useBackground()

  return (
    <button
      onClick={toggleBg}
      title={bgMode === 'gradient' ? 'Mudar para fundo de imagem' : 'Mudar para gradiente escuro'}
      aria-label={bgMode === 'gradient' ? 'Mudar para fundo de imagem' : 'Mudar para gradiente escuro'}
      style={{
        position:     'fixed',
        bottom:       20,
        right:        20,
        zIndex:       50,
        background:   '#111111',
        border:       '1px solid #2a2a2a',
        borderRadius: '10px',
        padding:      '8px 10px',
        fontSize:     '18px',
        cursor:       'pointer',
        lineHeight:   1,
        transition:   'border-color 0.2s',
      }}
      className="hover:border-neutral-500"
    >
      {bgMode === 'gradient' ? '🌄' : '🌫️'}
    </button>
  )
}
