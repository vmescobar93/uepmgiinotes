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

    const img = new Image()
    img.crossOrigin = "anonymous"

    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = logoUrl as string
    })

    return img
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
