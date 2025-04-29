import { jsPDF } from "jspdf"

/**
 * Configura un documento PDF con opciones comunes
 */
export function configurarDocumentoPDF(options: {
  orientation?: "portrait" | "landscape"
  format?: string | [number, number]
}): jsPDF {
  const doc = new jsPDF({
    orientation: options.orientation || "portrait",
    format: options.format || "letter",
    putOnlyUsedFonts: true,
    compress: true,
  })

  // Configurar fuentes para soportar caracteres especiales
  doc.setFont("helvetica", "normal")
  doc.setLanguage("es-MX")

  return doc
}
