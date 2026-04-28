import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Creamos un cliente de Supabase para el lado del cliente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Cliente para el lado del servidor
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient<Database>(supabaseUrl, supabaseServiceKey)
}

// Helper para ordenar cursos: Primaria primero, luego Secundaria, y dentro de cada nivel por nombre
type Curso = {
  nombre_corto: string
  nombre_largo?: string
  nivel?: string | null
  gestion_id?: number
}

export function sortCursos<T extends Curso>(cursos: T[]): T[] {
  const nivelOrder: Record<string, number> = {
    'Primaria': 1,
    'Secundaria': 2,
  }
  
  return [...cursos].sort((a, b) => {
    // Primero ordenar por nivel (Primaria antes que Secundaria)
    const nivelA = nivelOrder[a.nivel || ''] || 99
    const nivelB = nivelOrder[b.nivel || ''] || 99
    
    if (nivelA !== nivelB) {
      return nivelA - nivelB
    }
    
    // Dentro del mismo nivel, ordenar por nombre_corto alfanumericamente
    // Extraer el numero del curso (ej: "1ro A" -> 1, "2do B" -> 2)
    const getNumero = (nombre: string) => {
      const match = nombre.match(/^(\d+)/)
      return match ? parseInt(match[1]) : 99
    }
    
    const numA = getNumero(a.nombre_corto)
    const numB = getNumero(b.nombre_corto)
    
    if (numA !== numB) {
      return numA - numB
    }
    
    // Si tienen el mismo numero, ordenar por letra (A, B, C...)
    return a.nombre_corto.localeCompare(b.nombre_corto)
  })
}
