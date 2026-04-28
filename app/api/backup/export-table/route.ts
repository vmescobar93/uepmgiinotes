import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import * as XLSX from "xlsx"

const TABLES = [
  "cursos",
  "areas",
  "profesores",
  "alumnos",
  "materias",
  "materias_profesores",
  "calificaciones",
  "agrupaciones_materias",
  "configuracion",
  "usuarios",
] as const

type TableName = (typeof TABLES)[number]

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const table = searchParams.get("table") as TableName | "all"
    const format = searchParams.get("format") || "csv"

    if (!table) {
      return NextResponse.json({ error: "Tabla no especificada" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    if (table === "all") {
      // Exportar todas las tablas en un solo archivo Excel con múltiples hojas
      const workbook = XLSX.utils.book_new()

      for (const tableName of TABLES) {
        const { data, error } = await supabase.from(tableName).select("*")
        if (error) {
          console.error(`Error al obtener ${tableName}:`, error)
          continue
        }

        const worksheet = XLSX.utils.json_to_sheet(data || [])
        XLSX.utils.book_append_sheet(workbook, worksheet, tableName)
      }

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
      
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="backup_completo_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      })
    }

    // Verificar que la tabla sea válida
    if (!TABLES.includes(table as TableName)) {
      return NextResponse.json({ error: "Tabla no válida" }, { status: 400 })
    }

    const { data, error } = await supabase.from(table).select("*")

    if (error) {
      console.error(`Error al obtener ${table}:`, error)
      return NextResponse.json({ error: `Error al obtener datos de ${table}` }, { status: 500 })
    }

    if (format === "csv") {
      const worksheet = XLSX.utils.json_to_sheet(data || [])
      const csv = XLSX.utils.sheet_to_csv(worksheet)

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${table}_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    } else {
      // Excel format
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(data || [])
      XLSX.utils.book_append_sheet(workbook, worksheet, table)

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${table}_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      })
    }
  } catch (error: any) {
    console.error("Error al exportar tabla:", error)
    return NextResponse.json({ error: "Error al exportar tabla", details: error.message }, { status: 500 })
  }
}
