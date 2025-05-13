import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    // Intentar obtener la configuración
    const { data, error } = await supabase.from("configuracion").select("*").eq("id", 1).single()

    if (error) {
      console.error("Error al obtener configuración:", error)

      // Si no existe, crear un registro por defecto
      if (error.code === "PGRST116") {
        const defaultConfig = {
          id: 1,
          nombre_institucion: "U.E. Plena María Goretti II",
          logo_url: null,
          pie_pagina_url: null,
        }

        // Intentar insertar el registro por defecto
        const { error: insertError } = await supabase.from("configuracion").insert(defaultConfig)

        if (insertError) {
          console.error("Error al crear configuración por defecto:", insertError)
          return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 })
        }

        return NextResponse.json(defaultConfig)
      }

      return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error al procesar solicitud:", error)
    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 })
  }
}
