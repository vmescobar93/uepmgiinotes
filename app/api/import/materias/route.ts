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

    // Verificar cursos y áreas existentes
    const { data: cursos } = await supabase
      .from("cursos")
      .select("nombre_corto")
      .eq("gestion_id", gestionId)

    const { data: areas } = await supabase
      .from("areas")
      .select("id")
      .eq("gestion_id", gestionId)

    const cursosExistentes = new Set(cursos?.map((c) => c.nombre_corto) || [])
    const areasExistentes = new Set(areas?.map((a) => a.id) || [])

    const errors: string[] = []
    const validData: any[] = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 1

      if (!row.codigo) {
        errors.push(`Fila ${rowNum}: codigo es requerido`)
        continue
      }

      if (!row.nombre_corto || !row.nombre_largo) {
        errors.push(`Fila ${rowNum}: nombre_corto y nombre_largo son requeridos`)
        continue
      }

      if (row.curso_corto && !cursosExistentes.has(row.curso_corto)) {
        errors.push(`Fila ${rowNum}: curso "${row.curso_corto}" no existe`)
        continue
      }

      if (row.id_area && !areasExistentes.has(row.id_area)) {
        errors.push(`Fila ${rowNum}: area "${row.id_area}" no existe`)
        continue
      }

      validData.push({
        codigo: String(row.codigo),
        nombre_corto: String(row.nombre_corto),
        nombre_largo: String(row.nombre_largo),
        curso_corto: row.curso_corto || null,
        id_area: row.id_area || null,
        orden: row.orden ? Number(row.orden) : null,
        gestion_id: gestionId,
      })
    }

    if (validData.length === 0) {
      return NextResponse.json(
        { error: "No hay datos validos para importar", errors },
        { status: 400 }
      )
    }

    const { error: insertError } = await supabase
      .from("materias")
      .upsert(validData, { onConflict: "codigo" })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Se importaron ${validData.length} materias correctamente`,
      imported: validData.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
