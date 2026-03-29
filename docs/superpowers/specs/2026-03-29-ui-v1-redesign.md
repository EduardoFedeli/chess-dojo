# Design Spec — Chess Guild UI v1.0 Redesign

**Data:** 2026-03-29
**Escopo:** Reestruturação de layout, identidade visual dos bots e sistema de fundo dinâmico
**Páginas afetadas:** `/` (home), `/game`, `/review`

---

## 1. Grid de Bots — Layout 3×2 + Mago Ancião

### Estrutura CSS
O container de bots em `frontend/src/app/page.tsx` passa de `flex-row` para CSS Grid com 4 colunas e 2 linhas:

```css
grid-template-columns: repeat(3, 220px) 260px;
grid-template-rows: repeat(2, 1fr);
gap: 16px;
```

Distribuição dos bots:
- **Linha 1, col 1:** Aprendiz
- **Linha 1, col 2:** Escudeiro
- **Linha 1, col 3:** Caçador
- **Linha 2, col 1:** Cavaleiro
- **Linha 2, col 2:** Veterano
- **Linha 2, col 3:** Mestre de Guerra
- **Col 4, linhas 1–2:** Mago Ancião (`grid-column: 4; grid-row: 1 / 3`)

### Cards regulares (Aprendiz → Mestre de Guerra)
- `background: #000000` (preto puro — funde com o fundo preto das imagens dos bots)
- `border: 2px solid <accent>` quando selecionado, `transparent` quando não
- Stripe colorida (3px) no topo com `border-radius: 12px 12px 0 0`
- Badge de rank romano (I–VI) no canto superior direito
- Imagem: `160×160px`, `object-contain` (preserva pixel art sem cortes)
- Nome, estrelas (★☆ com accent), descrição, ELO

### Card Mago Ancião
- `width: 260px`, ocupa altura total das 2 linhas
- `background: #000000`
- `border: 2px solid #0047AB` + `box-shadow` com glow azul multicamada
- Pseudo-elemento `::before` com efeito de névoa cósmica (radial-gradients sobrepostos)
- Imagem: `200×200px`, sem borda interna
- Nome em `#0047AB` com `text-shadow` brilhante
- Linha divisória decorativa (`linear-gradient` transparente → `#0047AB66` → transparente)
- Estrelas: `★★★★★★★` em `#0047AB`
- ELO: `⚔ ELO ??????` em `#0047AB`, `font-size: 16px`, `letter-spacing: 3px`, `text-shadow` brilhante
- Badge de rank "VII" no canto superior direito

---

## 2. Cores e Identidade dos Bots

### Mudanças em `frontend/src/data/bots.ts` — `BOT_ACCENT`

| Bot | Antes | Depois |
|-----|-------|--------|
| `amador` (Caçador) | `#C8A84B` | `#228B22` (Verde Floresta) |
| `intermediario` (Cavaleiro) | `#EE964B` | `#c8a84b` (Bronze) |
| Demais | — | sem alteração |

### Tratamento especial do ELO do Mago Ancião em `page.tsx`
Quando `bot.level === 'mestre'`, renderizar `⚔ ELO ??????` em vez de `⚔ {bot.rating} ELO`. A cor é `#0047AB`.

---

## 3. Sistema de Fundo Dinâmico

### Novos arquivos

#### `frontend/src/contexts/BackgroundContext.tsx`
Client component. Responsabilidades:
- Estado: `bgMode: 'gradient' | 'image'`
- Inicialização: lê `localStorage.getItem('chess-dojo:bg-mode')`, padrão `'gradient'`
- Persiste mudanças em `localStorage.setItem('chess-dojo:bg-mode', mode)`
- Aplica via `useEffect`: `document.body.setAttribute('data-bg', bgMode)`
- Exporta `useBackground()` hook e `BackgroundProvider` component
- Renderiza `<BackgroundToggle />` internamente

#### `frontend/src/components/ui/BackgroundToggle.tsx`
Client component. Responsabilidades:
- Consome `useBackground()`
- `position: fixed; bottom: 20px; right: 20px; z-index: 50`
- Visual discreto: botão pequeno com ícone (🌄 para imagem, 🌫️ para gradiente) e tooltip
- Ao clicar, chama `toggleBg()` do contexto

### Modificações em arquivos existentes

#### `frontend/src/app/layout.tsx`
Envolve `{children}` com `<BackgroundProvider>`:
```tsx
<BackgroundProvider>
  {children}
</BackgroundProvider>
```
O `BackgroundProvider` renderiza o `BackgroundToggle` internamente, fazendo-o aparecer em todas as páginas sem modificar `game/page.tsx` ou `review/page.tsx`.

#### `frontend/src/app/globals.css`
Remove o background hardcoded do `body` e adiciona seletores por `data-bg`:

```css
body[data-bg="gradient"] {
  background: radial-gradient(ellipse at 20% 0%, #1a1208 0%, #0d0d0d 45%, #000000 100%);
  background-attachment: fixed;
}

body[data-bg="image"] {
  background-image: url('/bots/FundoPC.png');
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
}
```

Os backgrounds hardcoded em `game/page.tsx` e `review/page.tsx` (inline `style={{ background: '...' }}`) são removidos para que o body styling se aplique.

### Estado padrão
`'gradient'` — na primeira visita sem localStorage, o gradiente escuro Dark RPG é exibido.

---

## 4. Arquivos Modificados / Criados

| Arquivo | Ação |
|---------|------|
| `frontend/src/app/page.tsx` | Modificar — novo grid, cards redesenhados, ELO especial do Mago |
| `frontend/src/data/bots.ts` | Modificar — `BOT_ACCENT` Caçador e Cavaleiro |
| `frontend/src/app/globals.css` | Modificar — remover bg do body, adicionar seletores `data-bg` |
| `frontend/src/app/layout.tsx` | Modificar — envolver children com `BackgroundProvider` |
| `frontend/src/app/game/page.tsx` | Modificar — remover inline background style |
| `frontend/src/app/review/page.tsx` | Modificar — remover inline background style |
| `frontend/src/contexts/BackgroundContext.tsx` | Criar |
| `frontend/src/components/ui/BackgroundToggle.tsx` | Criar |

---

## 5. Fora do Escopo

- Mobile responsiveness do novo grid (tratado em iteração futura se necessário)
- FundoMobile.png (não especificado como responsivo nesta versão)
- Alterações em lógica de jogo, análise ou storage
