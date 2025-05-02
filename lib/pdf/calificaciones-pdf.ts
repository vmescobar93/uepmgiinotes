import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { getEstiloNotaPDF } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

type Alumno = {
  cod_moodle: string
  nombres: string | null
  apellidos: string | null
}

type Materia = {
  codigo: string
  nombre_largo: string | null
  curso_corto: string | null
}

type Profesor = {
  cod_moodle: string
  nombre: string | null
  apellidos: string | null
}

type Usuario = {
  id: string
  nombre: string | null
}

/**
 * Genera un PDF con las calificaciones de los alumnos para una materia y trimestre específicos
 */
export async function generarCalificacionesPDF({
  profesores,
  materias,
  alumnos,
  calificaciones,
  selectedProfesor,
  selectedMateria,
  selectedTrimestre,
  currentUserInfo,
}: {
  profesores: Profesor[]
  materias: Materia[]
  alumnos: Alumno[]
  calificaciones: Record<string, number>
  selectedProfesor: string
  selectedMateria: string
  selectedTrimestre: string
  currentUserInfo: Usuario | null
}) {
  if (!selectedMateria) {
    throw new Error("Seleccione materia y trimestre.")
  }

  if (!currentUserInfo) {
    throw new Error("No se pudo identificar al usuario actual.")
  }

  // Configurar fuentes para soportar caracteres especiales
  const doc = new jsPDF({
    orientation: "portrait",
    format: "letter",
    putOnlyUsedFonts: true,
    compress: false,
  })

  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()

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

      console.log("Añadiendo logo al PDF de calificaciones:", imgWidth, imgHeight)
      doc.addImage(img, "JPEG", 10, 10, imgWidth, imgHeight)
    } else {
      console.warn("No se pudo cargar el logo para las calificaciones")
    }
  } catch (error) {
    console.error("Error al añadir el logo al PDF de calificaciones:", error)
  }

  // Título y fecha
  const trimestreText = selectedTrimestre === "1" ? "1er" : selectedTrimestre === "2" ? "2do" : "3er"
  const today = new Date()
  const dateStr = today.toLocaleDateString()
  doc.setFontSize(16)
  doc.text(`Entrega de Notas ${trimestreText} Trimestre`, width - 14, 14, { align: "right" })
  doc.setFontSize(10)
  doc.text(`Fecha: ${dateStr}`, width - 14, 20, { align: "right" })

  // Datos de curso y materia
  const materiaObj = materias.find((m) => m.codigo === selectedMateria)
  const curso = materiaObj?.curso_corto || ""
  // Colocar curso y materia en posiciones fijas
  doc.setFontSize(10)
  doc.text(`Curso: ${curso}`, 14, 32)
  doc.text(`Materia: ${materiaObj?.nombre_largo || ""}`, 14, 36)

  // Información del profesor
  const prof = profesores.find((p) => p.cod_moodle === selectedProfesor)
  const nombreProfesor = prof ? `${prof.nombre} ${prof.apellidos}` : ""
  doc.text(`Profesor: ${nombreProfesor}`, 14, 40)

  // Tabla de calificaciones
  const head = [["#", "Apellidos", "Nombres", "Nota"]]
  const body = alumnos.map((a, i) => [
    String(i + 1),
    a.apellidos || "",
    a.nombres || "",
    calificaciones[a.cod_moodle]?.toFixed(2) || "",
  ])

  autoTable(doc, {
    head,
    body,
    startY: 48,
    theme: "grid",
    headStyles: { halign: "center", fillColor: [245, 166, 10], fontSize: 8 },
    styles: {
      fontSize: 9,
      cellPadding: 1,
      lineHeight: 1,
      font: "helvetica",
    },
    columnStyles: {
      0: { halign: "center" },
      3: { halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      // Aplicar colores según el estado de la nota
      if (data.column.index === 3 && data.section === "body") {
        const valor = data.cell.text[0]
        if (valor !== "" && valor !== "-") {
          const nota = Number.parseFloat(valor)
          if (!isNaN(nota)) {
            const estilos = getEstiloNotaPDF(nota, data.cell.styles)
            Object.assign(data.cell.styles, estilos)
          }
        }
      }
    },
  })

  // Pie de firmas y fecha/hora de impresión (centrado)
  const footerY = height - 30
  const lineLen = 60
  const marginX = 20
  const now = new Date().toLocaleString()

  // Líneas de firma
  doc.setLineWidth(0.4)
  doc.line(marginX, footerY, marginX + lineLen, footerY)
  doc.line(width - marginX - lineLen, footerY, width - marginX, footerY)

  // Etiquetas de firma
  doc.setFontSize(9)

  // Usar el usuario actual como transcriptor
  doc.text(`Transcriptor: ${currentUserInfo.nombre || ""}`, marginX, footerY + 4)
  doc.text(`Profesor: ${nombreProfesor}`, width - marginX - lineLen, footerY + 4)

  // Fecha y hora centrada bajo las firmas
  doc.setFontSize(10)
  doc.text(`Fecha y hora: ${now}`, width / 2, footerY + 15, { align: "center" })

  return doc
}

