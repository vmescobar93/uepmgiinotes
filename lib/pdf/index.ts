// Corregir las rutas de importación sin extensiones
import { generarBoletinPDF } from "./boletin-pdf"
import { generarTodosBoletinesPDF } from "./boletines-pdf"
import { generarCentralizadorInternoPDF } from "./centralizador-pdf"
import { generarCentralizadorMineduPDF } from "./centralizador-minedu-pdf"
import { generarCalificacionesPDF } from "./calificaciones-pdf"
import { generarRankingPDF } from "./ranking-pdf"

// Exportar todas las funciones
export {
  generarBoletinPDF,
  generarTodosBoletinesPDF,
  generarCentralizadorInternoPDF,
  generarCentralizadorMineduPDF,
  generarCalificacionesPDF,
  generarRankingPDF,
}
