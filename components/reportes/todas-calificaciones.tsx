"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { generarTodasCalificacionesPDF } from "@/lib/pdf"

interface TodasCalificacionesReporteProps {
  selectedProfesor: string
  profesorNombre?: string
}

export function TodasCalificacionesReporte({ selectedProfesor, profesorNombre }: TodasCalificacionesReporteProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const handleGeneratePdf = async () => {
    if (!selectedProfesor) {
      toast({ variant: "destructive", title: "Error", description: "Seleccione un profesor." })
      return
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo identificar al usuario actual.",
      })
      return
    }

    setIsLoading(true)

    try {
      // Obtener información del usuario actual
      const { data: currentUserInfo } = await supabase.from("usuarios").select("*").eq("id", user.id).single()

      // Generar el PDF con todas las calificaciones
      const doc = await generarTodasCalificacionesPDF({
        profesorId: selectedProfesor,
        currentUserInfo,
      })

      // Guardar el PDF
      const nombreArchivo = `Todas_Calificaciones_${profesorNombre || selectedProfesor}.pdf`
      doc.save(nombreArchivo)
    } catch (error: any) {
      console.error("Error al generar PDF:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo generar el PDF.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGeneratePdf}
      disabled={!selectedProfesor || isLoading}
      className="flex items-center"
      variant="outline"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Exportar todas las calificaciones
        </>
      )}
    </Button>
  )
}