/**
 * Genera un PDF con todas las calificaciones de un profesor para todas sus materias y trimestres
 */
export async function generarTodasCalificacionesPDF({
  profesorId,
  currentUserInfo,
}: {
  profesorId: string
  currentUserInfo: Usuario | null
}) {
  if (!profesorId) {
    throw new Error("Seleccione un profesor.")
  }

  if (!currentUserInfo) {
    throw new Error("No se pudo identificar al usuario actual.")
  }

  // Configurar documento PDF
  const doc = new jsPDF({
    orientation: "portrait",
    format: "letter",
    putOnlyUsedFonts: true,
    compress: false,
  })

  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()

  // Obtener información del profesor
  const { data: profesor } = await supabase.from("profesores").select("*").eq("cod_moodle", profesorId).single()

  if (!profesor) {
    throw new Error("No se encontró información del profesor.")
  }

  // Obtener materias del profesor
  const { data: materiasProfesor } = await supabase
    .from("materias_profesores")
    .select("codigo_materia")
    .eq("cod_moodle_profesor", profesorId)

  if (!materiasProfesor || materiasProfesor.length === 0) {
    throw new Error("El profesor no tiene materias asignadas.")
  }

  const codigosMaterias = materiasProfesor.map((mp) => mp.codigo_materia).filter(Boolean) as string[]

  // Obtener detalles de las materias
  const { data: materias } = await supabase
    .from("materias")
    .select("*")
    .in("codigo", codigosMaterias)
    .order("curso_corto")

  if (!materias || materias.length === 0) {
    throw new Error("No se encontraron materias para el profesor.")
  }

  // Cargar logo
  async function cargarLogo(logoUrl: string | null): Promise<HTMLImageElement | null> {
    if (!logoUrl) return null

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

  // Obtener la URL del logo desde la configuración
  const { data: configData } = await supabase.from("configuracion").select("logo_url").eq("id", 1).single()
  const logoUrl = configData?.logo_url || null
  const logoImg = await cargarLogo(logoUrl)

  // Procesar cada materia y trimestre
  let isFirstPage = true
  const trimestres = ["1", "2", "3"]
  const nombreProfesor = `${profesor.nombre} ${profesor.apellidos}`

  for (const materia of materias) {
    for (const trimestre of trimestres) {
      // Obtener alumnos del curso
      const { data: alumnos } = await supabase
        .from("alumnos")
        .select("*")
        .eq("curso_corto", materia.curso_corto)
        .eq("activo", true)
        .order("apellidos")

      if (!alumnos || alumnos.length === 0) continue

      // Obtener calificaciones
      const { data: calificacionesData } = await supabase
        .from("calificaciones")
        .select("*")
        .eq("materia_id", materia.codigo)
        .eq("trimestre", Number(trimestre))

      // Si no hay calificaciones para esta materia y trimestre, continuar con el siguiente
      if (!calificacionesData || calificacionesData.length === 0) continue

      // Mapear calificaciones por alumno
      const calificacionesMap: Record<string, number> = {}
      calificacionesData.forEach((cal) => {
        if (cal.alumno_id && cal.nota !== null) {
          calificacionesMap[cal.alumno_id] = cal.nota
        }
      })

      // Si no es la primera página, añadir una nueva
      if (!isFirstPage) {
        doc.addPage()
      } else {
        isFirstPage = false
      }

      // Añadir logo si existe
      if (logoImg) {
        const imgWidth = 70
        const imgHeight = (logoImg.height * imgWidth) / logoImg.width
        doc.addImage(logoImg, "JPEG", 10, 10, imgWidth, imgHeight)
      }

      // Título y fecha
      const trimestreText = trimestre === "1" ? "1er" : trimestre === "2" ? "2do" : "3er"
      const today = new Date()
      const dateStr = today.toLocaleDateString()
      doc.setFontSize(16)
      doc.text(`Entrega de Notas ${trimestreText} Trimestre`, width - 14, 14, { align: "right" })
      doc.setFontSize(10)
      doc.text(`Fecha: ${dateStr}`, width - 14, 20, { align: "right" })

      // Datos de curso y materia
      doc.setFontSize(10)
      doc.text(`Curso: ${materia.curso_corto || ""}`, 14, 32)
      doc.text(`Materia: ${materia.nombre_largo || ""}`, 14, 36)
      doc.text(`Profesor: ${nombreProfesor}`, 14, 40)

      // Tabla de calificaciones
      const head = [["#", "Apellidos", "Nombres", "Nota"]]
      const body = alumnos.map((a, i) => [
        String(i + 1),
        a.apellidos || "",
        a.nombres || "",
        calificacionesMap[a.cod_moodle]?.toFixed(2) || "",
      ])

      autoTable(doc, {
        head,
        body,
        startY: 48,
        theme: "grid",
        headStyles: { halign: "center", fillColor: [245, 166, 10], fontSize: 8 },
        styles: {
          fontSize: 9,
          cellPadding: 1,
          lineHeight: 1,
          font: "helvetica",
        },
        columnStyles: {
          0: { halign: "center" },
          3: { halign: "center" },
        },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          // Aplicar colores según el estado de la nota
          if (data.column.index === 3 && data.section === "body") {
            const valor = data.cell.text[0]
            if (valor !== "" && valor !== "-") {
              const nota = Number.parseFloat(valor)
              if (!isNaN(nota)) {
                const estilos = getEstiloNotaPDF(nota, data.cell.styles)
                Object.assign(data.cell.styles, estilos)
              }
            }
          }
        },
      })

      // Pie de firmas y fecha/hora de impresión
      const footerY = height - 30
      const lineLen = 60
      const marginX = 20
      const now = new Date().toLocaleString()

      // Líneas de firma
      doc.setLineWidth(0.4)
      doc.line(marginX, footerY, marginX + lineLen, footerY)
      doc.line(width - marginX - lineLen, footerY, width - marginX, footerY)

      // Etiquetas de firma
      doc.setFontSize(9)
      doc.text(`Transcriptor: ${currentUserInfo.nombre || ""}`, marginX, footerY + 4)
      doc.text(`Profesor: ${nombreProfesor}`, width - marginX - lineLen, footerY + 4)

      // Fecha y hora centrada bajo las firmas
      doc.setFontSize(10)
      doc.text(`Fecha y hora: ${now}`, width / 2, footerY + 15, { align: "center" })
    }
  }

  // Si no se generó ninguna página, lanzar error
  if (isFirstPage) {
    throw new Error("No hay calificaciones registradas para este profesor.")
  }

  return doc
}
