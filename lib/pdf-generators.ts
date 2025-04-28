import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { getEstiloNotaPDF } from "@/lib/utils"
import type { Database } from "@/types/supabase"

// Tipos
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"] & { orden?: number }
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]
type Agrupacion = Database["public"]["Tables"]["agrupaciones_materias"]["Row"]

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
  const pdfDoc = doc || new jsPDF({ unit: "mm", format: "letter" })

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
  if (logoUrl) {
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = logoUrl
      })

      // Calcular dimensiones para mantener proporción
      const imgWidth = 70
      const imgHeight = (img.height * imgWidth) / img.width

      pdfDoc.addImage(img, "JPEG", 10, 10, imgWidth, imgHeight)
    } catch (error) {
      console.error("Error al cargar el logo:", error)
    }
  }

  // Título y encabezado
  pdfDoc.setFontSize(16)
  pdfDoc.text("Boletín de Calificaciones", 120, 13, { align: "center", fontStyle: "bold" })
  pdfDoc.setFontSize(14)
  pdfDoc.text("1er Trimestre", 120, 19, { align: "center" })
  pdfDoc.setFontSize(12)
  pdfDoc.text(`${new Date().toLocaleDateString('es-ES')}`, 120, 25, { align: "center" })

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
  pdfDoc.text(`Curso:`, 15, 40, {fontStyle: "bold" })
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
      0: { cellWidth: 35, valign: "middle", fontStyle: "bold"  },
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
          const estilos = getEstiloNotaPDF(nota, data.cell.styles)
          Object.assign(data.cell.styles, estilos)
        }
      }
    },
  })

  return pdfDoc
}

/**
 * Genera un PDF con todos los boletines de un curso
 */
export async function generarTodosBoletinesPDF(
  alumnos: Alumno[],
  curso: Curso | undefined,
  materias: Materia[],
  calificaciones: CalificacionesTrimestres,
  nombreInstitucion: string,
  logoUrl: string | null,
  areaMap: Record<string, string>,
): Promise<jsPDF> {
  // Crear un nuevo documento PDF
  let doc = new jsPDF({ unit: "mm", format: "letter" })

  // Generar boletín para cada alumno
  for (let i = 0; i < alumnos.length; i++) {
    const alumnoActual = alumnos[i]
    // No añadir salto de página para el primer alumno
    doc = await generarBoletinPDF(
      alumnoActual,
      curso,
      materias,
      calificaciones,
      nombreInstitucion,
      logoUrl,
      areaMap,
      doc,
      i > 0, // Añadir salto de página excepto para el primer alumno
    )
  }

  return doc
}

/**
 * Genera un PDF del centralizador interno
 */
