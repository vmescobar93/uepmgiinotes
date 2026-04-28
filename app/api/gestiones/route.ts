import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("gestiones")
      .select("*")
      .order("anio", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { anio, nombre } = await request.json()

    if (!anio) {
      return NextResponse.json(
        { error: "El año es requerido" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("gestiones")
      .insert({
        anio,
        nombre: nombre || `Gestión ${anio}`,
        activa: false
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Ya existe una gestión para el año ${anio}` },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, activa } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "El ID es requerido" },
        { status: 400 }
      )
    }

    // Si se está activando una gestión, desactivar las demás
    if (activa) {
      await supabase
        .from("gestiones")
        .update({ activa: false })
        .neq("id", id)
    }

    const { data, error } = await supabase
      .from("gestiones")
      .update({ activa })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
