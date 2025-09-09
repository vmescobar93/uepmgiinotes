import jsPDF from "jspdf"
import "jspdf-autotable"
import type { Database } from "@/types/supabase"

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]

// Función para cargar el logo
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

// Función para agregar el encabezado
function agregarEncabezado(
  doc: jsPDF,
  nombreInstitucion: string,
  logoBase64: string | null,
  curso: Curso,
  trimestreTexto: string,
) {
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
  doc.text("CENTRALIZADOR DE CALIFICACIONES", 45, 28)

  // Información del curso y trimestre
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  doc.text(`Curso: ${curso.nombre_largo}`, 45, 36)
  doc.text(`Periodo: ${trimestreTexto}`, 45, 42)

  // Fecha
  const fecha = new Date().toLocaleDateString("es-ES")
  doc.text(`Fecha: ${fecha}`, 150, 36)
}

export async function generarCentralizadorInternoPDF(
  curso: Curso,
  alumnos: Alumno[],
  materias: Materia[],
  calificaciones: Calificacion[],
  nombreInstitucion: string,
  logoUrl: string,
  trimestre: string,
): Promise<jsPDF> {
  const doc = new jsPDF("landscape", "mm", "a4")

  // Cargar el logo
  const logoBase64 = logoUrl ? await cargarLogo(logoUrl) : null

  // Obtener texto del trimestre
  const trimestreTexto =
    trimestre === "1"
      ? "Primer Trimestre"
      : trimestre === "2"
        ? "Segundo Trimestre"
        : trimestre === "3"
          ? "Tercer Trimestre"
          : "Promedio Anual"

  // Agregar encabezado
  agregarEncabezado(doc, nombreInstitucion, logoBase64, curso, trimestreTexto)

  // Preparar datos para la tabla
  const headers = ["N°", "Apellidos y Nombres", ...materias.map((m) => m.nombre_corto), "Promedio"]

  const data = alumnos.map((alumno, index) => {
    const fila = [(index + 1).toString(), `${alumno.apellidos}, ${alumno.nombres}`]

    // Agregar calificaciones por materia
    let sumaNotas = 0
    let cantidadNotas = 0

    materias.forEach((materia) => {
      const calificacion = calificaciones.find(
        (cal) => cal.alumno_id === alumno.cod_moodle && cal.materia_id === materia.codigo,
      )

      if (calificacion && calificacion.nota !== null) {
        fila.push(calificacion.nota.toString())
        sumaNotas += calificacion.nota
        cantidadNotas++
      } else {
        fila.push("-")
      }
    })

    // Calcular promedio
    const promedio = cantidadNotas > 0 ? (sumaNotas / cantidadNotas).toFixed(2) : "-"
    fila.push(promedio)

    return fila
  })

  // Generar tabla
  ;(doc as any).autoTable({
    head: [headers],
    body: data,
    startY: 55,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [71, 71, 71],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 15 },
      1: { halign: "left", cellWidth: 50 },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 15, right: 15 },
  })

  // Agregar estadísticas en una tabla separada
  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Calcular estadísticas
  const totalAlumnos = alumnos.length
  const alumnosConNotas = data.filter((fila) => fila[fila.length - 1] !== "-").length
  const promedios = data.map((fila) => Number.parseFloat(fila[fila.length - 1])).filter((promedio) => !isNaN(promedio))

  const promedioGeneral =
    promedios.length > 0 ? (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(2) : "0.00"
  const notaMaxima = promedios.length > 0 ? Math.max(...promedios).toFixed(2) : "0.00"
  const notaMinima = promedios.length > 0 ? Math.min(...promedios).toFixed(2) : "0.00"

  const estadisticas = [
    ["Total de alumnos", totalAlumnos.toString()],
    ["Alumnos con calificaciones", alumnosConNotas.toString()],
    ["Promedio general", promedioGeneral],
    ["Nota más alta", notaMaxima],
    ["Nota más baja", notaMinima],
  ]
  ;(doc as any).autoTable({
    head: [["Estadística", "Valor"]],
    body: estadisticas,
    startY: finalY,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [71, 71, 71],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 60 },
      1: { halign: "center", cellWidth: 30 },
    },
    margin: { left: 15 },
    tableWidth: 90,
  })

  return doc
}
