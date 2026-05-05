"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { CentralizadorInterno } from "@/components/reportes/centralizador-interno"
import { CentralizadorMinedu } from "@/components/reportes/centralizador-minedu"
import { BoletinNotas } from "@/components/reportes/boletin-notas"
import { RankingAlumnos } from "@/components/reportes/ranking-alumnos"
import { RankingTop3 } from "@/components/reportes/ranking-top3"
import { RankingNivel } from "@/components/reportes/ranking-nivel"
import { HermanosLista } from "@/components/reportes/hermanos-lista"
import { generarTodosBoletinesPDF } from "@/lib/pdf/boletines-pdf"
import type { Database } from "@/types/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"] & {
  promedio?: number
  posicion?: number
  curso_nombre?: string
}
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]
type Agrupacion = Database["public"]["Tables"]["agrupaciones_materias"]["Row"]
type AreaMateria = Database["public"]["Tables"]["areas"]["Row"]

export default function ReportesPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [agrupaciones, setAgrupaciones] = useState<Agrupacion[]>([])
  const [areas, setAreas] = useState<AreaMateria[]>([])
  const [calificaciones, setCalificaciones] = useState<{
    trimestre1: Calificacion[]
    trimestre2: Calificacion[]
    trimestre3: Calificacion[]
  }>({
    trimestre1: [],
    trimestre2: [],
    trimestre3: [],
  })

  const [selectedCurso, setSelectedCurso] = useState("")
  const [selectedAlumno, setSelectedAlumno] = useState("")
  const [selectedTrimestre, setSelectedTrimestre] = useState("1")
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingAllBoletines, setIsGeneratingAllBoletines] = useState(false)
  const [showCentralizador, setShowCentralizador] = useState(false)
  const [showCentralizadorMinedu, setShowCentralizadorMinedu] = useState(false)
  const [showBoletin, setShowBoletin] = useState(false)
  const [showRanking, setShowRanking] = useState(false)
  const [isLoadingRanking, setIsLoadingRanking] = useState(false)
  const [todosLosAlumnos, setTodosLosAlumnos] = useState<Alumno[]>([])

  // Estado para el ranking Top 3
  const [showRankingTop3, setShowRankingTop3] = useState(false)
  const [isLoadingRankingTop3, setIsLoadingRankingTop3] = useState(false)
  const [alumnosPorCurso, setAlumnosPorCurso] = useState<Record<string, Alumno[]>>({})

  // Estado para el ranking por nivel - SIMPLIFICADO
  const [showRankingNivel, setShowRankingNivel] = useState(false)
  const [isLoadingRankingNivel, setIsLoadingRankingNivel] = useState(false)
  const [alumnosPrimaria, setAlumnosPrimaria] = useState<Alumno[]>([])
  const [alumnosSecundaria, setAlumnosSecundaria] = useState<Alumno[]>([])

  const { toast } = useToast()

  // Cargar cursos
  useEffect(() => {
    const fetchCursos = async () => {
      const { data } = await supabase.from("cursos").select("*").order("nombre_corto")
      if (data) setCursos(data)
    }
    fetchCursos()
  }, [])

  // Cargar áreas de materias - Corregido para usar la tabla "areas"
  useEffect(() => {
    const fetchAreas = async () => {
      const { data, error } = await supabase.from("areas").select("*")
      if (error) {
        console.error("Error al cargar áreas:", error)
      } else if (data) {
        setAreas(data)
      }
    }
    fetchAreas()
  }, [])

  // Cargar alumnos cuando se selecciona un curso
  useEffect(() => {
    const fetchAlumnos = async () => {
      if (!selectedCurso) {
        setAlumnos([])
        return
      }

      const { data } = await supabase
        .from("alumnos")
        .select("*")
        .eq("curso_corto", selectedCurso)
        .eq("activo", true)
        .order("apellidos")

      if (data) setAlumnos(data)
    }

    fetchAlumnos()
  }, [selectedCurso])

  // Función para calcular el promedio de un alumno
  const calcularPromedioAlumno = (alumnoId: string, calificacionesRelevantes: Calificacion[]): number => {
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
        Math.round((promediosPorMateria.reduce((sum, prom) => sum + prom, 0) / promediosPorMateria.length) * 100) / 100
      )
    } else {
      // Para un trimestre específico, calcular el promedio directo
      const suma = notasAlumno.reduce((sum, cal) => sum + (cal.nota || 0), 0)
      return Math.round((suma / notasAlumno.length) * 100) / 100
    }
  }

  // Función para generar el ranking Top 3 por curso
  const handleGenerarRankingTop3 = async () => {
    setIsLoadingRankingTop3(true)
    setShowRankingTop3(false)
    setShowRanking(false)
    setShowCentralizador(false)
    setShowCentralizadorMinedu(false)
    setShowBoletin(false)
    setShowRankingNivel(false)

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

      // Cargar todas las materias
      const { data: materiasData, error: materiasError } = await supabase.from("materias").select("codigo, curso_corto")

      if (materiasError) {
        throw new Error(`Error al cargar materias: ${materiasError.message}`)
      }

      if (!materiasData || materiasData.length === 0) {
        throw new Error("No hay materias registradas")
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

        if (selectedTrimestre === "FINAL") {
          // Para el promedio final, cargar los tres trimestres
          for (let t = 1; t <= 3; t++) {
            const { data: calificacionesTrimestre } = await supabase
              .from("calificaciones")
              .select("*")
              .in("materia_id", materiasCurso)
              .in("alumno_id", alumnosDelCurso)
              .eq("trimestre", t)
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
            .eq("trimestre", Number.parseInt(selectedTrimestre))
            .limit(5000)

          if (calificacionesTrimestre) {
            todasLasCalificaciones = [...todasLasCalificaciones, ...calificacionesTrimestre]
          }
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

        const promedio = calcularPromedioAlumno(alumno.cod_moodle, todasLasCalificaciones)

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
        }
      })

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
      setShowRankingTop3(true)
    } catch (error) {
      console.error("Error al generar ranking Top 3:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el ranking Top 3.",
      })
    } finally {
      setIsLoadingRankingTop3(false)
    }
  }

  // Función para generar el ranking por nivel - COMPLETAMENTE NUEVA
  const handleGenerarRankingNivel = async () => {
    setIsLoadingRankingNivel(true)
    setShowRankingNivel(false)
    setShowRankingTop3(false)
    setShowRanking(false)
    setShowCentralizador(false)
    setShowCentralizadorMinedu(false)
    setShowBoletin(false)

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

      // Cargar todas las materias
      const { data: materiasData, error: materiasError } = await supabase.from("materias").select("codigo, curso_corto")

      if (materiasError) {
        throw new Error(`Error al cargar materias: ${materiasError.message}`)
      }

      if (!materiasData || materiasData.length === 0) {
        throw new Error("No hay materias registradas")
      }

      // Cargar calificaciones por curso
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

        if (selectedTrimestre === "FINAL") {
          // Para el promedio final, cargar los tres trimestres
          for (let t = 1; t <= 3; t++) {
            const { data: calificacionesTrimestre } = await supabase
              .from("calificaciones")
              .select("*")
              .in("materia_id", materiasCurso)
              .in("alumno_id", alumnosDelCurso)
              .eq("trimestre", t)
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
            .eq("trimestre", Number.parseInt(selectedTrimestre))
            .limit(5000)

          if (calificacionesTrimestre) {
            todasLasCalificaciones = [...todasLasCalificaciones, ...calificacionesTrimestre]
          }
        }
      }

      // Obtener el mejor alumno de cada curso
      const mejoresAlumnosPorCurso: Record<string, Alumno> = {}

      // Procesar cada alumno
      alumnosData.forEach((alumno) => {
        const curso = cursosData.find((c) => c.nombre_corto === alumno.curso_corto)
        if (!curso) return // Ignorar alumnos sin curso asignado

        // Calcular promedio usando la función del componente padre
        const promedio = calcularPromedioAlumnoNivel(alumno.cod_moodle, todasLasCalificaciones, selectedTrimestre)

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
      setShowRankingNivel(true)
    } catch (error) {
      console.error("Error al generar ranking por nivel:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el ranking por nivel.",
      })
    } finally {
      setIsLoadingRankingNivel(false)
    }
  }

  // Función para calcular el promedio de un alumno para ranking por nivel
  const calcularPromedioAlumnoNivel = (alumnoId: string, calificaciones: Calificacion[], trimestre: string): number => {
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

  // Función para generar el ranking de alumnos
  const handleGenerarRanking = async () => {
    if (!selectedCurso) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Seleccione un curso para generar el ranking.",
      })
      return
    }

    setIsLoadingRanking(true)
    setShowRanking(false)
    setShowRankingTop3(false)
    setShowCentralizador(false)
    setShowCentralizadorMinedu(false)
    setShowBoletin(false)
    setShowRankingNivel(false)

    try {
      let alumnosData: Alumno[] = []

      if (selectedCurso === "TODOS") {
        // Cargar todos los alumnos activos
        const { data } = await supabase.from("alumnos").select("*").eq("activo", true).order("apellidos")

        if (data) {
          alumnosData = data
        }
      } else {
        // Cargar alumnos del curso seleccionado
        const { data } = await supabase
          .from("alumnos")
          .select("*")
          .eq("curso_corto", selectedCurso)
          .eq("activo", true)
          .order("apellidos")

        if (data) {
          alumnosData = data
        }
      }

      setTodosLosAlumnos(alumnosData)

      // Cargar todas las materias
      const { data: materiasData } = await supabase.from("materias").select("codigo, curso_corto")

      if (!materiasData || materiasData.length === 0) {
        throw new Error("No hay materias registradas")
      }

      // Obtener códigos de materias
      const codigosMaterias = materiasData.map((m) => m.codigo)

      // Obtener códigos de alumnos
      const codigosAlumnos = alumnosData.map((a) => a.cod_moodle)

      if (codigosAlumnos.length === 0) {
        throw new Error("No hay alumnos para mostrar")
      }

      // Cargar calificaciones del primer trimestre
      const { data: calificacionesT1 } = await supabase
        .from("calificaciones")
        .select("*")
        .in("materia_id", codigosMaterias)
        .in("alumno_id", codigosAlumnos)
        .eq("trimestre", 1)

      // Cargar calificaciones del segundo trimestre
      const { data: calificacionesT2 } = await supabase
        .from("calificaciones")
        .select("*")
        .in("materia_id", codigosMaterias)
        .in("alumno_id", codigosAlumnos)
        .eq("trimestre", 2)

      // Cargar calificaciones del tercer trimestre
      const { data: calificacionesT3 } = await supabase
        .from("calificaciones")
        .select("*")
        .in("materia_id", codigosMaterias)
        .in("alumno_id", codigosAlumnos)
        .eq("trimestre", 3)

      setCalificaciones({
        trimestre1: calificacionesT1 || [],
        trimestre2: calificacionesT2 || [],
        trimestre3: calificacionesT3 || [],
      })

      setShowRanking(true)
    } catch (error) {
      console.error("Error al cargar datos para el ranking:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos para el ranking.",
      })
    } finally {
      setIsLoadingRanking(false)
    }
  }

  // Función para generar el centralizador interno
  const handleGenerarCentralizador = async () => {
    if (!selectedCurso) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Seleccione un curso para generar el centralizador.",
      })
      return
    }

    setIsLoading(true)
    setShowCentralizador(false)
    setShowCentralizadorMinedu(false)
    setShowBoletin(false)
    setShowRanking(false)
    setShowRankingTop3(false)
    setShowRankingNivel(false)

    try {
      // Cargar materias del curso
      const { data: materiasData } = await supabase
        .from("materias")
        .select("*")
        .eq("curso_corto", selectedCurso)
        .order("nombre_largo")

      if (materiasData) {
        setMaterias(materiasData)
      }

      // Cargar calificaciones
      if (materiasData && materiasData.length > 0) {
        const codigosMaterias = materiasData.map((m) => m.codigo)

        const { data: calificacionesData } = await supabase
          .from("calificaciones")
          .select("*")
          .in("materia_id", codigosMaterias)
          .eq("trimestre", Number.parseInt(selectedTrimestre))

        if (calificacionesData) {
          setCalificaciones({
            ...calificaciones,
            trimestre1: selectedTrimestre === "1" ? calificacionesData : calificaciones.trimestre1,
            trimestre2: selectedTrimestre === "2" ? calificacionesData : calificaciones.trimestre2,
            trimestre3: selectedTrimestre === "3" ? calificacionesData : calificaciones.trimestre3,
          })
        }
      }

      setShowCentralizador(true)
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos para el centralizador.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para generar el centralizador MINEDU
  const handleGenerarCentralizadorMinedu = async () => {
    if (!selectedCurso) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Seleccione un curso para generar el centralizador MINEDU.",
      })
      return
    }

    // Verificar si el curso es de nivel primario o secundario
    const cursoSeleccionado = cursos.find((c) => c.nombre_corto === selectedCurso)
    if (cursoSeleccionado?.nivel !== "Secundaria" && cursoSeleccionado?.nivel !== "Primaria") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El centralizador MINEDU solo está disponible para cursos de nivel primario y secundario.",
      })
      return
    }

    setIsLoading(true)
    setShowCentralizador(false)
    setShowCentralizadorMinedu(false)
    setShowBoletin(false)
    setShowRanking(false)
    setShowRankingTop3(false)
    setShowRankingNivel(false)

    try {
      // Cargar materias del curso
      const { data: materiasData } = await supabase
        .from("materias")
        .select("*")
        .eq("curso_corto", selectedCurso)
        .order("nombre_largo")

      if (materiasData) {
        setMaterias(materiasData)
      }

      // Cargar agrupaciones para el curso seleccionado
      const { data: agrupacionesData } = await supabase
        .from("agrupaciones_materias")
        .select("*")
        .eq("curso_corto", selectedCurso)

      if (agrupacionesData) {
        setAgrupaciones(agrupacionesData)
      }

      // Cargar calificaciones
      if (materiasData && materiasData.length > 0) {
        const codigosMaterias = materiasData.map((m) => m.codigo)

        const { data: calificacionesData } = await supabase
          .from("calificaciones")
          .select("*")
          .in("materia_id", codigosMaterias)
          .eq("trimestre", Number.parseInt(selectedTrimestre))

        if (calificacionesData) {
          setCalificaciones({
            ...calificaciones,
            trimestre1: selectedTrimestre === "1" ? calificacionesData : calificaciones.trimestre1,
            trimestre2: selectedTrimestre === "2" ? calificacionesData : calificaciones.trimestre2,
            trimestre3: selectedTrimestre === "3" ? calificacionesData : calificaciones.trimestre3,
          })
        }
      }

      setShowCentralizadorMinedu(true)
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos para el centralizador MINEDU.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para generar el boletín de notas
  const handleGenerarBoletin = async () => {
    if (!selectedCurso || !selectedAlumno) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Seleccione un curso y un alumno para generar el boletín.",
      })
      return
    }

    setIsLoading(true)
    setShowCentralizador(false)
    setShowCentralizadorMinedu(false)
    setShowBoletin(false)
    setShowRanking(false)
    setShowRankingTop3(false)
    setShowRankingNivel(false)

    try {
      // Cargar materias del curso
      const { data: materiasData } = await supabase
        .from("materias")
        .select("*")
        .eq("curso_corto", selectedCurso)
        .order("orden", { ascending: true, nullsLast: true })

      if (materiasData) {
        setMaterias(materiasData)
      } else {
        setMaterias([])
      }

      // Cargar calificaciones de los tres trimestres
      const { data: materiasSimples } = await supabase
        .from("materias")
        .select("codigo")
        .eq("curso_corto", selectedCurso)

      if (materiasSimples && materiasSimples.length > 0) {
        const codigosMaterias = materiasSimples.map((m) => m.codigo)

        // Cargar calificaciones del primer trimestre
        const { data: calificacionesT1 } = await supabase
          .from("calificaciones")
          .select("*")
          .in("materia_id", codigosMaterias)
          .eq("trimestre", 1)
          .eq("alumno_id", selectedAlumno)

        // Cargar calificaciones del segundo trimestre
        const { data: calificacionesT2 } = await supabase
          .from("calificaciones")
          .select("*")
          .in("materia_id", codigosMaterias)
          .eq("trimestre", 2)
          .eq("alumno_id", selectedAlumno)

        // Cargar calificaciones del tercer trimestre
        const { data: calificacionesT3 } = await supabase
          .from("calificaciones")
          .select("*")
          .in("materia_id", codigosMaterias)
          .eq("trimestre", 3)
          .eq("alumno_id", selectedAlumno)

        setCalificaciones({
          trimestre1: calificacionesT1 || [],
          trimestre2: calificacionesT2 || [],
          trimestre3: calificacionesT3 || [],
        })
      }

      setShowBoletin(true)
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos para el boletín.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para generar todos los boletines del curso
  const handleGenerarTodosBoletines = async () => {
    if (!selectedCurso || alumnos.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Seleccione un curso con alumnos para generar todos los boletines.",
      })
      return
    }

    setIsGeneratingAllBoletines(true)

    try {
      // Cargar materias del curso
      const { data: materiasData } = await supabase
        .from("materias")
        .select("*")
        .eq("curso_corto", selectedCurso)
        .order("orden", { ascending: true, nullsLast: true })

      if (!materiasData || materiasData.length === 0) {
        throw new Error("No hay materias para este curso")
      }

      // Cargar calificaciones de todos los alumnos para los tres trimestres
      const codigosMaterias = materiasData.map((m) => m.codigo)
      const codigosAlumnos = alumnos.map((a) => a.cod_moodle)

      // Cargar calificaciones del primer trimestre para todos los alumnos
      const { data: calificacionesT1 } = await supabase
        .from("calificaciones")
        .select("*")
        .in("materia_id", codigosMaterias)
        .in("alumno_id", codigosAlumnos)
        .eq("trimestre", 1)

      // Cargar calificaciones del segundo trimestre para todos los alumnos
      const { data: calificacionesT2 } = await supabase
        .from("calificaciones")
        .select("*")
        .in("materia_id", codigosMaterias)
        .in("alumno_id", codigosAlumnos)
        .eq("trimestre", 2)

      // Cargar calificaciones del tercer trimestre para todos los alumnos
      const { data: calificacionesT3 } = await supabase
        .from("calificaciones")
        .select("*")
        .in("materia_id", codigosMaterias)
        .in("alumno_id", codigosAlumnos)
        .eq("trimestre", 3)

      const todasCalificaciones = {
        trimestre1: calificacionesT1 || [],
        trimestre2: calificacionesT2 || [],
        trimestre3: calificacionesT3 || [],
      }

      // Cargar configuración a través del endpoint de API
      const configResponse = await fetch("/api/configuracion/get")
      const config = await configResponse.json()

      // Cargar áreas
      const { data: areasData } = await supabase.from("areas").select("id, nombre")

      // Crear mapa de áreas
      const areaMap: Record<string, string> = {}
      if (areasData) {
        areasData.forEach((area) => {
          areaMap[area.id] = area.nombre
        })
      }

      // Obtener el objeto del curso
      const cursoObj = cursos.find((c) => c.nombre_corto === selectedCurso)

      // Configuración del pie de página
      const piePaginaConfig = {
        piePaginaUrl: config.pie_pagina_url,
        piePaginaAltura: config.pie_pagina_altura || 80,
        piePaginaAjuste: config.pie_pagina_ajuste || "proporcional",
      }

      console.log("Configuración del pie de página para todos los boletines:", piePaginaConfig)

      // Generar todos los boletines
      const doc = await generarTodosBoletinesPDF(
        alumnos,
        cursoObj,
        materiasData,
        todasCalificaciones,
        config.nombre_institucion,
        areaMap,
        piePaginaConfig,
      )

      // Guardar el documento combinado
      doc.save(`Boletines_${selectedCurso}.pdf`)

      toast({
        title: "PDF generado",
        description: `Se han generado ${alumnos.length} boletines en un solo documento.`,
      })
    } catch (error) {
      console.error("Error al generar todos los boletines:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron generar todos los boletines.",
      })
    } finally {
      setIsGeneratingAllBoletines(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Reportes</h1>

        <Tabs defaultValue="boletin">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="boletin">Boletín</TabsTrigger>
            <TabsTrigger value="centralizador">Centralizador</TabsTrigger>
            <TabsTrigger value="centralizador-minedu">Centralizador MINEDU</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="ranking-top3">Top 3 por Curso</TabsTrigger>
            <TabsTrigger value="ranking-nivel">Top 3 por Nivel</TabsTrigger>
            <TabsTrigger value="hermanos">Hermanos</TabsTrigger>
          </TabsList>

          <TabsContent value="boletin" className="space-y-4 pt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {cursos.map((curso) => (
                          <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                            {curso.nombre_largo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alumno">Alumno</Label>
                    <Select
                      value={selectedAlumno}
                      onValueChange={setSelectedAlumno}
                      disabled={!selectedCurso || alumnos.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar alumno" />
                      </SelectTrigger>
                      <SelectContent>
                        {alumnos.map((alumno) => (
                          <SelectItem key={alumno.cod_moodle} value={alumno.cod_moodle}>
                            {alumno.apellidos}, {alumno.nombres}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end space-x-2">
                    <Button
                      onClick={handleGenerarBoletin}
                      disabled={isLoading || !selectedCurso || !selectedAlumno}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                        </>
                      ) : (
                        "Generar Boletín"
                      )}
                    </Button>
                    <Button
                      onClick={handleGenerarTodosBoletines}
                      disabled={isGeneratingAllBoletines || !selectedCurso || alumnos.length === 0}
                      variant="outline"
                    >
                      {isGeneratingAllBoletines ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...
                        </>
                      ) : (
                        "Todos"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showBoletin && (
              <BoletinNotas
                alumno={alumnos.find((a) => a.cod_moodle === selectedAlumno)}
                curso={cursos.find((c) => c.nombre_corto === selectedCurso)}
                materias={materias}
                calificaciones={calificaciones}
                alumnos={alumnos}
              />
            )}
          </TabsContent>

          <TabsContent value="centralizador" className="space-y-4 pt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {cursos.map((curso) => (
                          <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                            {curso.nombre_largo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trimestre">Trimestre</Label>
                    <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar trimestre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Primer Trimestre</SelectItem>
                        <SelectItem value="2">Segundo Trimestre</SelectItem>
                        <SelectItem value="3">Tercer Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={handleGenerarCentralizador}
                      disabled={isLoading || !selectedCurso}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                        </>
                      ) : (
                        "Generar Centralizador"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showCentralizador && (
              <CentralizadorInterno
                curso={cursos.find((c) => c.nombre_corto === selectedCurso)}
                alumnos={alumnos}
                materias={materias}
                calificaciones={
                  selectedTrimestre === "1"
                    ? calificaciones.trimestre1
                    : selectedTrimestre === "2"
                      ? calificaciones.trimestre2
                      : calificaciones.trimestre3
                }
                trimestre={selectedTrimestre}
              />
            )}
          </TabsContent>

          <TabsContent value="centralizador-minedu" className="space-y-4 pt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {cursos
                          .filter((curso) => curso.nivel === "Primaria" || curso.nivel === "Secundaria")
                          .map((curso) => (
                            <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                              {curso.nombre_largo}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trimestre">Trimestre</Label>
                    <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar trimestre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Primer Trimestre</SelectItem>
                        <SelectItem value="2">Segundo Trimestre</SelectItem>
                        <SelectItem value="3">Tercer Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={handleGenerarCentralizadorMinedu}
                      disabled={isLoading || !selectedCurso}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                        </>
                      ) : (
                        "Generar Centralizador MINEDU"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showCentralizadorMinedu && (
              <CentralizadorMinedu
                curso={cursos.find((c) => c.nombre_corto === selectedCurso)}
                alumnos={alumnos}
                materias={materias}
                calificaciones={
                  selectedTrimestre === "1"
                    ? calificaciones.trimestre1
                    : selectedTrimestre === "2"
                      ? calificaciones.trimestre2
                      : calificaciones.trimestre3
                }
                agrupaciones={agrupaciones}
                trimestre={selectedTrimestre}
              />
            )}
          </TabsContent>

          <TabsContent value="ranking" className="space-y-4 pt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Select value={selectedCurso} onValueChange={setSelectedCurso}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODOS">Todos los Cursos</SelectItem>
                        {cursos.map((curso) => (
                          <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                            {curso.nombre_largo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trimestre">Trimestre</Label>
                    <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
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
                    <Button
                      onClick={handleGenerarRanking}
                      disabled={isLoadingRanking || !selectedCurso}
                      className="w-full"
                    >
                      {isLoadingRanking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                        </>
                      ) : (
                        "Generar Ranking"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showRanking && (
              <RankingAlumnos
                alumnos={todosLosAlumnos}
                cursos={cursos}
                calificaciones={calificaciones}
                selectedCurso={selectedCurso}
                selectedTrimestre={selectedTrimestre}
              />
            )}
          </TabsContent>

          <TabsContent value="ranking-top3" className="space-y-4 pt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trimestre">Trimestre</Label>
                    <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
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
                    <Button onClick={handleGenerarRankingTop3} disabled={isLoadingRankingTop3} className="w-full">
                      {isLoadingRankingTop3 ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                        </>
                      ) : (
                        "Generar Ranking Top 3"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showRankingTop3 && (
              <RankingTop3 alumnosPorCurso={alumnosPorCurso} cursos={cursos} selectedTrimestre={selectedTrimestre} />
            )}
          </TabsContent>

          <TabsContent value="ranking-nivel" className="space-y-4 pt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trimestre">Trimestre</Label>
                    <Select value={selectedTrimestre} onValueChange={setSelectedTrimestre}>
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
                    <Button onClick={handleGenerarRankingNivel} disabled={isLoadingRankingNivel} className="w-full">
                      {isLoadingRankingNivel ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
                        </>
                      ) : (
                        "Generar Ranking por Nivel"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {showRankingNivel && (
              <RankingNivel
                selectedTrimestre={selectedTrimestre}
                alumnosPrimaria={alumnosPrimaria}
                alumnosSecundaria={alumnosSecundaria}
              />
            )}
          </TabsContent>

          <TabsContent value="hermanos" className="space-y-4 pt-4">
            <HermanosLista />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
