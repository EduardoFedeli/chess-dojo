# Spec G — Best Move in Review

## Objetivo

Adicionar um botão "Ver melhor lance" na tela de revisão. Ao clicar, o Stockfish calcula o melhor lance da posição atual (~800ms) e exibe no tabuleiro: seta de origem→destino + highlight amarelo na origem e verde no destino. Navegar para outra posição limpa o resultado.

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `frontend/src/hooks/useBestMove.ts` | Novo hook — Worker Stockfish para consulta única |
| `frontend/src/components/board/ChessBoard.tsx` | Adicionar prop `arrows?: [string, string][]` |
| `frontend/src/app/review/page.tsx` | Botão + estado + arrows/squareStyles ao tabuleiro |

---

## Hook `useBestMove`

**Arquivo:** `frontend/src/hooks/useBestMove.ts`

```ts
type UseBestMoveReturn = {
  bestMove: { from: string; to: string } | null
  isLoading: boolean
  query: (fen: string) => void
  clear: () => void
}
```

- Cria um Worker `new Worker('/stockfish-18-lite-single.js')` na montagem, destrói no unmount
- `query(fen)`: envia `ucinewgame`, `position fen <fen>`, `go movetime 800`
- Parseia `bestmove <from><to>[promo]` → `{ from, to }` (ignora promoção para exibição)
- `bestmove (none)` → `bestMove = null`, `isLoading = false`
- `clear()`: reseta `bestMove` para `null` sem consultar o motor
- Estado: `bestMove`, `isLoading` (true entre `query()` e resposta do `bestmove`)

---

## ChessBoard — prop `arrows`

**Arquivo:** `frontend/src/components/board/ChessBoard.tsx`

Adicionar ao tipo `ChessBoardProps`:
```ts
arrows?: [string, string][]
```

Passar ao Chessboard options:
```tsx
...(arrows && arrows.length > 0 && { customArrows: arrows })
```

---

## Review page — botão e integração

**Arquivo:** `frontend/src/app/review/page.tsx`

### Hook

```ts
const { bestMove, isLoading: isBestMoveLoading, query: queryBestMove, clear: clearBestMove } = useBestMove()
```

### Limpar ao navegar

Substituir as funções de navegação para chamar `clearBestMove()` junto:

```ts
const goTo = useCallback((i: number) => {
  clearBestMove()
  setCurrentIndex(Math.max(0, Math.min(i, moves.length)))
}, [moves.length, clearBestMove])
```

(As demais funções `goFirst`, `goPrev`, `goNext`, `goLast` chamam `goTo`, portanto herdam o comportamento.)

### squareStyles para o tabuleiro

```ts
const bestMoveSquareStyles: Record<string, React.CSSProperties> = bestMove
  ? {
      [bestMove.from]: { background: 'rgba(255, 255, 0, 0.5)' },
      [bestMove.to]:   { background: 'rgba(0, 200, 100, 0.5)' },
    }
  : {}
```

Passar ao `<ChessBoard>`:
```tsx
squareStylesOverride={bestMoveSquareStyles}
arrows={bestMove ? [[bestMove.from, bestMove.to]] : []}
```

> **Nota:** O `ChessBoard` atual constrói `squareStyles` internamente (xeque, selecionada, movimentos válidos). Para não perder esses highlights, adicionar uma prop `squareStylesOverride` que é mergeada sobre os estilos internos — ou passar como `additionalSquareStyles` com merge no componente.

### Botão

Inserir no bloco `{/* 5. Botões fixos no rodapé da coluna */}`, antes do `PdfExportButton`:

```tsx
{activeResult && !isDeepAnalyzing && (
  <button
    onClick={() => {
      if (bestMove) {
        clearBestMove()
      } else {
        queryBestMove(currentFen)
      }
    }}
    disabled={isBestMoveLoading}
    className="w-full rounded-xl border border-neutral-700 py-2 text-xs text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-300 disabled:opacity-40"
  >
    {isBestMoveLoading ? 'Calculando...' : bestMove ? 'Limpar lance' : 'Ver melhor lance ⚡'}
  </button>
)}
```

---

## ChessBoard — squareStylesOverride

Para preservar os highlights internos (xeque, seleção, movimentos válidos) e ainda mostrar o melhor lance, adicionar prop `squareStylesOverride` ao `ChessBoard`:

```ts
squareStylesOverride?: Record<string, React.CSSProperties>
```

No build do `squareStyles` interno do componente, mergear ao final:
```ts
const squareStyles: Record<string, React.CSSProperties> = {}
// ... highlights existentes ...
// Override do melhor lance (sobrescreve se houver conflito)
Object.assign(squareStyles, squareStylesOverride)
```

---

## Comportamento esperado

| Estado | Botão | Tabuleiro |
|---|---|---|
| Sem análise | Botão não aparece | Normal |
| Analisando profunda | Botão não aparece | Normal |
| Análise disponível, sem melhor lance | `Ver melhor lance ⚡` | Normal |
| Calculando | `Calculando...` (disabled) | Normal |
| Melhor lance disponível | `Limpar lance` | Seta + highlights |
| Usuário navega | `Ver melhor lance ⚡` | Normal (limpo) |

---

## Verificação

```bash
cd frontend && npm run build   # zero erros TypeScript
cd frontend && npm run lint    # zero erros novos
```

## Commit

```
feat(review): botão "Ver melhor lance" com seta e highlight no tabuleiro
```
