const SOUND_KEY = 'chess-dojo:sound-enabled'

function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SOUND_KEY) !== 'false'
}

/** Tom curto e suave (~80ms) ao mover qualquer peça. */
export function playMoveSound(): void {
  if (!isSoundEnabled()) return
  const ctx  = new AudioContext()
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(440, ctx.currentTime)
  gain.gain.setValueAtTime(0.25, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.08)
  osc.onended = () => ctx.close()
}

/** Thud grave (~150ms) ao capturar uma peça. */
export function playCaptureSound(): void {
  if (!isSoundEnabled()) return
  const ctx  = new AudioContext()
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12)
  gain.gain.setValueAtTime(0.6, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.15)
  osc.onended = () => ctx.close()
}

/** Tom de alerta (~200ms) ao dar xeque. */
export function playCheckSound(): void {
  if (!isSoundEnabled()) return
  const ctx  = new AudioContext()
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'square'
  osc.frequency.setValueAtTime(880, ctx.currentTime)
  osc.frequency.setValueAtTime(860, ctx.currentTime + 0.06)
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.2)
  osc.onended = () => ctx.close()
}

/** Sequência ascendente C5→E5→G5 ao fim de jogo. */
export function playGameEndSound(): void {
  if (!isSoundEnabled()) return
  const ctx   = new AudioContext()
  const notes = [523, 659, 784]
  notes.forEach((freq, i) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    const t = ctx.currentTime + i * 0.14
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.35, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.start(t)
    osc.stop(t + 0.14)
    if (i === notes.length - 1) osc.onended = () => ctx.close()
  })
}
