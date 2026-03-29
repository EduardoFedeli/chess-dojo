# Mobile Responsive Design — Chess Guild Home

**Date:** 2026-03-29
**Status:** Approved

## Problema

1. Background "acaba" no mobile — `background-attachment: fixed` não funciona em iOS/Android
2. Cards dos bots causam scroll horizontal no mobile (grid fixo de ~940px)
3. Foto do Mago Ancião exibe `boxShadow` que parece uma borda indesejada
4. No PC, o conteúdo exige scroll vertical — deveria caber no viewport

## Solução

### `globals.css`

- Adicionar `.bot-grid`: `grid-template-columns: repeat(2, 1fr)` no mobile, override para `repeat(3, 220px) 260px` em `@media (min-width: 768px)`
- Adicionar `.mago-card`: `col-span-2` no mobile (largura total, última linha); override para `grid-column: 4 / row: 1/3` no desktop
- Adicionar `@media (max-width: 767px)` para background: trocar `FundoPC.png` → `FundoMobile.png` e `background-attachment: fixed` → `scroll` (em ambos modos)

### `page.tsx`

- Grid div: remover inline `style` do grid, usar `className="bot-grid"`
- Imagens bots regulares: `96×96px` mobile → `140×140px` desktop
- Mago card: remover `gridColumn`/`gridRow` do inline style, adicionar `className="mago-card col-span-2"`, remover `boxShadow` do container da imagem
- Mago imagem: `140×140px` mobile → `160×160px` desktop
- `main`: `gap-14 py-16` → `gap-6 py-6`

## Resultado esperado

- Mobile: scroll vertical apenas, 2 colunas de bots, Mago em largura total abaixo, fundo cobre a página inteira
- Desktop: sem scroll, tudo cabe no viewport
