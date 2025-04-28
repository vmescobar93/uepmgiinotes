"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/supabase"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"

// Eliminar las importaciones de Dialog que ya no necesitamos
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog"
// import { Label } from "@/components/ui/label"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Profesor = Database["public"]["Tables"]["profesores"]["Row"]
type Usuario = Database["public"]["Tables"]["usuarios"]["Row"]

interface PdfGeneratorProps {
  profesores: Profesor[]
  materias: Materia[]
  alumnos: Alumno[]
  calificaciones: Record<string, number>
  selectedProfesor: string
  selectedMateria: string
  selectedTrimestre: string
}

// Reemplazar la función PdfGenerator completa con esta versión actualizada
export function PdfGenerator({
  profesores,
  materias,
  alumnos,
  calificaciones,
  selectedProfesor,
  selectedMateria,
  selectedTrimestre,
}: PdfGeneratorProps) {
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
      // Configurar fuentes para soportar caracteres especiales
      const doc = new jsPDF({
        orientation: "portrait",
        format: "letter",
        putOnlyUsedFonts: true,
        compress: true,
      })

      // Añadir soporte para caracteres especiales (tildes)
      doc.setFont("helvetica", "normal")
      doc.setLanguage("es-MX")

      const width = doc.internal.pageSize.getWidth()
      const height = doc.internal.pageSize.getHeight()

      // Añadir logo si existe
      try {
        // Obtener el logo de la configuración
        const { data: configData } = await supabase.from("configuracion").select("logo_url").eq("id", 1).single()
        const logoUrl = configData?.logo_url

        if (logoUrl) {
          const img = new Image()
          img.crossOrigin = "anonymous"

          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = logoUrl
          })

          // Calcular dimensiones para mantener proporción
          const imgWidth = 75
          const imgHeight = (img.height * imgWidth) / img.width

          doc.addImage(img, "JPEG", 15, 10, imgWidth, imgHeight)
        }
      } catch (error) {
        console.error("Error al obtener o añadir logo:", error)
        // Continuar sin el logo si hay error
      }

      // Título y fecha
      const trimestreText = selectedTrimestre === "1" ? "1er" : selectedTrimestre === "2" ? "2do" : "3er"
      const today = new Date()
      const dateStr = today.toLocaleDateString()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text(`Entrega de Notas ${trimestreText} Trimestre`, width - 14, 14, { align: "right" })
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(`Fecha: ${dateStr}`, width - 14, 20, { align: "right" })

      // Datos de curso y materia
      const materiaObj = materias.find((m) => m.codigo === selectedMateria)
      const curso = materiaObj?.curso_corto || ""
      // Colocar curso y materia en posiciones fijas
      doc.setFontSize(10)
      doc.text(`Curso: ${curso}`, 14, 32)
      doc.text(`Materia: ${materiaObj?.nombre_largo || ""}`, 14, 36)

      // Información del profesor
      const prof = profesores.find((p) => p.cod_moodle === selectedProfesor)
      const nombreProfesor = prof ? `${prof.nombre} ${prof.apellidos}` : ""
      doc.text(`Profesor: ${nombreProfesor}`, 14, 40)

      // Tabla de calificaciones
      const head = [["#", "Apellidos", "Nombres", "Nota"]]
      const body = alumnos.map((a, i) => [
        String(i + 1),
        a.apellidos || "",
        a.nombres || "",
        calificaciones[a.cod_moodle]?.toFixed(2) || "",
      ])

      autoTable(doc, {
        head,
        body,
        startY: 48,
        theme: "grid",
        headStyles: { fillColor: [245, 166, 10], fontSize: 8 },
        styles: {
          fontSize: 8,
          cellPadding: 1,
          lineHeight: 1,
          font: "helvetica",
        },
        margin: { left: 14, right: 14 },
      })

      // Pie de firmas y fecha/hora de impresión (centrado)
      const footerY = height - 30
      const lineLen = 60
      const marginX = 20
      const now = new Date().toLocaleString()

      // Líneas de firma
      doc.setLineWidth(0.4)
      doc.line(marginX, footerY, marginX + lineLen, footerY)
      doc.line(width - marginX - lineLen, footerY, width - marginX, footerY)

      // Etiquetas de firma
      doc.setFontSize(9)

      // Usar el usuario actual como transcriptor
      doc.text(`Transcriptor: ${currentUserInfo.nombre || ""}`, marginX, footerY + 4)
      doc.text(`Profesor: ${nombreProfesor}`, width - marginX - lineLen, footerY + 4)

      // Fecha y hora centrada bajo las firmas
      doc.setFontSize(10)
      doc.text(`Fecha y hora: ${now}`, width / 2, footerY + 12, { align: "center" })

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
