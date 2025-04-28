import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

// GET: Obtener la configuración actual
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

// POST: Actualizar la configuración
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre_institucion } = body

    if (!nombre_institucion) {
      return NextResponse.json({ error: "El nombre de la institución es requerido" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Intentar actualizar usando la función RPC
    try {
      await supabase.rpc("insert_configuracion", {
        nombre_param: nombre_institucion,
        logo_url_param: null, // Mantener el logo_url existente
      })
    } catch (rpcError) {
      console.error("Error al usar RPC para actualizar configuración:", rpcError)

      // Intentar con el método normal como fallback
      const { data: existingConfig } = await supabase.from("configuracion").select("id").eq("id", 1).single()

      if (existingConfig) {
        const { error: updateError } = await supabase.from("configuracion").update({ nombre_institucion }).eq("id", 1)

        if (updateError) {
          console.error("Error al actualizar configuración:", updateError)
          return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 })
        }
      } else {
        const { error: insertError } = await supabase.from("configuracion").insert({ id: 1, nombre_institucion })

        if (insertError) {
          console.error("Error al insertar configuración:", insertError)
          return NextResponse.json({ error: "Error al insertar configuración" }, { status: 500 })
        }
      }
    }

    // Obtener la configuración actualizada
    const { data, error } = await supabase.from("configuracion").select("*").eq("id", 1).single()

    if (error) {
      console.error("Error al obtener configuración actualizada:", error)
      return NextResponse.json({ error: "Error al obtener configuración actualizada" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error al procesar solicitud:", error)
    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 })
  }
}
