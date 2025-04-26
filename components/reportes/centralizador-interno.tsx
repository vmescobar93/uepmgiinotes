"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Printer } from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { useToast } from "@/components/ui/use-toast"
import { getConfiguracion } from "@/lib/config"
import type { Database } from "@/types/supabase"

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]

interface CentralizadorInternoProps {
  curso?: Curso
  alumnos: Alumno[]
  materias: Materia[]
  calificaciones: Calificacion[]
  trimestre: string
}

export function CentralizadorInterno({
  curso,
  alumnos,
  materias,
  calificaciones,
  trimestre,
}: CentralizadorInternoProps) {
  const { toast } = useToast()
  const tableRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [nombreInstitucion, setNombreInstitucion] = useState("U.E. Plena María Goretti II")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  // Cargar configuración
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getConfiguracion()
      setNombreInstitucion(config.nombre_institucion)
      setLogoUrl(config.logo_url)
    }
    loadConfig()
  }, [])

  // Obtener la nota de un alumno en una materia específica
  const getCalificacion = (alumnoId: string, materiaId: string): number | null => {
    const calificacion = calificaciones.find((cal) => cal.alumno_id === alumnoId && cal.materia_id === materiaId)
    return calificacion ? calificacion.nota : null
  }

  // Calcular el promedio de un alumno
  const calcularPromedio = (alumnoId: string): number => {
    const notasAlumno = materias
      .map((materia) => getCalificacion(alumnoId, materia.codigo))
      .filter((nota): nota is number => nota !== null)

    if (notasAlumno.length === 0) return 0

    const suma = notasAlumno.reduce((acc, nota) => acc + nota, 0)
    return Math.round((suma / notasAlumno.length) * 100) / 100
  }

  // Exportar a PDF
  const exportarPDF = async () => {
    setIsExporting(true)

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      })

      // Añadir logo si existe
      if (logoUrl) {
        try {
          const img = new Image()
          img.crossOrigin = "anonymous"

          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = logoUrl
          })

          // Calcular dimensiones para mantener proporción
          const imgWidth = 25
          const imgHeight = (img.height * imgWidth) / img.width

          doc.addImage(img, "JPEG", 15, 10, imgWidth, imgHeight)
        } catch (error) {
          console.error("Error al cargar el logo:", error)
        }
      }

      // Título
      const trimestreTexto = trimestre === "1" ? "Primer" : trimestre === "2" ? "Segundo" : "Tercer"
      doc.setFontSize(16)
      doc.text(`Centralizador de Calificaciones - ${trimestreTexto} Trimestre`, 150, 15, { align: "center" })

      // Nombre de la institución
      doc.setFontSize(14)
      doc.text(nombreInstitucion, 150, 22, { align: "center" })

      // Información del curso
      doc.setFontSize(12)
      doc.text(`Curso: ${curso?.nombre_largo || ""}`, 15, 35)
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 40)

      // Preparar datos para la tabla
      const head = [["#", "Código", "Apellidos", "Nombres", ...materias.map((m) => m.nombre_corto), "Promedio"]]

      const body = alumnos.map((alumno, index) => {
        const notas = materias.map((materia) => {
          const nota = getCalificacion(alumno.cod_moodle, materia.codigo)
          return nota !== null ? nota.toFixed(2) : "-"
        })

        const promedio = calcularPromedio(alumno.cod_moodle)

        return [
          (index + 1).toString(),
          alumno.cod_moodle,
          alumno.apellidos,
          alumno.nombres,
          ...notas,
          promedio.toFixed(2),
        ]
      })

      // Generar tabla
      autoTable(doc, {
        head,
        body,
        startY: 45,
        theme: "grid",
        headStyles: { fillColor: [100, 100, 100], fontSize: 8, halign: "center" },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          1: { cellWidth: 15 },
          [4 + materias.length]: { halign: "center", fontStyle: "bold" },
        },
      })

      // Pie de página
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(
          `Página ${i} de ${pageCount} - ${nombreInstitucion}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        )
      }

      // Guardar PDF
      doc.save(`Centralizador_${curso?.nombre_corto || "Curso"}_T${trimestre}.pdf`)

      toast({
        title: "PDF generado",
        description: "El centralizador se ha exportado correctamente.",
      })
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Imprimir
  const imprimir = () => {
    window.print()
  }

  return (
    <Card className="print:shadow-none" id="centralizador-container">
      <CardHeader className="flex flex-row items-center justify-between print:hidden">
        <CardTitle>Centralizador Interno - {curso?.nombre_largo}</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={imprimir}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button size="sm" onClick={exportarPDF} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="hidden print:block mb-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            {logoUrl && (
              <img
                src={logoUrl || "/placeholder.svg"}
                alt="Logo institucional"
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-center">
                Centralizador de Calificaciones -{" "}
                {trimestre === "1" ? "Primer" : trimestre === "2" ? "Segundo" : "Tercer"} Trimestre
              </h2>
              <h3 className="text-lg font-semibold text-center">{nombreInstitucion}</h3>
            </div>
          </div>
          <p className="text-center">
            Curso: {curso?.nombre_largo} - Fecha: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="rounded-md border overflow-x-auto" ref={tableRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Apellidos</TableHead>
                <TableHead>Nombres</TableHead>
                {materias.map((materia) => (
                  <TableHead key={materia.codigo} className="text-center whitespace-nowrap">
                    {materia.nombre_corto}
                  </TableHead>
                ))}
                <TableHead className="text-center font-bold">Promedio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5 + materias.length} className="h-24 text-center">
                    No hay alumnos para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                alumnos.map((alumno, index) => (
                  <TableRow key={alumno.cod_moodle}>
                    <TableCell className="text-center">{index + 1}</TableCell>
                    <TableCell>{alumno.cod_moodle}</TableCell>
                    <TableCell>{alumno.apellidos}</TableCell>
                    <TableCell>{alumno.nombres}</TableCell>
                    {materias.map((materia) => {
                      const nota = getCalificacion(alumno.cod_moodle, materia.codigo)
                      return (
                        <TableCell key={materia.codigo} className="text-center">
                          {nota !== null ? nota.toFixed(2) : "-"}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center font-bold">
                      {calcularPromedio(alumno.cod_moodle).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
