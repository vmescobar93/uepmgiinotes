import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const piePaginaFile = formData.get("pie_pagina") as File

    if (!piePaginaFile) {
      return NextResponse.json({ error: "No se ha proporcionado ningún archivo" }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!piePaginaFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen (PNG, JPG, JPEG)" }, { status: 400 })
    }

    // Validar tamaño (máximo 2MB)
    if (piePaginaFile.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no debe superar los 2MB" }, { status: 400 })
    }

    // Crear cliente de Supabase con rol de servicio
    const supabaseAdmin = createServerSupabaseClient()

    // Generar un nombre único para el archivo
    const timestamp = Date.now()
    const fileExtension = piePaginaFile.name.split(".").pop()
    const fileName = `pie_pagina_${timestamp}.${fileExtension}`

    // Convertir el archivo a un ArrayBuffer para subirlo
    const arrayBuffer = await piePaginaFile.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    let uploadSuccess = false
    let publicUrl = ""

    // Intentar subir el archivo
    try {
      console.log("Subiendo imagen de pie de página...")
      const { error: uploadError } = await supabaseAdmin.storage.from("logos").upload(fileName, buffer, {
        contentType: piePaginaFile.type,
        cacheControl: "3600",
        upsert: true,
      })

      if (uploadError) {
        console.error("Error al subir archivo:", uploadError)
        throw uploadError
      }
      uploadSuccess = true
    } catch (uploadError: any) {
      console.error("Error al subir archivo:", uploadError)
      return NextResponse.json({ error: `Error al subir archivo: ${uploadError.message}` }, { status: 500 })
    }

    if (uploadSuccess) {
      // Obtener la URL pública del archivo
      const { data: publicUrlData } = supabaseAdmin.storage.from("logos").getPublicUrl(fileName)

      if (!publicUrlData) {
        return NextResponse.json({ error: "No se pudo obtener la URL de la imagen" }, { status: 500 })
      }

      publicUrl = publicUrlData.publicUrl

      // Actualizar la URL del pie de página en la base de datos
      try {
        const { data: configData } = await supabaseAdmin.from("configuracion").select("id").eq("id", 1).single()

        if (configData) {
          await supabaseAdmin.from("configuracion").update({ pie_pagina_url: publicUrl }).eq("id", 1)
        } else {
          await supabaseAdmin
            .from("configuracion")
            .insert({ id: 1, nombre_institucion: "U.E. Plena María Goretti II", pie_pagina_url: publicUrl })
        }
      } catch (dbError) {
        console.error("Error al actualizar pie_pagina_url en la base de datos:", dbError)
        return NextResponse.json({ error: "Error al actualizar la base de datos" }, { status: 500 })
      }

      return NextResponse.json({ success: true, pie_pagina_url: publicUrl })
    } else {
      return NextResponse.json({ error: "No se pudo subir el archivo" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error al procesar la solicitud:", error)
    return NextResponse.json({ error: error.message || "Error al procesar la solicitud" }, { status: 500 })
  }
}
