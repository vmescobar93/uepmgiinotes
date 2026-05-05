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

    const errors: string[] = []
    const validData: any[] = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNum = i + 1

      if (!row.cod_moodle) {
        errors.push(`Fila ${rowNum}: cod_moodle es requerido`)
        continue
      }

      if (!row.nombre || !row.apellidos) {
        errors.push(`Fila ${rowNum}: nombre y apellidos son requeridos`)
        continue
      }

      validData.push({
        cod_moodle: String(row.cod_moodle),
        nombre: String(row.nombre),
        apellidos: String(row.apellidos),
        ci: row.ci ? String(row.ci) : null,
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

    const { error: insertError } = await supabase
      .from("profesores")
      .upsert(validData, { onConflict: "cod_moodle" })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Se importaron ${validData.length} profesores correctamente`,
      imported: validData.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
