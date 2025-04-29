"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/supabase"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { generarCalificacionesPDF } from "@/lib/pdf"

type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Profesor = Database["public"]["Tables"]["profesores"]["Row"]
type Usuario = Database["public"]["Tables"]["usuarios"]["Row"]

interface CalificacionesReporteProps {
  profesores: Profesor[]
  materias: Materia[]
  alumnos: Alumno[]
  calificaciones: Record<string, number>
  selectedProfesor: string
  selectedMateria: string
  selectedTrimestre: string
}

export function CalificacionesReporte({
  profesores,
  materias,
  alumnos,
  calificaciones,
  selectedProfesor,
  selectedMateria,
  selectedTrimestre,
}: CalificacionesReporteProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth() // Obtener el usuario autenticado
  const [currentUserInfo, setCurrentUserInfo] = useState<Usuario | null>(null)

  // Cargar información del usuario actual
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!user) return

      try {
        const { data } = await supabase.from("usuarios").select("*").eq("id", user.id).single()

        if (data) setCurrentUserInfo(data)
      } catch (error) {
        console.error("Error al cargar información del usuario:", error)
      }
    }

    fetchCurrentUser()
  }, [user])

  const handleGeneratePdf = async () => {
    if (!selectedMateria) {
      toast({ variant: "destructive", title: "Error", description: "Seleccione materia y trimestre." })
      return
    }

    if (!currentUserInfo) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo identificar al usuario actual.",
      })
      return
    }

    setIsLoading(true)

    try {
      // Usar la función refactorizada para generar el PDF
      const doc = await generarCalificacionesPDF({
        profesores,
        materias,
        alumnos,
        calificaciones,
        selectedProfesor,
        selectedMateria,
        selectedTrimestre,
        currentUserInfo,
      })

      // Guardar el PDF
      doc.save(`Calificaciones_${selectedMateria}_T${selectedTrimestre}.pdf`)
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePdf}
      disabled={!selectedMateria || alumnos.length === 0 || isLoading}
      className="flex items-center"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Generar PDF
        </>
      )}
    </Button>
  )
}
