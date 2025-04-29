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
    compress: true,
  })

  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()

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
