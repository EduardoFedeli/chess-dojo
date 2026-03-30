"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChessBoard } from "@/components/board/ChessBoard";
import { AdvantageBar } from "@/components/review/AdvantageBar";
import { AdvantageGraph } from "@/components/review/AdvantageGraph";
import { MoveSummary } from "@/components/review/MoveSummary";
import { PdfExportButton } from "@/components/review/PdfExportButton";
import { useStockfishAnalysis } from "@/hooks/useStockfishAnalysis";
import {
  classifyMoves,
  computeAccuracy,
  CLASSIFICATION_META,
} from "@/utils/move-classifier";
import type {
  AnalysisResult,
  GameMove,
  MoveClassification,
  SavedGame,
} from "@/types/game.types";
import { usePieceTheme } from "@/hooks/usePieceTheme";
import { useBestMove } from "@/hooks/useBestMove";
import { BOTS } from "@/data/bots";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const STORAGE_GAME = "chess-dojo:last-game";
const STORAGE_ANALYSIS = "chess-dojo:last-analysis";

// Classificações que merecem destaque visual na lista de jogadas.
// Boa e Excelente são omitidas — são jogadas normais e não precisam de badge.
const NOTABLE: Set<MoveClassification> = new Set([
  "brilliant",
  "inaccuracy",
  "mistake",
  "missed_win",
  "blunder",
]);

// Badge colorido por classificação (só para classificações notáveis)
function MoveBadge({ classification }: { classification: MoveClassification }) {
  const meta = CLASSIFICATION_META[classification];
  return (
    <span
      className="rounded px-1 text-[8px] font-bold"
      style={{ background: `${meta.color}22`, color: meta.color }}
    >
      {meta.emoji}
    </span>
  );
}

