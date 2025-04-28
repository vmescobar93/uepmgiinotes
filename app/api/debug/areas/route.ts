import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Obtener todas las áreas
    const { data: areas, error: areasError } = await supabase.from("areas").select("id, nombre")

    if (areasError) {
      throw new Error(`Error al obtener áreas: ${areasError.message}`)
    }

    console.log("Áreas obtenidas:", areas)

    // Crear un mapa de áreas para búsqueda rápida (usando strings como claves)
    const areasMap: Record<string, string> = {}
    areas.forEach((area) => {
      areasMap[area.id] = area.nombre
    })

    console.log("Mapa de áreas:", areasMap)

    // Obtener todas las materias
    const { data: materias, error: materiasError } = await supabase
      .from("materias")
      .select("codigo, nombre_largo, id_area")

    if (materiasError) {
      throw new Error(`Error al obtener materias: ${materiasError.message}`)
    }

    console.log("Materias obtenidas:", materias)

    // Contar materias con y sin área asignada
    const conArea = materias.filter((m) => m.id_area !== null).length
    const sinArea = materias.length - conArea

    // Información de diagnóstico
    const diagnostico = {
      total_areas: areas.length,
      areas: areas,
      total_materias: materias.length,
      materias_con_area: conArea,
      materias_sin_area: sinArea,
      materias: materias.map((m) => {
        const areaNombre = m.id_area ? areasMap[m.id_area] : null
        console.log(`Materia ${m.codigo}, id_area: ${m.id_area}, nombre área: ${areaNombre}`)
        return {
          codigo: m.codigo,
          nombre: m.nombre_largo,
          id_area: m.id_area,
          area_nombre: areaNombre,
        }
      }),
    }

    return NextResponse.json(diagnostico)
  } catch (error: any) {
    console.error("Error en diagnóstico de áreas:", error)
    return NextResponse.json({ error: error.message || "Error al realizar diagnóstico de áreas" }, { status: 500 })
  }
}
