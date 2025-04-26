import { supabase, createServerSupabaseClient } from "@/lib/supabase"

export interface ConfiguracionSistema {
  id: number
  nombre_institucion: string
  logo_url: string | null
}

export async function getConfiguracion(): Promise<ConfiguracionSistema> {
  try {
    // Usar el cliente normal para lectura
    const { data } = await supabase.from("configuracion").select("*").single()

    if (data) {
      return data as ConfiguracionSistema
    }

    // Si no hay datos, intentar crear la configuración inicial con el cliente admin
    const supabaseAdmin = createServerSupabaseClient()
    await supabaseAdmin.from("configuracion").upsert({
      id: 1,
      nombre_institucion: "U.E. Plena María Goretti II",
      logo_url: null,
    })

    return {
      id: 1,
      nombre_institucion: "U.E. Plena María Goretti II",
      logo_url: null,
    }
  } catch (error) {
    console.error("Error al obtener configuración:", error)
    return {
      id: 1,
      nombre_institucion: "U.E. Plena María Goretti II",
      logo_url: null,
    }
  }
}
