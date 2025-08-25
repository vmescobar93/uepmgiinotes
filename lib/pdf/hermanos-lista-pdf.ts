import type { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { getEstiloNotaPDF } from "@/lib/utils"
import { configurarDocumentoPDF } from "@/lib/pdf/utils/pdf-utils"
import { supabase } from "@/lib/supabase"

interface Alumno {
  cod_moodle: string
  nombres: string
  apellidos: string
  curso_corto: string
  curso_nombre?: string
  promedio?: number
}

interface GrupoHermanos {
  apellidoNormalizado: string
  apellidoOriginal: string
  hermanos: Alumno[]
}

/**
 * Genera un PDF con la lista de alumnos que tienen 3 o más hermanos
 */
export async function generarHermanosListaPDF(
  gruposHermanos: GrupoHermanos[],
  nombreInstitucion: string,
  logoUrl: string | null,
  trimestreTexto = "Promedio Anual",
): Promise<jsPDF> {
  const doc = configurarDocumentoPDF({
    orientation: "portrait",
    format: "letter",
    compress: false,
  })

  // Función para cargar el logo
  async function cargarLogo(logoUrl: string | null): Promise<HTMLImageElement | null> {
    if (!logoUrl) {
      console.warn("No se proporcionó una URL de logo.")
      return null
    }

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      // Usar una promesa para manejar la carga de la imagen
      return new Promise((resolve, reject) => {
        img.onload = () => resolve(img)
        img.onerror = () => {
          console.error("Error al cargar el logo")
          reject(null)
        }
        img.src = logoUrl

        // Establecer un timeout por si la imagen no carga
        setTimeout(() => {
          if (!img.complete) {
            console.warn("Timeout al cargar el logo")
            reject(null)
          }
        }, 5000)
      })
    } catch (error) {
      console.error("Error al cargar el logo:", error)
      return null
    }
  }

  // Añadir encabezado con logo y título
  const pageWidth = doc.internal.pageSize.width
  const margenDerecho = 15
  let logoHeight = 0

  // Añadir logo si existe
  try {
    // Obtener la URL del logo desde la configuración si no se proporcionó
    if (!logoUrl) {
      const { data: configData } = await supabase.from("configuracion").select("logo_url").eq("id", 1).single()
      logoUrl = configData?.logo_url || null
    }

    const img = await cargarLogo(logoUrl)
    if (img) {
      // Calcular dimensiones para mantener proporción
      const imgWidth = 70
      const imgHeight = (img.height * imgWidth) / img.width

      console.log("Añadiendo logo al PDF de hermanos:", imgWidth, imgHeight)
      doc.addImage(img, "JPEG", 15, 10, imgWidth, imgHeight)

      // Guardar altura del logo para cálculos posteriores
      logoHeight = imgHeight
    } else {
      console.warn("No se pudo cargar el logo para la lista de hermanos")
    }
  } catch (error) {
    console.error("Error al añadir el logo al PDF de hermanos:", error)
  }

  // Título del reporte - alineado a la derecha y a la misma altura que el logo
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("LISTA DE HERMANOS", pageWidth - margenDerecho, 15, { align: "right" })

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
  const lineaY = Math.max(10 + logoHeight, 35) + 5
  doc.setDrawColor(255, 196, 0) // Color amarillo para la línea
  doc.setLineWidth(1)
  doc.line(15, lineaY, pageWidth - 15, lineaY)

  // Posición inicial para las tablas
  let yPos = lineaY + 15

  // Generar una tabla para cada grupo de hermanos
  gruposHermanos.forEach((grupo, index) => {
    // Verificar si queda suficiente espacio en la página
    if (yPos > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      yPos = 20
    }

    // Título del grupo
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(`Familia ${grupo.apellidoOriginal}`, 15, yPos)
    yPos += 8

    // Datos para la tabla
    const head = [
      [
        "#",
        "Nombres",
        "Apellidos",
        "Curso",
        trimestreTexto === "Promedio Anual" ? "Promedio Anual" : `Promedio ${trimestreTexto}`,
      ],
    ]
    const body = grupo.hermanos.map((alumno, idx) => [
      (idx + 1).toString(),
      alumno.nombres,
      alumno.apellidos,
      alumno.curso_nombre || alumno.curso_corto,
      alumno.promedio && alumno.promedio > 0 ? alumno.promedio.toFixed(2) : "-",
    ])

    // Generar tabla
    autoTable(doc, {
      head,
      body,
      startY: yPos,
      theme: "grid",
      headStyles: { fillColor: [255, 196, 0], textColor: [0, 0, 0], fontSize: 10, halign: "center" },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        4: { halign: "center", cellWidth: 20 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245], // Gris muy claro para filas alternas
      },
      didParseCell: (data) => {
        // Aplicar colores al promedio
        if (data.column.index === 4 && data.section === "body") {
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

    // Actualizar la posición Y para la siguiente tabla
    yPos = (doc as any).lastAutoTable.finalY + 15
  })

  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(
      `Página ${i} de ${pageCount} - ${nombreInstitucion} - Alumnos con 3 o más hermanos`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    )
  }

  return doc
}