function ReviewContent() {
  const router = useRouter();

  // --- Dados da partida — lidos do localStorage na inicialização (client-only) ---
  const [savedGame] = useState<SavedGame | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_GAME);
    return raw ? (JSON.parse(raw) as SavedGame) : null;
  });
  const [cachedResult, setCachedResult] = useState<AnalysisResult | null>(
    () => {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem(STORAGE_ANALYSIS);
      return raw ? (JSON.parse(raw) as AnalysisResult) : null;
    },
  );

  const { customPieces } = usePieceTheme();
  const {
    bestMove,
    isLoading: isBestMoveLoading,
    query: queryBestMove,
    clear: clearBestMove,
  } = useBestMove();

  // --- Estado de replay ---
  const [currentIndex, setCurrentIndex] = useState(0); // 0 = posição inicial

  // --- Estado de análise profunda ---
  const [deepAnalysisEnabled, setDeepAnalysisEnabled] = useState(false);

  const [boardSize, setBoardSize] = useState(600);

  useEffect(() => {
    function calculateOptimalBoardSize() {
      // 100vh - paddings verticais e botões
      const maxAvailableHeight = window.innerHeight - 138;
      // 100vw - paddings, painel direito (480px), gaps e barra de vantagem
      const maxAvailableWidth = window.innerWidth - 612;

      // Escolhe o menor gargalo para garantir que nada estoure na tela
      const optimalSize = Math.min(maxAvailableHeight, maxAvailableWidth, 840);

      // Limita a um tamanho mínimo razoável
      setBoardSize(Math.max(optimalSize, 300));
    }

    calculateOptimalBoardSize();
    window.addEventListener("resize", calculateOptimalBoardSize);
    return () => window.removeEventListener("resize", calculateOptimalBoardSize);
  }, []);

  // Redireciona para home se não houver partida salva
  useEffect(() => {
    if (!savedGame) router.push("/");
  }, [savedGame, router]);

  const moves = savedGame?.moves ?? [];
  const fens = [INITIAL_FEN, ...moves.map((m: GameMove) => m.fen)];

  // Análise profunda (depth 10) — só quando o usuário clica "Começar Análise"
  const {
    scores: deepScores,
    progress: deepProgress,
    isAnalyzing: isDeepAnalyzing,
  } = useStockfishAnalysis({ fens, depth: 10, enabled: deepAnalysisEnabled });

  const deepReady =
    !isDeepAnalyzing && deepScores.length === fens.length && fens.length > 1;

  // Quando análise profunda concluir, salvar no localStorage e atualizar cache
  useEffect(() => {
    if (!deepReady || deepScores.length === 0) return;
    const evaluations = classifyMoves(deepScores, moves);
    const accuracy = computeAccuracy(evaluations);
    const result: AnalysisResult = {
      evaluations,
      accuracy,
      date: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_ANALYSIS, JSON.stringify(result));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCachedResult(result);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeepAnalysisEnabled(false);
  }, [deepReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determinar quais dados exibir: análise profunda concluída > cache
  const activeResult: AnalysisResult | null = deepReady
    ? (() => {
        const evaluations = classifyMoves(deepScores, moves);
        const accuracy = computeAccuracy(evaluations);
        return { evaluations, accuracy, date: new Date().toISOString() };
      })()
    : cachedResult;

  const activeScores = deepReady ? deepScores : null;
  const graphScores: number[] =
    activeScores ??
    (activeResult?.evaluations
      ? [
          activeResult.evaluations[0]?.scoreBefore ?? 0,
          ...activeResult.evaluations.map((e) => e.scoreAfter),
        ]
      : []);

  // Precisão apenas das jogadas do jogador
  const playerAccuracy = activeResult
    ? computeAccuracy(
        activeResult.evaluations.filter(
          (_, i) => moves[i]?.color === savedGame?.playerColor,
        ),
      )
    : null;

  // --- Navegação ---
  const goTo = useCallback(
    (i: number) => {
      clearBestMove();
      setCurrentIndex(Math.max(0, Math.min(i, moves.length)));
    },
    [moves.length, clearBestMove],
  );
  const goFirst = useCallback(() => goTo(0), [goTo]);
  const goPrev = useCallback(
    () => goTo(currentIndex - 1),
    [goTo, currentIndex],
  );
  const goNext = useCallback(
    () => goTo(currentIndex + 1),
    [goTo, currentIndex],
  );
  const goLast = useCallback(() => goTo(moves.length), [goTo, moves.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  // FEN atual para o tabuleiro
  const currentFen =
    currentIndex === 0 ? INITIAL_FEN : moves[currentIndex - 1].fen;
  // Score atual para a barra de vantagem
  const currentScore = graphScores[currentIndex] ?? 0;

  if (!savedGame) return null;

  const bestMoveSquareStyles: Record<string, React.CSSProperties> = bestMove
    ? {
        [bestMove.from]: { background: "rgba(255, 255, 0, 0.5)" },
        [bestMove.to]: { background: "rgba(0, 200, 100, 0.5)" },
      }
    : {};

  const dateStr = new Date(savedGame.date).toLocaleDateString("pt-BR");
  const reviewBot = BOTS.find((b) => b.id === savedGame.botLevel);
  const botName =
    reviewBot?.name ??
    savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1);
  const botRating = reviewBot?.rating;
  const scoreDisplay =
    currentScore === 0
      ? "0.0"
      : `${currentScore > 0 ? "+" : ""}${(currentScore / 100).toFixed(1)}`;

  return (
    <main className="h-[100dvh] w-screen text-neutral-200 overflow-x-hidden p-2 md:flex md:items-center md:justify-center md:p-6 md:overflow-hidden relative">
      {/* Botão voltar (Fixo no topo esquerdo) */}
      <div className="mb-4 w-full z-10 md:absolute md:top-6 md:left-6 md:mb-0 md:w-auto">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 px-2 text-sm font-semibold text-neutral-500 transition-colors hover:text-neutral-200 md:text-base"
        >
          ← Início
        </button>
      </div>

      {/* Container Central: O ITEMS-STRETCH garante que os dois lados tenham a MESMA altura */}
      <div className="mx-auto flex w-full max-w-[500px] flex-col gap-4 md:max-w-none md:w-auto md:flex-row md:items-stretch md:justify-center md:gap-6 h-full py-4 md:py-0">
        {/* COLUNA ESQUERDA: Barra de vantagem + Tabuleiro + Controles */}
        <div className="flex shrink-0 gap-2 md:gap-4 md:items-start h-fit md:my-auto">
          {/* Barra de vantagem */}
          {graphScores.length > 0 && (
            <div className="shrink-0" style={{ height: boardSize }}>
              <AdvantageBar scoreCp={currentScore} height={boardSize} />
            </div>
          )}

          {/* Tabuleiro e botões */}
          <div
            className="flex flex-col items-center gap-3"
            style={{ width: boardSize }}
          >
            <div
              className="relative"
              style={{ width: boardSize, height: boardSize }}
            >
              <ChessBoard
                fen={currentFen}
                playerColor={savedGame.playerColor}
                makeMove={(_from: string, _to: string) => null}
                onMove={() => {}}
                disabled={true}
                customPieces={customPieces}
                squareStylesOverride={bestMoveSquareStyles}
                arrows={bestMove ? [[bestMove.from, bestMove.to]] : []}
              />
            </div>

            {/* Controles de Navegação (Número de Vantagem removido, e botões centralizados) */}
            <div className="flex w-full items-center justify-center mt-1">
              <div className="flex justify-center gap-2 md:gap-3">
                {[
                  { label: "⏮", action: goFirst, title: "Início" },
                  { label: "◀", action: goPrev, title: "Anterior (←)" },
                  { label: "▶", action: goNext, title: "Próximo (→)" },
                  { label: "⏭", action: goLast, title: "Fim" },
                ].map(({ label, action, title }) => (
                  <button
                    key={label}
                    onClick={action}
                    title={title}
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-400 transition-colors hover:border-neutral-400 hover:text-white md:px-5 md:py-2.5 md:text-base font-bold"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA UNIFICADA: Vai preencher 100% da altura da coluna esquerda */}
        <div className="flex w-full flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a]/95 shadow-2xl backdrop-blur-md md:w-[480px] md:shrink-0 h-full">
          {/* 1. Cabeçalho (Em duas linhas: Título em cima, Dados embaixo) */}
          <div className="shrink-0 border-b border-neutral-800/60 px-5 py-4">
            <div className="flex flex-col gap-2">
              
              {/* Linha 1: Título "Revisão" e Badge de Resultado à direita */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Revisão</h2>
                <div
                  className="flex shrink-0 items-center rounded-md bg-neutral-900/60 px-2.5 py-1 text-sm font-black shadow-sm"
                  style={{
                    color:
                      savedGame.result === "won"
                        ? "#6B8F71"
                        : savedGame.result === "lost"
                          ? "#f87171"
                          : "#9ca3af",
                  }}
                >
                  {savedGame.result === "won"
                    ? "🏆 Vitória"
                    : savedGame.result === "lost"
                      ? "😔 Derrota"
                      : "🤝 Empate"}
                </div>
              </div>

              {/* Linha 2: Data, Bot e Cor */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
                <span>📅 {dateStr}</span>
                <span className="opacity-50 text-xs">•</span>
                <span className="font-semibold text-neutral-300">
                  🤖 vs {botName}
                </span>
                <span className="opacity-50 text-xs">•</span>
                <span>
                  {savedGame.playerColor === "white" ? "♔ Brancas" : "♚ Pretas"}
                </span>
              </div>

            </div>
          </div>

          {/* Estado: analisando (profunda) */}
          {isDeepAnalyzing && (
            <div className="flex flex-1 flex-col justify-center p-6">
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-neutral-400">
                Análise profunda em andamento...
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(deepProgress * 100)}%`,
                    background: "linear-gradient(90deg, #6B8F71, #EE964B)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Estado: sem análise */}
          {!activeResult && !isDeepAnalyzing && (
            <div className="flex flex-1 flex-col justify-center p-6">
              <button
                onClick={() => setDeepAnalysisEnabled(true)}
                className="w-full rounded-xl py-4 text-sm font-black tracking-wide shadow-lg transition-all hover:opacity-90 md:text-base"
                style={{ backgroundColor: "#6B8F71", color: "#000" }}
              >
                Começar Análise Profunda (Depth 10)
              </button>
            </div>
          )}

          {/* Estado: análise disponível */}
          {activeResult && !isDeepAnalyzing && (
            <>
              {/* 2. Gráfico */}
              {graphScores.length > 0 && (
                <div className="shrink-0 border-b border-neutral-800/60 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-500">
                    Vantagem
                  </p>
                  <AdvantageGraph
                    scores={graphScores}
                    currentIndex={currentIndex}
                    onMoveClick={goTo}
                    height={80}
                  />
                </div>
              )}

              {/* 3. Resumo de Precisão */}
              <div className="shrink-0 border-b border-neutral-800/60 p-4">
                <MoveSummary
                  evaluations={activeResult.evaluations}
                  accuracy={playerAccuracy ?? activeResult.accuracy}
                  compact={true}
                />
              </div>

              {/* 4. Lista de jogadas — flex-1 garante que isso sugue TODO o espaço vazio! */}
              <div className="flex min-h-0 flex-1 flex-col bg-neutral-900/20">
                <div className="shrink-0 bg-neutral-900/50 px-5 py-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                    Jogadas
                  </p>
                </div>
                <div
                  className="flex-1 overflow-y-auto px-5 py-2"
                  style={{ scrollbarWidth: "thin" }}
                >
                  <div className="flex flex-col gap-0.5 text-sm font-mono">
                    {moves
                      .reduce<
                        {
                          white: GameMove;
                          black: GameMove | null;
                          wIdx: number;
                          bIdx: number | null;
                        }[]
                      >((rows, move, i) => {
                        if (i % 2 === 0)
                          rows.push({
                            white: move,
                            black: null,
                            wIdx: i + 1,
                            bIdx: null,
                          });
                        else {
                          rows[rows.length - 1].black = move;
                          rows[rows.length - 1].bIdx = i + 1;
                        }
                        return rows;
                      }, [])
                      .map((row, rowIdx) => {
                        const wEval = activeResult.evaluations[rowIdx * 2];
                        const bEval = activeResult.evaluations[rowIdx * 2 + 1];
                        const wActive = currentIndex === row.wIdx;
                        const bActive = currentIndex === (row.bIdx ?? -1);
                        const showWBadge =
                          wEval &&
                          row.white.color === savedGame.playerColor &&
                          NOTABLE.has(wEval.classification);
                        const showBBadge =
                          bEval &&
                          row.black?.color === savedGame.playerColor &&
                          NOTABLE.has(bEval.classification);
                        return (
                          <div
                            key={rowIdx}
                            className="grid items-center gap-2 py-0.5 border-b border-neutral-800/30 last:border-0"
                            style={{ gridTemplateColumns: "36px 1fr 1fr" }}
                          >
                            <span className="font-bold text-neutral-600">
                              {rowIdx + 1}.
                            </span>
                            <button
                              onClick={() => goTo(row.wIdx)}
                              className="flex items-center gap-2 rounded px-2.5 py-1 text-left transition-colors hover:bg-neutral-800"
                              style={{
                                background: wActive ? "#EE964B14" : undefined,
                                color: wActive ? "#EE964B" : "#e5e7eb",
                              }}
                            >
                              {row.white.san}
                              {showWBadge && (
                                <MoveBadge
                                  classification={wEval.classification}
                                />
                              )}
                            </button>
                            {row.black ? (
                              <button
                                onClick={() => goTo(row.bIdx!)}
                                className="flex items-center gap-2 rounded px-2.5 py-1 text-left transition-colors hover:bg-neutral-800"
                                style={{
                                  background: bActive ? "#EE964B14" : undefined,
                                  color: bActive ? "#EE964B" : "#9ca3af",
                                }}
                              >
                                {row.black.san}
                                {showBBadge && (
                                  <MoveBadge
                                    classification={bEval!.classification}
                                  />
                                )}
                              </button>
                            ) : (
                              <span className="pl-3 text-neutral-700">—</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* 5. Botões de ação (Rodapé fixo do painel unificado) */}
              <div className="shrink-0 border-t border-neutral-800/60 bg-neutral-900/40 p-4">
                <div className="flex flex-col gap-2">
                  {/* Ver melhor lance - AGORA COM ESTILO LARANJA/AMARELO */}
                  <button
                    onClick={() => {
                      if (bestMove) clearBestMove();
                      else queryBestMove(currentFen);
                    }}
                    disabled={isBestMoveLoading}
                    className="w-full rounded-lg border border-[#EE964B]/30 bg-[#EE964B]/10 py-3 text-sm font-bold text-[#EE964B] shadow-md transition-colors hover:bg-[#EE964B]/20 disabled:opacity-50"
                  >
                    {isBestMoveLoading
                      ? "Calculando..."
                      : bestMove
                        ? "Limpar lance"
                        : "Ver melhor lance ⚡"}
                  </button>

                  {/* Re-analisar - AGORA COM ESTILO ESCURO/NEUTRO (Igual ao PDF) */}
                  {cachedResult && !deepReady && (
                    <button
                      onClick={() => setDeepAnalysisEnabled(true)}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-3 text-sm font-bold text-neutral-400 shadow-md transition-colors hover:bg-neutral-800"
                    >
                      Re-analisar com depth 10
                    </button>
                  )}

                  <div className="w-full rounded-lg bg-neutral-950 shadow-md transition-opacity hover:opacity-80">
                    <PdfExportButton
                      savedGame={savedGame}
                      result={activeResult}
                      playerAccuracy={playerAccuracy ?? activeResult.accuracy}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewContent />
    </Suspense>
  );
}
