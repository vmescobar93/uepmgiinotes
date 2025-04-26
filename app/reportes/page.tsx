"use client"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, Printer, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { CentralizadorInterno } from "@/components/reportes/centralizador-interno"
import { CentralizadorMinedu } from "@/components/reportes/centralizador-minedu"
import { BoletinNotas } from "@/components/reportes/boletin-notas"
import type { Database } from "@/types/supabase"

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Calificacion = Database["public"]["Tables"]["calificaciones"]["Row"]
type Agrupacion = Database["public"]["Tables"]["agrupaciones_materias"]["Row"]

export default function ReportesPage() {
  const [cursos, setCursos] = useState<Curso[]>([])
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [agrupaciones, setAgrupaciones] = useState<Agrupacion[]>([])
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
  const [showCentralizador, setShowCentralizador] = useState(false)
  const [showCentralizadorMinedu, setShowCentralizadorMinedu] = useState(false)
  const [showBoletin, setShowBoletin] = useState(false)

  const { toast } = useToast()

  // Cargar cursos
  useEffect(() => {
    const fetchCursos = async () => {
      const { data } = await supabase.from("cursos").select("*").order("nombre_corto")
      if (data) setCursos(data)
    }
    fetchCursos()
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
        .order("nombre_largo")

      if (materiasData) {
        setMaterias(materiasData)
      }

      // Cargar calificaciones de los tres trimestres
      if (materiasData && materiasData.length > 0) {
        const codigosMaterias = materiasData.map((m) => m.codigo)

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
                </div>
              </CardContent>
            </Card>

            {showBoletin && (
              <BoletinNotas
                alumno={alumnos.find((a) => a.cod_moodle === selectedAlumno)}
                curso={cursos.find((c) => c.nombre_corto === selectedCurso)}
                materias={materias}
                calificaciones={calificaciones}
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
                        <SelectItem value="FINAL">Calificación Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:flex-row">
                  <Button disabled={!selectedCurso}>
                    <FileText className="mr-2 h-4 w-4" />
                    Generar Ranking
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
