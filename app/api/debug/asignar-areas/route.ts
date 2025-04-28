import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { area_id } = await request.json()

    if (!area_id) {
      return NextResponse.json({ error: "Se requiere un ID de área válido" }, { status: 400 })
    }

    // Verificar que el área existe
    const { data: area, error: areaError } = await supabase
      .from("areas")
      .select("id, nombre")
      .eq("id", area_id)
      .single()

    if (areaError || !area) {
      return NextResponse.json({ error: "El área especificada no existe" }, { status: 400 })
    }

    // Actualizar materias sin área asignada
    const { data: updated, error: updateError } = await supabase
      .from("materias")
      .update({ id_area: area_id })
      .is("id_area", null)
      .select("codigo, nombre_largo")

    if (updateError) {
      throw new Error(`Error al actualizar materias: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      area: area,
      materias_actualizadas: updated?.length || 0,
      materias: updated || [],
    })
  } catch (error: any) {
    console.error("Error al asignar áreas:", error)
    return NextResponse.json({ error: error.message || "Error al asignar áreas a materias" }, { status: 500 })
  }
}
