import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

interface BackupData {
  version: string
  fecha_backup: string
  gestion: string
  datos: {
    cursos: any[]
    areas: any[]
    profesores: any[]
    alumnos: any[]
    materias: any[]
    materias_profesores: any[]
    calificaciones: any[]
    agrupaciones_materias: any[]
    configuracion: any[]
    usuarios: any[]
  }
}

export async function POST(request: Request) {
  try {
    const backup: BackupData = await request.json()

    // Validar estructura del backup
    if (!backup.version || !backup.datos) {
      return NextResponse.json(
        { error: "Formato de backup inválido" },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    const errores: string[] = []
    const resultados: Record<string, number> = {}

    // Eliminar datos existentes en orden inverso a las dependencias
    console.log("Eliminando datos existentes...")
    
    const deleteOperations = [
      supabase.from("calificaciones").delete().neq("id", -1),
      supabase.from("materias_profesores").delete().neq("id", -1),
      supabase.from("agrupaciones_materias").delete().neq("id", -1),
      supabase.from("materias").delete().neq("codigo", ""),
      supabase.from("alumnos").delete().neq("cod_moodle", ""),
      supabase.from("profesores").delete().neq("cod_moodle", ""),
      supabase.from("cursos").delete().neq("nombre_corto", ""),
      supabase.from("areas").delete().neq("id", ""),
    ]

    for (const op of deleteOperations) {
      const { error } = await op
      if (error) {
        console.error("Error al eliminar:", error)
      }
    }

    // Restaurar datos en orden de dependencias

    // 1. Cursos (sin dependencias)
    if (backup.datos.cursos?.length > 0) {
      const { error } = await supabase.from("cursos").insert(backup.datos.cursos)
      if (error) {
        errores.push(`Cursos: ${error.message}`)
      } else {
        resultados.cursos = backup.datos.cursos.length
      }
    }

    // 2. Areas (sin dependencias)
    if (backup.datos.areas?.length > 0) {
      const { error } = await supabase.from("areas").insert(backup.datos.areas)
      if (error) {
        errores.push(`Areas: ${error.message}`)
      } else {
        resultados.areas = backup.datos.areas.length
      }
    }

    // 3. Profesores (sin dependencias)
    if (backup.datos.profesores?.length > 0) {
      const { error } = await supabase.from("profesores").insert(backup.datos.profesores)
      if (error) {
        errores.push(`Profesores: ${error.message}`)
      } else {
        resultados.profesores = backup.datos.profesores.length
      }
    }

    // 4. Alumnos (depende de cursos)
    if (backup.datos.alumnos?.length > 0) {
      const { error } = await supabase.from("alumnos").insert(backup.datos.alumnos)
      if (error) {
        errores.push(`Alumnos: ${error.message}`)
      } else {
        resultados.alumnos = backup.datos.alumnos.length
      }
    }

    // 5. Materias (depende de cursos y areas)
    if (backup.datos.materias?.length > 0) {
      const { error } = await supabase.from("materias").insert(backup.datos.materias)
      if (error) {
        errores.push(`Materias: ${error.message}`)
      } else {
        resultados.materias = backup.datos.materias.length
      }
    }

    // 6. Materias_profesores (depende de materias y profesores)
    if (backup.datos.materias_profesores?.length > 0) {
      const { error } = await supabase.from("materias_profesores").insert(backup.datos.materias_profesores)
      if (error) {
        errores.push(`Materias-Profesores: ${error.message}`)
      } else {
        resultados.materias_profesores = backup.datos.materias_profesores.length
      }
    }

    // 7. Calificaciones (depende de alumnos y materias)
    if (backup.datos.calificaciones?.length > 0) {
      const { error } = await supabase.from("calificaciones").insert(backup.datos.calificaciones)
      if (error) {
        errores.push(`Calificaciones: ${error.message}`)
      } else {
        resultados.calificaciones = backup.datos.calificaciones.length
      }
    }

    // 8. Agrupaciones_materias
    if (backup.datos.agrupaciones_materias?.length > 0) {
      const { error } = await supabase.from("agrupaciones_materias").insert(backup.datos.agrupaciones_materias)
      if (error) {
        errores.push(`Agrupaciones: ${error.message}`)
      } else {
        resultados.agrupaciones_materias = backup.datos.agrupaciones_materias.length
      }
    }

    // 9. Configuracion (actualizar en lugar de insertar)
    if (backup.datos.configuracion?.length > 0) {
      for (const config of backup.datos.configuracion) {
        const { error } = await supabase
          .from("configuracion")
          .upsert(config, { onConflict: "id" })
        if (error) {
          errores.push(`Configuración: ${error.message}`)
        }
      }
      resultados.configuracion = backup.datos.configuracion.length
    }

    if (errores.length > 0) {
      return NextResponse.json({
        success: false,
        message: "Restauración completada con errores",
        errores,
        resultados,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Restauración completada exitosamente",
      resultados,
      fecha_backup_original: backup.fecha_backup,
      gestion_restaurada: backup.gestion,
    })
  } catch (error: any) {
    console.error("Error al restaurar backup:", error)
    return NextResponse.json(
      { error: "Error al restaurar backup", details: error.message },
      { status: 500 }
    )
  }
}
