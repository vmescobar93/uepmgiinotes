"use client"

import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/supabase"

type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Profesor = Database["public"]["Tables"]["profesores"]["Row"]

interface PdfGeneratorProps {
  profesores: Profesor[]
  materias: Materia[]
  alumnos: Alumno[]
  calificaciones: Record<string, number>
  selectedProfesor: string
  selectedMateria: string
  selectedTrimestre: string
}

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

  const handleClick = () => {
    if (!selectedMateria) {
      toast({ variant: "destructive", title: "Error", description: "Seleccione materia y trimestre." })
      return
    }

    const doc = new jsPDF({ orientation: "portrait", format: "letter" })
    const width = doc.internal.pageSize.getWidth()
    const height = doc.internal.pageSize.getHeight()

    // Título y fecha
    const trimestreText = selectedTrimestre === "1" ? "1er" : selectedTrimestre === "2" ? "2do" : "3er"
    const today = new Date()
    const dateStr = today.toLocaleDateString()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(`Entrega de Notas ${trimestreText} Trimestre`, width / 2, 14, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Fecha: ${dateStr}`, width / 2, 20, { align: "center" })

    // Datos de curso y materia
    const materiaObj = materias.find((m) => m.codigo === selectedMateria)
    const curso = materiaObj?.curso_corto || ""
    // Colocar curso y materia en posiciones fijas
    doc.setFontSize(12)
    doc.text(`Curso: ${curso}`, 14, 30)
    doc.text(`Materia: ${materiaObj?.nombre_largo}`, 14, 34)

    // Información del profesor
    const prof = profesores.find((p) => p.cod_moodle === selectedProfesor)
    doc.text(`Profesor: ${prof?.nombre} ${prof?.apellidos}`, 14, 42)

    // Tabla de calificaciones
    const head = [["#", "Apellidos", "Nombres", "Nota"]]
    const body = alumnos.map((a, i) => [
      String(i + 1),
      a.apellidos,
      a.nombres,
      calificaciones[a.cod_moodle]?.toFixed(2) || "",
    ])
    autoTable(doc, {
      head,
      body,
      startY: 48,
      theme: "grid",
      headStyles: { fillColor: [200, 200, 200], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1, lineHeight: 1 },
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
    doc.text("Transcriptor", marginX, footerY + 4)
    doc.text(`Profesor: ${prof?.nombre} ${prof?.apellidos}`, width - marginX - lineLen, footerY + 4)

    // Fecha y hora centrada bajo las firmas
    doc.setFontSize(10)
    doc.text(`Fecha y hora: ${now}`, width / 2, footerY + 12, { align: "center" })

    doc.save(`Calificaciones_${selectedMateria}_T${selectedTrimestre}.pdf`)
  }

  return (
    <Button onClick={handleClick} disabled={!selectedMateria || alumnos.length === 0} className="flex items-center">
      <FileText className="mr-2 h-4 w-4" />
      Generar PDF
    </Button>
  )
}
