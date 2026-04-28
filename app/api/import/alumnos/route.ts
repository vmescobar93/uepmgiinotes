import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  try {
    const { data, gestionId } = await request.json()

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "No hay datos para importar" }, { status: 400 })
    }

    if (!gestionId) {
      return NextResponse.json({ error: "Se requiere gestionId" }, { status: 400 })
    }

    // Verificar cursos existentes
    const { data: cursos } = await supabase
      .from("cursos")
      .select("nombre_corto")
      .eq("gestion_id", gestionId)

    const cursosExistentes = new Set(cursos?.map((c) => c.nombre_corto) || [])

    const errors: string[] = []
    const validData: any[] = []

    // Validar y preparar datos
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 1

      if (!row.cod_moodle) {
        errors.push(`Fila ${rowNum}: cod_moodle es requerido`)
        continue
      }

      if (!row.nombres || !row.apellidos) {
        errors.push(`Fila ${rowNum}: nombres y apellidos son requeridos`)
        continue
      }

      if (row.curso_corto && !cursosExistentes.has(row.curso_corto)) {
        errors.push(`Fila ${rowNum}: curso "${row.curso_corto}" no existe`)
        continue
      }

      validData.push({
        cod_moodle: String(row.cod_moodle),
        nombres: String(row.nombres),
        apellidos: String(row.apellidos),
        curso_corto: row.curso_corto || null,
        ci: row.ci ? String(row.ci) : null,
        rude: row.rude ? String(row.rude) : null,
        activo: row.activo !== false,
        gestion_id: gestionId,
      })
    }

    if (validData.length === 0) {
      return NextResponse.json(
        { error: "No hay datos validos para importar", errors },
        { status: 400 }
      )
    }

    // Insertar con upsert para manejar duplicados
    const { error: insertError, data: inserted } = await supabase
      .from("alumnos")
      .upsert(validData, { onConflict: "cod_moodle" })
      .select()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Se importaron ${validData.length} alumnos correctamente`,
      imported: validData.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
