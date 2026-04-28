import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Obtener datos de todas las tablas en el orden correcto para respetar las relaciones
    const [
      { data: cursos, error: cursosError },
      { data: areas, error: areasError },
      { data: profesores, error: profesoresError },
      { data: alumnos, error: alumnosError },
      { data: materias, error: materiasError },
      { data: materias_profesores, error: materiasProfeError },
      { data: calificaciones, error: califError },
      { data: agrupaciones_materias, error: agrupError },
      { data: configuracion, error: configError },
      { data: usuarios, error: usuariosError },
    ] = await Promise.all([
      supabase.from("cursos").select("*"),
      supabase.from("areas").select("*"),
      supabase.from("profesores").select("*"),
      supabase.from("alumnos").select("*"),
      supabase.from("materias").select("*"),
      supabase.from("materias_profesores").select("*"),
      supabase.from("calificaciones").select("*"),
      supabase.from("agrupaciones_materias").select("*"),
      supabase.from("configuracion").select("*"),
      supabase.from("usuarios").select("*"),
    ])

    // Verificar errores
    const errors = [
      cursosError,
      areasError,
      profesoresError,
      alumnosError,
      materiasError,
      materiasProfeError,
      califError,
      agrupError,
      configError,
      usuariosError,
    ].filter(Boolean)

    if (errors.length > 0) {
      console.error("Errores al obtener datos:", errors)
      return NextResponse.json(
        { error: "Error al obtener datos de la base de datos", details: errors },
        { status: 500 }
      )
    }

    const backup = {
      version: "1.0",
      fecha_backup: new Date().toISOString(),
      gestion: new Date().getFullYear().toString(),
      datos: {
        cursos: cursos || [],
        areas: areas || [],
        profesores: profesores || [],
        alumnos: alumnos || [],
        materias: materias || [],
        materias_profesores: materias_profesores || [],
        calificaciones: calificaciones || [],
        agrupaciones_materias: agrupaciones_materias || [],
        configuracion: configuracion || [],
        usuarios: usuarios || [],
      },
      estadisticas: {
        total_cursos: cursos?.length || 0,
        total_areas: areas?.length || 0,
        total_profesores: profesores?.length || 0,
        total_alumnos: alumnos?.length || 0,
        total_materias: materias?.length || 0,
        total_asignaciones: materias_profesores?.length || 0,
        total_calificaciones: calificaciones?.length || 0,
        total_agrupaciones: agrupaciones_materias?.length || 0,
      },
    }

    return NextResponse.json(backup)
  } catch (error: any) {
    console.error("Error al crear backup:", error)
    return NextResponse.json(
      { error: "Error al crear backup", details: error.message },
      { status: 500 }
    )
  }
}
