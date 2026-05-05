"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { CalificacionesReporte } from "@/components/reportes/calificaciones"
import { TodasCalificacionesReporte } from "@/components/reportes/todas-calificaciones"

type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Profesor = Database["public"]["Tables"]["profesores"]["Row"]

export default function CalificacionesPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [calificaciones, setCalificaciones] = useState<Record<string, number>>({})
  const [calificacionesInput, setCalificacionesInput] = useState<Record<string, string>>({})
  const [selectedProfesor, setSelectedProfesor] = useState<string>("")
  const [selectedMateria, setSelectedMateria] = useState<string>("")
  const [selectedTrimestre, setSelectedTrimestre] = useState<string>("1")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasPendingChanges, setHasPendingChanges] = useState(false) // Añadir estado para rastrear cambios pendientes
  const { toast } = useToast()

  // Fetch profesores activos
  useEffect(() => {
    const fetchProfesores = async () => {
      try {
        const { data } = await supabase.from("profesores").select("*").eq("activo", true).order("apellidos")

        if (data) setProfesores(data)
      } catch (error) {
        console.error("Error al cargar profesores:", error)
      }
    }

    fetchProfesores()
  }, [])

  // Fetch materias por profesor
  useEffect(() => {
    const fetchMaterias = async () => {
      if (!selectedProfesor) {
        setMaterias([])
        return
      }

      try {
        const { data: materiasProfesor } = await supabase
          .from("materias_profesores")
          .select("codigo_materia")
          .eq("cod_moodle_profesor", selectedProfesor)

        if (!materiasProfesor || materiasProfesor.length === 0) {
          setMaterias([])
          return
        }

        const codigosMaterias = materiasProfesor.map((mp) => mp.codigo_materia).filter(Boolean) as string[]

        if (codigosMaterias.length === 0) {
          setMaterias([])
          return
        }

        const { data } = await supabase.from("materias").select("*").in("codigo", codigosMaterias)

        if (data) setMaterias(data)
      } catch (error) {
        console.error("Error al cargar materias:", error)
      }
    }

    fetchMaterias()
  }, [selectedProfesor])

  // Fetch alumnos y calificaciones
  useEffect(() => {
    const fetchAlumnosYCalificaciones = async () => {
      if (!selectedMateria) {
        setAlumnos([])
        setCalificaciones({})
        setCalificacionesInput({})
        return
      }

      setIsLoading(true)

      try {
        // Obtener el curso de la materia
        const { data: materiaData } = await supabase
          .from("materias")
          .select("curso_corto")
          .eq("codigo", selectedMateria)
          .single()

        if (!materiaData || !materiaData.curso_corto) {
          setAlumnos([])
          setIsLoading(false)
          return
        }

        // Obtener alumnos del curso
        const { data: alumnosData } = await supabase
          .from("alumnos")
          .select("*")
          .eq("curso_corto", materiaData.curso_corto)
          .eq("activo", true)
          .order("apellidos")

        if (alumnosData) {
          setAlumnos(alumnosData)

          // Obtener calificaciones
          const { data: calificacionesData } = await supabase
            .from("calificaciones")
            .select("*")
            .eq("materia_id", selectedMateria)
            .eq("trimestre", Number(selectedTrimestre))

          const calificacionesMap: Record<string, number> = {}
          const inputsMap: Record<string, string> = {}

          if (calificacionesData) {
            calificacionesData.forEach((cal) => {
              if (cal.alumno_id && cal.nota !== null) {
                calificacionesMap[cal.alumno_id] = cal.nota
                inputsMap[cal.alumno_id] = cal.nota.toFixed(2).replace(".", ",")
              }
            })
          }

          setCalificaciones(calificacionesMap)
          setCalificacionesInput(inputsMap)
        }
      } catch (error) {
        console.error("Error al cargar alumnos y calificaciones:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los datos.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlumnosYCalificaciones()
  }, [selectedMateria, selectedTrimestre, toast])

  // Handlers de input
  const handleInputChange = (id: string, raw: string) => {
    const parsed = raw.replace(",", ".")
    if (!/^[0-9]{0,3}(?:\.[0-9]{0,2})?$/.test(parsed)) return

    const value = Number.parseFloat(parsed)
    if (isNaN(value) || value < 0 || value > 100) return

    setCalificacionesInput((prev) => ({ ...prev, [id]: raw }))
    setCalificaciones((prev) => ({ ...prev, [id]: Math.round(value * 100) / 100 }))
    setHasPendingChanges(true) // Marcar cambios pendientes
  }

  const handleInputBlur = (id: string) => {
    const raw = calificacionesInput[id] ?? ""
    let value = Number.parseFloat(raw.replace(",", "."))

    if (isNaN(value)) return

    value = Math.max(0, Math.min(100, value))

    setCalificacionesInput((prev) => ({
      ...prev,
      [id]: value.toFixed(2).replace(".", ","),
    }))

    setCalificaciones((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  // Funciones para validar cambios antes de cambiar selección
  const handleProfesorChange = (newProfesor: string) => {
    if (hasPendingChanges) {
      toast({
        variant: "destructive",
        title: "Cambios sin guardar",
        description: "Debe guardar las calificaciones antes de cambiar de profesor.",
      })
      return
    }
    setSelectedProfesor(newProfesor)
    setSelectedMateria("")
  }

  const handleMateriaChange = (newMateria: string) => {
    if (hasPendingChanges) {
      toast({
        variant: "destructive",
        title: "Cambios sin guardar",
        description: "Debe guardar las calificaciones antes de cambiar de materia.",
      })
      return
    }
    setSelectedMateria(newMateria)
  }

  const handleTrimestreChange = (newTrimestre: string) => {
    if (hasPendingChanges) {
      toast({
        variant: "destructive",
        title: "Cambios sin guardar",
        description: "Debe guardar las calificaciones antes de cambiar de trimestre.",
      })
      return
    }
    setSelectedTrimestre(newTrimestre)
  }

  // Guardar calificaciones
  const handleGuardar = async () => {
    if (!selectedMateria) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Seleccione materia y trimestre.",
      })
      return
    }

    setIsSaving(true)

    try {
      const payload = Object.entries(calificaciones).map(([alumno_id, nota]) => ({
        alumno_id,
        materia_id: selectedMateria,
        trimestre: Number(selectedTrimestre),
        nota,
      }))

      // Eliminar calificaciones existentes
      await supabase
        .from("calificaciones")
        .delete()
        .eq("materia_id", selectedMateria)
        .eq("trimestre", Number(selectedTrimestre))
        .in("alumno_id", Object.keys(calificaciones))

      // Insertar nuevas calificaciones
      const { error } = await supabase.from("calificaciones").insert(payload)

      if (error) throw error

      setHasPendingChanges(false) // Limpiar cambios pendientes
      toast({
        title: "Calificaciones guardadas",
        description: "Las calificaciones se han guardado correctamente.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudieron guardar las calificaciones.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Obtener el nombre del profesor seleccionado
  const profesorSeleccionado = profesores.find((p) => p.cod_moodle === selectedProfesor)
  const nombreProfesor = profesorSeleccionado ? `${profesorSeleccionado.apellidos}, ${profesorSeleccionado.nombre}` : ""

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Calificaciones</h1>
        <Card>
          <CardHeader>
            <CardTitle>Registro de Calificaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filtros */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Profesor</Label>
                <Select
                  value={selectedProfesor}
                  onValueChange={handleProfesorChange} // Usar nuevo handler
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar profesor" />
                  </SelectTrigger>
                  <SelectContent>
                    {profesores.map((p) => (
                      <SelectItem key={p.cod_moodle} value={p.cod_moodle}>
                        {`${p.apellidos}, ${p.nombre}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Materia</Label>
                <Select
                  value={selectedMateria}
                  onValueChange={handleMateriaChange} // Usar nuevo handler
                  disabled={!selectedProfesor || !materias.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar materia" />
                  </SelectTrigger>
                  <SelectContent>
                    {materias.map((m) => (
                      <SelectItem key={m.codigo} value={m.codigo}>
                        {`${m.nombre_largo} (${m.curso_corto})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Trimestre</Label>
                <Select value={selectedTrimestre} onValueChange={handleTrimestreChange}>
                  {" "}
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar trimestre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1er Trimestre</SelectItem>
                    <SelectItem value="2">2do Trimestre</SelectItem>
                    <SelectItem value="3">3er Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botón para exportar todas las calificaciones */}
            {selectedProfesor && (
              <div className="flex justify-end">
                <TodasCalificacionesReporte
                  selectedProfesor={selectedProfesor}
                  profesorNombre={nombreProfesor}
                  selectedTrimestre={selectedTrimestre}
                />
              </div>
            )}

            {/* Tabla y acciones */}
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : alumnos.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Apellidos</TableHead>
                        <TableHead>Nombres</TableHead>
                        <TableHead className="text-right">Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alumnos.map((a, i) => (
                        <TableRow key={a.cod_moodle}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell>{a.apellidos}</TableCell>
                          <TableCell>{a.nombres}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]{0,2}"
                              value={calificacionesInput[a.cod_moodle] || ""}
                              onChange={(e) => handleInputChange(a.cod_moodle, e.target.value)}
                              onBlur={() => handleInputBlur(a.cod_moodle)}
                              className="w-16 text-right"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center">
                  <CalificacionesReporte
                    profesores={profesores}
                    materias={materias}
                    alumnos={alumnos}
                    calificaciones={calificaciones}
                    selectedProfesor={selectedProfesor}
                    selectedMateria={selectedMateria}
                    selectedTrimestre={selectedTrimestre}
                  />
                  <Button
                    onClick={handleGuardar}
                    disabled={isSaving}
                    variant={hasPendingChanges ? "default" : "outline"}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {hasPendingChanges ? "Guardar cambios" : "Guardar"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-center text-muted-foreground">
                  {selectedMateria
                    ? "No hay alumnos para mostrar."
                    : "Seleccione un profesor y una materia para ver los alumnos."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
