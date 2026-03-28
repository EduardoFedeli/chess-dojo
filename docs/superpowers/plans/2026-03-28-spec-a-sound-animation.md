# Spec A — Som & Animação do Bot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir som duplo em capturas, adicionar som ao bot, animar peças do bot a 400ms e atrasar o popup de resultado até a animação terminar.

**Architecture:** Todas as mudanças estão em `frontend/src/app/game/page.tsx`. Nenhum outro arquivo é tocado. As quatro mudanças são independentes e vão em commits separados. A constante `playerFenColor` é declarada uma vez e reutilizada nos Tasks 2, 3 e 4.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, react-chessboard v5 (options API), Web Audio API (sound.ts já existente).

---

## Contexto do arquivo

**Arquivo:** `frontend/src/app/game/page.tsx`

Seções relevantes para este plano (leia o arquivo antes de começar):

- **Linha ~64:** `const { fen, makeMove, status, resign, moves } = useGame(colorParam)` — onde `colorParam` é acessível
- **Linhas ~152–160:** os dois `useEffect` de som existentes (xeque e fim de jogo)
- **Linhas ~183–194:** `<ChessBoard>` com o `onMove` e as `options` do Chessboard
- **Linha ~123:** `const isGameOver = status !== 'playing'`
- **Linha ~255:** `{isGameOver && (` — início do overlay de fim de jogo

---

## Task 1: Corrigir som duplo em capturas

**Files:**
- Modify: `frontend/src/app/game/page.tsx` (~linha 187)

- [ ] **Step 1: Verificar comportamento atual**

  Rode `cd frontend && npm run dev`, faça uma captura de peça. Você deve ouvir dois sons quase simultâneos (move + capture). Confirme o bug antes de mexer no código.

- [ ] **Step 2: Corrigir o callback `onMove`**

  Localize o trecho (está dentro do JSX, prop do `<ChessBoard>`):
  ```tsx
  onMove={(move) => {
    playMoveSound()
    if (move.isCapture) playCaptureSound()
  }}
  ```

  Substitua por:
  ```tsx
  onMove={(move) => {
    if (move.isCapture) playCaptureSound()
    else playMoveSound()
  }}
  ```

- [ ] **Step 3: Verificar manualmente**

  Com `npm run dev` rodando:
  - Mova uma peça sem capturar → deve ouvir apenas o tom suave (triangle 440Hz)
  - Capture uma peça → deve ouvir apenas o thud grave (sine 120→40Hz), sem o tom suave junto

- [ ] **Step 4: Commit**

  ```bash
  cd frontend && npm run lint
  ```
  Esperado: 0 errors (warnings de refs no useStockfishAnalysis.ts são pré-existentes, ignorar).

  ```bash
  cd ..
  git add frontend/src/app/game/page.tsx
  git commit -m "fix(sound): captura toca apenas som de captura, sem som de movimento"
  ```

---

## Task 2: Som do bot

**Files:**
- Modify: `frontend/src/app/game/page.tsx` (~linha 64 e após linha 160)

- [ ] **Step 1: Declarar `playerFenColor`**

  Localize a linha onde `colorParam` é usado (por volta da linha 64):
  ```ts
  const { fen, makeMove, status, resign, moves } = useGame(colorParam)
  ```

  Logo **após** essa linha, adicione:
  ```ts
  const playerFenColor = colorParam === 'white' ? 'w' : 'b'
  ```

  Esta constante será reutilizada nos Tasks 2, 3 e 4.

- [ ] **Step 2: Adicionar useEffect de som do bot**

  Localize os dois `useEffect` de som que já existem no componente (estão próximos entre si, por volta das linhas 152–160):
  ```ts
  // Som de xeque
  useEffect(() => {
    const last = moves[moves.length - 1]
    if (last?.isCheck && !last.isCheckmate) playCheckSound()
  }, [moves]) // eslint-disable-line react-hooks/exhaustive-deps

  // Som de fim de jogo
  useEffect(() => {
    if (status !== 'playing') playGameEndSound()
  }, [status])
  ```

  Adicione um **terceiro** `useEffect` imediatamente após os dois:
  ```ts
  // Som do bot: detecta quando o último lance é do bot e toca o som adequado
  useEffect(() => {
    const last = moves[moves.length - 1]
    if (!last || last.color === playerFenColor) return
    if (last.isCapture) playCaptureSound()
    else playMoveSound()
  }, [moves]) // eslint-disable-line react-hooks/exhaustive-deps
  ```

