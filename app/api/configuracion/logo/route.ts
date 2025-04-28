import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const logoFile = formData.get("logo") as File

    if (!logoFile) {
      return NextResponse.json({ error: "No se ha proporcionado ningún archivo" }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!logoFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen (PNG, JPG, JPEG)" }, { status: 400 })
    }

    // Validar tamaño (máximo 2MB)
    if (logoFile.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no debe superar los 2MB" }, { status: 400 })
    }

    // Crear cliente de Supabase con rol de servicio
    const supabaseAdmin = createServerSupabaseClient()

    // Generar un nombre único para el archivo
    const timestamp = Date.now()
    const fileExtension = logoFile.name.split(".").pop()
    const fileName = `logo_${timestamp}.${fileExtension}`

    // Convertir el archivo a un ArrayBuffer para subirlo
    const arrayBuffer = await logoFile.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    let uploadSuccess = false
    let publicUrl = ""

    // Intentar subir el archivo usando la función RPC
    try {
      console.log("Intentando subir archivo usando función RPC...")
      await supabaseAdmin.rpc("upload_logo_file", {
        file_name: fileName,
        file_content: buffer,
        mime_type: logoFile.type,
      })
      uploadSuccess = true
    } catch (rpcError) {
      console.error("Error al subir archivo usando RPC:", rpcError)

      // Si falla, intentar el método normal como fallback
      try {
        console.log("Intentando subir archivo usando método normal...")
        const { error: uploadError } = await supabaseAdmin.storage.from("logos").upload(fileName, buffer, {
          contentType: logoFile.type,
          cacheControl: "3600",
          upsert: true,
        })

        if (uploadError) {
          console.error("Error al subir archivo usando método normal:", uploadError)
          throw uploadError
        }
        uploadSuccess = true
      } catch (uploadError: any) {
        console.error("Error al subir archivo:", uploadError)
        return NextResponse.json({ error: `Error al subir archivo: ${uploadError.message}` }, { status: 500 })
      }
    }

    if (uploadSuccess) {
      // Obtener la URL pública del archivo
      const { data: publicUrlData } = supabaseAdmin.storage.from("logos").getPublicUrl(fileName)

      if (!publicUrlData) {
        return NextResponse.json({ error: "No se pudo obtener la URL del logo" }, { status: 500 })
      }

      publicUrl = publicUrlData.publicUrl

      // Actualizar la URL del logo en la base de datos
      try {
        // Intentar usar la función RPC
        await supabaseAdmin.rpc("update_logo_url", { logo_url_param: publicUrl })
      } catch (rpcError) {
        console.error("Error al usar RPC para actualizar logo_url:", rpcError)

        // Intentar con el método normal como fallback
        try {
          const { data: configData } = await supabaseAdmin.from("configuracion").select("id").eq("id", 1).single()

          if (configData) {
            await supabaseAdmin.from("configuracion").update({ logo_url: publicUrl }).eq("id", 1)
          } else {
            await supabaseAdmin
              .from("configuracion")
              .insert({ id: 1, nombre_institucion: "U.E. Plena María Goretti II", logo_url: publicUrl })
          }
        } catch (dbError) {
          console.error("Error al actualizar logo_url en la base de datos:", dbError)
          return NextResponse.json({ error: "Error al actualizar la base de datos" }, { status: 500 })
        }
      }

      return NextResponse.json({ success: true, logo_url: publicUrl })
    } else {
      return NextResponse.json({ error: "No se pudo subir el archivo" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error al procesar la solicitud:", error)
    return NextResponse.json({ error: error.message || "Error al procesar la solicitud" }, { status: 500 })
  }
}
