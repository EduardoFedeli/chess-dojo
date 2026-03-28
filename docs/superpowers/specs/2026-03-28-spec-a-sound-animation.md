# Spec A — Som & Animação do Bot

**Date:** 2026-03-28
**Status:** Approved

## Overview

Quatro correções relacionadas ao feedback sonoro e visual das jogadas do bot em `game/page.tsx`. Nenhum outro arquivo é modificado.

**Arquivo alterado:** `frontend/src/app/game/page.tsx`

---

## Item 1 — Corrigir som duplo em capturas

**Problema:** ao capturar, `onMove` chama `playMoveSound()` e `playCaptureSound()` — dois sons simultâneos.

**Fix:** tornar mutuamente exclusivos.

```ts
// Antes
onMove={(move) => {
  playMoveSound()
  if (move.isCapture) playCaptureSound()
}}

// Depois
onMove={(move) => {
  if (move.isCapture) playCaptureSound()
  else playMoveSound()
}}
```

---

## Item 2 — Som do bot

**Problema:** o bot joga em silêncio. Só o jogador emite sons via `onMove`.

**Solução:** novo `useEffect` que observa `moves`. Quando o último lance tem cor diferente do jogador, é do bot → toca o som adequado.

```ts
const playerFenColor = colorParam === 'white' ? 'w' : 'b'

useEffect(() => {
  const last = moves[moves.length - 1]
  if (!last || last.color === playerFenColor) return
  if (last.isCapture) playCaptureSound()
  else playMoveSound()
}, [moves]) // eslint-disable-line react-hooks/exhaustive-deps
```

O `useEffect` de xeque já existente (`playCheckSound`) continua funcionando para ambos os lados sem mudanças — não filtrar por cor foi uma escolha intencional.

`playerFenColor` é uma constante derivada (não estado), declarada uma vez no corpo do componente e reutilizada nos itens 2, 3 e 4.

---

## Item 3 — Animação 400ms para bot, 300ms para jogador

**Intenção:** tornar os movimentos do bot menos intimidadores com uma animação ligeiramente mais lenta.

**Implementação:** derivado sem estado extra.

```ts
const lastMoveColor = moves[moves.length - 1]?.color
const animDuration  = lastMoveColor && lastMoveColor !== playerFenColor ? 400 : 300
```

Passado ao `<Chessboard>` dentro do objeto `options`:

```tsx
options={{
  // ...demais opções existentes...
  animationDuration: animDuration,
}}
```

> **Nota de implementação:** react-chessboard v5 expõe `animationDuration` no objeto `options`. Verificar em `node_modules/react-chessboard` se o prop existe. Se ausente, aplicar `style={{ transition: 'transform 400ms' }}` no container do tabuleiro como fallback.

---

## Item 4 — Popup de resultado só após animação do bot

**Problema:** quando o bot dá xeque-mate, o overlay de resultado aparece imediatamente, enquanto a animação da peça ainda está ocorrendo.

**Solução:** estado `overlayVisible` separado de `isGameOver`. Quando o jogo termina por lance do bot, aguarda 500ms antes de exibir o overlay.

```ts
const [overlayVisible, setOverlayVisible] = useState(false)

useEffect(() => {
  if (!isGameOver) { setOverlayVisible(false); return }
  const lastColor = moves[moves.length - 1]?.color
  const botFinished = lastColor && lastColor !== playerFenColor
  if (botFinished) {
    const t = setTimeout(() => setOverlayVisible(true), 500)
    return () => clearTimeout(t)
  }
  setOverlayVisible(true)
}, [isGameOver]) // eslint-disable-line react-hooks/exhaustive-deps
```

No JSX, substituir:
```tsx
// Antes
{isGameOver && (

// Depois
{overlayVisible && (
```

O `setOverlayVisible(false)` no branch `!isGameOver` garante que, se o usuário jogar novamente sem recarregar, o overlay seja limpo corretamente.

---

## Constraints

- `useStockfish.ts`: não modificado
- `useGame.ts`: não modificado
- `sound.ts`: não modificado
- Um commit por item
