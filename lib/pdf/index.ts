// Importar todas las funciones de generación de PDF
import { generarBoletinPDF } from "@/lib/pdf/boletin-pdf"
import { generarTodosBoletinesPDF } from "@/lib/pdf/boletines-pdf"
import { generarCentralizadorInternoPDF } from "@/lib/pdf/centralizador-pdf"
import { generarCentralizadorMineduPDF } from "@/lib/pdf/centralizador-minedu-pdf"
import { generarCalificacionesPDF, generarTodasCalificacionesPDF } from "@/lib/pdf/calificaciones-pdf"
import { generarRankingPDF } from "@/lib/pdf/ranking-pdf"
import { generarRankingTop3PDF } from "@/lib/pdf/ranking-top3-pdf"
import { generarRankingNivelPDF } from "@/lib/pdf/ranking-nivel-pdf"
import { generarHermanosListaPDF } from "@/lib/pdf/hermanos-lista-pdf"

// Exportar todas las funciones
export {
  generarBoletinPDF,
  generarTodosBoletinesPDF,
  generarCentralizadorInternoPDF,
  generarCentralizadorMineduPDF,
  generarCalificacionesPDF,
  generarTodasCalificacionesPDF,
  generarRankingPDF,
  generarRankingTop3PDF,
  generarRankingNivelPDF,
  generarHermanosListaPDF,
}
