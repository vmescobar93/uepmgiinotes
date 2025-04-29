// Exportar todas las funciones para mantener compatibilidad con el código existente
import { generarBoletinPDF } from "./boletin-pdf"
import { generarTodosBoletinesPDF } from "./boletines-pdf"
import { generarCentralizadorInternoPDF } from "./centralizador-pdf"
import { generarCentralizadorMineduPDF } from "./centralizador-minedu-pdf"
import { generarCalificacionesPDF } from "./calificaciones-pdf"

export {
  generarBoletinPDF,
  generarTodosBoletinesPDF,
  generarCentralizadorInternoPDF,
  generarCentralizadorMineduPDF,
  generarCalificacionesPDF,
}
