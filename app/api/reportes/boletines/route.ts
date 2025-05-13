import { NextResponse } from "next/server"
import { generarTodosBoletinesPDF } from "@/lib/pdf/boletines-pdf"

export async function POST(request: Request) {
  try {
    const { alumnos, curso, materias, calificaciones, nombreInstitucion, areaMap, piePaginaConfig } =
      await request.json()

    if (!alumnos || !materias || !calificaciones) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Generar el PDF con todos los boletines
    console.log("Generando PDF con todos los boletines...")
    console.log("Configuración de pie de página:", piePaginaConfig)

    const doc = await generarTodosBoletinesPDF(
      alumnos,
      curso,
      materias,
      calificaciones,
      nombreInstitucion,
      areaMap,
      piePaginaConfig,
    )

    // Convertir el PDF a un array buffer
    const pdfBuffer = doc.output("arraybuffer")

    // Devolver el PDF como respuesta
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Boletines_${curso?.nombre || "Curso"}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("Error al generar los PDFs:", error)
    return NextResponse.json({ error: error.message || "Error al generar los PDFs" }, { status: 500 })
  }
}
