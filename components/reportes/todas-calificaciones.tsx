"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { generarTodasCalificacionesPDF } from "@/lib/pdf"

export function TodasCalificacionesReporte({
  selectedProfesor,
  profesorNombre,
  selectedTrimestre,
}: {
  selectedProfesor: string
  profesorNombre: string
  selectedTrimestre: string
}) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  const handleGeneratePdf = async () => {
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

      if (!currentUserInfo) {
        throw new Error("No se pudo obtener información del usuario actual.")
      }

      // Generar el PDF con todas las calificaciones del trimestre seleccionado
      const doc = await generarTodasCalificacionesPDF({
        profesorId: selectedProfesor,
        currentUserInfo,
        selectedTrimestre,
      })

      // Guardar el PDF con el nombre que incluye el trimestre
      const trimestreText = selectedTrimestre === "1" ? "1er" : selectedTrimestre === "2" ? "2do" : "3er"
      const nombreArchivo = `Calificaciones_${profesorNombre}_${trimestreText}Trimestre.pdf`
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
      disabled={isLoading}
      className="flex items-center bg-transparent"
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
          Exportar calificaciones ({selectedTrimestre === "1" ? "1er" : selectedTrimestre === "2" ? "2do" : "3er"}{" "}
          Trimestre)
        </>
      )}
    </Button>
  )
}
