"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Printer, Loader2, Users, Medal } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { CentralizadorInterno } from "@/components/reportes/centralizador-interno"
import { CentralizadorMinedu } from "@/components/reportes/centralizador-minedu"
import { BoletinNotas, generarBoletinPDF } from "@/components/reportes/boletin-notas"
import { RankingAlumnos } from "@/components/reportes/ranking-alumnos"
import type { Database } from "@/types/supabase"
import { jsPDF } from "jspdf"
import { getConfiguracion } from "@/lib/config"

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
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
  // Añadir un nuevo estado para controlar la visualización del ranking
  const [showRanking, setShowRanking] = useState(false)
  const [isLoadingRanking, setIsLoadingRanking] = useState(false)
  const [todosLosAlumnos, setTodosLosAlumnos] = useState<Alumno[]>([])

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

  // Añadir una función para generar el ranking de alumnos
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
    setShowCentralizador(false)
    setShowCentralizadorMinedu(false)
    setShowBoletin(false)

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

    // Verificar si el curso es de nivel secundario
    const cursoSeleccionado = cursos.find((c) => c.nombre_corto === selectedCurso)
    if (cursoSeleccionado?.nivel !== "Secundaria") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El centralizador MINEDU solo está disponible para cursos de nivel secundario.",
      })
      return
    }

    setIsLoading(true)
    setShowCentralizador(false)
    setShowCentralizadorMinedu(false)
    setShowBoletin(false)

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

      // Cargar configuración y áreas
      const config = await getConfiguracion()
      const { data: areasData } = await supabase.from("areas").select("id, nombre")

      // Crear mapa de áreas
      const areaMap: Record<string, string> = {}
      if (areasData) {
        areasData.forEach((area) => {
          areaMap[area.id] = area.nombre
        })
      }

      // Crear un nuevo documento PDF
      let doc = new jsPDF({ unit: "mm", format: "a4" })

      // Generar boletín para cada alumno
      const cursoObj = cursos.find((c) => c.nombre_corto === selectedCurso)

      for (let i = 0; i < alumnos.length; i++) {
        const alumnoActual = alumnos[i]
        // No añadir salto de página para el primer alumno
        doc = await generarBoletinPDF(
          alumnoActual,
          cursoObj,
          materiasData,
          todasCalificaciones,
          config.nombre_institucion,
          config.logo_url,
          areaMap,
          doc,
          i > 0, // Añadir salto de página excepto para el primer alumno
        )
      }

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

        <Tabs defaultValue="centralizador">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="centralizador">Centralizador</TabsTrigger>
            <TabsTrigger value="boletin">Boletín</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>

          <TabsContent value="centralizador" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Centralizador de Calificaciones</CardTitle>
                <CardDescription>Genere el centralizador de calificaciones por curso y trimestre.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Button onClick={handleGenerarCentralizador} disabled={!selectedCurso || isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Centralizador Interno
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleGenerarCentralizadorMinedu}
                    disabled={
                      !selectedCurso ||
                      isLoading ||
                      cursos.find((c) => c.nombre_corto === selectedCurso)?.nivel !== "Secundaria"
                    }
                    variant="outline"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Centralizador MINEDU
                      </>
                    )}
                  </Button>
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

          <TabsContent value="boletin" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Boletín de Calificaciones</CardTitle>
                <CardDescription>
                  Genere el boletín individual de calificaciones por alumno y trimestre.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="curso">Curso</Label>
                    <Select
                      value={selectedCurso}
                      onValueChange={(value) => {
                        setSelectedCurso(value)
                        setSelectedAlumno("")
                      }}
                    >
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
                            {`${alumno.apellidos}, ${alumno.nombres}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Button onClick={handleGenerarBoletin} disabled={!selectedCurso || !selectedAlumno || isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <Printer className="mr-2 h-4 w-4" />
                        Generar Boletín
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleGenerarTodosBoletines}
                    disabled={!selectedCurso || alumnos.length === 0 || isGeneratingAllBoletines}
                    variant="secondary"
                  >
                    {isGeneratingAllBoletines ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Users className="mr-2 h-4 w-4" />
                        Generar Todos los Boletines
                      </>
                    )}
                  </Button>
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

          <TabsContent value="ranking" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ranking de Alumnos</CardTitle>
                <CardDescription>Genere el ranking de mejores alumnos por curso o nivel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        <SelectItem value="TODOS">Todos los cursos</SelectItem>
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
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Button onClick={handleGenerarRanking} disabled={!selectedCurso || isLoadingRanking}>
                    {isLoadingRanking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <Medal className="mr-2 h-4 w-4" />
                        Generar Ranking
                      </>
                    )}
                  </Button>
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
        </Tabs>
      </div>
    </MainLayout>
  )
}
