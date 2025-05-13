import { createServerSupabaseClient } from "@/lib/supabase"

export interface ConfiguracionSistema {
  id: number
  nombre_institucion: string
  logo_url: string | null
  pie_pagina_url: string | null
  pie_pagina_altura: number
  pie_pagina_ajuste: string
}

export async function getConfiguracion(): Promise<ConfiguracionSistema> {
  try {
    // Crear cliente de Supabase con rol de servicio para asegurar acceso
    const supabaseAdmin = createServerSupabaseClient()

    // Intentar obtener la configuración
    const { data, error } = await supabaseAdmin.from("configuracion").select("*").eq("id", 1).single()

    if (data && !error) {
      return data as ConfiguracionSistema
    }

    // Si no hay datos, crear la configuración inicial
    const defaultConfig: ConfiguracionSistema = {
      id: 1,
      nombre_institucion: "U.E. Plena María Goretti II",
      logo_url: null,
      pie_pagina_url: null,
      pie_pagina_altura: 80,
      pie_pagina_ajuste: "proporcional",
    }

    try {
      // Usar la función RPC para insertar la configuración
      await supabaseAdmin.rpc("insert_configuracion", {
        nombre_param: defaultConfig.nombre_institucion,
        logo_url_param: defaultConfig.logo_url,
      })
    } catch (rpcError) {
      console.error("Error al usar RPC para insertar configuración:", rpcError)

      // Intentar con el método normal como fallback
      try {
        await supabaseAdmin.from("configuracion").insert(defaultConfig)
      } catch (fallbackError) {
        console.error("Error en fallback:", fallbackError)
      }
    }

    return defaultConfig
  } catch (error) {
    console.error("Error al obtener configuración:", error)
    return {
      id: 1,
      nombre_institucion: "U.E. Plena María Goretti II",
      logo_url: null,
      pie_pagina_url: null,
      pie_pagina_altura: 80,
      pie_pagina_ajuste: "proporcional",
    }
  }
}
