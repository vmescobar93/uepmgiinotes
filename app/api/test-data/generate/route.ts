import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { trimestre = 1, cursoCorto = null } = body

    // Validar trimestre
    if (![1, 2, 3].includes(trimestre)) {
      return NextResponse.json({ error: "Trimestre inválido. Debe ser 1, 2 o 3." }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Primero, verificar la restricción de la tabla calificaciones
    try {
      const { data: tableInfo } = await supabase.rpc("get_table_constraints", {
        table_name: "calificaciones",
      })

      console.log("Restricciones de la tabla calificaciones:", tableInfo)
    } catch (error) {
      console.log("No se pudo obtener información de restricciones, continuando con valores predeterminados")
    }

    // Obtener todos los alumnos (opcionalmente filtrados por curso)
    const alumnosQuery = supabase.from("alumnos").select("cod_moodle, curso_corto").eq("activo", true)

    if (cursoCorto) {
      alumnosQuery.eq("curso_corto", cursoCorto)
    }

    const { data: alumnos, error: alumnosError } = await alumnosQuery

    if (alumnosError) {
      return NextResponse.json({ error: `Error al obtener alumnos: ${alumnosError.message}` }, { status: 500 })
    }

    if (!alumnos || alumnos.length === 0) {
      return NextResponse.json({ error: "No se encontraron alumnos activos" }, { status: 404 })
    }

    // Agrupar alumnos por curso
    const alumnosPorCurso: Record<string, string[]> = {}
    alumnos.forEach((alumno) => {
      if (!alumno.curso_corto) return

      if (!alumnosPorCurso[alumno.curso_corto]) {
        alumnosPorCurso[alumno.curso_corto] = []
      }
      alumnosPorCurso[alumno.curso_corto].push(alumno.cod_moodle)
    })

    // Para cada curso, obtener sus materias y generar calificaciones
    const calificacionesGeneradas = []
    let totalCalificaciones = 0

    for (const curso in alumnosPorCurso) {
      // Obtener materias del curso
      const { data: materias, error: materiasError } = await supabase
        .from("materias")
        .select("codigo")
        .eq("curso_corto", curso)

      if (materiasError) {
        console.error(`Error al obtener materias para el curso ${curso}: ${materiasError.message}`)
        continue
      }

      if (!materias || materias.length === 0) {
        console.warn(`No se encontraron materias para el curso ${curso}`)
        continue
      }

      // Generar calificaciones para cada alumno y materia
      const alumnosDelCurso = alumnosPorCurso[curso]

      for (const alumnoId of alumnosDelCurso) {
        for (const materia of materias) {
          // Generar una nota aleatoria entre 0 y 100 con hasta 2 decimales
          // Asegurarse de que esté dentro del rango permitido (0-100)
          const notaBase = Math.random() * 60 + 40 // Entre 40 y 100
          const nota = Math.min(100, Math.max(0, Math.round(notaBase * 100) / 100)) // Asegurar rango 0-100 con 2 decimales

          calificacionesGeneradas.push({
            alumno_id: alumnoId,
            materia_id: materia.codigo,
            trimestre: trimestre,
            nota: nota,
          })
        }
      }
    }

    // Eliminar calificaciones existentes para el trimestre seleccionado
    if (cursoCorto) {
      // Si se especificó un curso, eliminar solo las calificaciones de los alumnos de ese curso
      const alumnosIds = alumnosPorCurso[cursoCorto] || []
      if (alumnosIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("calificaciones")
          .delete()
          .eq("trimestre", trimestre)
          .in("alumno_id", alumnosIds)

        if (deleteError) {
          return NextResponse.json(
            { error: `Error al eliminar calificaciones existentes: ${deleteError.message}` },
            { status: 500 },
          )
        }
      }
    } else {
      // Si no se especificó curso, eliminar todas las calificaciones del trimestre
      const { error: deleteError } = await supabase.from("calificaciones").delete().eq("trimestre", trimestre)

      if (deleteError) {
        return NextResponse.json(
          { error: `Error al eliminar calificaciones existentes: ${deleteError.message}` },
          { status: 500 },
        )
      }
    }

    // Insertar nuevas calificaciones
    if (calificacionesGeneradas.length > 0) {
      // Insertar en lotes más pequeños para facilitar la depuración
      const batchSize = 100 // Reducido para mejor manejo de errores
      for (let i = 0; i < calificacionesGeneradas.length; i += batchSize) {
        const batch = calificacionesGeneradas.slice(i, i + batchSize)
        const { error: insertError } = await supabase.from("calificaciones").insert(batch)

        if (insertError) {
          console.error("Error al insertar lote de calificaciones:", insertError)
          // Intentar insertar uno por uno para identificar el problema
          for (const calificacion of batch) {
            const { error: singleInsertError } = await supabase.from("calificaciones").insert([calificacion])
            if (singleInsertError) {
              console.error("Error al insertar calificación individual:", calificacion, singleInsertError)
              return NextResponse.json(
                {
                  error: `Error al insertar calificación: ${singleInsertError.message}`,
                  calificacion: calificacion,
                },
                { status: 500 },
              )
            }
          }
        }

        totalCalificaciones += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se generaron ${totalCalificaciones} calificaciones de prueba para el trimestre ${trimestre}`,
      totalCalificaciones,
    })
  } catch (error: any) {
    console.error("Error en la generación de datos de prueba:", error)
    return NextResponse.json({ error: error.message || "Error al generar datos de prueba" }, { status: 500 })
  }
}
