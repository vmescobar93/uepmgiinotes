import type { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { getEstiloNotaPDF } from "@/lib/utils"
import { configurarDocumentoPDF } from "./utils/pdf-utils"
import { supabase } from "@/lib/supabase"

// Tipos
type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]
type Agrupacion = Database["public"]["Tables"]["agrupaciones_materias"]["Row"]

/**
 * Genera un centralizador MINEDU de calificaciones en PDF
 */
export async function generarCentralizadorMineduPDF(
  curso: Curso | undefined,
  alumnos: Alumno[],
  materias: Materia[],
  calificaciones: Calificacion[],
  agrupaciones: Agrupacion[],
  trimestre: string,
  nombreInstitucion: string,
): Promise<jsPDF> {
  const doc = configurarDocumentoPDF({
    orientation: "landscape",
    format: "letter",
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
    const { data: configData } = await supabase.from("configuracion").select("logo_url").eq("id", 1).single()
    const logoUrl = configData?.logo_url || null

    const img = await cargarLogo(logoUrl)
    if (img) {
      // Calcular dimensiones para mantener proporción
      const imgWidth = 75
      const imgHeight = (img.height * imgWidth) / img.width

      console.log("Añadiendo logo al PDF de centralizador MINEDU:", imgWidth, imgHeight)
      doc.addImage(img, "JPEG", 15, 10, imgWidth, imgHeight)
    } else {
      console.warn("No se pudo cargar el logo para el centralizador MINEDU")
    }
  } catch (error) {
    console.error("Error al añadir el logo al PDF de centralizador MINEDU:", error)
  }

  // Título
  const trimestreTexto = trimestre === "1" ? "1er" : trimestre === "2" ? "2do" : "3er"
  doc.setFontSize(16)
  doc.text(`Centralizador MINEDU`, 180, 15, { align: "center" })
  doc.setFontSize(14)
  doc.text(`${trimestreTexto} Trimestre`, 180, 22, { align: "center" })

  // Información del curso
  doc.setFontSize(12)
  doc.text(`Curso: ${curso?.nombre_largo || ""}`, 15, 35)
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 15, 40)

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
    headStyles: { fillColor: [245, 166, 10], fontSize: 10, halign: "center" },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
    },
    didParseCell: (data) => {
      // Centrar todas las columnas de materias
      if (data.column.index >= 3 && data.section === "body") {
        data.cell.styles.halign = "center"
      }

      // Aplicar colores según el estado de la nota
      if (data.column.index >= 3 && data.section === "body") {
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
