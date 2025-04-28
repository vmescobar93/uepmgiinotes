import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, nombre, rol, activo } = body

    if (!email || !password || !nombre) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Crear cliente de Supabase con rol de servicio
    const supabaseAdmin = createServerSupabaseClient()

    // Crear usuario en autenticación
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Crear registro en la tabla usuarios
    const { error: dbError } = await supabaseAdmin.from("usuarios").insert([
      {
        id: authData.user.id,
        email,
        nombre,
        rol: rol || "transcriptor",
        activo: activo !== undefined ? activo : true,
      },
    ])

    if (dbError) {
      // Si falla la inserción en la tabla, intentar eliminar el usuario de autenticación
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: authData.user.id })
  } catch (error: any) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json({ error: error.message || "Error al crear usuario" }, { status: 500 })
  }
}
