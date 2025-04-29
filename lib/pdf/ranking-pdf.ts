import type { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { configurarDocumentoPDF } from "./utils/pdf-utils"
import { supabase } from "@/lib/supabase"

// Definir tipos
interface Alumno {
  apellidos: string
  nombres: string
  promedio: number
  posicion: number
  [key: string]: any
}

interface Curso {
  nombre_corto: string
  nombre_largo: string
  [key: string]: any
}

interface GenerarRankingPDFOptions {
  alumnos: Alumno[]
  cursos: Curso[]
  selectedCurso: string
  selectedTrimestre: string
  nombreInstitucion: string
  logoUrl: string | null
}

/**
 * Genera un PDF con el ranking de alumnos
 */
export async function generarRankingPDF(options: GenerarRankingPDFOptions): Promise<jsPDF> {
  const { alumnos, cursos, selectedCurso, selectedTrimestre, nombreInstitucion, logoUrl } = options

  // Crear documento PDF
  const doc = configurarDocumentoPDF({
    orientation: "portrait",
    format: "letter",
    putOnlyUsedFonts: true,
    compress: false, // Desactivar compresión
  })

  async function cargarLogo(logoUrl: string | null): Promise<HTMLImageElement | null> {
    if (!logoUrl) {
      console.warn("No se proporcionó una URL de logo.")
      return null
    }

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = logoUrl
      })

      return img
    } catch (error) {
      console.error("Error al cargar el logo:", error)
      return null
    }
  }

  // Añadir logo si existe
  try {
    // Obtener la URL del logo desde la configuración
    const { data: configData } = await supabase.from("configuracion").select("logo_url").eq("id", 1).single()
    const logoUrl = configData?.logo_url || null

    const img = await cargarLogo(logoUrl)
    if (img) {
      // Calcular dimensiones para mantener proporción
      const imgWidth = 70
      const imgHeight = (img.height * imgWidth) / img.width

      console.log("Añadiendo logo al PDF de ranking:", imgWidth, imgHeight)
      doc.addImage(img, "JPEG", 15, 10, imgWidth, imgHeight)
    } else {
      console.warn("No se pudo cargar el logo para el ranking")
    }
  } catch (error) {
    console.error("Error al añadir el logo al PDF de ranking:", error)
  }

  // Título
  const trimestreTexto =
    selectedTrimestre === "1"
      ? "Primer Trimestre"
      : selectedTrimestre === "2"
        ? "Segundo Trimestre"
        : selectedTrimestre === "3"
          ? "Tercer Trimestre"
          : "Promedio Anual"

  const cursoTexto =
    selectedCurso === "TODOS"
      ? "Todos los Cursos"
      : cursos.find((c) => c.nombre_corto === selectedCurso)?.nombre_largo || selectedCurso

  doc.setFontSize(16)
  doc.text(`Ranking de Alumnos`, 195, 15, { align: "right" })
  doc.text(`${trimestreTexto}`, 195, 21, { align: "right" })

  // Información del curso
  doc.setFontSize(12)
  doc.text(`Curso: ${cursoTexto}`, 15, 35)
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 195, 35, { align: "right" })

  // Preparar datos para la tabla
  const head = [["Posición", "Apellidos", "Nombres", "Promedio"]]

  const body = alumnos.map((alumno) => [
    alumno.posicion.toString(),
    alumno.apellidos,
    alumno.nombres,
    alumno.promedio.toFixed(2),
  ])

  // Generar tabla
  autoTable(doc, {
    head,
    body,
    startY: 45,
    theme: "grid",
    headStyles: { fillColor: [245, 166, 10], fontSize: 10, halign: "center" },
    bodyStyles: { fontSize: 9, font: "helvetica" },
    columnStyles: {
      0: { halign: "center", cellWidth: 20 },
      3: { halign: "center", fontStyle: "bold" },
    },

    didParseCell: (data) => {
      if (data.section === "body") {
        // 1) Calculamos la posición real de la fila
        const posicion = data.row.index + 1
        if (posicion <= 3) {
          // 2) Negrita para los top 3
          data.cell.styles.fontStyle = "bold"

          // 3) Mapa de colores
          const colores = {
            1: { main: [255, 223, 0], subtle: [255, 240, 180] }, // Oro
            2: { main: [192, 192, 192], subtle: [220, 220, 220] }, // Plata
            3: { main: [205, 127, 50], subtle: [235, 200, 175] }, // Bronce
          }
          const { main, subtle } = colores[posicion]

          // 4) Columnas a colorear:
          //    - índice 0 → color "main"
          //    - índices 1, 2, 3 → color "subtle"
          if (data.column.index === 0) {
            data.cell.styles.fillColor = main
          } else if (data.column.index >= 1 && data.column.index <= 3) {
            data.cell.styles.fillColor = subtle
          }
        }
      }
    },
  })

  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Página ${i} de ${pageCount} - ${nombreInstitucion}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    )
  }

  return doc
}
