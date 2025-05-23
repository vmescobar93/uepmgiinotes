"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Printer } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getConfiguracion } from "@/lib/config"
import { generarCentralizadorInternoPDF } from "@/lib/pdf"
import { getEstadoNota } from "@/lib/utils"
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

// Componente para mostrar una nota con el color correspondiente
function NotaConEstado({ nota }: { nota: number | null }) {
  if (nota === null) return <span>-</span>

  const { color, texto } = getEstadoNota(nota)

  return (
    <span style={{ color }} title={texto}>
      {nota.toFixed(2)}
    </span>
  )
}

// Interfaz para las estadísticas por materia
interface EstadisticasMateria {
  materiaId: string
  nombreMateria: string
  aprobados: number
  porcentajeAprobados: number
  reprobados: number
  porcentajeReprobados: number
  promedio: number
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
  const [materiasOrdenadas, setMateriasOrdenadas] = useState<Materia[]>([])
  const [estadisticasPorMateria, setEstadisticasPorMateria] = useState<EstadisticasMateria[]>([])
  const [promedioGeneral, setPromedioGeneral] = useState<number>(0)

  // Cargar configuración
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getConfiguracion()
      setNombreInstitucion(config.nombre_institucion)
      setLogoUrl(config.logo_url)
    }
    loadConfig()
  }, [])

  // Ordenar materias por el campo "orden"
  useEffect(() => {
    const ordenadas = [...materias].sort((a, b) => {
      // Si el campo orden es null, colocar al final
      if (a.orden === null) return 1
      if (b.orden === null) return -1
      // Ordenar por el campo orden
      return a.orden - b.orden
    })
    setMateriasOrdenadas(ordenadas)
  }, [materias])

  // Obtener la nota de un alumno en una materia específica
  const getCalificacion = (alumnoId: string, materiaId: string): number | null => {
    const calificacion = calificaciones.find((cal) => cal.alumno_id === alumnoId && cal.materia_id === materiaId)
    return calificacion ? calificacion.nota : null
  }

  // Calcular el promedio de un alumno
  const calcularPromedio = (alumnoId: string): number => {
    const notasAlumno = materiasOrdenadas
      .map((materia) => getCalificacion(alumnoId, materia.codigo))
      .filter((nota): nota is number => nota !== null)

    if (notasAlumno.length === 0) return 0

    const suma = notasAlumno.reduce((acc, nota) => acc + nota, 0)
    return Math.round((suma / notasAlumno.length) * 100) / 100
  }

  // Calcular estadísticas por materia y promedio general
  useEffect(() => {
    if (materiasOrdenadas.length === 0 || alumnos.length === 0) {
      setEstadisticasPorMateria([])
      setPromedioGeneral(0)
      return
    }

    const estadisticas = materiasOrdenadas.map((materia) => {
      // Obtener todas las notas para esta materia
      const notasMateria = alumnos
        .map((alumno) => getCalificacion(alumno.cod_moodle, materia.codigo))
        .filter((nota): nota is number => nota !== null)

      // Contar aprobados y reprobados
      const aprobados = notasMateria.filter((nota) => nota >= 51).length
      const reprobados = notasMateria.filter((nota) => nota < 51).length

      // Calcular porcentajes
      const totalConNota = notasMateria.length
      const porcentajeAprobados = totalConNota > 0 ? (aprobados / totalConNota) * 100 : 0
      const porcentajeReprobados = totalConNota > 0 ? (reprobados / totalConNota) * 100 : 0

      // Calcular promedio
      const promedio =
        totalConNota > 0
          ? Math.round((notasMateria.reduce((acc, nota) => acc + nota, 0) / totalConNota) * 100) / 100
          : 0

      return {
        materiaId: materia.codigo,
        nombreMateria: materia.nombre_corto,
        aprobados,
        porcentajeAprobados,
        reprobados,
        porcentajeReprobados,
        promedio,
      }
    })

    setEstadisticasPorMateria(estadisticas)

    // Calcular promedio general
    const promediosAlumnos = alumnos.map((alumno) => calcularPromedio(alumno.cod_moodle))
    const sumaPromedios = promediosAlumnos.reduce((acc, promedio) => acc + promedio, 0)
    const promGeneral =
      promediosAlumnos.length > 0 ? Math.round((sumaPromedios / promediosAlumnos.length) * 100) / 100 : 0
    setPromedioGeneral(promGeneral)
  }, [materiasOrdenadas, alumnos, calificaciones])

  // Exportar a PDF
  const exportarPDF = async () => {
    setIsExporting(true)

    try {
      const doc = await generarCentralizadorInternoPDF(
        curso,
        alumnos,
        materias,
        calificaciones,
        trimestre,
        nombreInstitucion,
        logoUrl,
        estadisticasPorMateria,
        promedioGeneral,
      )

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
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error("Error al cargar el logo en la vista previa")
                  e.currentTarget.style.display = "none"
                }}
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
                {materiasOrdenadas.map((materia) => (
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
                  <TableCell colSpan={5 + materiasOrdenadas.length} className="h-24 text-center">
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
                    {materiasOrdenadas.map((materia) => {
                      const nota = getCalificacion(alumno.cod_moodle, materia.codigo)
                      return (
                        <TableCell key={materia.codigo} className="text-center">
                          <NotaConEstado nota={nota} />
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center font-bold">
                      <NotaConEstado nota={calcularPromedio(alumno.cod_moodle)} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Tabla de estadísticas por materia (alineada con la tabla principal) */}
        <div className="mt-0 overflow-x-auto">
          <Table className="border-t-0">
            <TableBody>
              {/* Fila de Aprobados */}
              <TableRow>
                <TableCell className="w-10 text-center"></TableCell>
                <TableCell className="w-20"></TableCell>
                <TableCell colSpan={2} className="font-medium">
                  Aprobados
                </TableCell>
                {estadisticasPorMateria.map((est) => (
                  <TableCell key={`aprobados-${est.materiaId}`} className="text-center whitespace-nowrap">
                    {est.aprobados}
                  </TableCell>
                ))}
                <TableCell className="text-center font-bold">-</TableCell>
              </TableRow>
              {/* Fila de % Aprobados */}
              <TableRow>
                <TableCell className="text-center"></TableCell>
                <TableCell></TableCell>
                <TableCell colSpan={2} className="font-medium">
                  % Aprobados
                </TableCell>
                {estadisticasPorMateria.map((est) => (
                  <TableCell key={`pct-aprobados-${est.materiaId}`} className="text-center whitespace-nowrap">
                    {est.porcentajeAprobados.toFixed(2)}%
                  </TableCell>
                ))}
                <TableCell className="text-center font-bold">-</TableCell>
              </TableRow>
              {/* Fila de Reprobados */}
              <TableRow>
                <TableCell className="text-center"></TableCell>
                <TableCell></TableCell>
                <TableCell colSpan={2} className="font-medium">
                  Reprobados
                </TableCell>
                {estadisticasPorMateria.map((est) => (
                  <TableCell key={`reprobados-${est.materiaId}`} className="text-center whitespace-nowrap">
                    {est.reprobados}
                  </TableCell>
                ))}
                <TableCell className="text-center font-bold">-</TableCell>
              </TableRow>
              {/* Fila de % Reprobados */}
              <TableRow>
                <TableCell className="text-center"></TableCell>
                <TableCell></TableCell>
                <TableCell colSpan={2} className="font-medium">
                  % Reprobados
                </TableCell>
                {estadisticasPorMateria.map((est) => (
                  <TableCell key={`pct-reprobados-${est.materiaId}`} className="text-center whitespace-nowrap">
                    {est.porcentajeReprobados.toFixed(2)}%
                  </TableCell>
                ))}
                <TableCell className="text-center font-bold">-</TableCell>
              </TableRow>
              {/* Fila de Promedio */}
              <TableRow>
                <TableCell className="text-center"></TableCell>
                <TableCell></TableCell>
                <TableCell colSpan={2} className="font-medium">
                  Promedio
                </TableCell>
                {estadisticasPorMateria.map((est) => (
                  <TableCell key={`promedio-${est.materiaId}`} className="text-center whitespace-nowrap">
                    <NotaConEstado nota={est.promedio} />
                  </TableCell>
                ))}
                <TableCell className="text-center font-bold">
                  <NotaConEstado nota={promedioGeneral} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Leyenda de colores */}
        <div className="mt-6 text-sm print:mt-4">
          <h3 className="font-semibold mb-2">Leyenda:</h3>
          <ul className="space-y-1">
            <li>
              <span className="inline-block w-4 h-4 bg-red-500 mr-2"></span>
              <span style={{ color: "red" }}>0-49,00:</span> Reprobado
            </li>
            <li>
              <span className="inline-block w-4 h-4 bg-amber-500 mr-2"></span>
              <span style={{ color: "#f59e0b" }}>49,01-50,99:</span> No Concluyente
            </li>
            <li>
              <span className="inline-block w-4 h-4 bg-green-500 mr-2"></span>
              <span>51,00-100,00:</span> Aprobado
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
