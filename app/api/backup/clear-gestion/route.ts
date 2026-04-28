import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST() {
  try {
    const supabase = createServerSupabaseClient()

    console.log("Limpiando datos para nueva gestión...")

    // Eliminar solo los datos que cambian por gestión (calificaciones y asignaciones)
    // Mantener: cursos, materias, profesores, alumnos, areas, configuracion
    
    // 1. Eliminar calificaciones (las notas son de la gestión actual)
    const { error: califError } = await supabase
      .from("calificaciones")
      .delete()
      .neq("id", -1)

    if (califError) {
      console.error("Error al eliminar calificaciones:", califError)
      return NextResponse.json(
        { error: "Error al eliminar calificaciones", details: califError.message },
        { status: 500 }
      )
    }

    // 2. Opcionalmente, también se podrían limpiar las asignaciones materia-profesor
    // si estas cambian cada gestión
    // const { error: asignError } = await supabase
    //   .from("materias_profesores")
    //   .delete()
    //   .neq("id", -1)

    return NextResponse.json({
      success: true,
      message: "Datos de la gestión limpiados correctamente. Se han eliminado todas las calificaciones.",
      nota: "Los cursos, materias, profesores, alumnos y configuración se han mantenido.",
    })
  } catch (error: any) {
    console.error("Error al limpiar gestión:", error)
    return NextResponse.json(
      { error: "Error al limpiar datos de gestión", details: error.message },
      { status: 500 }
    )
  }
}
