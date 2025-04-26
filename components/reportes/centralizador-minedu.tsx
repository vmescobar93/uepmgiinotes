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
type Agrupacion = Database["public"]["Tables"]["agrupaciones_materias"]["Row"]

interface CentralizadorMineduProps {
  curso?: Curso
  alumnos: Alumno[]
  materias: Materia[]
  calificaciones: Calificacion[]
  agrupaciones: Agrupacion[]
  trimestre: string
}

interface MateriaAgrupada {
  id_area: number
  nombre_grupo: string
  nombre_mostrar: string
  materias: string[]
}

export function CentralizadorMinedu({
  curso,
  alumnos,
  materias,
  calificaciones,
  agrupaciones,
  trimestre,
}: CentralizadorMineduProps) {
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

  // Agrupar materias según las agrupaciones
  const materiasAgrupadas: MateriaAgrupada[] = []
  const materiasNoAgrupadas: string[] = []

  // Identificar materias agrupadas y no agrupadas
  if (agrupaciones.length > 0) {
    // Agrupar por id_area y nombre_grupo
    const grupos = agrupaciones.reduce(
      (acc, agrupacion) => {
        const key = `${agrupacion.id_area}-${agrupacion.nombre_grupo}`
        if (!acc[key]) {
          acc[key] = {
            id_area: agrupacion.id_area,
            nombre_grupo: agrupacion.nombre_grupo,
            nombre_mostrar: agrupacion.nombre_mostrar,
            materias: [],
          }
        }
        if (agrupacion.materia_codigo) {
          acc[key].materias.push(agrupacion.materia_codigo)
        }
        return acc
      },
      {} as Record<string, MateriaAgrupada>,
    )

    // Convertir a array
    Object.values(grupos).forEach((grupo) => {
      materiasAgrupadas.push(grupo)
    })

    // Identificar materias no agrupadas
    const materiasAgrupadasCodigos = agrupaciones
      .map((a) => a.materia_codigo)
      .filter((codigo): codigo is string => !!codigo)

    materias.forEach((materia) => {
      if (!materiasAgrupadasCodigos.includes(materia.codigo)) {
        materiasNoAgrupadas.push(materia.codigo)
      }
    })
  } else {
    // Si no hay agrupaciones, todas las materias son no agrupadas
    materiasNoAgrupadas.push(...materias.map((m) => m.codigo))
  }

  // Obtener la nota de un alumno en una materia específica
  const getCalificacion = (alumnoId: string, materiaId: string): number | null => {
    const calificacion = calificaciones.find((cal) => cal.alumno_id === alumnoId && cal.materia_id === materiaId)
    return calificacion ? calificacion.nota : null
  }

  // Calcular el promedio de un grupo de materias para un alumno
  const calcularPromedioGrupo = (alumnoId: string, materiasCodigos: string[]): number => {
    const notasGrupo = materiasCodigos
      .map((codigo) => getCalificacion(alumnoId, codigo))
      .filter((nota): nota is number => nota !== null)

    if (notasGrupo.length === 0) return 0

    const suma = notasGrupo.reduce((acc, nota) => acc + nota, 0)
    // Redondear a entero según requisito
    return Math.round(suma / notasGrupo.length)
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
      doc.text(`Centralizador MINEDU - ${trimestreTexto} Trimestre`, 150, 15, { align: "center" })

      // Nombre de la institución
      doc.setFontSize(14)
      doc.text(nombreInstitucion, 150, 22, { align: "center" })

      // Información del curso
      doc.setFontSize(12)
      doc.text(`Curso: ${curso?.nombre_largo || ""}`, 15, 35)
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 40)

      // Preparar datos para la tabla
      const head = [["#", "Código", "Apellidos", "Nombres"]]

      // Añadir encabezados de materias agrupadas
      materiasAgrupadas.forEach((grupo) => {
        head[0].push(grupo.nombre_grupo)
      })

      // Añadir encabezados de materias no agrupadas
      materias
        .filter((materia) => materiasNoAgrupadas.includes(materia.codigo))
        .forEach((materia) => {
          head[0].push(materia.nombre_corto)
        })

      const body = alumnos.map((alumno, index) => {
        const row = [(index + 1).toString(), alumno.cod_moodle, alumno.apellidos, alumno.nombres]

        // Añadir notas de grupos
        materiasAgrupadas.forEach((grupo) => {
          const promedio = calcularPromedioGrupo(alumno.cod_moodle, grupo.materias)
          row.push(promedio === 0 ? "-" : promedio.toString())
        })

        // Añadir notas de materias no agrupadas
        materias
          .filter((materia) => materiasNoAgrupadas.includes(materia.codigo))
          .forEach((materia) => {
            const nota = getCalificacion(alumno.cod_moodle, materia.codigo)
            row.push(nota !== null ? Math.round(nota).toString() : "-")
          })

        return row
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
        },
      })

      // Pie de página
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(
          `Página ${i} de ${pageCount} - ${nombreInstitucion} - Centralizador MINEDU`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        )
      }

      // Guardar PDF
      doc.save(`Centralizador_MINEDU_${curso?.nombre_corto || "Curso"}_T${trimestre}.pdf`)

      toast({
        title: "PDF generado",
        description: "El centralizador MINEDU se ha exportado correctamente.",
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

  // Obtener el nombre de la materia a partir del código
  const getNombreMateria = (codigo: string): string => {
    const materia = materias.find((m) => m.codigo === codigo)
    return materia ? materia.nombre_corto : codigo
  }

  return (
    <Card className="print:shadow-none" id="centralizador-minedu-container">
      <CardHeader className="flex flex-row items-center justify-between print:hidden">
        <CardTitle>Centralizador MINEDU - {curso?.nombre_largo}</CardTitle>
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
                Centralizador MINEDU - {trimestre === "1" ? "Primer" : trimestre === "2" ? "Segundo" : "Tercer"}{" "}
                Trimestre
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

                {/* Encabezados de materias agrupadas */}
                {materiasAgrupadas.map((grupo) => (
                  <TableHead key={`${grupo.id_area}-${grupo.nombre_grupo}`} className="text-center whitespace-nowrap">
                    {grupo.nombre_grupo}
                    <span className="sr-only">{grupo.nombre_mostrar}</span>
                  </TableHead>
                ))}

                {/* Encabezados de materias no agrupadas */}
                {materias
                  .filter((materia) => materiasNoAgrupadas.includes(materia.codigo))
                  .map((materia) => (
                    <TableHead key={materia.codigo} className="text-center whitespace-nowrap">
                      {materia.nombre_corto}
                    </TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4 + materiasAgrupadas.length + materiasNoAgrupadas.length}
                    className="h-24 text-center"
                  >
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

                    {/* Notas de materias agrupadas */}
                    {materiasAgrupadas.map((grupo) => {
                      const promedio = calcularPromedioGrupo(alumno.cod_moodle, grupo.materias)
                      return (
                        <TableCell
                          key={`${alumno.cod_moodle}-${grupo.id_area}-${grupo.nombre_grupo}`}
                          className="text-center font-medium"
                        >
                          {promedio === 0 ? "-" : promedio}
                        </TableCell>
                      )
                    })}

                    {/* Notas de materias no agrupadas */}
                    {materias
                      .filter((materia) => materiasNoAgrupadas.includes(materia.codigo))
                      .map((materia) => {
                        const nota = getCalificacion(alumno.cod_moodle, materia.codigo)
                        return (
                          <TableCell key={`${alumno.cod_moodle}-${materia.codigo}`} className="text-center">
                            {nota !== null ? Math.round(nota) : "-"}
                          </TableCell>
                        )
                      })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Leyenda de agrupaciones */}
        {materiasAgrupadas.length > 0 && (
          <div className="mt-6 text-sm">
            <h3 className="font-semibold mb-2">Leyenda de agrupaciones:</h3>
            <ul className="space-y-1">
              {materiasAgrupadas.map((grupo) => (
                <li key={`leyenda-${grupo.id_area}-${grupo.nombre_grupo}`}>
                  <strong>{grupo.nombre_grupo}</strong> ({grupo.nombre_mostrar}):{" "}
                  {grupo.materias.map(getNombreMateria).join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