- [ ] **Step 3: Verificar manualmente**

  Com `npm run dev`, inicie uma partida:
  - Jogue como brancas — ao bot (preto) mover, deve ouvir o som de movimento
  - Ao bot capturar uma de suas peças, deve ouvir o som de captura (grave)
  - Cheque que o bot não gera som duplo (o `onMove` do player não é acionado pelo bot)

- [ ] **Step 4: Commit**

  ```bash
  cd frontend && npm run lint
  ```

  ```bash
  cd ..
  git add frontend/src/app/game/page.tsx
  git commit -m "feat(sound): bot emite sons de movimento e captura"
  ```

---

## Task 3: Animação do bot a 400ms

**Files:**
- Modify: `frontend/src/app/game/page.tsx` (~linha 64 e na seção do `<Chessboard>`)

**Pré-requisito:** `playerFenColor` já foi declarado no Task 2.

- [ ] **Step 1: Verificar se `animationDuration` existe no react-chessboard v5**

  Rode:
  ```bash
  grep -r "animationDuration" frontend/node_modules/react-chessboard/dist/ | head -5
  ```

  - Se retornar resultados → o prop existe, siga o Step 2.
  - Se não retornar nada → use o fallback descrito no Step 2b.

- [ ] **Step 2a: Implementar com `animationDuration` (caminho principal)**

  Localize a declaração do `<ChessBoard>` no JSX (por volta da linha 183). Antes dela, adicione a constante derivada:
  ```ts
  const lastMoveColor = moves[moves.length - 1]?.color
  const animDuration  = lastMoveColor && lastMoveColor !== playerFenColor ? 400 : 300
  ```

  > Coloque essas duas linhas imediatamente antes do `return (` do componente, ou em qualquer lugar do corpo do componente após a declaração de `playerFenColor`.

  No JSX, dentro do componente `<Chessboard>` (que fica dentro de `<ChessBoard>`), o objeto `options` é montado em `ChessBoard.tsx` — mas `animationDuration` precisa ser passado como prop separado para `<ChessBoard>`. Verifique `frontend/src/components/board/ChessBoard.tsx`:

  Se `ChessBoard` ainda não aceitar `animationDuration`, adicione o prop:

  **Em `ChessBoard.tsx`**, no type `ChessBoardProps`:
  ```ts
  animationDuration?: number
  ```

  Na desestruturação da função:
  ```ts
  export function ChessBoard({
    fen, playerColor, makeMove, onMove,
    disabled = false, theme, customPieces,
    animationDuration = 300,   // ← adicionar
  }: ChessBoardProps) {
  ```

  No objeto `options` do `<Chessboard>`:
  ```tsx
  options={{
    position: fen,
    boardOrientation: playerColor,
    onPieceDrop: handlePieceDrop,
    onPieceDrag: handlePieceDrag,
    onSquareClick: handleSquareClick,
    allowDragging: !disabled && !pendingPromotion,
    squareStyles,
    animationDuration,          // ← adicionar
    ...(theme?.darkSquareStyle  && { darkSquareStyle:  theme.darkSquareStyle  }),
    ...(theme?.lightSquareStyle && { lightSquareStyle: theme.lightSquareStyle }),
    ...(customPieces            && { customPieces }),
  }}
  ```

  Em `game/page.tsx`, passe o valor ao `<ChessBoard>`:
  ```tsx
  <ChessBoard
    fen={fen}
    playerColor={colorParam}
    makeMove={makeMove}
    onMove={(move) => {
      if (move.isCapture) playCaptureSound()
      else playMoveSound()
    }}
    disabled={isBotThinking || isGameOver}
    theme={BOARD_THEMES[activeTheme].theme}
    customPieces={customPieces}
    animationDuration={animDuration}   // ← adicionar
  />
  ```

