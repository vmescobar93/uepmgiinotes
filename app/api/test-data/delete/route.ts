import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { trimestre = null, cursoCorto = null, confirmacion = "" } = body

    // Validar confirmación para evitar eliminaciones accidentales
    if (confirmacion !== "CONFIRMAR") {
      return NextResponse.json(
        { error: "Debe proporcionar la confirmación 'CONFIRMAR' para eliminar datos" },
        { status: 400 },
      )
    }

    const supabase = createServerSupabaseClient()
    let query = supabase.from("calificaciones").delete()

    // Filtrar por trimestre si se especifica
    if (trimestre !== null) {
      if (![1, 2, 3].includes(trimestre)) {
        return NextResponse.json({ error: "Trimestre inválido. Debe ser 1, 2 o 3." }, { status: 400 })
      }
      query = query.eq("trimestre", trimestre)
    }

    // Filtrar por curso si se especifica
    let alumnosIds: string[] | null = null
    if (cursoCorto) {
      // Obtener IDs de alumnos del curso
      const { data: alumnos, error: alumnosError } = await supabase
        .from("alumnos")
        .select("cod_moodle")
        .eq("curso_corto", cursoCorto)
        .eq("activo", true)

      if (alumnosError) {
        return NextResponse.json({ error: `Error al obtener alumnos: ${alumnosError.message}` }, { status: 500 })
      }

      if (!alumnos || alumnos.length === 0) {
        return NextResponse.json({ error: `No se encontraron alumnos para el curso ${cursoCorto}` }, { status: 404 })
      }

      alumnosIds = alumnos.map((a) => a.cod_moodle)
      query = query.in("alumno_id", alumnosIds)
    }

    // Primero, contar cuántos registros se eliminarán
    const countQuery = supabase.from("calificaciones").select("*", { count: "exact", head: true })

    // Aplicar los mismos filtros que usaremos para eliminar
    if (trimestre !== null) {
      countQuery.eq("trimestre", trimestre)
    }

    if (cursoCorto) {
      // Si tenemos alumnosIds de la consulta anterior
      if (alumnosIds && alumnosIds.length > 0) {
        countQuery.in("alumno_id", alumnosIds)
      } else {
        // Si no hay alumnos, no se eliminará nada
        return NextResponse.json({ success: true, message: "No hay calificaciones para eliminar", count: 0 })
      }
    }

    // Obtener el conteo
    const { count, error: countError } = await countQuery

    if (countError) {
      return NextResponse.json({ error: `Error al contar calificaciones: ${countError.message}` }, { status: 500 })
    }

    // Si hay registros para eliminar, proceder con la eliminación
    if (count && count > 0) {
      // Ejecutar la eliminación sin RETURNING
      const { error: deleteError } = await query

      if (deleteError) {
        return NextResponse.json({ error: `Error al eliminar calificaciones: ${deleteError.message}` }, { status: 500 })
      }
    }

    // Construir mensaje de respuesta
    let mensaje = `Se eliminaron ${count || 0} calificaciones`
    if (trimestre !== null) {
      mensaje += ` del trimestre ${trimestre}`
    }
    if (cursoCorto) {
      mensaje += ` para el curso ${cursoCorto}`
    }

    return NextResponse.json({
      success: true,
      message: mensaje,
      count: count || 0,
    })
  } catch (error: any) {
    console.error("Error en la eliminación de calificaciones:", error)
    return NextResponse.json({ error: error.message || "Error al eliminar calificaciones" }, { status: 500 })
  }
}
