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
  logoUrl: string | null,
  trimestreTexto: string,
): Promise<jsPDF> {
  // Crear documento PDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  // Añadir encabezado
  await agregarEncabezado(doc, logoUrl, trimestreTexto)

  // Ordenar cursos por nivel y nombre
  const cursosOrdenados = [...cursos].sort((a, b) => {
    if (a.nivel !== b.nivel) {
      // Orden de niveles: Inicial, Primaria, Secundaria
      const nivelOrden: Record<string, number> = {
        Inicial: 1,
        Primaria: 2,
        Secundaria: 3,
      }
      return (nivelOrden[a.nivel] || 99) - (nivelOrden[b.nivel] || 99)
    }
    return a.nombre_largo.localeCompare(b.nombre_largo)
  })

  // Agrupar cursos por nivel
  const cursosPorNivel: Record<string, Curso[]> = {}
  cursosOrdenados.forEach((curso) => {
    if (!cursosPorNivel[curso.nivel]) {
      cursosPorNivel[curso.nivel] = []
    }
    cursosPorNivel[curso.nivel].push(curso)
  })

  // Posición inicial
  let y = 40 // Aumentado para dar más espacio al encabezado con logo más grande
  const margenX = 15

  // Procesar cada nivel
  Object.entries(cursosPorNivel).forEach(([nivel, cursosNivel], nivelIndex) => {
    // Añadir título del nivel
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(`Nivel ${nivel}`, margenX, y)
    y += 10

    // Procesar cada curso del nivel
    cursosNivel.forEach((curso, cursoIndex) => {
      const alumnos = alumnosPorCurso[curso.nombre_corto] || []

      // Si no hay alumnos, mostrar mensaje
      if (alumnos.length === 0) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.text(`${curso.nombre_largo}: No hay datos suficientes`, margenX, y)
        y += 8
        return
      }

      // Añadir título del curso
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text(`${curso.nombre_largo}`, margenX, y)
      y += 8

      // Crear tabla para este curso
      autoTable(doc, {
        startY: y,
        head: [["Posición", "Alumno", "Promedio"]],
        body: alumnos.map((alumno) => [
          alumno.posicion?.toString() || "-",
          `${alumno.apellidos}, ${alumno.nombres}`,
          alumno.promedio?.toFixed(2) || "-",
        ]),
        headStyles: {
          fillColor: [255, 196, 0], // Color amarillo para los encabezados
          textColor: [0, 0, 0], // Texto negro para mejor contraste
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 10,
        },
        columnStyles: {
          0: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 20, halign: "center" },
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245], // Gris muy claro para filas alternas
        },
        margin: { left: margenX },
      })

      // Actualizar posición Y después de la tabla
      y = (doc as any).lastAutoTable.finalY + 10

      // Verificar si necesitamos una nueva página
      if (y > 250 && cursoIndex < cursosNivel.length - 1) {
        doc.addPage()
        y = 20
      }
    })

    // Añadir nueva página entre niveles si no es el último
    if (nivelIndex < Object.keys(cursosPorNivel).length - 1) {
      doc.addPage()
      y = 20
    }
  })

  // Añadir pie de página
  agregarPiePagina(doc)

  return doc
}

/**
 * Añade el encabezado al documento PDF
 */
async function agregarEncabezado(doc: jsPDF, logoUrl: string | null, trimestreTexto: string): Promise<void> {
  const pageWidth = doc.internal.pageSize.width
  const margenDerecho = 15 // Margen derecho para el texto
  let logoHeight = 0 // Altura del logo para calcular posiciones

  // Añadir logo si existe
  if (logoUrl) {
    try {
      // Cargar imagen
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = "Anonymous"
        image.onload = () => resolve(image)
        image.onerror = (e) => reject(new Error("Error al cargar el logo"))
        image.src = logoUrl
      })

      // Calcular dimensiones para mantener proporción
      const maxWidth = 70 // Aumentado a 70mm
      const maxHeight = 70 // Mantenemos la proporción
      let imgWidth = img.width
      let imgHeight = img.height

      if (imgWidth > maxWidth) {
        const ratio = maxWidth / imgWidth
        imgWidth = maxWidth
        imgHeight = imgHeight * ratio
      }

      if (imgHeight > maxHeight) {
        const ratio = maxHeight / imgHeight
        imgHeight = maxHeight
        imgWidth = imgWidth * ratio
      }

      // Guardar altura del logo para cálculos posteriores
      logoHeight = imgHeight

      // Añadir imagen
      doc.addImage(img, "JPEG", 15, 10, imgWidth, imgHeight)
    } catch (error) {
      console.error("Error al añadir logo:", error)
    }
  }

  // Título del reporte - alineado a la derecha y a la misma altura que el logo
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("MEJORES ALUMNOS POR CURSO", pageWidth - margenDerecho, 15, { align: "right" })

  // Trimestre - alineado a la derecha y debajo del título
  doc.setFontSize(14)
  doc.text(`Periodo: ${trimestreTexto}`, pageWidth - margenDerecho, 22, { align: "right" })

  // Fecha de generación - alineado a la derecha y debajo del trimestre
  const fecha = new Date().toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`Fecha de generación: ${fecha}`, pageWidth - margenDerecho, 29, { align: "right" })

  // Línea separadora - debajo del logo o del texto, lo que sea más bajo
  const lineaY = Math.max(10 + logoHeight, 27) + 5
  doc.setDrawColor(255, 196, 0) // Color amarillo para la línea
  doc.setLineWidth(1)
  doc.line(15, lineaY, pageWidth - 15, lineaY)
}

/**
 * Añade el pie de página al documento PDF
 */
function agregarPiePagina(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" })
  }
}
