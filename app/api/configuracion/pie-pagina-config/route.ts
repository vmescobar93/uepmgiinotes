import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pie_pagina_altura, pie_pagina_ajuste } = body

    // Validar los datos
    if (pie_pagina_altura === undefined || !pie_pagina_ajuste) {
      return NextResponse.json({ error: "Los parámetros de configuración son requeridos" }, { status: 400 })
    }

    // Validar el tipo de ajuste
    const ajustesPermitidos = ["proporcional", "altura_fija", "ancho_completo"]
    if (!ajustesPermitidos.includes(pie_pagina_ajuste)) {
      return NextResponse.json({ error: "El tipo de ajuste no es válido" }, { status: 400 })
    }

    // Validar la altura
    const altura = Number(pie_pagina_altura)
    if (isNaN(altura) || altura < 30 || altura > 200) {
      return NextResponse.json({ error: "La altura debe ser un número entre 30 y 200" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Actualizar la configuración
    const { data, error } = await supabase
      .from("configuracion")
      .update({
        pie_pagina_altura: altura,
        pie_pagina_ajuste: pie_pagina_ajuste,
      })
      .eq("id", 1)
      .select()
      .single()

    if (error) {
      console.error("Error al actualizar la configuración:", error)
      return NextResponse.json({ error: "Error al actualizar la configuración" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error al procesar la solicitud:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud" }, { status: 500 })
  }
}
