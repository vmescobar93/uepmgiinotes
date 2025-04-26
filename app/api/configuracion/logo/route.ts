import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("logo") as File

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen (PNG, JPG, JPEG)" }, { status: 400 })
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no debe superar los 2MB" }, { status: 400 })
    }

    // Crear cliente de Supabase con rol de servicio
    const supabaseAdmin = createServerSupabaseClient()

    // Intentar crear el bucket si no existe
    const { error: bucketError } = await supabaseAdmin.storage.createBucket("logos", {
      public: true,
      fileSizeLimit: 2097152, // 2MB en bytes
    })

    // Si hay un error que no sea "bucket already exists", lanzar error
    if (bucketError && !bucketError.message.includes("already exists")) {
      throw bucketError
    }

    // Subir archivo a Supabase Storage
    const fileName = `logo_${Date.now()}.${file.name.split(".").pop()}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data, error } = await supabaseAdmin.storage.from("logos").upload(fileName, buffer, {
      cacheControl: "3600",
      upsert: true,
    })

    if (error) throw error

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage.from("logos").getPublicUrl(fileName)

    if (!urlData) {
      throw new Error("No se pudo obtener la URL del logo")
    }

    const publicUrl = urlData.publicUrl

    // Actualizar en la base de datos
    const { error: updateError } = await supabaseAdmin
      .from("configuracion")
      .upsert({ id: 1, logo_url: publicUrl }, { onConflict: "id" })

    if (updateError) throw updateError

    return NextResponse.json({ success: true, logo_url: publicUrl })
  } catch (error: any) {
    console.error("Error al subir logo:", error)
    return NextResponse.json({ error: error.message || "Error al subir el logo" }, { status: 500 })
  }
}
