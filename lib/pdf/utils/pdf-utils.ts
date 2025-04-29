import { jsPDF } from "jspdf"
import { supabase } from "@/lib/supabase"

/**
 * Función para cargar el logo desde Supabase
 */
export async function cargarLogo(logoUrl: string | null): Promise<HTMLImageElement | null> {
  if (!logoUrl) return null

  try {
    // Obtener el logo de la configuración si no se proporciona
    if (logoUrl === "auto") {
      const { data: configData } = await supabase.from("configuracion").select("logo_url").eq("id", 1).single()
      logoUrl = configData?.logo_url || null
      if (!logoUrl) return null
    }

    // Asegurarse de que la URL sea absoluta
    if (!logoUrl.startsWith("http")) {
      console.error("URL del logo no es absoluta:", logoUrl)
      return null
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        console.log("Logo cargado correctamente:", logoUrl)
        resolve(img)
      }

      img.onerror = (e) => {
        console.error("Error al cargar el logo:", e)
        reject(new Error(`No se pudo cargar el logo desde ${logoUrl}`))
      }

      // Añadir un parámetro de caché para evitar problemas de caché
      img.src = `${logoUrl}?t=${new Date().getTime()}`
    })
  } catch (error) {
    console.error("Error al cargar el logo:", error)
    return null
  }
}

/**
 * Configura un documento PDF con opciones comunes
 */
export function configurarDocumentoPDF(options: {
  orientation?: "portrait" | "landscape"
  format?: string | [number, number]
}): jsPDF {
  const doc = new jsPDF({
    orientation: options.orientation || "portrait",
    format: options.format || "letter",
    putOnlyUsedFonts: true,
    compress: true,
  })

  // Configurar fuentes para soportar caracteres especiales
  doc.setFont("helvetica", "normal")
  doc.setLanguage("es-MX")

  return doc
}
