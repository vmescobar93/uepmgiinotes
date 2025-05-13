import type jsPDF from "jspdf"
import { generarBoletinPDF } from "./boletin-pdf"
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
 * Genera un PDF con todos los boletines de un curso
 */
export async function generarTodosBoletinesPDF(
  alumnos: Alumno[],
  curso: Curso | undefined,
  materias: Materia[],
  calificaciones: CalificacionesTrimestres,
  nombreInstitucion: string,
  areaMap: Record<string, string>,
  piePaginaConfig?: ConfiguracionPiePagina | string | null,
): Promise<jsPDF> {
  if (alumnos.length === 0) {
    throw new Error("No hay alumnos para generar boletines")
  }

  // Cargar áreas frescas desde la base de datos
  let areaMapActualizado = { ...areaMap }
  try {
    console.log("Cargando áreas frescas para todos los boletines")
    const { data: areasData } = await supabase.from("areas").select("id, nombre")
    if (areasData && areasData.length > 0) {
      // Crear un nuevo mapa de áreas
      areaMapActualizado = {}
      areasData.forEach((area) => {
        areaMapActualizado[area.id] = area.nombre
      })
      console.log("Áreas cargadas:", areasData.length)
      console.log("Mapa de áreas actualizado:", areaMapActualizado)
    } else {
      console.warn("No se encontraron áreas en la base de datos")
    }
  } catch (error) {
    console.error("Error al cargar áreas para todos los boletines:", error)
  }

  // Verificar las materias y sus áreas
  materias.forEach((m) => {
    console.log(
      `Materia: ${m.nombre_largo}, ID Área: ${m.id_area}, Nombre Área: ${m.id_area ? areaMapActualizado[m.id_area] || "No encontrada" : "Sin área asignada"}`,
    )
  })

  // Cargar configuración de pie de página si no se proporciona
  let piePaginaConfigActualizada = piePaginaConfig
  if (!piePaginaConfigActualizada) {
    try {
      console.log("Cargando configuración de pie de página para todos los boletines")
      const { data: configData } = await supabase
        .from("configuracion")
        .select("pie_pagina_url, pie_pagina_altura, pie_pagina_ajuste")
        .eq("id", 1)
        .single()

      if (configData) {
        piePaginaConfigActualizada = {
          piePaginaUrl: configData.pie_pagina_url,
          piePaginaAltura: configData.pie_pagina_altura || 80,
          piePaginaAjuste: configData.pie_pagina_ajuste || "proporcional",
        }
        console.log("Configuración de pie de página cargada:", piePaginaConfigActualizada)
      }
    } catch (error) {
      console.error("Error al cargar configuración de pie de página para todos los boletines:", error)
    }
  }

  // Generar boletín para el primer alumno
  const doc = await generarBoletinPDF(
    alumnos[0],
    curso,
    materias,
    calificaciones,
    nombreInstitucion,
    areaMapActualizado,
    piePaginaConfigActualizada,
  )

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
      areaMapActualizado,
      piePaginaConfigActualizada,
      doc,
      false, // No añadir salto de página adicional
    )
  }

  return doc
}
