import type jsPDF from "jspdf"
import { generarBoletinPDF } from "./boletin-pdf"
import type { Database } from "@/types/supabase"

// Tipos
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"] & { orden?: number }

interface CalificacionesTrimestres {
  trimestre1: Database["public"]["Tables"]["calificaciones"]["Row"][]
  trimestre2: Database["public"]["Tables"]["calificaciones"]["Row"][]
  trimestre3: Database["public"]["Tables"]["calificaciones"]["Row"][]
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
  areaMap: Record<string, string>,
): Promise<jsPDF> {
  if (alumnos.length === 0) {
    throw new Error("No hay alumnos para generar boletines")
  }

  // Generar boletín para el primer alumno
  const doc = await generarBoletinPDF(alumnos[0], curso, materias, calificaciones, nombreInstitucion, areaMap)

  // Añadir el resto de alumnos
  for (let i = 1; i < alumnos.length; i++) {
    // Añadir una nueva página para cada alumno adicional
    doc.addPage()

    // Generar el boletín para este alumno en la nueva página
    await generarBoletinPDF(
      alumnos[i],
      curso,
      materias,
      calificaciones,
      nombreInstitucion,
      areaMap,
      doc,
      false, // No añadir salto de página adicional
    )
  }

  return doc
}
