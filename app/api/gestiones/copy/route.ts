import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { 
      sourceGestionId, 
      newAnio, 
      copyOptions 
    } = await request.json()

    if (!sourceGestionId || !newAnio) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      )
    }

    // Verificar que la gestión origen existe
    const { data: sourceGestion, error: sourceError } = await supabase
      .from("gestiones")
      .select("*")
      .eq("id", sourceGestionId)
      .single()

    if (sourceError || !sourceGestion) {
      return NextResponse.json(
        { error: "Gestión origen no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que el año no existe
    const { data: existingGestion } = await supabase
      .from("gestiones")
      .select("id")
      .eq("anio", newAnio)
      .single()

    if (existingGestion) {
      return NextResponse.json(
        { error: `Ya existe una gestión para el año ${newAnio}` },
        { status: 400 }
      )
    }

    // Crear la nueva gestión
    const { data: newGestion, error: createError } = await supabase
      .from("gestiones")
      .insert({
        anio: newAnio,
        nombre: `Gestión ${newAnio}`,
        activa: false
      })
      .select()
      .single()

    if (createError || !newGestion) {
      return NextResponse.json(
        { error: "Error al crear la nueva gestión" },
        { status: 500 }
      )
    }

    const stats = {
      cursos: 0,
      materias: 0,
      areas: 0,
      profesores: 0,
      alumnos: 0,
      asignaciones: 0,
      agrupaciones: 0
    }

    // Copiar áreas
    if (copyOptions.areas) {
      const { data: areas } = await supabase
        .from("areas")
        .select("*")
        .eq("gestion_id", sourceGestionId)

      if (areas && areas.length > 0) {
        const newAreas = areas.map(({ id, ...area }) => ({
          ...area,
          gestion_id: newGestion.id
        }))
        
        const { error } = await supabase.from("areas").insert(newAreas)
        if (!error) stats.areas = newAreas.length
      }
    }

    // Copiar cursos
    if (copyOptions.cursos) {
      const { data: cursos } = await supabase
        .from("cursos")
        .select("*")
        .eq("gestion_id", sourceGestionId)

      if (cursos && cursos.length > 0) {
        const newCursos = cursos.map((curso) => ({
          ...curso,
          gestion_id: newGestion.id
        }))
        
        const { error } = await supabase.from("cursos").insert(newCursos)
        if (!error) stats.cursos = newCursos.length
      }
    }

    // Copiar materias
    if (copyOptions.materias) {
      const { data: materias } = await supabase
        .from("materias")
        .select("*")
        .eq("gestion_id", sourceGestionId)

      if (materias && materias.length > 0) {
        const newMaterias = materias.map((materia) => ({
          ...materia,
          gestion_id: newGestion.id
        }))
        
        const { error } = await supabase.from("materias").insert(newMaterias)
        if (!error) stats.materias = newMaterias.length
      }
    }

    // Copiar profesores
    if (copyOptions.profesores) {
      const { data: profesores } = await supabase
        .from("profesores")
        .select("*")
        .eq("gestion_id", sourceGestionId)

      if (profesores && profesores.length > 0) {
        const newProfesores = profesores.map((profesor) => ({
          ...profesor,
          gestion_id: newGestion.id
        }))
        
        const { error } = await supabase.from("profesores").insert(newProfesores)
        if (!error) stats.profesores = newProfesores.length
      }
    }

    // Copiar asignaciones de materias-profesores
    if (copyOptions.asignaciones) {
      const { data: asignaciones } = await supabase
        .from("materias_profesores")
        .select("*")
        .eq("gestion_id", sourceGestionId)

      if (asignaciones && asignaciones.length > 0) {
        const newAsignaciones = asignaciones.map(({ id, ...asig }) => ({
          ...asig,
          gestion_id: newGestion.id
        }))
        
        const { error } = await supabase.from("materias_profesores").insert(newAsignaciones)
        if (!error) stats.asignaciones = newAsignaciones.length
      }
    }

    // Copiar agrupaciones de materias
    if (copyOptions.agrupaciones) {
      const { data: agrupaciones } = await supabase
        .from("agrupaciones_materias")
        .select("*")
        .eq("gestion_id", sourceGestionId)

      if (agrupaciones && agrupaciones.length > 0) {
        const newAgrupaciones = agrupaciones.map(({ id, ...agrup }) => ({
          ...agrup,
          gestion_id: newGestion.id
        }))
        
        const { error } = await supabase.from("agrupaciones_materias").insert(newAgrupaciones)
        if (!error) stats.agrupaciones = newAgrupaciones.length
      }
    }

    // Copiar alumnos (promovidos al siguiente curso)
    if (copyOptions.alumnos) {
      const { data: alumnos } = await supabase
        .from("alumnos")
        .select("*")
        .eq("gestion_id", sourceGestionId)
        .eq("activo", true)

      if (alumnos && alumnos.length > 0) {
        // Mapeo de cursos para promoción
        const cursoPromocion: Record<string, string> = {
          "1A": "2A", "1B": "2B", "1C": "2C",
          "2A": "3A", "2B": "3B", "2C": "3C",
          "3A": "4A", "3B": "4B", "3C": "4C",
          "4A": "5A", "4B": "5B", "4C": "5C",
          "5A": "6A", "5B": "6B", "5C": "6C",
          "6A": "1S-A", "6B": "1S-B", "6C": "1S-C",
          "1S-A": "2S-A", "1S-B": "2S-B", "1S-C": "2S-C",
          "2S-A": "3S-A", "2S-B": "3S-B", "2S-C": "3S-C",
          "3S-A": "4S-A", "3S-B": "4S-B", "3S-C": "4S-C",
          "4S-A": "5S-A", "4S-B": "5S-B", "4S-C": "5S-C",
          "5S-A": "6S-A", "5S-B": "6S-B", "5S-C": "6S-C",
        }

        const newAlumnos = alumnos.map((alumno) => ({
          ...alumno,
          gestion_id: newGestion.id,
          curso_corto: copyOptions.promoverAlumnos 
            ? (cursoPromocion[alumno.curso_corto || ""] || alumno.curso_corto)
            : alumno.curso_corto
        }))
        
        const { error } = await supabase.from("alumnos").insert(newAlumnos)
        if (!error) stats.alumnos = newAlumnos.length
      }
    }

    return NextResponse.json({
      success: true,
      gestion: newGestion,
      stats
    })
  } catch (error: any) {
    console.error("Error al copiar gestión:", error)
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}
