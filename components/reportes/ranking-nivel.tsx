"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Download, Printer, Loader2, Award } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { generarRankingNivelPDF } from "@/lib/pdf"
import type { Database } from "@/types/supabase"

// Tipos
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"] & {
  promedio?: number
  posicion?: number
  curso_nombre?: string
}

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]

interface RankingNivelProps {
  alumnosPrimaria?: Alumno[]
  alumnosSecundaria?: Alumno[]
  selectedTrimestre?: string
}

export function RankingNivel({
  alumnosPrimaria: initialAlumnosPrimaria = [],
  alumnosSecundaria: initialAlumnosSecundaria = [],
  selectedTrimestre = "FINAL",
}: RankingNivelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [trimestre, setTrimestre] = useState(selectedTrimestre)
  const { toast } = useToast()
  const [alumnosPrimaria, setAlumnosPrimaria] = useState<Alumno[]>(initialAlumnosPrimaria)
  const [alumnosSecundaria, setAlumnosSecundaria] = useState<Alumno[]>(initialAlumnosSecundaria)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Función para generar el ranking
  const handleGenerarRanking = async () => {
    setIsLoading(true)
    setDebugInfo("")
    let debugOutput = ""

    try {
      // Cargar todos los cursos
      const { data: cursosData, error: cursosError } = await supabase.from("cursos").select("*").order("nombre_corto")

      if (cursosError) {
        throw new Error(`Error al cargar cursos: ${cursosError.message}`)
      }

      if (!cursosData || cursosData.length === 0) {
        throw new Error("No hay cursos registrados")
      }

      // Separar cursos por nivel
      const cursosPrimaria = cursosData.filter((curso) => curso.nivel === "Primaria")
      const cursosSecundaria = cursosData.filter((curso) => curso.nivel === "Secundaria")

      debugOutput += `Cursos de Primaria: ${cursosPrimaria.length}\n`
      debugOutput += `Cursos de Secundaria: ${cursosSecundaria.length}\n`

      // Cargar todos los alumnos activos
      const { data: alumnosData, error: alumnosError } = await supabase
        .from("alumnos")
        .select("*")
        .eq("activo", true)
        .order("apellidos")

      if (alumnosError) {
        throw new Error(`Error al cargar alumnos: ${alumnosError.message}`)
      }

      if (!alumnosData || alumnosData.length === 0) {
        throw new Error("No hay alumnos activos registrados")
      }

      // Cargar todas las materias
      const { data: materiasData, error: materiasError } = await supabase.from("materias").select("codigo, curso_corto")

      if (materiasError) {
        throw new Error(`Error al cargar materias: ${materiasError.message}`)
      }

      if (!materiasData || materiasData.length === 0) {
        throw new Error("No hay materias registradas")
      }

      // Obtener códigos de materias para todos los cursos
      const codigosMaterias = materiasData.map((m) => m.codigo)

      // Obtener códigos de alumnos
      const codigosAlumnos = alumnosData.map((a) => a.cod_moodle)

      // SOLUCIÓN: Cargar calificaciones por curso en lugar de todas a la vez
      // Esto evita el límite de 1000 filas de Supabase
      let todasLasCalificaciones: Calificacion[] = []

      // Agrupar alumnos por curso para consultas más eficientes
      const alumnosPorCursoMap: Record<string, string[]> = {}
      alumnosData.forEach((alumno) => {
        if (!alumnosPorCursoMap[alumno.curso_corto]) {
          alumnosPorCursoMap[alumno.curso_corto] = []
        }
        alumnosPorCursoMap[alumno.curso_corto].push(alumno.cod_moodle)
      })

      // Cargar calificaciones curso por curso
      for (const cursoCodigo of Object.keys(alumnosPorCursoMap)) {
        const alumnosDelCurso = alumnosPorCursoMap[cursoCodigo]
        const materiasCurso = materiasData.filter((m) => m.curso_corto === cursoCodigo).map((m) => m.codigo)

        if (trimestre === "FINAL") {
          // Para el promedio final, cargar los tres trimestres
          for (let t = 1; t <= 3; t++) {
            const { data: calificacionesTrimestre } = await supabase
              .from("calificaciones")
              .select("*")
              .in("materia_id", materiasCurso)
              .in("alumno_id", alumnosDelCurso)
              .eq("trimestre", t)
              // Aumentar el límite para asegurarnos de obtener todas las calificaciones
              .limit(5000)

            if (calificacionesTrimestre) {
              todasLasCalificaciones = [...todasLasCalificaciones, ...calificacionesTrimestre]
            }
          }
        } else {
          // Para un trimestre específico
          const { data: calificacionesTrimestre } = await supabase
            .from("calificaciones")
            .select("*")
            .in("materia_id", materiasCurso)
            .in("alumno_id", alumnosDelCurso)
            .eq("trimestre", Number.parseInt(trimestre))
            // Aumentar el límite para asegurarnos de obtener todas las calificaciones
            .limit(5000)

          if (calificacionesTrimestre) {
            todasLasCalificaciones = [...todasLasCalificaciones, ...calificacionesTrimestre]
          }
        }
      }

      debugOutput += `Total de calificaciones cargadas: ${todasLasCalificaciones.length}\n`

      // Obtener el mejor alumno de cada curso
      const mejoresAlumnosPorCurso: Record<string, Alumno> = {}

      // Procesar cada alumno
      alumnosData.forEach((alumno) => {
        const curso = cursosData.find((c) => c.nombre_corto === alumno.curso_corto)
        if (!curso) return // Ignorar alumnos sin curso asignado

        // Calcular promedio
        const promedio = calcularPromedioAlumno(alumno.cod_moodle, todasLasCalificaciones)

        // Solo considerar alumnos con promedio > 0
        if (promedio > 0) {
          const alumnoConPromedio = {
            ...alumno,
            promedio,
            curso_nombre: curso.nombre_largo,
          }

          // Verificar si es el mejor de su curso
          if (
            !mejoresAlumnosPorCurso[curso.nombre_corto] ||
            promedio > (mejoresAlumnosPorCurso[curso.nombre_corto].promedio || 0)
          ) {
            mejoresAlumnosPorCurso[curso.nombre_corto] = alumnoConPromedio
          }
        }
      })

      debugOutput += `Mejores alumnos por curso: ${Object.keys(mejoresAlumnosPorCurso).length}\n`

      // Separar los mejores alumnos por nivel
      const mejoresAlumnosPrimaria: Alumno[] = []
      const mejoresAlumnosSecundaria: Alumno[] = []

      Object.keys(mejoresAlumnosPorCurso).forEach((cursoCodigo) => {
        const alumno = mejoresAlumnosPorCurso[cursoCodigo]
        const curso = cursosData.find((c) => c.nombre_corto === cursoCodigo)

        if (curso) {
          if (curso.nivel === "Primaria") {
            mejoresAlumnosPrimaria.push(alumno)
          } else if (curso.nivel === "Secundaria") {
            mejoresAlumnosSecundaria.push(alumno)
          }
        }
      })

      debugOutput += `Mejores alumnos de Primaria: ${mejoresAlumnosPrimaria.length}\n`
      debugOutput += `Mejores alumnos de Secundaria: ${mejoresAlumnosSecundaria.length}\n`

      // Ordenar por promedio (de mayor a menor)
      mejoresAlumnosPrimaria.sort((a, b) => (b.promedio || 0) - (a.promedio || 0))
      mejoresAlumnosSecundaria.sort((a, b) => (b.promedio || 0) - (a.promedio || 0))

      // Asignar posiciones
      mejoresAlumnosPrimaria.forEach((alumno, index) => {
        alumno.posicion = index + 1
      })

      mejoresAlumnosSecundaria.forEach((alumno, index) => {
        alumno.posicion = index + 1
      })

      // Tomar solo los 3 mejores de cada nivel
      const top3Primaria = mejoresAlumnosPrimaria.slice(0, 3)
      const top3Secundaria = mejoresAlumnosSecundaria.slice(0, 3)

      // Actualizar el estado
      setAlumnosPrimaria(top3Primaria)
      setAlumnosSecundaria(top3Secundaria)
      setDebugInfo(debugOutput)
    } catch (error) {
      console.error("Error al generar ranking por nivel:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el ranking por nivel.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para calcular el promedio de un alumno
  const calcularPromedioAlumno = (alumnoId: string, calificaciones: Calificacion[]): number => {
    // Filtrar calificaciones del alumno
    const notasAlumno = calificaciones.filter((cal) => cal.alumno_id === alumnoId)

    if (notasAlumno.length === 0) return 0

    // Si es promedio final, calcular primero el promedio por materia
    if (trimestre === "FINAL") {
      // Agrupar calificaciones por materia
      const materiaMap: Record<string, number[]> = {}

      notasAlumno.forEach((cal) => {
        if (cal.materia_id && cal.nota !== null) {
          if (!materiaMap[cal.materia_id]) {
            materiaMap[cal.materia_id] = []
          }
          materiaMap[cal.materia_id].push(Number(cal.nota))
        }
      })

      // Calcular promedio por materia
      const promediosPorMateria = Object.entries(materiaMap).map(([materiaId, notas]) => {
        return notas.reduce((sum, nota) => sum + nota, 0) / notas.length
      })

      // Calcular promedio general
      if (promediosPorMateria.length === 0) return 0

      return (
        Math.round((promediosPorMateria.reduce((sum, prom) => sum + prom, 0) / promediosPorMateria.length) * 100) / 100
      )
    } else {
      // Para un trimestre específico, calcular el promedio directo
      // Verificar si hay notas nulas o indefinidas
      const notasValidas = notasAlumno.filter((cal) => cal.nota !== null && cal.nota !== undefined)

      if (notasValidas.length === 0) return 0

      // Convertir explícitamente a número para evitar problemas con strings
      const notasNumericas = notasValidas.map((cal) => Number(cal.nota))

      const suma = notasNumericas.reduce((sum, nota) => sum + nota, 0)
      return Math.round((suma / notasNumericas.length) * 100) / 100
    }
  }

  // Función para exportar a PDF
  const exportarPDF = async () => {
    setIsGeneratingPDF(true)

    try {
      // Cargar configuración
      const { data: configData } = await supabase.from("configuracion").select("*").eq("id", 1).single()

      if (!configData) {
        throw new Error("No se pudo cargar la configuración")
      }

      // Obtener texto del trimestre
      const trimestreTexto =
        trimestre === "1"
          ? "Primer Trimestre"
          : trimestre === "2"
            ? "Segundo Trimestre"
            : trimestre === "3"
              ? "Tercer Trimestre"
              : "Promedio Anual"

      // Generar PDF
      const doc = await generarRankingNivelPDF(
        alumnosPrimaria,
        alumnosSecundaria,
        configData.nombre_institucion,
        configData.logo_url,
        trimestreTexto,
      )

      // Guardar PDF
      doc.save(`Ranking_Nivel_${trimestreTexto.replace(/\s+/g, "_")}.pdf`)

      toast({
        title: "PDF generado",
        description: "El ranking por nivel se ha exportado correctamente.",
      })
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF del ranking por nivel.",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Función para imprimir
  const imprimir = () => window.print()

  // Obtener texto del trimestre
  const trimestreTexto =
    trimestre === "1"
      ? "Primer Trimestre"
      : trimestre === "2"
        ? "Segundo Trimestre"
        : trimestre === "3"
          ? "Tercer Trimestre"
          : "Promedio Anual"

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Mejores Alumnos por Nivel</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={imprimir} className="print:hidden">
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <Button
              size="sm"
              onClick={exportarPDF}
              disabled={isGeneratingPDF || (alumnosPrimaria.length === 0 && alumnosSecundaria.length === 0)}
              className="print:hidden"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" /> Exportar PDF
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 print:hidden">
            <div className="space-y-2">
              <Label htmlFor="trimestre">Trimestre</Label>
              <Select value={trimestre} onValueChange={setTrimestre}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar trimestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Primer Trimestre</SelectItem>
                  <SelectItem value="2">Segundo Trimestre</SelectItem>
                  <SelectItem value="3">Tercer Trimestre</SelectItem>
                  <SelectItem value="FINAL">Promedio Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleGenerarRanking} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                  </>
                ) : (
                  <>
                    <Award className="mr-2 h-4 w-4" /> Generar Ranking por Nivel
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Información de depuración */}
          {debugInfo && (
            <Card className="bg-gray-50 p-4 print:hidden">
              <CardHeader className="p-2">
                <CardTitle className="text-sm">Información de depuración</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-60">{debugInfo}</pre>
              </CardContent>
            </Card>
          )}

          {/* Título para impresión */}
          <div className="hidden print:block mb-6">
            <h2 className="text-2xl font-bold text-center">Mejores Alumnos por Nivel</h2>
            <h3 className="text-xl font-semibold text-center">Periodo: {trimestreTexto}</h3>
            <p className="text-center text-sm mt-2">Fecha de generación: {new Date().toLocaleDateString("es-ES")}</p>
          </div>

          {/* Mostrar resultados */}
          <div className="space-y-8">
            {/* Sección Primaria */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b pb-2">Nivel Primaria</h3>
              {alumnosPrimaria.length > 0 ? (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full">
                    <thead className="bg-amber-400 text-black">
                      <tr>
                        <th className="p-2 text-left w-16">Posición</th>
                        <th className="p-2 text-left">Alumno</th>
                        <th className="p-2 text-left">Curso</th>
                        <th className="p-2 text-right w-24">Promedio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {alumnosPrimaria.map((alumno) => {
                        // Determinar color según posición
                        let bgColor = "bg-white"
                        let textColor = "text-gray-900"
                        let icon = null

                        if (alumno.posicion === 1) {
                          bgColor = "bg-amber-50"
                          textColor = "text-amber-800"
                          icon = "🥇"
                        } else if (alumno.posicion === 2) {
                          bgColor = "bg-gray-50"
                          textColor = "text-gray-700"
                          icon = "🥈"
                        } else if (alumno.posicion === 3) {
                          bgColor = "bg-orange-50"
                          textColor = "text-orange-700"
                          icon = "🥉"
                        }

                        return (
                          <tr key={alumno.cod_moodle} className={bgColor}>
                            <td className="p-2 text-center">
                              <span className="text-lg">{icon}</span>
                            </td>
                            <td className={`p-2 font-medium ${textColor}`}>
                              {alumno.apellidos}, {alumno.nombres}
                            </td>
                            <td className="p-2">{alumno.curso_nombre || alumno.curso_corto}</td>
                            <td className="p-2 text-right font-bold">{alumno.promedio?.toFixed(2)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No hay datos disponibles para el nivel primaria
                </p>
              )}
            </div>

            {/* Sección Secundaria */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b pb-2">Nivel Secundaria</h3>
              {alumnosSecundaria.length > 0 ? (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full">
                    <thead className="bg-amber-400 text-black">
                      <tr>
                        <th className="p-2 text-left w-16">Posición</th>
                        <th className="p-2 text-left">Alumno</th>
                        <th className="p-2 text-left">Curso</th>
                        <th className="p-2 text-right w-24">Promedio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {alumnosSecundaria.map((alumno) => {
                        // Determinar color según posición
                        let bgColor = "bg-white"
                        let textColor = "text-gray-900"
                        let icon = null

                        if (alumno.posicion === 1) {
                          bgColor = "bg-amber-50"
                          textColor = "text-amber-800"
                          icon = "🥇"
                        } else if (alumno.posicion === 2) {
                          bgColor = "bg-gray-50"
                          textColor = "text-gray-700"
                          icon = "🥈"
                        } else if (alumno.posicion === 3) {
                          bgColor = "bg-orange-50"
                          textColor = "text-orange-700"
                          icon = "🥉"
                        }

                        return (
                          <tr key={alumno.cod_moodle} className={bgColor}>
                            <td className="p-2 text-center">
                              <span className="text-lg">{icon}</span>
                            </td>
                            <td className={`p-2 font-medium ${textColor}`}>
                              {alumno.apellidos}, {alumno.nombres}
                            </td>
                            <td className="p-2">{alumno.curso_nombre || alumno.curso_corto}</td>
                            <td className="p-2 text-right font-bold">{alumno.promedio?.toFixed(2)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No hay datos disponibles para el nivel secundaria
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RankingNivel
