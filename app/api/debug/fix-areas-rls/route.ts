import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST() {
  try {
    const supabase = createServerSupabaseClient()

    // Verificar si RLS está habilitado
    const { data: rlsStatus, error: rlsError } = await supabase.rpc("check_rls_status", { table_name: "areas" })

    if (rlsError) {
      // Si la función RPC no existe, intentamos deshabilitar RLS directamente
      const { error: disableError } = await supabase.from("areas").select("id").limit(1)

      if (disableError && disableError.message.includes("permission denied")) {
        // Deshabilitar RLS
        await supabase.rpc("disable_rls", { table_name: "areas" })
      }
    }

    // Intentar obtener áreas después de la corrección
    const { data: areas, error: areasError } = await supabase.from("areas").select("id, nombre")

    if (areasError) {
      throw new Error(`Error al obtener áreas después de la corrección: ${areasError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: "Políticas RLS de áreas corregidas",
      areas_count: areas?.length || 0,
      areas: areas,
    })
  } catch (error: any) {
    console.error("Error al corregir políticas RLS:", error)
    return NextResponse.json({ error: error.message || "Error al corregir políticas RLS" }, { status: 500 })
  }
}
