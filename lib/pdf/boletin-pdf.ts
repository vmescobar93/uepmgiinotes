import type { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { getEstiloNotaPDF } from "@/lib/utils"
import { cargarLogo, configurarDocumentoPDF } from "./utils/pdf-utils"
import type { Database } from "@/types/supabase"

// Tipos
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"] & { orden?: number }
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]

interface CalificacionesTrimestres {
  trimestre1: Calificacion[]
  trimestre2: Calificacion[]
  trimestre3: Calificacion[]
}

/**
 * Genera un boletín de calificaciones en PDF para un alumno específico
 */
export async function generarBoletinPDF(
  alumno: Alumno,
  curso: Curso | undefined,
  materias: Materia[],
  calificaciones: CalificacionesTrimestres,
  nombreInstitucion: string,
  logoUrl: string | null,
  areaMap: Record<string, string>,
  doc?: jsPDF,
  addPageBreak = true,
): Promise<jsPDF> {
  // Crear un nuevo documento si no se proporciona uno
  const pdfDoc = doc || configurarDocumentoPDF({ format: "letter" })

  // Si estamos añadiendo a un documento existente y se solicita un salto de página
  if (doc && addPageBreak) {
    pdfDoc.addPage()
  }

  // Funciones para calcular calificaciones
  const getCalificacion = (materiaId: string, trimestre: 1 | 2 | 3): number | null => {
    const list =
      trimestre === 1
        ? calificaciones.trimestre1
        : trimestre === 2
          ? calificaciones.trimestre2
          : calificaciones.trimestre3

    const cal = list.find((c) => c.alumno_id === alumno.cod_moodle && c.materia_id === materiaId)
    return cal?.nota ?? null
  }

  const calcularPromedioMateria = (materiaId: string): number => {
    const notas = [1, 2, 3]
      .map((t) => getCalificacion(materiaId, t as 1 | 2 | 3))
      .filter((n): n is number => n !== null)

    if (!notas.length) return 0
    return Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 100) / 100
  }

  const calcularPromedioTrimestre = (tr: 1 | 2 | 3): number => {
    const notas = materias.map((m) => getCalificacion(m.codigo, tr)).filter((n): n is number => n !== null)
    if (!notas.length) return 0
    return Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 100) / 100
  }

  const calcularPromedioAnual = (): number => {
    const proms = [1, 2, 3].map((t) => calcularPromedioTrimestre(t as 1 | 2 | 3)).filter((p) => p > 0)
    if (!proms.length) return 0
    return Math.round((proms.reduce((s, p) => s + p, 0) / proms.length) * 100) / 100
  }

  // Agrupar materias por área
  const materiasConArea = materias.map((m) => ({
    ...m,
    areaNombre: m.id_area && areaMap[m.id_area] ? areaMap[m.id_area] : "Sin área",
  }))

  // Ordenar por área y luego por orden
  const ordenadas = [...materiasConArea].sort((a, b) => {
    const areaA = a.areaNombre || "Sin área"
    const areaB = b.areaNombre || "Sin área"

    if (areaA !== areaB) {
      return areaA.localeCompare(areaB)
    }
    return (a.orden ?? 0) - (b.orden ?? 0)
  })

  // Agrupar por área
  const materiasAgrupadas: Record<
    string,
    {
      areaNombre: string
      materias: (Materia & { areaNombre?: string })[]
    }
  > = {}

  ordenadas.forEach((materia) => {
    const areaId = materia.id_area || "sin-area"
    if (!materiasAgrupadas[areaId]) {
      materiasAgrupadas[areaId] = {
        areaNombre: materia.areaNombre || "Sin área",
        materias: [],
      }
    }
    materiasAgrupadas[areaId].materias.push(materia)
  })

  // Añadir logo si existe
  try {
    const img = await cargarLogo(logoUrl)
    if (img) {
      // Calcular dimensiones para mantener proporción
      const imgWidth = 70
      const imgHeight = (img.height * imgWidth) / img.width

      pdfDoc.addImage(img, "JPEG", 10, 10, imgWidth, imgHeight)
    }
  } catch (error) {
    console.error("Error al añadir el logo al PDF:", error)
  }

  // Título y encabezado
  pdfDoc.setFontSize(16)
  pdfDoc.text("Boletín de Calificaciones", 120, 13, { align: "center", fontStyle: "bold" })
  pdfDoc.setFontSize(14)
  pdfDoc.text("1er Trimestre", 120, 19, { align: "center" })
  pdfDoc.setFontSize(12)
  pdfDoc.text(`${new Date().toLocaleDateString("es-ES")}`, 120, 25, { align: "center" })

  // Agregar leyenda de colores
  pdfDoc.setFontSize(9)
  pdfDoc.text("Escala de Rendimiento:", 202, 13, { align: "right" })
  pdfDoc.setTextColor(255, 0, 0)
  pdfDoc.text("No Satisfactorio: 0 - 50", 202, 17, { align: "right" })
  pdfDoc.setTextColor(245, 158, 11)
  pdfDoc.text("Satisfactorio: 51 - 79", 202, 21, { align: "right" })
  pdfDoc.setTextColor(0, 0, 0)
  pdfDoc.text("Óptimo: 80 - 100", 202, 25, { align: "right" })

  // Información del alumno y curso
  pdfDoc.setFontSize(11)
  pdfDoc.text(`Alumno:`, 15, 35, { fontStyle: "bold" })
  pdfDoc.text(`${alumno.apellidos}, ${alumno.nombres}`, 35, 35)
  pdfDoc.text(`Curso:`, 15, 40, { fontStyle: "bold" })
  pdfDoc.text(`${curso?.nombre_largo || ""}`, 35, 40)

  // Pie de página con firmas
  const pageHeight = pdfDoc.internal.pageSize.getHeight()
  pdfDoc.setLineWidth(0.5)
  pdfDoc.line(40, pageHeight - 40, 80, pageHeight - 40) // Línea para firma del director
  pdfDoc.line(120, pageHeight - 40, 160, pageHeight - 40) // Línea para firma del padre/apoderado

  pdfDoc.setFontSize(10)
  pdfDoc.text("Director/a", 60, pageHeight - 35, { align: "center" })
  pdfDoc.text("Padre o Apoderado", 140, pageHeight - 35, { align: "center" })

  // Preparar datos para la tabla
  const head = [["Área", "Materia", "1er Trimestre", "2do Trimestre", "3er Trimestre", "Promedio Anual"]]
  const body = []

  // Datos de materias agrupados por área
  Object.values(materiasAgrupadas).forEach((grupo) => {
    // Calcular el número de filas para esta área
    const numFilas = grupo.materias.length

    // Iterar sobre las materias del grupo
    grupo.materias.forEach((materia, index) => {
      const nota1 = getCalificacion(materia.codigo, 1)
      const nota2 = getCalificacion(materia.codigo, 2)
      const nota3 = getCalificacion(materia.codigo, 3)
      const promedio = calcularPromedioMateria(materia.codigo)

      // Para la primera materia de cada área, añadir el nombre del área
      // Para las demás materias, dejar la celda del área vacía
      const row = [
        index === 0 ? { content: grupo.areaNombre, rowSpan: numFilas } : "",
        materia.nombre_largo,
        nota1 !== null ? nota1.toFixed(2) : "-",
        nota2 !== null ? nota2.toFixed(2) : "-",
        nota3 !== null ? nota3.toFixed(2) : "-",
        promedio.toFixed(2),
      ]

      // Filtrar elementos vacíos (para las celdas que se combinan)
      body.push(row.filter((cell) => cell !== ""))
    })
  })

  // Agregar promedio general
  body.push([
    { content: "PROMEDIO GENERAL", colSpan: 2 },
    calcularPromedioTrimestre(1).toFixed(2),
    calcularPromedioTrimestre(2).toFixed(2),
    calcularPromedioTrimestre(3).toFixed(2),
    calcularPromedioAnual().toFixed(2),
  ])

  // Generar tabla
  autoTable(pdfDoc, {
    startY: 45,
    head: head,
    body: body,
    theme: "grid",
    headStyles: {
      fillColor: [245, 166, 10],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 35, valign: "middle", fontStyle: "bold" },
      1: { cellWidth: 55, valign: "middle" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center", fontStyle: "bold" },
    },
    styles: {
      fontSize: 9,
      cellPadding: 1.5,
    },
    didParseCell: (data) => {
      // Estilo para la fila de promedio general
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold"
        data.cell.styles.fillColor = [220, 220, 220]
      }

      // Aplicar colores según el estado de la nota
      if (data.column.index >= 2 && data.column.index <= 5 && data.section === "body") {
        const valor = data.cell.text[0]
        if (valor !== "-") {
          const nota = Number.parseFloat(valor)
          if (!isNaN(nota)) {
            const estilos = getEstiloNotaPDF(nota, data.cell.styles)
            Object.assign(data.cell.styles, estilos)
          }
        }
      }
    },
  })

  return pdfDoc
}
