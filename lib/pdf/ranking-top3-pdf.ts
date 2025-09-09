import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Database } from "@/types/supabase"

// Tipos
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"] & {
  promedio?: number
  posicion?: number
  curso_nombre?: string
}

type Curso = Database["public"]["Tables"]["cursos"]["Row"]

/**
 * Genera un PDF con el ranking de los 3 mejores alumnos por curso
 */
export async function generarRankingTop3PDF(
  alumnosPorCurso: Record<string, Alumno[]>,
  cursos: Curso[],
  nombreInstitucion: string,
  logoUrl: string,
  trimestreTexto: string,
): Promise<jsPDF> {
  const doc = new jsPDF("portrait", "mm", "a4")

  // Cargar el logo
  const logoBase64 = logoUrl ? await cargarLogo(logoUrl) : null

  // Agregar encabezado
  agregarEncabezado(doc, nombreInstitucion, logoBase64, trimestreTexto)

  let currentY = 55

  // Generar tabla para cada curso que tenga alumnos
  Object.keys(alumnosPorCurso).forEach((cursoCodigo) => {
    const alumnosCurso = alumnosPorCurso[cursoCodigo]

    if (alumnosCurso.length === 0) return

    const curso = cursos.find((c) => c.nombre_corto === cursoCodigo)
    if (!curso) return

    // Verificar si necesitamos una nueva página
    if (currentY > 250) {
      doc.addPage()
      currentY = 20
    }

    // Título del curso
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(`${curso.nombre_largo}`, 15, currentY)
    currentY += 10

    // Preparar datos para la tabla
    const headers = ["Pos.", "Alumno", "Promedio"]
    const data = alumnosCurso.map((alumno) => [
      alumno.posicion?.toString() || "-",
      `${alumno.apellidos}, ${alumno.nombres}`,
      alumno.promedio?.toFixed(2) || "-",
    ])

    // Generar tabla
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: currentY,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [255, 193, 7], // Amarillo
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 20 },
        1: { halign: "left", cellWidth: 100 },
        2: { halign: "center", cellWidth: 30 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 15, right: 15 },
    })

    currentY = (doc as any).lastAutoTable.finalY + 15
  })

  return doc
}

/**
 * Carga el logo desde una URL
 */
async function cargarLogo(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl)
    const blob = await response.blob()

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Error al cargar el logo:", error)
    return null
  }
}

/**
 * Añade el encabezado al documento PDF
 */
function agregarEncabezado(doc: jsPDF, nombreInstitucion: string, logoBase64: string | null, trimestreTexto: string) {
  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 15, 10, 25, 25)
    } catch (error) {
      console.error("Error al agregar logo:", error)
    }
  }

  // Título de la institución
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(nombreInstitucion, 45, 20)

  // Título del reporte
  doc.setFontSize(14)
  doc.text("RANKING TOP 3 POR CURSO", 45, 28)

  // Información del trimestre
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(`Periodo: ${trimestreTexto}`, 45, 36)

  // Fecha
  const fecha = new Date().toLocaleDateString("es-ES")
  doc.text(`Fecha: ${fecha}`, 150, 36)
}
