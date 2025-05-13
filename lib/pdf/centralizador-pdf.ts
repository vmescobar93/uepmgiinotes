import type { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { getEstiloNotaPDF } from "@/lib/utils"
import { configurarDocumentoPDF } from "./utils/pdf-utils"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

// Tipos
type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]

// Interfaz para las estadísticas por materia
interface EstadisticasMateria {
  materiaId: string
  nombreMateria: string
  aprobados: number
  porcentajeAprobados: number
  reprobados: number
  porcentajeReprobados: number
  promedio: number
}

/**
 * Genera un centralizador interno de calificaciones en PDF
 */
export async function generarCentralizadorInternoPDF(
  curso: Curso | undefined,
  alumnos: Alumno[],
  materias: Materia[],
  calificaciones: Calificacion[],
  trimestre: string,
  nombreInstitucion: string,
  logoUrl: string | null,
  estadisticasPorMateria?: EstadisticasMateria[],
  promedioGeneral = 0,
): Promise<jsPDF> {
  const doc = configurarDocumentoPDF({
    orientation: "landscape",
    format: [216, 330],
    compress: false,
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

      console.log("Añadiendo logo al PDF de centralizador interno:", imgWidth, imgHeight)
      doc.addImage(img, "JPEG", 15, 10, imgWidth, imgHeight)
    } else {
      console.warn("No se pudo cargar el logo para el centralizador interno")
    }
  } catch (error) {
    console.error("Error al añadir el logo al PDF de centralizador interno:", error)
  }

  // Título
  const trimestreTexto = trimestre === "1" ? "1er" : trimestre === "2" ? "2do" : "3er"
  doc.setFontSize(16)
  doc.text(`Centralizador de Calificaciones`, 180, 15, { align: "center" })
  doc.setFontSize(14)
  doc.text(`${trimestreTexto} Trimestre`, 180, 22, { align: "center" })

  // Agregar leyenda de colores
  doc.setFontSize(10)
  doc.text("Leyenda de calificaciones:", 315, 15, { align: "right" })

  doc.setFontSize(9)
  doc.setTextColor(255, 0, 0)
  doc.text("0-49,00: Reprobado", 315, 20, { align: "right" })

  doc.setTextColor(245, 158, 11)
  doc.text("49,01-50,99: No Concluyente", 315, 25, { align: "right" })

  doc.setTextColor(0, 0, 0)
  doc.text("51,00-100,00: Aprobado", 315, 30, { align: "right" })

  // Información del curso
  doc.setFontSize(12)
  doc.text(`Curso: ${curso?.nombre_largo || ""}`, 15, 35)
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 15, 40)

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

  // Calcular promedios para todos los alumnos
  const promediosAlumnos = alumnos.map((alumno) => ({
    alumnoId: alumno.cod_moodle,
    promedio: calcularPromedio(alumno.cod_moodle),
  }))

  // Ordenar promedios de mayor a menor
  const promediosOrdenados = [...promediosAlumnos].sort((a, b) => b.promedio - a.promedio)

  // Obtener los IDs de los 3 mejores promedios
  const mejoresPromediosIds = promediosOrdenados.slice(0, 3).map((p) => p.alumnoId)

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

  // Generar tabla principal
  autoTable(doc, {
    margin: { left: 5, right: 5 },
    head,
    body,
    startY: 45,
    theme: "grid",
    headStyles: { fillColor: [245, 166, 10], fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 7.5, font: "helvetica" },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
    },
    didParseCell: (data) => {
      // Centrar todas las columnas de materias
      if (data.column.index >= 3 && data.section === "body") {
        data.cell.styles.halign = "center"
      }

      // Destacar los tres mejores promedios
      if (data.section === "body") {
        const alumnoActual = alumnos[data.row.index]
        if (alumnoActual && mejoresPromediosIds.includes(alumnoActual.cod_moodle)) {
          // Determinar la posición en el ranking
          const posicion = mejoresPromediosIds.indexOf(alumnoActual.cod_moodle) + 1

          // Aplicar estilos según la posición
          data.cell.styles.fontStyle = "bold"

          if (data.column.index === 0) {
            // Solo mostrar el indicador en la columna de número
            if (posicion === 1) {
              data.cell.styles.fillColor = [255, 223, 0] // Oro (amarillo)
            } else if (posicion === 2) {
              data.cell.styles.fillColor = [192, 192, 192] // Plata (gris)
            } else if (posicion === 3) {
              data.cell.styles.fillColor = [205, 127, 50] // Bronce (marrón)
            }
          } else {
            // Para el resto de columnas, solo aplicar un color de fondo más sutil
            if (posicion === 1) {
              data.cell.styles.fillColor = [255, 240, 180] // Oro claro
            } else if (posicion === 2) {
              data.cell.styles.fillColor = [220, 220, 220] // Plata claro
            } else if (posicion === 3) {
              data.cell.styles.fillColor = [235, 200, 175] // Bronce claro
            }
          }
        }
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

  // Si no hay estadísticas proporcionadas, calcularlas
  let estadisticas = estadisticasPorMateria
  if (!estadisticas) {
    estadisticas = materiasOrdenadas.map((materia) => {
      // Obtener todas las notas para esta materia
      const notasMateria = alumnos
        .map((alumno) => getCalificacion(alumno.cod_moodle, materia.codigo))
        .filter((nota): nota is number => nota !== null)

      // Contar aprobados y reprobados
      const aprobados = notasMateria.filter((nota) => nota >= 51).length
      const reprobados = notasMateria.filter((nota) => nota < 51).length

      // Calcular porcentajes
      const totalConNota = notasMateria.length
      const porcentajeAprobados = totalConNota > 0 ? (aprobados / totalConNota) * 100 : 0
      const porcentajeReprobados = totalConNota > 0 ? (reprobados / totalConNota) * 100 : 0

      // Calcular promedio
      const promedio =
        totalConNota > 0
          ? Math.round((notasMateria.reduce((acc, nota) => acc + nota, 0) / totalConNota) * 100) / 100
          : 0

      return {
        materiaId: materia.codigo,
        nombreMateria: materia.nombre_corto,
        aprobados,
        porcentajeAprobados,
        reprobados,
        porcentajeReprobados,
        promedio,
      }
    })
  }

  // Calcular promedio general si no se proporciona
  if (promedioGeneral === 0) {
    const promediosAlumnos = alumnos.map((alumno) => calcularPromedio(alumno.cod_moodle))
    const sumaPromedios = promediosAlumnos.reduce((acc, promedio) => acc + promedio, 0)
    promedioGeneral =
      promediosAlumnos.length > 0 ? Math.round((sumaPromedios / promediosAlumnos.length) * 100) / 100 : 0
  }

  // Preparar datos para la tabla de estadísticas con materias como columnas
  // Usar el mismo formato que la tabla principal
  const headEstadisticas = [["", "", "", "", ...materiasOrdenadas.map((m) => m.nombre_corto), "Promedio"]]

  // Crear filas para cada tipo de estadística
  const rowAprobados = ["Aprobados", "", "", ""]
  const rowPorcentajeAprobados = ["% Aprobados", "", "", ""]
  const rowReprobados = ["Reprobados", "", "", ""]
  const rowPorcentajeReprobados = ["% Reprobados", "", "", ""]
  const rowPromedio = ["Promedio", "", "", ""]

  // Llenar los datos para cada materia
  estadisticas.forEach((est) => {
    rowAprobados.push(est.aprobados.toString())
    rowPorcentajeAprobados.push(est.porcentajeAprobados.toFixed(2) + "%")
    rowReprobados.push(est.reprobados.toString())
    rowPorcentajeReprobados.push(est.porcentajeReprobados.toFixed(2) + "%")
    rowPromedio.push(est.promedio.toFixed(2))
  })

  // Añadir el promedio general a la última columna
  rowAprobados.push("-")
  rowPorcentajeAprobados.push("-")
  rowReprobados.push("-")
  rowPorcentajeReprobados.push("-")
  rowPromedio.push(promedioGeneral.toFixed(2))

  const bodyEstadisticas = [rowAprobados, rowPorcentajeAprobados, rowReprobados, rowPorcentajeReprobados, rowPromedio]

  // Generar tabla de estadísticas justo después de la tabla principal
  autoTable(doc, {
    margin: { left: 5, right: 5 },
    head: [], // Sin encabezado para que parezca contigua
    body: bodyEstadisticas,
    startY: (doc as any).lastAutoTable.finalY, // Justo después de la tabla anterior
    theme: "grid",
    bodyStyles: { fontSize: 7.5, font: "helvetica" },
    willDrawCell: (data) => {
      // Eliminar el borde superior para que parezca una continuación de la tabla principal
      if (data.row.index === 0) {
        data.cell.styles.lineWidth = { top: 0, right: 0.1, bottom: 0.1, left: 0.1 }
      }
    },
    didParseCell: (data) => {
      // Asegurar que las celdas tengan el mismo ancho que la tabla principal
      if (data.column.index === 0) {
        data.cell.styles.cellWidth = 8 // Mismo ancho que la columna # en la tabla principal
      }

      // Centrar todas las columnas excepto las primeras 4
      if (data.column.index >= 4) {
        data.cell.styles.halign = "center"
      }

      // Aplicar colores al promedio en la última fila
      if (data.row.index === 4 && data.column.index >= 4) {
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
