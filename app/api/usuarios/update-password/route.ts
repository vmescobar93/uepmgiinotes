import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
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

    // Actualizar contraseña
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userData.id, {
      password,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al actualizar contraseña:", error)
    return NextResponse.json({ error: error.message || "Error al actualizar contraseña" }, { status: 500 })
  }
}
