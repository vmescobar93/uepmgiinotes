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

interface BoletinNotasProps {
  alumno?: Alumno
  curso?: Curso
  materias: Materia[]
  calificaciones: {
    trimestre1: Calificacion[]
    trimestre2: Calificacion[]
    trimestre3: Calificacion[]
  }
}

export function BoletinNotas({ alumno, curso, materias, calificaciones }: BoletinNotasProps) {
  const { toast } = useToast()
  const boletinRef = useRef<HTMLDivElement>(null)
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

  // Obtener la nota de una materia en un trimestre específico
  const getCalificacion = (materiaId: string, trimestre: 1 | 2 | 3): number | null => {
    const calificacionesTrimestre =
      trimestre === 1
        ? calificaciones.trimestre1
        : trimestre === 2
          ? calificaciones.trimestre2
          : calificaciones.trimestre3

    const calificacion = calificacionesTrimestre.find(
      (cal) => cal.alumno_id === alumno?.cod_moodle && cal.materia_id === materiaId,
    )

    return calificacion?.nota ?? null
  }

  // Calcular el promedio anual de una materia
  const calcularPromedioMateria = (materiaId: string): number => {
    const nota1 = getCalificacion(materiaId, 1)
    const nota2 = getCalificacion(materiaId, 2)
    const nota3 = getCalificacion(materiaId, 3)

    const notas = [nota1, nota2, nota3].filter((nota): nota is number => nota !== null)

    if (notas.length === 0) return 0

    const suma = notas.reduce((acc, nota) => acc + nota, 0)
    return Math.round((suma / notas.length) * 100) / 100
  }

  // Calcular el promedio de un trimestre
  const calcularPromedioTrimestre = (trimestre: 1 | 2 | 3): number => {
    const notasTrimestre = materias
      .map((materia) => getCalificacion(materia.codigo, trimestre))
      .filter((nota): nota is number => nota !== null)

    if (notasTrimestre.length === 0) return 0

    const suma = notasTrimestre.reduce((acc, nota) => acc + nota, 0)
    return Math.round((suma / notasTrimestre.length) * 100) / 100
  }

  // Calcular el promedio anual
  const calcularPromedioAnual = (): number => {
    const promedioT1 = calcularPromedioTrimestre(1)
    const promedioT2 = calcularPromedioTrimestre(2)
    const promedioT3 = calcularPromedioTrimestre(3)

    // Si no hay notas en algún trimestre, no lo consideramos para el promedio
    const promedios = []
    if (promedioT1 > 0) promedios.push(promedioT1)
    if (promedioT2 > 0) promedios.push(promedioT2)
    if (promedioT3 > 0) promedios.push(promedioT3)

    if (promedios.length === 0) return 0

    const suma = promedios.reduce((acc, prom) => acc + prom, 0)
    return Math.round((suma / promedios.length) * 100) / 100
  }

  // Exportar a PDF
  const exportarPDF = async () => {
    if (!alumno) return

    setIsExporting(true)

    try {
      const doc = new jsPDF({
        orientation: "portrait",
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

          // Centrar el logo en la parte superior
          const pageWidth = doc.internal.pageSize.getWidth()
          const xPos = (pageWidth - imgWidth) / 2

          doc.addImage(img, "JPEG", xPos, 10, imgWidth, imgHeight)
        } catch (error) {
          console.error("Error al cargar el logo:", error)
        }
      }

      // Título
      const yPos = logoUrl ? 45 : 20
      doc.setFontSize(16)
      doc.text("BOLETÍN DE CALIFICACIONES", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" })
      doc.setFontSize(14)
      doc.text(nombreInstitucion, doc.internal.pageSize.getWidth() / 2, yPos + 7, { align: "center" })

      // Información del alumno
      doc.setFontSize(12)
      doc.text(`Alumno: ${alumno.apellidos}, ${alumno.nombres}`, 15, yPos + 20)
      doc.text(`Código: ${alumno.cod_moodle}`, 15, yPos + 27)
      doc.text(`Curso: ${curso?.nombre_largo || ""}`, 15, yPos + 34)
      doc.text(`Gestión: ${new Date().getFullYear()}`, 15, yPos + 41)
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 15, yPos + 48)

      // Preparar datos para la tabla
      const head = [
        [
          { content: "Materia", rowSpan: 2 },
          { content: "1er Trimestre", colSpan: 1 },
          { content: "2do Trimestre", colSpan: 1 },
          { content: "3er Trimestre", colSpan: 1 },
          { content: "Promedio Anual", rowSpan: 2 },
        ],
      ]

      const body = materias.map((materia) => {
        const nota1 = getCalificacion(materia.codigo, 1)
        const nota2 = getCalificacion(materia.codigo, 2)
        const nota3 = getCalificacion(materia.codigo, 3)
        const promedioMateria = calcularPromedioMateria(materia.codigo)

        return [
          materia.nombre_largo,
          nota1 !== null ? nota1.toFixed(2) : "-",
          nota2 !== null ? nota2.toFixed(2) : "-",
          nota3 !== null ? nota3.toFixed(2) : "-",
          promedioMateria.toFixed(2),
        ]
      })

      // Añadir fila de promedios
      const promedioT1 = calcularPromedioTrimestre(1)
      const promedioT2 = calcularPromedioTrimestre(2)
      const promedioT3 = calcularPromedioTrimestre(3)
      const promedioAnual = calcularPromedioAnual()

      body.push([
        { content: "PROMEDIO", styles: { fontStyle: "bold" } },
        { content: promedioT1.toFixed(2), styles: { fontStyle: "bold" } },
        { content: promedioT2.toFixed(2), styles: { fontStyle: "bold" } },
        { content: promedioT3.toFixed(2), styles: { fontStyle: "bold" } },
        { content: promedioAnual.toFixed(2), styles: { fontStyle: "bold" } },
      ])

      // Generar tabla
      autoTable(doc, {
        head,
        body,
        startY: yPos + 55,
        theme: "grid",
        headStyles: { fillColor: [100, 100, 100], fontSize: 10, halign: "center" },
        bodyStyles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { halign: "center" },
          2: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "center" },
        },
      })

      // Sección de firmas
      const finalY = (doc as any).lastAutoTable.finalY + 20

      doc.line(40, finalY + 20, 90, finalY + 20) // Línea para firma del director
      doc.line(120, finalY + 20, 170, finalY + 20) // Línea para firma del profesor

      doc.setFontSize(10)
      doc.text("Director/a", 65, finalY + 25, { align: "center" })
      doc.text("Profesor/a Tutor/a", 145, finalY + 25, { align: "center" })

      // Pie de página
      doc.setFontSize(8)
      doc.text(
        `Página 1 de 1 - Boletín de Calificaciones - ${nombreInstitucion}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" },
      )

      // Guardar PDF
      doc.save(`Boletin_${alumno.apellidos}_${alumno.nombres}.pdf`)

      toast({
        title: "PDF generado",
        description: "El boletín se ha exportado correctamente.",
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

  if (!alumno) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Seleccione un alumno para generar el boletín.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="print:shadow-none" id="boletin-container">
      <CardHeader className="flex flex-row items-center justify-between print:hidden">
        <CardTitle>Boletín de Calificaciones</CardTitle>
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
      <CardContent ref={boletinRef}>
        <div className="mb-6">
          <div className="flex flex-col items-center justify-center mb-4">
            {logoUrl && (
              <img
                src={logoUrl || "/placeholder.svg"}
                alt="Logo institucional"
                className="h-20 w-auto object-contain mb-2"
              />
            )}
            <h2 className="text-xl font-bold text-center mb-1">BOLETÍN DE CALIFICACIONES</h2>
            <h3 className="text-lg font-semibold text-center">{nombreInstitucion}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
            <div>
              <p>
                <strong>Alumno:</strong> {alumno.apellidos}, {alumno.nombres}
              </p>
              <p>
                <strong>Código:</strong> {alumno.cod_moodle}
              </p>
            </div>
            <div>
              <p>
                <strong>Curso:</strong> {curso?.nombre_largo}
              </p>
              <p>
                <strong>Gestión:</strong> {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Materia</TableHead>
                <TableHead className="text-center">1er Trimestre</TableHead>
                <TableHead className="text-center">2do Trimestre</TableHead>
                <TableHead className="text-center">3er Trimestre</TableHead>
                <TableHead className="text-center">Promedio Anual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No hay materias para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {materias.map((materia) => {
                    const nota1 = getCalificacion(materia.codigo, 1)
                    const nota2 = getCalificacion(materia.codigo, 2)
                    const nota3 = getCalificacion(materia.codigo, 3)
                    const promedioMateria = calcularPromedioMateria(materia.codigo)

                    return (
                      <TableRow key={materia.codigo}>
                        <TableCell>{materia.nombre_largo}</TableCell>
                        <TableCell className="text-center">{nota1 !== null ? nota1.toFixed(2) : "-"}</TableCell>
                        <TableCell className="text-center">{nota2 !== null ? nota2.toFixed(2) : "-"}</TableCell>
                        <TableCell className="text-center">{nota3 !== null ? nota3.toFixed(2) : "-"}</TableCell>
                        <TableCell className="text-center font-medium">{promedioMateria.toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">PROMEDIO</TableCell>
                    <TableCell className="text-center font-bold">{calcularPromedioTrimestre(1).toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold">{calcularPromedioTrimestre(2).toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold">{calcularPromedioTrimestre(3).toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold">{calcularPromedioAnual().toFixed(2)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 print:mt-20">
          <div className="text-center">
            <div className="border-t border-gray-300 mx-auto w-40 pt-2">Director/a</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-300 mx-auto w-40 pt-2">Profesor/a Tutor/a</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
