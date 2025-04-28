import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: "Falta el email del usuario" }, { status: 400 })
    }

    // Crear cliente de Supabase con rol de servicio
    const supabaseAdmin = createServerSupabaseClient()

    // Buscar el usuario por email
    const { data: userData, error: userError } = await supabaseAdmin
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .single()

    if (userError) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Eliminar usuario de autenticación
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error)
    return NextResponse.json({ error: error.message || "Error al eliminar usuario" }, { status: 500 })
  }
}