export async function generarCentralizadorInternoPDF(
  curso: Curso | undefined,
  alumnos: Alumno[],
  materias: Materia[],
  calificaciones: Calificacion[],
  trimestre: string,
  nombreInstitucion: string,
  logoUrl: string | null,
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  })

  // Añadir logo si existe
  if (logoUrl) {
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = logoUrl
      })

      // Calcular dimensiones para mantener proporción
      const imgWidth = 75
      const imgHeight = (img.height * imgWidth) / img.width

      doc.addImage(img, "JPEG", 15, 10, imgWidth, imgHeight)
    } catch (error) {
      console.error("Error al cargar el logo:", error)
    }
  }

  // Título
  const trimestreTexto = trimestre === "1" ? "1er" : trimestre === "2" ? "2do" : "3er"
  doc.setFontSize(16)
  doc.text(`Centralizador de Calificaciones`, 150, 15, { align: "center" })
  doc.setFontSize(14)
  doc.text(`${trimestreTexto} Trimestre`, 150, 22, { align: "center" })
  // Nombre de la institución
  doc.text(nombreInstitucion, 150, 29, { align: "center" })

  // Información del curso
  doc.setFontSize(12)
  doc.text(`Curso: ${curso?.nombre_largo || ""}`, 15, 35)
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 15, 40)

  // Ordenar materias por el campo "orden"
  const materiasOrdenadas = [...materias].sort((a, b) => {
    // Si el campo orden es null, colocar al final
    if (a.orden === null) return 1
    if (b.orden === null) return -1
    // Ordenar por el campo orden
    return a.orden - b.orden
  })

  // Obtener la nota de un alumno en una materia específica
  const getCalificacion = (alumnoId: string, materiaId: string): number | null => {
    const calificacion = calificaciones.find((cal) => cal.alumno_id === alumnoId && cal.materia_id === materiaId)
    return calificacion ? calificacion.nota : null
  }

  // Calcular el promedio de un alumno
  const calcularPromedio = (alumnoId: string): number => {
    const notasAlumno = materiasOrdenadas
      .map((materia) => getCalificacion(alumnoId, materia.codigo))
      .filter((nota): nota is number => nota !== null)

    if (notasAlumno.length === 0) return 0

    const suma = notasAlumno.reduce((acc, nota) => acc + nota, 0)
    return Math.round((suma / notasAlumno.length) * 100) / 100
  }

  // Preparar datos para la tabla
  const head = [["#", "Apellidos", "Nombres", ...materiasOrdenadas.map((m) => m.nombre_corto), "Promedio"]]

  const body = alumnos.map((alumno, index) => {
    const notas = materiasOrdenadas.map((materia) => {
      const nota = getCalificacion(alumno.cod_moodle, materia.codigo)
      return nota !== null ? nota.toFixed(2) : "-"
    })

    const promedio = calcularPromedio(alumno.cod_moodle)

    return [(index + 1).toString(), alumno.apellidos, alumno.nombres, ...notas, promedio.toFixed(2)]
  })

  // Generar tabla
  autoTable(doc, {
    head,
    body,
    startY: 45,
    theme: "grid",
    headStyles: { fillColor: [245, 166, 10], fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      [3 + materiasOrdenadas.length]: { halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      // Aplicar colores según el estado de la nota
      if (data.column.index >= 3 && data.column.index < 3 + materiasOrdenadas.length && data.section === "body") {
        const valor = data.cell.text[0]
        if (valor !== "-") {
          const nota = Number.parseFloat(valor)
          const estilos = getEstiloNotaPDF(nota, data.cell.styles)
          Object.assign(data.cell.styles, estilos)
        }
      }

      // Aplicar color al promedio
      if (data.column.index === 3 + materiasOrdenadas.length && data.section === "body") {
        const promedio = Number.parseFloat(data.cell.text[0])
        const estilos = getEstiloNotaPDF(promedio, data.cell.styles)
        Object.assign(data.cell.styles, estilos)
      }
    },
  })

  // Agregar leyenda de colores
  const startY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.text("Leyenda de calificaciones:", 15, startY)

  doc.setFontSize(9)
  doc.setTextColor(255, 0, 0)
  doc.text("0-49,00: Reprobado", 20, startY + 5)

  doc.setTextColor(245, 158, 11)
  doc.text("49,01-50,99: No Concluyente", 20, startY + 10)

  doc.setTextColor(0, 0, 0)
  doc.text("51,00-100,00: Aprobado", 20, startY + 15)

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

/**
 * Genera un PDF del centralizador MINEDU
 */
export async function generarCentralizadorMineduPDF(
  curso: Curso | undefined,
  alumnos: Alumno[],
  materias: Materia[],
  calificaciones: Calificacion[],
  agrupaciones: Agrupacion[],
  trimestre: string,
  nombreInstitucion: string,
  logoUrl: string | null,
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "letter",
  })

  // Añadir logo si existe
  if (logoUrl) {
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = logoUrl
      })

      // Calcular dimensiones para mantener proporción
      const imgWidth = 75
      const imgHeight = (img.height * imgWidth) / img.width

      doc.addImage(img, "JPEG", 15, 10, imgWidth, imgHeight)
    } catch (error) {
      console.error("Error al cargar el logo:", error)
    }
  }

  // Título
  const trimestreTexto = trimestre === "1" ? "1er" : trimestre === "2" ? "2do" : "3er"
  doc.setFontSize(16)
  doc.text(`Centralizador MINEDU`, 180, 15, { align: "center" })
  doc.setFontSize(14)
  doc.text(`${trimestreTexto} Trimestre`, 180, 22, { align: "center" })
  // Nombre de la institución
  //doc.setFontSize(14)
  //doc.text(nombreInstitucion, 150, 22, { align: "center" })

  // Información del curso
  doc.setFontSize(10)
  doc.text(`Curso: ${curso?.nombre_largo || ""}`, 15, 35)
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 15, 40)

  // Procesar materias y agrupaciones
  interface MateriaAgrupada {
    id_area: number
    nombre_grupo: string
    nombre_mostrar: string
    materias: string[]
    orden: number
  }

  interface ElementoOrdenado {
    tipo: "grupo" | "materia"
    id: string
    nombre: string
    orden: number
  }

  // Crear un mapa para acceder rápidamente a las materias por código
  const materiasMap = new Map<string, Materia>()
  materias.forEach((materia) => {
    materiasMap.set(materia.codigo, materia)
  })

  // Identificar materias agrupadas y no agrupadas
  const grupos: Record<string, MateriaAgrupada> = {}
  const noAgrupadas: Materia[] = []
  const materiasAgrupadasCodigos = new Set<string>()

  if (agrupaciones.length > 0) {
    // Procesar agrupaciones
    agrupaciones.forEach((agrupacion) => {
      if (!agrupacion.materia_codigo) return

      const key = `${agrupacion.id_area}-${agrupacion.nombre_grupo}`

      if (!grupos[key]) {
        grupos[key] = {
          id_area: agrupacion.id_area,
          nombre_grupo: agrupacion.nombre_grupo,
          nombre_mostrar: agrupacion.nombre_mostrar,
          materias: [],
          orden: Number.POSITIVE_INFINITY,
        }
      }

      grupos[key].materias.push(agrupacion.materia_codigo)
      materiasAgrupadasCodigos.add(agrupacion.materia_codigo)
    })

    // Calcular el orden mínimo para cada grupo
    Object.values(grupos).forEach((grupo) => {
      let minOrden = Number.POSITIVE_INFINITY

      grupo.materias.forEach((codigo) => {
        const materia = materiasMap.get(codigo)
        if (materia && materia.orden !== null && materia.orden < minOrden) {
          minOrden = materia.orden
        }
      })

      grupo.orden = minOrden === Number.POSITIVE_INFINITY ? 1000 : minOrden
    })

    // Identificar materias no agrupadas
    materias.forEach((materia) => {
      if (!materiasAgrupadasCodigos.has(materia.codigo)) {
        noAgrupadas.push(materia)
      }
    })
  } else {
    // Si no hay agrupaciones, todas las materias son no agrupadas
    noAgrupadas.push(...materias)
  }

  // Crear lista combinada de elementos ordenados
  const elementosOrdenados: ElementoOrdenado[] = []

  // Añadir grupos
  Object.entries(grupos).forEach(([key, grupo]) => {
    elementosOrdenados.push({
      tipo: "grupo",
      id: key,
      nombre: grupo.nombre_grupo,
      orden: grupo.orden,
    })
  })

  // Añadir materias no agrupadas
  noAgrupadas.forEach((materia) => {
    elementosOrdenados.push({
      tipo: "materia",
      id: materia.codigo,
      nombre: materia.nombre_corto,
      orden: materia.orden !== null ? materia.orden : 1000,
    })
  })

  // Ordenar todos los elementos por el campo orden
  elementosOrdenados.sort((a, b) => a.orden - b.orden)

  // Obtener la nota de un alumno en una materia específica
  const getCalificacion = (alumnoId: string, materiaId: string): number | null => {
    const calificacion = calificaciones.find((cal) => cal.alumno_id === alumnoId && cal.materia_id === materiaId)
    return calificacion ? calificacion.nota : null
  }

  // Calcular el promedio de un grupo de materias para un alumno
  const calcularPromedioGrupo = (alumnoId: string, materiasCodigos: string[]): number => {
    const notasGrupo = materiasCodigos
      .map((codigo) => getCalificacion(alumnoId, codigo))
      .filter((nota): nota is number => nota !== null)

    if (notasGrupo.length === 0) return 0

    const suma = notasGrupo.reduce((acc, nota) => acc + nota, 0)
    // Redondear a entero según requisito
    return Math.round(suma / notasGrupo.length)
  }

  // Preparar datos para la tabla
  const head = [["#", "Apellidos", "Nombres"]]

  // Añadir encabezados según el orden calculado
  elementosOrdenados.forEach((elemento) => {
    head[0].push(elemento.nombre)
  })

  const body = alumnos.map((alumno, index) => {
    const row = [(index + 1).toString(), alumno.apellidos, alumno.nombres]

    // Añadir notas según el orden calculado
    elementosOrdenados.forEach((elemento) => {
      if (elemento.tipo === "grupo") {
        const grupo = grupos[elemento.id]
        const promedio = calcularPromedioGrupo(alumno.cod_moodle, grupo.materias)
        row.push(promedio === 0 ? "-" : promedio.toString())
      } else {
        const materia = noAgrupadas.find((m) => m.codigo === elemento.id)
        if (materia) {
          const nota = getCalificacion(alumno.cod_moodle, materia.codigo)
          row.push(nota !== null ? Math.round(nota).toString() : "-")
        }
      }
    })

    return row
  })

  // Generar tabla
  autoTable(doc, {
    head,
    body,
    startY: 45,
    theme: "grid",
    headStyles: { fillColor: [245, 166, 10], fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      //1: { cellWidth: 15 },
    },
    didParseCell: (data) => {
      // Aplicar colores según el estado de la nota
      if (data.column.index >= 4 && data.section === "body") {
        const valor = data.cell.text[0]
        if (valor !== "-") {
          const nota = Number.parseFloat(valor)
          const estilos = getEstiloNotaPDF(nota, data.cell.styles)
          Object.assign(data.cell.styles, estilos)
        }
      }
    },
  })

  // Leyenda de agrupaciones
  if (Object.keys(grupos).length > 0) {
    const startY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text("Leyenda de agrupaciones:", 15, startY)

    let y = startY + 5
    Object.values(grupos).forEach((grupo) => {
      // Obtener el nombre de la materia a partir del código
      const getNombreMateria = (codigo: string): string => {
        const materia = materias.find((m) => m.codigo === codigo)
        return materia ? materia.nombre_corto : codigo
      }

      const text = `${grupo.nombre_grupo} (${grupo.nombre_mostrar}): ${grupo.materias.map(getNombreMateria).join(", ")}`
      doc.setFontSize(8)
      doc.text(text, 20, y)
      y += 4
    })

    // Agregar leyenda de colores
    doc.setFontSize(10)
    doc.text("Leyenda de calificaciones:", 15, y + 5)

    doc.setFontSize(9)
    doc.setTextColor(255, 0, 0)
    doc.text("0-49: Reprobado", 20, y + 10)

    doc.setTextColor(245, 158, 11)
    doc.text("50: No Concluyente", 20, y + 15)

    doc.setTextColor(0, 0, 0)
    doc.text("51-100: Aprobado", 20, y + 20)
  } else {
    // Si no hay agrupaciones, solo agregar leyenda de colores
    const startY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text("Leyenda de calificaciones:", 15, startY)

    doc.setFontSize(9)
    doc.setTextColor(255, 0, 0)
    doc.text("0-49: Reprobado", 20, startY + 5)

    doc.setTextColor(245, 158, 11)
    doc.text("50: No Concluyente", 20, startY + 10)

    doc.setTextColor(0, 0, 0)
    doc.text("51-100: Aprobado", 20, startY + 15)
  }

  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Página ${i} de ${pageCount} - ${nombreInstitucion} - Centralizador MINEDU`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    )
  }

  return doc
}
