"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getConfiguracion } from "@/lib/config"
import { supabase } from "@/lib/supabase"
import { generarHermanosListaPDF } from "@/lib/pdf/hermanos-lista-pdf"
import { normalizarTexto } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { Database } from "@/types/supabase"

type Alumno = Database["public"]["Tables"]["alumnos"]["Row"] & {
  promedio?: number
  curso_nombre?: string
}

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]

interface GrupoHermanos {
  apellidoNormalizado: string
  apellidoOriginal: string
  hermanos: Alumno[]
}

// Función para calcular el promedio de un alumno
function calcularPromedioAlumno(calificacionesAlumno: Calificacion[], trimestre: string, debug = false): number {
  if (calificacionesAlumno.length === 0) return 0

  // Si es un trimestre específico
  if (trimestre !== "FINAL") {
    // Agrupar por materia
    const materiasMap: Record<string, number[]> = {}

    calificacionesAlumno.forEach((cal) => {
      if (!cal.materia_id || cal.nota === null) return

      if (!materiasMap[cal.materia_id]) {
        materiasMap[cal.materia_id] = []
      }

      materiasMap[cal.materia_id].push(cal.nota)
    })

    if (debug) {
      console.log(`Materias con calificaciones: ${Object.keys(materiasMap).length}`)
      console.log("Detalle de materias:", Object.keys(materiasMap))
    }

    // Calcular promedio por materia
    const promediosPorMateria: number[] = []

    Object.entries(materiasMap).forEach(([materiaId, notas]) => {
      if (notas.length === 0) return

      const suma = notas.reduce((acc, nota) => acc + nota, 0)
      const promedio = suma / notas.length
      promediosPorMateria.push(promedio)

      if (debug) {
        console.log(`Materia ${materiaId}: Notas=${notas.join(", ")}, Promedio=${promedio.toFixed(2)}`)
      }
    })

    // Calcular promedio general
    if (promediosPorMateria.length === 0) return 0

    const sumaPromedios = promediosPorMateria.reduce((acc, prom) => acc + prom, 0)
    const promedioFinal = Math.round((sumaPromedios / promediosPorMateria.length) * 100) / 100

    if (debug) {
      console.log(`Suma de promedios: ${sumaPromedios.toFixed(2)}`)
      console.log(`Cantidad de materias: ${promediosPorMateria.length}`)
      console.log(`PROMEDIO FINAL: ${promedioFinal.toFixed(2)}`)
    }

    return promedioFinal
  }

  // Para el promedio anual
  // Primero agrupamos por materia y trimestre
  const materiasConCalificacion = new Set<string>()

  // Identificar materias con calificaciones
  calificacionesAlumno.forEach((cal) => {
    if (cal.materia_id) materiasConCalificacion.add(cal.materia_id)
  })

  // Para cada materia, calcular el promedio anual
  const promediosPorMateria: number[] = []

  materiasConCalificacion.forEach((materiaId) => {
    const calificacionesMateria = calificacionesAlumno.filter((c) => c.materia_id === materiaId)

    // Agrupar por trimestre
    const promediosPorTrimestre: Record<number, { suma: number; cantidad: number }> = {
      1: { suma: 0, cantidad: 0 },
      2: { suma: 0, cantidad: 0 },
      3: { suma: 0, cantidad: 0 },
    }

    calificacionesMateria.forEach((cal) => {
      if (cal.trimestre && cal.nota !== null) {
        promediosPorTrimestre[cal.trimestre].suma += cal.nota
        promediosPorTrimestre[cal.trimestre].cantidad += 1
      }
    })

    // Calcular promedio por trimestre
    const promediosTrimestre: number[] = []

    Object.entries(promediosPorTrimestre).forEach(([trimestre, { suma, cantidad }]) => {
      if (cantidad > 0) {
        const promedio = suma / cantidad
        promediosTrimestre.push(promedio)
      }
    })

    // Calcular promedio anual de la materia
    if (promediosTrimestre.length > 0) {
      const sumaPromediosTrimestre = promediosTrimestre.reduce((acc, prom) => acc + prom, 0)
      const promedioAnualMateria = sumaPromediosTrimestre / promediosTrimestre.length
      promediosPorMateria.push(promedioAnualMateria)
    }
  })

  // Calcular promedio general anual
  if (promediosPorMateria.length === 0) return 0

  const sumaPromediosAnuales = promediosPorMateria.reduce((acc, prom) => acc + prom, 0)
  const promedioFinal = Math.round((sumaPromediosAnuales / promediosPorMateria.length) * 100) / 100

  return promedioFinal
}

