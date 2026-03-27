# Game Analysis — Design Spec

**Data:** 2026-03-27
**Status:** aprovado
**Escopo:** Parte A (histórico ao vivo) + Parte B (revisão pós-partida)

---

## Visão Geral

Adicionar análise de partidas ao Chess Dojo em duas camadas:

- **Parte A** — Painel de histórico de jogadas em tempo real durante a partida (read-only)
- **Parte B** — Página `/review` com replay de tabuleiro, avaliação Stockfish, classificação de jogadas, gráfico de vantagem e exportação em PDF

A análise Stockfish roda automaticamente ao fim de cada partida, alimentando tanto o overlay de fim de jogo quanto a página de revisão.

---

## Arquitetura

### Novos arquivos

```
frontend/src/
  hooks/
    useStockfishAnalysis.ts       ← hook de análise sequencial (Abordagem B)
  components/
    game/
      MoveHistory.tsx             ← painel de histórico ao vivo
    review/
      AdvantageBar.tsx            ← barra vertical de vantagem
      AdvantageGraph.tsx          ← gráfico recharts clicável
      MoveSummary.tsx             ← cards de totais + acurácia
  app/
    review/
      page.tsx                    ← página de revisão
  utils/
    move-classifier.ts            ← função pura: avaliações → classificação
    pgn-builder.ts                ← gera PGN string a partir de GameMove[]
```

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `app/game/page.tsx` | Adicionar `MoveHistory`, análise automática ao fim, novo overlay |
| `types/game.types.ts` | Adicionar `MoveClassification`, `MoveEvaluation`, `AnalysisResult` |
| `package.json` | Instalar `recharts`, `jspdf`, `html2canvas` |

### Fluxo de dados

```
useGame.moves (GameMove[])
  → pgn-builder.ts → string PGN
  → localStorage 'chess-dojo:last-game' (Game + PGN)

status !== 'playing'
  → useStockfishAnalysis(fens[], { movetime: 300 })
  → evaluations[] → localStorage 'chess-dojo:last-analysis'
  → move-classifier.ts → MoveEvaluation[]
  → overlay de fim de jogo (resumo)
  → /review (replay + gráfico + PDF)
```

---

## Parte A — Histórico ao Vivo

### Componente `MoveHistory`

- Painel fixo de **160px de largura**, mesma altura do tabuleiro
- Grid de 3 colunas: `número | jogada brancas | jogada pretas`
- Última jogada destacada em laranja (`#EE964B`)
- Quando só as brancas jogaram na rodada atual, coluna preta exibe `—`
- Scroll automático para a última jogada via `useEffect` + `scrollIntoView`
- **Read-only** — nenhuma ação ao clicar durante a partida

### Layout responsivo em `game/page.tsx`

```
Desktop (≥ sm):
  [Tabuleiro 560px] [MoveHistory 160px]
  [temas] [desistir]        (abaixo do conjunto)

Mobile (< sm):
  [Tabuleiro 100%]
  [temas] [desistir]
  [MoveHistory altura fixa 120px, scroll vertical]
```

---

## Parte B — Revisão Pós-Partida

### 1. Análise automática no overlay de fim de jogo

Quando `status !== 'playing'`, `game/page.tsx` dispara `useStockfishAnalysis` com todos os FENs da partida.

**Overlay — Estado A (analisando):**
- Resultado (venceu/perdeu/empate)
- Barra de progresso: "Analisando jogada X / Y..."
- Botão "Jogar novamente" (funcional mesmo durante análise)

**Overlay — Estado B (análise concluída):**
- Resultado + Precisão em destaque (ex.: **78%**)
- Grid com todas as 7 categorias e contagens
- Botão primário **"Revisão da Partida"** → `/review`
- Botão secundário "Jogar novamente"

### 2. Persistência no localStorage

| Chave | Conteúdo |
|---|---|
| `chess-dojo:last-game` | `{ pgn, botLevel, playerColor, result, date, moves[] }` |
| `chess-dojo:last-analysis` | `MoveEvaluation[]` com score, classificação e delta por jogada |

### 3. Hook `useStockfishAnalysis`

```ts
type UseStockfishAnalysisOptions = {
  fens: string[]       // N+1 FENs: posição inicial + FEN após cada jogada
  movetime?: number    // ms por posição; padrão 300
  depth?: number       // depth por posição; se definido, ignora movetime
  enabled: boolean
}

// Retorno do hook (diferente do AnalysisResult exportado em game.types.ts)
type UseStockfishAnalysisReturn = {
  scores: number[]     // N+1 scores em centipawns (perspectiva brancas)
  progress: number     // 0–1
  isAnalyzing: boolean
}
```

**Construção do array de FENs:** `[initialFen, ...moves.map(m => m.fen)]` — avalia N+1 posições para obter `scoreBefore` e `scoreAfter` de cada uma das N jogadas.

Internamente: Worker UCI sequencial. Envia `position fen <fen>` + `go movetime <ms>`, aguarda `bestmove`, extrai o score da linha `info ... score cp <n>` ou `score mate <n>`. Avança para o próximo FEN.

**Normalização de score:** score sempre do ponto de vista das brancas. O Stockfish retorna o score do ponto de vista do lado que vai jogar — se `chess.turn() === 'b'` (pretas a mover), multiplicar por -1 para converter para perspectiva das brancas.

