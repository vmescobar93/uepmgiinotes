"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Printer, Medal } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getConfiguracion } from "@/lib/config"
import { generarRankingPDF } from "@/lib/pdf/index"
import type { Database } from "@/types/supabase"

type Alumno = Database["public"]["Tables"]["alumnos"]["Row"] & {
  promedio: number
  posicion: number
  curso_nombre?: string
}

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]

interface RankingAlumnosProps {
  alumnos: Alumno[]
  cursos: Curso[]
  calificaciones: {
    trimestre1: Calificacion[]
    trimestre2: Calificacion[]
    trimestre3: Calificacion[]
  }
  selectedCurso: string
  selectedTrimestre: string
}

export function RankingAlumnos({
  alumnos,
  cursos,
  calificaciones,
  selectedCurso,
  selectedTrimestre,
}: RankingAlumnosProps) {
  const { toast } = useToast()
  const tableRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [nombreInstitucion, setNombreInstitucion] = useState("U.E. Plena María Goretti II")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [alumnosRanking, setAlumnosRanking] = useState<Alumno[]>([])

  // Cargar configuración
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getConfiguracion()
      setNombreInstitucion(config.nombre_institucion)
      setLogoUrl(config.logo_url)
    }
    loadConfig()
  }, [])

  // Calcular ranking
  useEffect(() => {
    if (!alumnos.length) return

    // Función para obtener el promedio de un alumno
    const calcularPromedioAlumno = (alumnoId: string): number => {
      // Determinar qué calificaciones usar según el trimestre seleccionado
      let calificacionesRelevantes: Calificacion[] = []

      if (selectedTrimestre === "1") {
        calificacionesRelevantes = calificaciones.trimestre1
      } else if (selectedTrimestre === "2") {
        calificacionesRelevantes = calificaciones.trimestre2
      } else if (selectedTrimestre === "3") {
        calificacionesRelevantes = calificaciones.trimestre3
      } else if (selectedTrimestre === "FINAL") {
        // Para el promedio final, usar todas las calificaciones
        calificacionesRelevantes = [
          ...calificaciones.trimestre1,
          ...calificaciones.trimestre2,
          ...calificaciones.trimestre3,
        ]
      }

      // Filtrar calificaciones del alumno
      const notasAlumno = calificacionesRelevantes.filter((cal) => cal.alumno_id === alumnoId)

      if (notasAlumno.length === 0) return 0

      // Si es promedio final, calcular primero el promedio por materia
      if (selectedTrimestre === "FINAL") {
        // Agrupar calificaciones por materia
        const materiaMap: Record<string, number[]> = {}

        notasAlumno.forEach((cal) => {
          if (cal.materia_id && cal.nota !== null) {
            if (!materiaMap[cal.materia_id]) {
              materiaMap[cal.materia_id] = []
            }
            materiaMap[cal.materia_id].push(cal.nota)
          }
        })

        // Calcular promedio por materia
        const promediosPorMateria = Object.values(materiaMap).map((notas) => {
          return notas.reduce((sum, nota) => sum + nota, 0) / notas.length
        })

        // Calcular promedio general
        if (promediosPorMateria.length === 0) return 0
        return (
          Math.round((promediosPorMateria.reduce((sum, prom) => sum + prom, 0) / promediosPorMateria.length) * 100) /
          100
        )
      } else {
        // Para un trimestre específico, calcular el promedio directo
        const suma = notasAlumno.reduce((sum, cal) => sum + (cal.nota || 0), 0)
        return Math.round((suma / notasAlumno.length) * 100) / 100
      }
    }

    // Calcular promedio para cada alumno y añadir información del curso
    const alumnosConPromedio = alumnos.map((alumno) => {
      const curso = cursos.find((c) => c.nombre_corto === alumno.curso_corto)
      return {
        ...alumno,
        promedio: calcularPromedioAlumno(alumno.cod_moodle),
        curso_nombre: curso?.nombre_largo || alumno.curso_corto || "Sin curso",
      }
    })

    // Filtrar alumnos con promedio > 0 y ordenar por promedio (descendente)
    const alumnosOrdenados = alumnosConPromedio.filter((a) => a.promedio > 0).sort((a, b) => b.promedio - a.promedio)

    // Asignar posición en el ranking
    const alumnosConPosicion = alumnosOrdenados.map((alumno, index) => ({
      ...alumno,
      posicion: index + 1,
    }))

    setAlumnosRanking(alumnosConPosicion)
  }, [alumnos, cursos, calificaciones, selectedTrimestre])

  // Exportar a PDF
  const exportarPDF = async () => {
    if (alumnosRanking.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay datos para exportar.",
      })
      return
    }

    setIsExporting(true)

    try {
      // Usar la función centralizada para generar el PDF
      const doc = await generarRankingPDF({
        alumnos: alumnosRanking,
        cursos,
        selectedCurso,
        selectedTrimestre,
        nombreInstitucion,
        logoUrl,
      })

      // Guardar PDF
      const cursoFileName = selectedCurso === "TODOS" ? "TodosLosCursos" : selectedCurso
      const trimestreFileName = selectedTrimestre === "FINAL" ? "Anual" : `T${selectedTrimestre}`
      doc.save(`Ranking_${cursoFileName}_${trimestreFileName}.pdf`)

      toast({
        title: "PDF generado",
        description: "El ranking se ha exportado correctamente.",
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

  // Obtener el color de fondo según la posición
  const getPositionColor = (position: number): string => {
    if (position === 1) return "bg-yellow-100"
    if (position === 2) return "bg-gray-100"
    if (position === 3) return "bg-amber-100"
    return ""
  }

  // Obtener el icono según la posición
  const getPositionIcon = (position: number) => {
    if (position === 1) return <Medal className="h-5 w-5 text-yellow-500" />
    if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (position === 3) return <Medal className="h-5 w-5 text-amber-600" />
    return position
  }

  return (
    <Card className="print:shadow-none" id="ranking-container">
      <CardHeader className="flex flex-row items-center justify-between print:hidden">
        <CardTitle>
          Ranking de Alumnos - {selectedTrimestre === "FINAL" ? "Promedio Anual" : `Trimestre ${selectedTrimestre}`}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={imprimir}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button size="sm" onClick={exportarPDF} disabled={isExporting || alumnosRanking.length === 0}>
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
                Ranking de Alumnos -{" "}
                {selectedTrimestre === "FINAL" ? "Promedio Anual" : `Trimestre ${selectedTrimestre}`}
              </h2>
              <h3 className="text-lg font-semibold text-center">{nombreInstitucion}</h3>
            </div>
          </div>
          <p className="text-center">
            Curso:{" "}
            {selectedCurso === "TODOS"
              ? "Todos los Cursos"
              : cursos.find((c) => c.nombre_corto === selectedCurso)?.nombre_largo || selectedCurso}
            {" - "}Fecha: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="rounded-md border overflow-x-auto" ref={tableRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Posición</TableHead>
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Apellidos</TableHead>
                <TableHead>Nombres</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead className="w-24 text-center">Promedio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alumnosRanking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No hay datos para mostrar. Asegúrese de que existan calificaciones para el trimestre seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                alumnosRanking.map((alumno) => (
                  <TableRow key={alumno.cod_moodle} className={getPositionColor(alumno.posicion)}>
                    <TableCell className="text-center font-medium">
                      <div className="flex items-center justify-center">{getPositionIcon(alumno.posicion)}</div>
                    </TableCell>
                    <TableCell>{alumno.cod_moodle}</TableCell>
                    <TableCell>{alumno.apellidos}</TableCell>
                    <TableCell>{alumno.nombres}</TableCell>
                    <TableCell>{alumno.curso_nombre}</TableCell>
                    <TableCell className="text-center font-bold">{alumno.promedio.toFixed(2)}</TableCell>
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
