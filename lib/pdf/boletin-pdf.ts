import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { getEstiloNotaPDF } from "@/lib/utils"
import type { Database } from "@/types/supabase"
import { supabase } from "@/lib/supabase"

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

interface ConfiguracionPiePagina {
  piePaginaUrl: string | null
  piePaginaAltura: number
  piePaginaAjuste: string
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
  areaMap: Record<string, string>,
  piePaginaConfig?: ConfiguracionPiePagina | string | null,
  doc?: jsPDF,
  addPageBreak = true,
): Promise<jsPDF> {
  // Crear un nuevo documento si no se proporciona uno
  const pdfDoc = doc || new jsPDF({ format: "letter", orientation: "portrait", compress: false })

  // Si estamos añadiendo a un documento existente y se solicita un salto de página
  if (doc && addPageBreak) {
    pdfDoc.addPage()
  }

  // Procesar la configuración del pie de página
  let piePaginaUrl: string | null = null
  let piePaginaAltura = 80
  let piePaginaAjuste = "proporcional"

  if (typeof piePaginaConfig === "string" || piePaginaConfig === null) {
    piePaginaUrl = piePaginaConfig
  } else if (piePaginaConfig && typeof piePaginaConfig === "object") {
    piePaginaUrl = piePaginaConfig.piePaginaUrl
    piePaginaAltura = piePaginaConfig.piePaginaAltura || 80
    piePaginaAjuste = piePaginaConfig.piePaginaAjuste || "proporcional"
  }

  // Si no se proporciona configuración, intentar obtenerla de la base de datos
  if (!piePaginaConfig) {
    try {
      const { data: configData } = await supabase
        .from("configuracion")
        .select("pie_pagina_url, pie_pagina_altura, pie_pagina_ajuste, logo_url")
        .eq("id", 1)
        .single()

      if (configData) {
        piePaginaUrl = configData.pie_pagina_url
        piePaginaAltura = configData.pie_pagina_altura || 80
        piePaginaAjuste = configData.pie_pagina_ajuste || "proporcional"
      }
    } catch (error) {
      console.error("Error al obtener configuración del pie de página:", error)
    }
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

  // Verificar si el mapa de áreas está vacío y obtener áreas si es necesario
  const areaMapActualizado = { ...areaMap }
  if (Object.keys(areaMapActualizado).length === 0) {
    try {
      console.log("Cargando áreas para el PDF porque el mapa está vacío")
      const { data: areasData } = await supabase.from("areas").select("id, nombre")
      if (areasData && areasData.length > 0) {
        areasData.forEach((area) => {
          areaMapActualizado[area.id] = area.nombre
        })
      }
    } catch (error) {
      console.error("Error al cargar áreas para el PDF:", error)
    }
  }

  // Imprimir el mapa de áreas para depuración
  console.log("Mapa de áreas para el PDF:", areaMapActualizado)

  // Imprimir las materias y sus áreas para depuración
  materias.forEach((m) => {
    console.log(
      `Materia: ${m.nombre_largo}, ID Área: ${m.id_area}, Nombre Área: ${m.id_area ? areaMapActualizado[m.id_area] || "No encontrada" : "Sin área asignada"}`,
    )
  })

  // Agrupar materias por área
  const materiasConArea = materias.map((m) => {
    // Verificar si la materia tiene un id_area y si ese id existe en el mapa
    const areaNombre = m.id_area && areaMapActualizado[m.id_area] ? areaMapActualizado[m.id_area] : "Sin área"

    return {
      ...m,
      areaNombre,
    }
  })

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

  async function cargarImagen(url: string | null): Promise<HTMLImageElement | null> {
    if (!url) {
      console.warn("No se proporcionó una URL de imagen.")
      return null
    }

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = url
      })

      return img
    } catch (error) {
      console.error("Error al cargar la imagen:", error)
      return null
    }
  }

  // Añadir logo si existe
  try {
    // Obtener la URL del logo desde la configuración
    const { data: configData } = await supabase.from("configuracion").select("logo_url").eq("id", 1).single()
    const logoUrl = configData?.logo_url || null

    console.log("URL del logo:", logoUrl)

    if (logoUrl) {
      const img = await cargarImagen(logoUrl)
      if (img) {
        // Calcular dimensiones para mantener proporción
        const imgWidth = 70
        const imgHeight = (img.height * imgWidth) / img.width

        console.log("Añadiendo logo al PDF de boletín:", imgWidth, imgHeight)
        pdfDoc.addImage(img, "JPEG", 10, 10, imgWidth, imgHeight)
      } else {
        console.warn("No se pudo cargar el logo para el boletín")
      }
    } else {
      console.warn("No hay URL de logo disponible")
    }
  } catch (error) {
    console.error("Error al añadir el logo al PDF de boletín:", error)
  }

  // Título y encabezado
  pdfDoc.setFontSize(16)
  pdfDoc.text("Boletín de Calificaciones", 120, 13, { align: "center" })
  pdfDoc.setFontSize(14)
  pdfDoc.text(nombreInstitucion, 120, 20, { align: "center" })
  pdfDoc.setFontSize(12)
  pdfDoc.text(`${new Date().toLocaleDateString("es-ES")}`, 120, 27, { align: "center" })

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
  pdfDoc.text(`Alumno:`, 15, 35)
  pdfDoc.text(`${alumno.apellidos}, ${alumno.nombres}`, 35, 35)
  pdfDoc.text(`Curso:`, 15, 40)
  pdfDoc.text(`${curso?.nombre_largo || ""}`, 35, 40)

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

  // Obtener la posición final de la tabla
  const finalY = (pdfDoc as any).lastAutoTable.finalY || pdfDoc.internal.pageSize.height - 60

  // Añadir pie de página con imagen si existe, o líneas de firma si no
  if (piePaginaUrl) {
    try {
      // Cargar la imagen del pie de página
      const piePaginaImg = await cargarImagen(piePaginaUrl)
      if (piePaginaImg) {
        // Obtener dimensiones de la página
        const pageWidth = pdfDoc.internal.pageSize.width // Ancho de la página en puntos
        const margin = 15 // Reducir el margen a cada lado en puntos
        const availableWidth = pageWidth - 2 * margin // Ancho disponible para la imagen

        console.log(
          `Aplicando ajuste: ${piePaginaAjuste}, altura: ${piePaginaAltura}px, ancho disponible: ${availableWidth}pt`,
        )
        console.log(`Dimensiones originales de la imagen: ${piePaginaImg.width}x${piePaginaImg.height}px`)
        console.log(`Dimensiones de página: ancho=${pageWidth}pt, alto=${pdfDoc.internal.pageSize.height}pt`)

        let imgWidth, imgHeight

        switch (piePaginaAjuste) {
          case "altura_fija":
            // Altura fija, ancho proporcional
            imgHeight = piePaginaAltura
            imgWidth = (piePaginaImg.width * imgHeight) / piePaginaImg.height

            // Si el ancho calculado es mayor que el disponible, ajustar
            if (imgWidth > availableWidth) {
              imgWidth = availableWidth
              imgHeight = (piePaginaImg.height * imgWidth) / piePaginaImg.width
            }

            // Centrar horizontalmente
            const leftMargin = (pageWidth - imgWidth) / 2
            pdfDoc.addImage(piePaginaImg, "JPEG", leftMargin, finalY + 20, imgWidth, imgHeight)
            break

          case "ancho_completo":
            // Ancho completo, altura proporcional
            imgWidth = availableWidth
            imgHeight = (piePaginaImg.height * imgWidth) / piePaginaImg.width

            // Verificar que la altura no sea excesiva, pero permitir crecer hasta el máximo
            // Aumentamos el máximo para imágenes de ancho completo
            const maxHeight = 250 // Aumentamos el límite para imágenes de ancho completo
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight
              // No ajustamos el ancho para mantener el ancho completo
            }

            console.log(`Ancho completo - Final: ancho=${imgWidth}pt, alto=${imgHeight}pt, max altura=${maxHeight}pt`)
            pdfDoc.addImage(piePaginaImg, "JPEG", margin, finalY + 20, imgWidth, imgHeight)
            break

          case "proporcional":
          default:
            // Proporcional con altura máxima
            imgHeight = piePaginaAltura
            imgWidth = (piePaginaImg.width * imgHeight) / piePaginaImg.height

            // Si el ancho es mayor que el ancho disponible, ajustar
            if (imgWidth > availableWidth) {
              imgWidth = availableWidth
              imgHeight = (piePaginaImg.height * imgWidth) / piePaginaImg.width
            }

            // Centrar horizontalmente
            const leftPos = (pageWidth - imgWidth) / 2
            pdfDoc.addImage(piePaginaImg, "JPEG", leftPos, finalY + 20, imgWidth, imgHeight)
            break
        }

        console.log(
          `Imagen de pie de página añadida con ajuste: ${piePaginaAjuste}, altura final: ${imgHeight}pt, ancho final: ${imgWidth}pt, escala: ${(imgWidth / piePaginaImg.width).toFixed(2)}x`,
        )
      } else {
        console.warn("No se pudo cargar la imagen del pie de página, usando líneas de firma")
        // Usar líneas de firma como fallback
        const pageHeight = pdfDoc.internal.pageSize.height
        pdfDoc.setLineWidth(0.5)
        pdfDoc.line(40, pageHeight - 40, 80, pageHeight - 40) // Línea para firma del director
        pdfDoc.line(120, pageHeight - 40, 160, pageHeight - 40) // Línea para firma del padre/apoderado

        pdfDoc.setFontSize(10)
        pdfDoc.text("Director/a", 60, pageHeight - 35, { align: "center" })
        pdfDoc.text("Padre o Apoderado", 140, pageHeight - 35, { align: "center" })
      }
    } catch (error) {
      console.error("Error al añadir la imagen del pie de página:", error)
      // Usar líneas de firma como fallback
      const pageHeight = pdfDoc.internal.pageSize.height
      pdfDoc.setLineWidth(0.5)
      pdfDoc.line(40, pageHeight - 40, 80, pageHeight - 40) // Línea para firma del director
      pdfDoc.line(120, pageHeight - 40, 160, pageHeight - 40) // Línea para firma del padre/apoderado

      pdfDoc.setFontSize(10)
      pdfDoc.text("Director/a", 60, pageHeight - 35, { align: "center" })
      pdfDoc.text("Padre o Apoderado", 140, pageHeight - 35, { align: "center" })
    }
  } else {
    // Usar líneas de firma tradicionales
    const pageHeight = pdfDoc.internal.pageSize.height
    pdfDoc.setLineWidth(0.5)
    pdfDoc.line(40, pageHeight - 40, 80, pageHeight - 40) // Línea para firma del director
    pdfDoc.line(120, pageHeight - 40, 160, pageHeight - 40) // Línea para firma del padre/apoderado

    pdfDoc.setFontSize(10)
    pdfDoc.text("Director/a", 60, pageHeight - 35, { align: "center" })
    pdfDoc.text("Padre o Apoderado", 140, pageHeight - 35, { align: "center" })
  }

  return pdfDoc
}
