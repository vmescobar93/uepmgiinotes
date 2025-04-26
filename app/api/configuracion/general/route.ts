import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { nombre_institucion } = await request.json()

    if (!nombre_institucion) {
      return NextResponse.json({ error: "El nombre de la institución es requerido" }, { status: 400 })
    }

    // Crear cliente de Supabase con rol de servicio
    const supabaseAdmin = createServerSupabaseClient()

    // Actualizar en la base de datos
    const { error } = await supabaseAdmin
      .from("configuracion")
      .upsert({ id: 1, nombre_institucion }, { onConflict: "id" })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al guardar configuración:", error)
    return NextResponse.json({ error: error.message || "Error al guardar la configuración" }, { status: 500 })
  }
}