### 4. Classificação de jogadas — `move-classifier.ts`

Compara avaliação **antes** e **depois** de cada jogada (delta em pawns = centipawns / 100).

| Categoria | Símbolo | Cor | Critério |
|---|---|---|---|
| Brilhante | 🌟 | `#a78bfa` | Melhor jogada (delta < 0.2) **e** sacrifício detectado¹ |
| Excelente | ✨ | `#34d399` | Melhor jogada (delta < 0.2), sem sacrifício |
| Boa | ✅ | `#6B8F71` | delta 0.2 – 0.5 |
| Imprecisão | ⚠️ | `#9ca3af` | delta 0.5 – 1.0 |
| Erro | ❌ | `#EE964B` | delta 1.0 – 2.0 |
| Chance Perdida | 🎯 | `#f87171` | Avaliação antes ≥ +3.0 **e** avaliação depois < +1.0 |
| Capivarada | 💀 | `#ef4444` | delta > 2.0 |

> ¹ **Detecção de sacrifício simplificada:** a peça movida foi para uma casa onde o oponente poderia capturá-la (a casa de destino estava atacada) **ou** capturou uma peça de valor inferior sem recaptura imediata. Classificado como Brilhante apenas se também for a melhor jogada (delta < 0.2).

**Prioridade de classificação:** Chance Perdida e Brilhante têm prioridade sobre as categorias baseadas em delta.

**Acurácia:** `(Brilhante + Excelente + Boa) / total × 100`, arredondado para inteiro.

### 5. Página `/review`

#### Layout desktop

```
[Barra de vantagem 14px] [Tabuleiro] [Painel de análise]
                         [Controles ⏮ ◀ ▶ ⏭]
```

#### Barra de vantagem (`AdvantageBar`)

- Barra vertical, preto no topo (vantagem das pretas), branco na base (vantagem das brancas)
- Clampada em ±5 pawns para visualização
- Score numérico exibido abaixo (valor real, não clampado), ex.: `+1.3`
- Atualiza conforme o usuário navega pelo histórico

#### Tabuleiro replay

- `ChessBoard` com `disabled={true}` (sem interação)
- Posição atualizada pelo índice da jogada atual (`currentMoveIndex`)
- Navegação: ⏮ (início) · ◀ (anterior) · ▶ (próximo) · ⏭ (fim)
- Atalhos de teclado: `←` / `→`

#### Painel de análise — Estado pré-análise

Visível se `chess-dojo:last-analysis` não existe ou usuário quer re-analisar:
- Cabeçalho com metadados da partida
- Controles de navegação (ativos — permite navegar sem análise)
- Botão **"Começar Análise"** (verde) → dispara `useStockfishAnalysis` com `depth: 10`

#### Painel de análise — Estado pós-análise

- **Gráfico de vantagem** (`AdvantageGraph`): linha recharts com score por jogada, clicável — clique navega o tabuleiro para aquela jogada
- **Precisão:** destaque numérico
- **Totais por categoria:** grid 2 colunas (nome + contagem), 7 categorias
- **Lista de jogadas** com badge por jogada: grid 3 colunas `número | brancas + badge | pretas + badge`; clicar em uma jogada navega o tabuleiro; jogada atual destacada em laranja
- **Botão "Baixar Revisão em PDF"** (aparece após análise concluída)

#### Layout mobile

```
[Barra de vantagem horizontal] [Tabuleiro]
[Controles ⏮ ◀ ▶ ⏭]
[Painel de análise — coluna única, scroll]
```

### 6. Exportação PDF

**Bibliotecas:** `jspdf` + `html2canvas`
**Nome do arquivo:** `chess-dojo-revisao-YYYY-MM-DD.pdf`

**Conteúdo capturado (sem o tabuleiro):**

1. Cabeçalho: título, data, bot, cor do jogador, resultado
2. Bloco de precisão
3. Cards de classificação (grid 4 colunas, 7 categorias)
4. Imagem do gráfico de vantagem (`html2canvas` do elemento `AdvantageGraph`)
5. Lista completa de jogadas com badges (2 colunas, fonte monospace)
6. Rodapé com nome do arquivo e crédito

**Estratégia:** capturar um `<div id="pdf-content">` oculto (tema claro, fundo branco), não a tela atual.

---

## Types novos em `game.types.ts`

```ts
export type MoveClassification =
  | 'brilliant'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'missed_win'
  | 'blunder'

export type MoveEvaluation = {
  moveIndex: number          // índice no array GameMove[]
  scoreBefore: number        // centipawns, perspectiva brancas
  scoreAfter: number         // centipawns, perspectiva brancas
  delta: number              // Math.abs(scoreAfter - scoreBefore) / 100
  classification: MoveClassification
}

export type AnalysisResult = {
  evaluations: MoveEvaluation[]
  accuracy: number           // 0–100
  date: string               // ISO 8601
}
```

---

## Dependências a instalar

```bash
cd frontend
npm install recharts jspdf html2canvas
npm install --save-dev @types/jspdf  # se necessário
```

---

## Fora de escopo

- Histórico de múltiplas partidas (só a última é armazenada)
- Análise da jogada sugerida ("melhor jogada era Nf3") — só classificação
- Modo análise livre (posição customizada)
- Compartilhamento de revisão online
