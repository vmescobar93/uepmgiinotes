"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"

export interface Gestion {
  id: number
  anio: number
  nombre: string
  activa: boolean
  created_at: string
}

interface GestionContextType {
  gestionActual: Gestion | null
  gestiones: Gestion[]
  isLoading: boolean
  setGestionActual: (gestion: Gestion) => void
  refetchGestiones: () => Promise<void>
}

const GestionContext = createContext<GestionContextType | undefined>(undefined)

const GESTION_STORAGE_KEY = "gestion_actual_id"

export function GestionProvider({ children }: { children: ReactNode }) {
  const [gestionActual, setGestionActualState] = useState<Gestion | null>(null)
  const [gestiones, setGestiones] = useState<Gestion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchGestiones = async () => {
    try {
      const { data, error } = await supabase
        .from("gestiones")
        .select("*")
        .order("anio", { ascending: false })

      if (error) {
        console.error("Error fetching gestiones:", error)
        setIsLoading(false)
        return
      }

      setGestiones(data || [])

      // Intentar cargar la gestión guardada en localStorage (solo en cliente)
      let savedGestionId: string | null = null
      if (typeof window !== "undefined") {
        savedGestionId = localStorage.getItem(GESTION_STORAGE_KEY)
      }
      
      if (savedGestionId && data) {
        const savedGestion = data.find(g => g.id === parseInt(savedGestionId))
        if (savedGestion) {
          setGestionActualState(savedGestion)
          setIsLoading(false)
          return
        }
      }

      // Si no hay gestión guardada o no existe, usar la activa
      if (data && data.length > 0) {
        const gestionActiva = data.find(g => g.activa) || data[0]
        setGestionActualState(gestionActiva)
        if (typeof window !== "undefined") {
          localStorage.setItem(GESTION_STORAGE_KEY, gestionActiva.id.toString())
        }
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGestiones()
  }, [])

  const setGestionActual = (gestion: Gestion) => {
    setGestionActualState(gestion)
    if (typeof window !== "undefined") {
      localStorage.setItem(GESTION_STORAGE_KEY, gestion.id.toString())
      // Forzar reload para que todas las páginas recarguen con la nueva gestión
      window.location.reload()
    }
  }

  const refetchGestiones = async () => {
    await fetchGestiones()
  }

  const value = {
    gestionActual,
    gestiones,
    isLoading,
    setGestionActual,
    refetchGestiones,
  }

  return <GestionContext.Provider value={value}>{children}</GestionContext.Provider>
}

export const useGestion = () => {
  const context = useContext(GestionContext)
  if (context === undefined) {
    throw new Error("useGestion must be used within a GestionProvider")
  }
  return context
}
