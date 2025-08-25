"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Download, Printer, Loader2, Award } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { generarRankingTop3PDF } from "@/lib/pdf/index"
import type { Database } from "@/types/supabase"

// Tipos
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"] & {
  promedio?: number
  posicion?: number
  curso_nombre?: string
}

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]

interface RankingTop3Props {
  alumnosPorCurso?: Record<string, Alumno[]>
  cursos?: Curso[]
  selectedTrimestre?: string
}

export function RankingTop3({
  alumnosPorCurso: initialAlumnosPorCurso = {},
  cursos: initialCursos = [],
  selectedTrimestre = "FINAL",
}: RankingTop3Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [trimestre, setTrimestre] = useState(selectedTrimestre)
  const { toast } = useToast()
  const [alumnosPorCurso, setAlumnosPorCurso] = useState<Record<string, Alumno[]>>(initialAlumnosPorCurso)
  const [cursos, setCursos] = useState<Curso[]>(initialCursos)
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

      // Buscar específicamente al alumno 543 de 5AP para depuración
      const alumno543 = alumnosData.find((a) => a.cod_moodle === "543" && a.curso_corto === "5AP")
      if (alumno543) {
        debugOutput += `Alumno encontrado: ${alumno543.nombres} ${alumno543.apellidos} (${alumno543.cod_moodle}) - Curso: ${alumno543.curso_corto}\n`
      } else {
        debugOutput += "Alumno 543 de 5AP no encontrado en la lista de alumnos activos\n"
      }

      // Cargar todas las materias
      const { data: materiasData, error: materiasError } = await supabase.from("materias").select("codigo, curso_corto")

      if (materiasError) {
        throw new Error(`Error al cargar materias: ${materiasError.message}`)
      }

      if (!materiasData || materiasData.length === 0) {
        throw new Error("No hay materias registradas")
      }

      // Obtener códigos de materias para 5AP específicamente
      const materias5AP = materiasData.filter((m) => m.curso_corto === "5AP")
      const codigosMaterias5AP = materias5AP.map((m) => m.codigo)

      debugOutput += `Materias para 5AP: ${codigosMaterias5AP.length} materias encontradas\n`
      debugOutput += `Códigos de materias 5AP: ${codigosMaterias5AP.join(", ")}\n`

      // Obtener códigos de materias para todos los cursos
      const codigosMaterias = materiasData.map((m) => m.codigo)

      // Obtener códigos de alumnos
      const codigosAlumnos = alumnosData.map((a) => a.cod_moodle)

      // Cargar calificaciones específicas para el alumno 543 en el trimestre seleccionado
      if (alumno543) {
        const { data: calificacionesAlumno543 } = await supabase
          .from("calificaciones")
          .select("*")
          .in("materia_id", codigosMaterias5AP)
          .eq("alumno_id", "543")
          .eq("trimestre", Number.parseInt(trimestre))

        debugOutput += `Calificaciones del alumno 543 en trimestre ${trimestre}: ${calificacionesAlumno543?.length || 0} encontradas\n`

        if (calificacionesAlumno543 && calificacionesAlumno543.length > 0) {
          debugOutput += "Detalle de calificaciones:\n"
          calificacionesAlumno543.forEach((cal) => {
            debugOutput += `- Materia: ${cal.materia_id}, Nota: ${cal.nota}\n`
          })

          // Calcular promedio manualmente
          const suma = calificacionesAlumno543.reduce((sum, cal) => sum + Number(cal.nota || 0), 0)
          const promedio = calificacionesAlumno543.length > 0 ? suma / calificacionesAlumno543.length : 0

          debugOutput += `Suma total: ${suma}, Cantidad: ${calificacionesAlumno543.length}, Promedio calculado: ${promedio.toFixed(2)}\n`
        } else {
          debugOutput += "No se encontraron calificaciones para este alumno en el trimestre seleccionado\n"
        }
      }

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

      debugOutput += `Total de calificaciones cargadas para todos los alumnos: ${todasLasCalificaciones.length}\n`

      // Verificar si las calificaciones del alumno 543 están incluidas
      if (alumno543) {
        const calificaciones543 = todasLasCalificaciones.filter(
          (cal) => cal.alumno_id === "543" && cal.trimestre === Number.parseInt(trimestre),
        )
        debugOutput += `Calificaciones del alumno 543 en el conjunto total: ${calificaciones543.length}\n`
        if (calificaciones543.length > 0) {
          debugOutput += "Primeras 3 calificaciones encontradas:\n"
          calificaciones543.slice(0, 3).forEach((cal) => {
            debugOutput += `- Materia: ${cal.materia_id}, Nota: ${cal.nota}\n`
          })
        }
      }

      // Agrupar alumnos por curso
      const alumnosPorCursoObj: Record<string, Alumno[]> = {}

      // Inicializar el objeto con todos los cursos (incluso los que no tengan alumnos)
      cursosData.forEach((curso) => {
        alumnosPorCursoObj[curso.nombre_corto] = []
      })

      // Calcular promedio para cada alumno y añadir información del curso
      alumnosData.forEach((alumno) => {
        const curso = cursosData.find((c) => c.nombre_corto === alumno.curso_corto)
        if (!curso) return // Ignorar alumnos sin curso asignado

        // Depuración especial para el alumno 543
        const esAlumno543 = alumno.cod_moodle === "543" && alumno.curso_corto === "5AP"

        // Calcular promedio con depuración detallada para el alumno 543
        const promedio = calcularPromedioAlumno(alumno.cod_moodle, todasLasCalificaciones, esAlumno543)

        if (esAlumno543) {
          debugOutput += `Promedio final calculado para alumno 543: ${promedio}\n`
        }

        // Solo incluir alumnos con promedio > 0
        if (promedio > 0) {
          const alumnoConPromedio = {
            ...alumno,
            promedio,
            curso_nombre: curso.nombre_largo,
          }

          if (!alumnosPorCursoObj[curso.nombre_corto]) {
            alumnosPorCursoObj[curso.nombre_corto] = []
          }

          alumnosPorCursoObj[curso.nombre_corto].push(alumnoConPromedio)

          if (esAlumno543) {
            debugOutput += `Alumno 543 INCLUIDO en el ranking con promedio ${promedio}\n`
          }
        } else {
          if (esAlumno543) {
            debugOutput += `Alumno 543 NO INCLUIDO en el ranking porque su promedio es ${promedio}\n`
          }
        }
      })

      // Verificar específicamente el curso 5AP
      debugOutput += `Alumnos en 5AP después de filtrar: ${alumnosPorCursoObj["5AP"]?.length || 0}\n`
      if (alumnosPorCursoObj["5AP"] && alumnosPorCursoObj["5AP"].length > 0) {
        debugOutput += "Alumnos incluidos en 5AP:\n"
        alumnosPorCursoObj["5AP"].forEach((a) => {
          debugOutput += `- ${a.nombres} ${a.apellidos} (${a.cod_moodle}): ${a.promedio}\n`
        })
      }

      // Ordenar alumnos por promedio en cada curso y asignar posición
      Object.keys(alumnosPorCursoObj).forEach((cursoKey) => {
        // Ordenar por promedio (descendente)
        alumnosPorCursoObj[cursoKey].sort((a, b) => (b.promedio || 0) - (a.promedio || 0))

        // Asignar posición
        alumnosPorCursoObj[cursoKey] = alumnosPorCursoObj[cursoKey].map((alumno, index) => ({
          ...alumno,
          posicion: index + 1,
        }))

        // Tomar solo los 3 mejores
        alumnosPorCursoObj[cursoKey] = alumnosPorCursoObj[cursoKey].slice(0, 3)
      })

      // Actualizar el estado
      setAlumnosPorCurso(alumnosPorCursoObj)
      setCursos(cursosData)
      setDebugInfo(debugOutput)
    } catch (error) {
      console.error("Error al generar ranking Top 3:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el ranking Top 3.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para calcular el promedio de un alumno
  const calcularPromedioAlumno = (alumnoId: string, calificaciones: Calificacion[], debug = false): number => {
    // Filtrar calificaciones del alumno
    const notasAlumno = calificaciones.filter((cal) => cal.alumno_id === alumnoId)

    if (debug) {
      console.log(`DEBUG - Alumno ${alumnoId}: ${notasAlumno.length} calificaciones encontradas`)
    }

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

      if (debug) {
        console.log("Materias agrupadas:", materiaMap)
      }

      // Calcular promedio por materia
      const promediosPorMateria = Object.entries(materiaMap).map(([materiaId, notas]) => {
        const promMateria = notas.reduce((sum, nota) => sum + nota, 0) / notas.length
        if (debug) {
          console.log(`Materia ${materiaId}: ${notas.join(", ")} => Promedio: ${promMateria}`)
        }
        return promMateria
      })

      // Calcular promedio general
      if (promediosPorMateria.length === 0) return 0

      const promedioFinal =
        Math.round((promediosPorMateria.reduce((sum, prom) => sum + prom, 0) / promediosPorMateria.length) * 100) / 100

      if (debug) {
        console.log(`Promedios por materia: ${promediosPorMateria.join(", ")}`)
        console.log(`Promedio final: ${promedioFinal}`)
      }

      return promedioFinal
    } else {
      // Para un trimestre específico, calcular el promedio directo
      // Verificar si hay notas nulas o indefinidas
      const notasValidas = notasAlumno.filter((cal) => cal.nota !== null && cal.nota !== undefined)

      if (debug) {
        console.log(`Notas válidas: ${notasValidas.length} de ${notasAlumno.length}`)
      }

      if (notasValidas.length === 0) return 0

      // Convertir explícitamente a número para evitar problemas con strings
      const notasNumericas = notasValidas.map((cal) => Number(cal.nota))

      if (debug) {
        console.log("Notas numéricas:", notasNumericas)
      }

      const suma = notasNumericas.reduce((sum, nota) => sum + nota, 0)
      const promedio = Math.round((suma / notasNumericas.length) * 100) / 100

      if (debug) {
        console.log(`Suma: ${suma}, Cantidad: ${notasNumericas.length}, Promedio: ${promedio}`)
      }

      return promedio
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
      const doc = await generarRankingTop3PDF(
        alumnosPorCurso,
        cursos,
        configData.nombre_institucion,
        configData.logo_url,
        trimestreTexto,
      )

      // Guardar PDF
      doc.save(`Ranking_Top3_${trimestreTexto.replace(/\s+/g, "_")}.pdf`)

      toast({
        title: "PDF generado",
        description: "El ranking Top 3 se ha exportado correctamente.",
      })
    } catch (error) {
      console.error("Error al generar PDF:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF del ranking Top 3.",
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

  // Agrupar cursos por nivel
  const cursosPorNivel: Record<string, Curso[]> = {}
  cursos.forEach((curso) => {
    if (!cursosPorNivel[curso.nivel]) {
      cursosPorNivel[curso.nivel] = []
    }
    cursosPorNivel[curso.nivel].push(curso)
  })

  // Ordenar niveles: Inicial, Primaria, Secundaria
  const nivelesOrdenados = Object.keys(cursosPorNivel).sort((a, b) => {
    const nivelOrden: Record<string, number> = {
      Inicial: 1,
      Primaria: 2,
      Secundaria: 3,
    }
    return (nivelOrden[a] || 99) - (nivelOrden[b] || 99)
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top 3 Mejores Alumnos por Curso</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={imprimir} className="print:hidden">
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <Button
              size="sm"
              onClick={exportarPDF}
              disabled={isGeneratingPDF || Object.keys(alumnosPorCurso).length === 0}
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
                    <Award className="mr-2 h-4 w-4" /> Generar Ranking Top 3
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Información de depuración */}
          {debugInfo && (
            <Card className="bg-gray-50 p-4 print:hidden">
              <CardHeader className="p-2">
                <CardTitle className="text-sm">Información de depuración (Alumno 543 de 5AP)</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-60">{debugInfo}</pre>
              </CardContent>
            </Card>
          )}

          {/* Título para impresión */}
          <div className="hidden print:block mb-6">
            <h2 className="text-2xl font-bold text-center">Ranking de los 3 Mejores Alumnos por Curso</h2>
            <h3 className="text-xl font-semibold text-center">Periodo: {trimestreTexto}</h3>
            <p className="text-center text-sm mt-2">Fecha de generación: {new Date().toLocaleDateString("es-ES")}</p>
          </div>

          {/* Mostrar resultados */}
          {Object.keys(alumnosPorCurso).length > 0 ? (
            <div className="space-y-8">
              {nivelesOrdenados.map((nivel) => (
                <div key={nivel} className="space-y-4">
                  <h3 className="text-lg font-bold border-b pb-2">Nivel {nivel}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cursosPorNivel[nivel].map((curso) => {
                      const alumnos = alumnosPorCurso[curso.nombre_corto] || []
                      return (
                        <Card key={curso.nombre_corto} className="overflow-hidden">
                          <CardHeader className="bg-muted py-2">
                            <CardTitle className="text-sm md:text-base">{curso.nombre_largo}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0">
                            {alumnos.length > 0 ? (
                              <div className="divide-y">
                                {alumnos.map((alumno) => {
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
                                    <div
                                      key={alumno.cod_moodle}
                                      className={`flex items-center justify-between p-3 ${bgColor}`}
                                    >
                                      <div className="flex items-center">
                                        <span className="text-lg mr-2">{icon}</span>
                                        <div>
                                          <p className={`font-medium ${textColor}`}>
                                            {alumno.apellidos}, {alumno.nombres}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-bold text-lg">{alumno.promedio?.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="p-4 text-center text-muted-foreground">
                                No hay datos suficientes para este curso
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Seleccione un trimestre y haga clic en "Generar Ranking Top 3" para ver los resultados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RankingTop3
