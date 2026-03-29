'use client'

import { useState } from 'react'
import { CLASSIFICATION_META } from '@/utils/move-classifier'
import type { AnalysisResult, MoveClassification, SavedGame } from '@/types/game.types'

const FLAG_CLASSIFICATIONS: MoveClassification[] = ['brilliant', 'missed_win', 'mistake', 'blunder']

const FLAG_COLORS: Record<string, [number, number, number]> = {
  brilliant:  [167, 139, 250],
  missed_win: [248, 113, 113],
  mistake:    [238, 150,  75],
  blunder:    [239,  68,  68],
}

export function PdfExportButton({
  savedGame,
  result,
  playerAccuracy,
}: {
  savedGame: SavedGame
  result: AnalysisResult
  playerAccuracy: number
}) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const W = 210, H = 297, M = 14
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      let y = M

      function ensureSpace(needed: number) {
        if (y + needed > H - M) { doc.addPage(); y = M }
      }

      const dateStr    = new Date(savedGame.date).toLocaleDateString('pt-BR')
      const resultText = savedGame.result === 'won' ? 'Vitoria' : savedGame.result === 'lost' ? 'Derrota' : 'Empate'
      const colorText  = savedGame.playerColor === 'white' ? 'Brancas' : 'Pretas'
      const botName    = savedGame.botLevel.charAt(0).toUpperCase() + savedGame.botLevel.slice(1)
      const moves      = savedGame.moves

      // ── Cabeçalho ────────────────────────────────────────────────────────────
      doc.setFontSize(15).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
      doc.text('Chess Dojo - Revisao de Partida', M, y); y += 7

      doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100, 100, 100)
      doc.text(`${dateStr}  vs ${botName}  ${colorText}  ${resultText}  ${moves.length} jogadas`, M, y); y += 4

      doc.setDrawColor(180, 180, 180).line(M, y, W - M, y); y += 6

      // ── Gráfico de vantagem ───────────────────────────────────────────────────
      const graphScores: number[] = [
        result.evaluations[0]?.scoreBefore ?? 0,
        ...result.evaluations.map(e => e.scoreAfter),
      ]

      const gW   = W - 2 * M
      const gH   = 28
      const gX   = M
      const gY   = y
      const midY = gY + gH / 2

      function scoreToY(cp: number): number {
        const clamped = Math.max(-500, Math.min(500, cp))
        return midY - (clamped / 500) * (gH / 2)
      }

      function indexToX(i: number): number {
        return gX + (i / Math.max(graphScores.length - 1, 1)) * gW
      }

      function fillPolygon(pts: [number, number][], r: number, g: number, b: number) {
        if (pts.length < 2) return
        const segs: [number, number][] = pts.slice(1).map(([x2, y2], i) => {
          const [x1, y1] = pts[i]
          return [x2 - x1, y2 - y1] as [number, number]
        })
        doc.setFillColor(r, g, b)
        doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'F', true)
      }

      // Fundo cinza claro
      doc.setFillColor(240, 240, 240)
      doc.rect(gX, gY, gW, gH, 'F')

      // Polígono positivo (acima de zero) — claro (brancas vencendo)
      const posPoints: [number, number][] = [[gX, midY]]
      graphScores.forEach((cp, i) => {
        posPoints.push([indexToX(i), Math.min(scoreToY(cp), midY)])
      })
      posPoints.push([gX + gW, midY])
      fillPolygon(posPoints, 220, 220, 220)

      // Polígono negativo (abaixo de zero) — escuro (pretas vencendo)
      const negPoints: [number, number][] = [[gX, midY]]
      graphScores.forEach((cp, i) => {
        negPoints.push([indexToX(i), Math.max(scoreToY(cp), midY)])
      })
      negPoints.push([gX + gW, midY])
      fillPolygon(negPoints, 60, 60, 60)

      // Flags: linhas verticais coloridas nas jogadas notáveis
      result.evaluations.forEach((ev, i) => {
        if (!FLAG_CLASSIFICATIONS.includes(ev.classification)) return
        const x = indexToX(i + 1)
        const [r, g, b] = FLAG_COLORS[ev.classification]
        doc.setDrawColor(r, g, b).setLineWidth(0.4)
        doc.line(x, gY, x, gY + gH)
      })

      // Linha central (y=0)
      doc.setDrawColor(100, 100, 100).setLineWidth(0.2)
      doc.line(gX, midY, gX + gW, midY)

      // Borda do gráfico
      doc.setDrawColor(180, 180, 180).setLineWidth(0.3)
      doc.rect(gX, gY, gW, gH)

      y += gH + 4

      doc.setDrawColor(180, 180, 180).line(M, y, W - M, y); y += 6

      // ── Precisão do jogador ───────────────────────────────────────────────────
      doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
      doc.text('Precisao do jogador:', M, y)
      doc.setTextColor(45, 106, 79)
      doc.text(`${playerAccuracy}%`, M + 47, y); y += 8

      // ── Contagem de classificações ────────────────────────────────────────────
      const classKeys = Object.keys(CLASSIFICATION_META) as MoveClassification[]
      const counts    = classKeys.reduce((acc, key) => {
        acc[key] = result.evaluations.filter(e => e.classification === key).length
        return acc
      }, {} as Record<MoveClassification, number>)

      const cols  = 4
      const cellW = (W - M * 2) / cols
      classKeys.forEach((key, i) => {
        const col = i % cols, row = Math.floor(i / cols)
        const x = M + col * cellW, cy = y + row * 10
        ensureSpace(12)
        doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(90, 90, 90)
        doc.text(CLASSIFICATION_META[key].label, x, cy)
        doc.setFont('helvetica', 'bold').setTextColor(0, 0, 0)
        doc.text(String(counts[key]), x, cy + 4)
      })
      y += Math.ceil(classKeys.length / cols) * 10 + 4

      doc.setDrawColor(180, 180, 180).line(M, y, W - M, y); y += 6

      // ── Lista de jogadas (duas colunas) ───────────────────────────────────────
      doc.setFontSize(8).setFont('helvetica', 'normal')
      const colW = (W - M * 2) / 2
      const rowH = 5
      const numW = 8

      for (let i = 0; i < moves.length; i += 2) {
        ensureSpace(rowH)

        const wMove = moves[i]
        const bMove = moves[i + 1]
        const wEval = result.evaluations[i]
        const bEval = result.evaluations[i + 1]
        const pairNum = Math.floor(i / 2) + 1

        doc.setTextColor(140, 140, 140)
        doc.text(`${pairNum}.`, M, y)

        doc.setTextColor(0, 0, 0)
        doc.text(wMove.san, M + numW, y)
        if (wEval) {
          doc.setTextColor(100, 100, 100).setFontSize(6)
          doc.text(CLASSIFICATION_META[wEval.classification].label, M + numW + 10, y)
          doc.setFontSize(8)
        }

        if (bMove) {
          doc.setTextColor(60, 60, 60)
          doc.text(bMove.san, M + colW, y)
          if (bEval) {
            doc.setTextColor(100, 100, 100).setFontSize(6)
            doc.text(CLASSIFICATION_META[bEval.classification].label, M + colW + 10, y)
            doc.setFontSize(8)
          }
        }

        y += rowH
      }

      // ── Rodapé ───────────────────────────────────────────────────────────────
      ensureSpace(10)
      doc.setDrawColor(200, 200, 200).line(M, y + 4, W - M, y + 4); y += 8
      doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(160, 160, 160)
      doc.text(`Chess Dojo  -  ${dateStr}`, W / 2, y, { align: 'center' })

      // ── Salvar ───────────────────────────────────────────────────────────────
      const date = new Date(savedGame.date).toISOString().slice(0, 10)
      doc.save(`chess-dojo-revisao-${date}.pdf`)

    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="w-full rounded-xl border border-neutral-700 py-3 text-sm font-semibold text-neutral-400 transition-colors hover:border-neutral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isExporting ? 'Gerando PDF...' : '⬇ Baixar Revisão em PDF'}
    </button>
  )
}