export function HermanosLista() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [nombreInstitucion, setNombreInstitucion] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [gruposHermanos, setGruposHermanos] = useState<GrupoHermanos[]>([])
  const [cursos, setCursos] = useState<Record<string, Curso>>({})
  const [selectedTrimestre, setSelectedTrimestre] = useState("FINAL")

  // Cargar datos iniciales y encontrar hermanos
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      setIsLoading(true)
      try {
        // Cargar configuración
        const config = await getConfiguracion()
        setNombreInstitucion(config.nombre_institucion)
        setLogoUrl(config.logo_url)

        // Cargar todos los alumnos activos
        const { data: alumnos, error: alumnosError } = await supabase
          .from("alumnos")
          .select("*")
          .eq("activo", true)
          .order("apellidos")

        if (alumnosError) {
          throw new Error(`Error al cargar alumnos: ${alumnosError.message}`)
        }

        if (!alumnos || alumnos.length === 0) {
          throw new Error("No hay alumnos activos registrados")
        }

        // Cargar todos los cursos
        const { data: cursosData, error: cursosError } = await supabase.from("cursos").select("*")

        if (cursosError) {
          throw new Error(`Error al cargar cursos: ${cursosError.message}`)
        }

        // Crear un mapa de cursos para acceso rápido
        const cursosMap: Record<string, Curso> = {}
        cursosData?.forEach((curso) => {
          cursosMap[curso.nombre_corto] = curso
        })
        setCursos(cursosMap)

        // PASO 1: Agrupar alumnos por apellido normalizado
        const gruposPorApellido: Record<string, Alumno[]> = {}

        alumnos.forEach((alumno) => {
          if (!alumno.apellidos) return

          // Normalizar apellido para comparación
          const apellidoNormalizado = normalizarTexto(alumno.apellidos)

          if (!gruposPorApellido[apellidoNormalizado]) {
            gruposPorApellido[apellidoNormalizado] = []
          }

          // Añadir curso_nombre al alumno
          const alumnoConCurso = {
            ...alumno,
            curso_nombre: cursosMap[alumno.curso_corto]?.nombre_largo || alumno.curso_corto,
          }

          gruposPorApellido[apellidoNormalizado].push(alumnoConCurso)
        })

        // PASO 1: Filtrar grupos con 3 o más hermanos
        const gruposConTresOMasHermanos: GrupoHermanos[] = []
        const alumnosHermanos: Alumno[] = []

        Object.entries(gruposPorApellido).forEach(([apellidoNormalizado, hermanos]) => {
          if (hermanos.length >= 3) {
            gruposConTresOMasHermanos.push({
              apellidoNormalizado,
              apellidoOriginal: hermanos[0].apellidos || "",
              hermanos,
            })
            // Añadir estos alumnos a la lista de hermanos
            alumnosHermanos.push(...hermanos)
          }
        })

        // Si no hay grupos con 3 o más hermanos, terminar
        if (gruposConTresOMasHermanos.length === 0) {
          setGruposHermanos([])
          setIsLoading(false)
          return
        }

        // PASO 2: Obtener los IDs de los alumnos que son hermanos
        const idsAlumnosHermanos = alumnosHermanos.map((a) => a.cod_moodle)
        console.log(`Encontrados ${idsAlumnosHermanos.length} alumnos con 3 o más hermanos`)

        // Guardar los grupos temporalmente (sin promedios)
        setGruposHermanos(gruposConTresOMasHermanos)
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "No se pudieron cargar los datos iniciales.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    cargarDatosIniciales()
  }, [toast])

  // Cargar calificaciones y calcular promedios cuando cambia el trimestre
  useEffect(() => {
    const cargarCalificacionesYCalcularPromedios = async () => {
      if (gruposHermanos.length === 0) return

      setIsLoading(true)

      try {
        // PASO 2: Obtener todos los alumnos que son hermanos
        const todosLosHermanos: Alumno[] = []
        gruposHermanos.forEach((grupo) => {
          todosLosHermanos.push(...grupo.hermanos)
        })

        // Obtener los IDs de los alumnos
        const idsAlumnos = todosLosHermanos.map((a) => a.cod_moodle)

        // PASO 2: Cargar calificaciones solo para estos alumnos
        let calificacionesFiltradas: Calificacion[] = []

        if (selectedTrimestre === "FINAL") {
          // Para el promedio anual, necesitamos todas las calificaciones (posiblemente más de 1000)
          const pageSize = 1000;
          let page = 0;
          let allCalificaciones: Calificacion[] = [];

          while (true) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data: calificaciones, error: calificacionesError } = await supabase
              .from("calificaciones")
              .select("*")
              .in("alumno_id", idsAlumnos)
              .range(from, to);

            if (calificacionesError) {
              throw new Error(`Error al cargar calificaciones: ${calificacionesError.message}`);
            }

            if (calificaciones && calificaciones.length > 0) {
              allCalificaciones = allCalificaciones.concat(calificaciones);
            }

            if (!calificaciones || calificaciones.length < pageSize) {
              break; // última página
            }

            page++;
          }

          calificacionesFiltradas = allCalificaciones;
        } else {
          // Para un trimestre específico, filtramos por trimestre
          const trimestreNum = Number.parseInt(selectedTrimestre)
          const { data: calificaciones, error: calificacionesError } = await supabase
            .from("calificaciones")
            .select("*")
            .in("alumno_id", idsAlumnos)
            .eq("trimestre", trimestreNum)

          if (calificacionesError) {
            throw new Error(`Error al cargar calificaciones: ${calificacionesError.message}`)
          }

          calificacionesFiltradas = calificaciones || []
        }

        console.log(`Cargadas ${calificacionesFiltradas.length} calificaciones para ${idsAlumnos.length} alumnos`)

        // Verificar calificaciones para Luciana (debug)
        const lucianaId = todosLosHermanos.find(
          (a) => a.nombres?.includes("Luciana") && a.apellidos?.includes("Asturizaga"),
        )?.cod_moodle

        if (lucianaId) {
          const calificacionesLuciana = calificacionesFiltradas.filter((c) => c.alumno_id === lucianaId)
          console.log(`Calificaciones de Luciana: ${calificacionesLuciana.length}`)

          // Contar materias distintas
          const materiasLuciana = new Set(calificacionesLuciana.map((c) => c.materia_id))
          console.log(`Materias distintas de Luciana: ${materiasLuciana.size}`)
          console.log("Materias:", Array.from(materiasLuciana))

          if (selectedTrimestre !== "FINAL") {
            // Calcular promedio para debug
            const promedio = calcularPromedioAlumno(calificacionesLuciana, selectedTrimestre, true)
            console.log(`Promedio calculado para Luciana: ${promedio.toFixed(2)}`)
          }
        }

        // PASO 3: Calcular promedios para cada alumno
        const gruposActualizados = gruposHermanos.map((grupo) => {
          const hermanosConPromedio = grupo.hermanos.map((alumno) => {
            // Obtener calificaciones del alumno
            const calificacionesAlumno = calificacionesFiltradas.filter((c) => c.alumno_id === alumno.cod_moodle)

            // Calcular promedio
            const promedio = calcularPromedioAlumno(
              calificacionesAlumno,
              selectedTrimestre,
              alumno.nombres?.includes("Luciana") && alumno.apellidos?.includes("Asturizaga"),
            )

            return {
              ...alumno,
              promedio,
            }
          })

          return {
            ...grupo,
            hermanos: hermanosConPromedio,
          }
        })

        setGruposHermanos(gruposActualizados)
      } catch (error) {
        console.error("Error al cargar calificaciones y calcular promedios:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las calificaciones o calcular los promedios.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    cargarCalificacionesYCalcularPromedios()
  }, [gruposHermanos.length, selectedTrimestre, toast])

  // Exportar a PDF
  const exportarPDF = async () => {
    setIsExporting(true)

    try {
      // Obtener texto del trimestre para el título
      let trimestreTexto = "Promedio Anual"
      if (selectedTrimestre === "1") trimestreTexto = "Primer Trimestre"
      if (selectedTrimestre === "2") trimestreTexto = "Segundo Trimestre"
      if (selectedTrimestre === "3") trimestreTexto = "Tercer Trimestre"

      const doc = await generarHermanosListaPDF(gruposHermanos, nombreInstitucion, logoUrl, trimestreTexto)

      // Guardar PDF
      doc.save(`Alumnos_con_3_o_mas_hermanos_${trimestreTexto.replace(" ", "_")}.pdf`)

      toast({
        title: "PDF generado",
        description: "La lista de hermanos se ha exportado correctamente.",
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

  return (
    <Card className="print:shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 print:hidden">
        <CardTitle>Alumnos con 3 o más hermanos</CardTitle>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="trimestre" className="text-sm font-medium">
              Trimestre:
            </Label>
            <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre} disabled={isLoading}>
              <SelectTrigger className="w-[180px]">
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
          <Button size="sm" onClick={exportarPDF} disabled={isExporting || isLoading}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : gruposHermanos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron alumnos con 3 o más hermanos.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {gruposHermanos.map((grupo) => (
              <div key={grupo.apellidoNormalizado} className="space-y-2">
                <h3 className="text-lg font-semibold">Familia {grupo.apellidoOriginal}</h3>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        <TableHead>Nombres</TableHead>
                        <TableHead>Apellidos</TableHead>
                        <TableHead>Curso</TableHead>
                        <TableHead className="text-center">
                          {selectedTrimestre === "FINAL"
                            ? "Promedio Anual"
                            : `Promedio ${selectedTrimestre}° Trimestre`}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grupo.hermanos.map((alumno, index) => (
                        <TableRow key={alumno.cod_moodle}>
                          <TableCell className="text-center">{index + 1}</TableCell>
                          <TableCell>{alumno.nombres}</TableCell>
                          <TableCell>{alumno.apellidos}</TableCell>
                          <TableCell>{alumno.curso_nombre}</TableCell>
                          <TableCell className="text-center">
                            {alumno.promedio && alumno.promedio > 0 ? alumno.promedio.toFixed(2) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