- [ ] **Step 2b: Fallback se `animationDuration` não existir no Chessboard**

  Se o grep do Step 1 não retornou nada, o react-chessboard desta versão não suporta o prop. Nesse caso, envolva o container do tabuleiro com uma transição CSS:

  Em `game/page.tsx`, no container do tabuleiro (o `<div style={{ width: boardSize, height: boardSize }}>`):
  ```tsx
  <div
    style={{
      width: boardSize,
      height: boardSize,
      transition: `all ${animDuration}ms ease`,
    }}
  >
    <ChessBoard ... />
  </div>
  ```

  > **Nota:** o fallback CSS afeta o container, não as peças individuais. O efeito será menos preciso. Se isso ocorrer, deixe uma nota no commit para revisar quando o react-chessboard for atualizado.

- [ ] **Step 3: Verificar manualmente**

  Com `npm run dev`:
  - Mova suas peças — animação deve parecer normal (rápida, ~300ms)
  - Observe o bot mover — deve parecer levemente mais suave/lento (~400ms)
  - A diferença não deve ser dramática, apenas "mais confortável"

- [ ] **Step 4: Commit**

  ```bash
  cd frontend && npm run lint
  ```

  Arquivos a adicionar dependem do Step 2a ou 2b:
  ```bash
  # Se Step 2a (com ChessBoard.tsx modificado):
  cd ..
  git add frontend/src/app/game/page.tsx frontend/src/components/board/ChessBoard.tsx
  git commit -m "feat(game): animação do bot a 400ms, jogador permanece em 300ms"

  # Se Step 2b (fallback CSS, só page.tsx):
  cd ..
  git add frontend/src/app/game/page.tsx
  git commit -m "feat(game): animação do bot levemente mais lenta (fallback CSS)"
  ```

---

## Task 4: Popup de resultado após animação do bot

**Files:**
- Modify: `frontend/src/app/game/page.tsx` (~linha 123 e linha ~255)

**Pré-requisito:** `playerFenColor` já foi declarado no Task 2.

- [ ] **Step 1: Adicionar estado `overlayVisible`**

  Localize a linha:
  ```ts
  const isGameOver = status !== 'playing'
  ```

  Logo após ela, adicione:
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

- [ ] **Step 2: Substituir `isGameOver` pelo `overlayVisible` no JSX do overlay**

  Localize no JSX (por volta da linha 255):
  ```tsx
  {/* Overlay de fim de jogo */}
  {isGameOver && (
  ```

  Substitua **apenas** essa linha de abertura:
  ```tsx
  {/* Overlay de fim de jogo */}
  {overlayVisible && (
  ```

  > **Atenção:** o `isGameOver` ainda é usado em outros lugares do JSX (ex: `disabled={isBotThinking || isGameOver}` no `<ChessBoard>` e no botão de desistir). NÃO substitua esses — apenas o overlay de fim de jogo.

- [ ] **Step 3: Verificar manualmente**

  Com `npm run dev`, jogue uma partida até o fim:

  **Cenário A — bot dá xeque-mate:**
  - O bot faz o último movimento → a peça anima por ~400ms → após ~500ms total, o overlay aparece
  - Não deve aparecer durante a animação

  **Cenário B — jogador dá xeque-mate:**
  - O jogador faz o último movimento → o overlay aparece imediatamente (sem delay)

  **Cenário C — jogador desiste:**
  - Clica em Desistir → confirma → overlay aparece imediatamente

  **Cenário D — jogar novamente (sem recarregar página):**
  - Após ver o overlay, clica em "Jogar novamente" → navega para home → inicia nova partida → nenhum overlay residual aparece

- [ ] **Step 4: Commit**

  ```bash
  cd frontend && npm run lint
  ```

  ```bash
  cd ..
  git add frontend/src/app/game/page.tsx
  git commit -m "feat(game): popup de resultado aparece após animação do bot terminar"
  ```

---

## Verificação final

Após todos os commits:

```bash
cd frontend && npm run build
```

Esperado: build sem erros. Warnings de tipo em `useStockfishAnalysis.ts` são pré-existentes — ignorar.

```bash
cd .. && git log --oneline -5
```

Esperado (do mais recente ao mais antigo):
```
feat(game): popup de resultado aparece após animação do bot terminar
feat(game): animação do bot a 400ms, jogador permanece em 300ms
feat(sound): bot emite sons de movimento e captura
fix(sound): captura toca apenas som de captura, sem som de movimento
```
