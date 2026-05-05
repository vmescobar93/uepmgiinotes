"use client"

import { useEffect, useState, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Plus, Search, X, GraduationCap, BookOpen, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { useToast } from "@/hooks/use-toast"

type Profesor = Database["public"]["Tables"]["profesores"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type MateriaProfesor = Database["public"]["Tables"]["materias_profesores"]["Row"]

interface AsignacionConDetalles extends MateriaProfesor {
  profesor?: Profesor
  materia?: Materia
}

interface ProfesorConMaterias {
  profesor: Profesor
  materias: AsignacionConDetalles[]
}

export default function AsignacionesPage() {
  const [asignaciones, setAsignaciones] = useState<AsignacionConDetalles[]>([])
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedProfesorForAdd, setSelectedProfesorForAdd] = useState<Profesor | null>(null)
  const [selectedMateria, setSelectedMateria] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const [asignacionesRes, profesoresRes, materiasRes] = await Promise.all([
        supabase.from("materias_profesores").select("*"),
        supabase.from("profesores").select("*").eq("activo", true).order("apellidos"),
        supabase.from("materias").select("*").order("curso_corto").order("nombre_corto")
      ])

      if (asignacionesRes.error) throw asignacionesRes.error
      if (profesoresRes.error) throw profesoresRes.error
      if (materiasRes.error) throw materiasRes.error

      setProfesores(profesoresRes.data || [])
      setMaterias(materiasRes.data || [])

      const asignacionesConDetalles: AsignacionConDetalles[] = (asignacionesRes.data || []).map((asig) => ({
        ...asig,
        profesor: profesoresRes.data?.find(p => p.cod_moodle === asig.cod_moodle_profesor),
        materia: materiasRes.data?.find(m => m.codigo === asig.codigo_materia)
      }))

      setAsignaciones(asignacionesConDetalles)
    } catch (error) {
      console.error("Error al obtener datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las asignaciones",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddMateria = async () => {
    if (!selectedProfesorForAdd || !selectedMateria) {
      toast({
        title: "Error",
        description: "Debe seleccionar una materia",
        variant: "destructive"
      })
      return
    }

    const existingAsignacion = asignaciones.find(
      a => a.cod_moodle_profesor === selectedProfesorForAdd.cod_moodle && a.codigo_materia === selectedMateria
    )

    if (existingAsignacion) {
      toast({
        title: "Error",
        description: "Esta materia ya esta asignada a este profesor",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("materias_profesores").insert({
        cod_moodle_profesor: selectedProfesorForAdd.cod_moodle,
        codigo_materia: selectedMateria
      })

      if (error) throw error

      toast({
        title: "Materia asignada",
        description: "La materia fue asignada correctamente"
      })

      setSelectedMateria("")
      fetchData()
    } catch (error) {
      console.error("Error al asignar materia:", error)
      toast({
        title: "Error",
        description: "No se pudo asignar la materia",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMateria = async (asignacionId: number) => {
    setRemovingId(asignacionId)
    try {
      const { error } = await supabase.from("materias_profesores").delete().eq("id", asignacionId)

      if (error) throw error

      toast({
        title: "Materia removida",
        description: "La materia fue removida correctamente"
      })

      fetchData()
    } catch (error) {
      console.error("Error al remover materia:", error)
      toast({
        title: "Error",
        description: "No se pudo remover la materia",
        variant: "destructive"
      })
    } finally {
      setRemovingId(null)
    }
  }

  const openAddDialog = (profesor: Profesor) => {
    setSelectedProfesorForAdd(profesor)
    setSelectedMateria("")
    setIsAddDialogOpen(true)
  }

  // Agrupar por profesor
  const profesoresConMaterias: ProfesorConMaterias[] = profesores.map(profesor => ({
    profesor,
    materias: asignaciones.filter(a => a.cod_moodle_profesor === profesor.cod_moodle)
  }))

  // Filtrar por termino de busqueda
  const filteredProfesores = profesoresConMaterias.filter(({ profesor, materias: materiasProf }) => {
    const searchLower = searchTerm.toLowerCase()
    const profesorNombre = `${profesor.nombre} ${profesor.apellidos}`.toLowerCase()
    const tieneMateriaBuscada = materiasProf.some(m => 
      m.materia?.nombre_corto?.toLowerCase().includes(searchLower) ||
      m.materia?.nombre_largo?.toLowerCase().includes(searchLower) ||
      m.materia?.curso_corto?.toLowerCase().includes(searchLower)
    )
    
    return profesorNombre.includes(searchLower) || tieneMateriaBuscada
  })

  // Materias disponibles para asignar (no asignadas al profesor seleccionado)
  const materiasDisponibles = selectedProfesorForAdd
    ? materias.filter(m => !asignaciones.some(
        a => a.cod_moodle_profesor === selectedProfesorForAdd.cod_moodle && a.codigo_materia === m.codigo
      ))
    : []

  // Agrupar materias por curso para el selector
  const materiasPorCurso = materiasDisponibles.reduce((acc, materia) => {
    const curso = materia.curso_corto || "Sin curso"
    if (!acc[curso]) acc[curso] = []
    acc[curso].push(materia)
    return acc
  }, {} as Record<string, Materia[]>)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Asignaciones</h1>
            <p className="text-muted-foreground">
              Gestiona las materias de cada profesor
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-sm">
              {asignaciones.length} asignaciones totales
            </Badge>
          </div>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por profesor, materia o curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProfesores.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center text-muted-foreground">
            <User className="h-12 w-12 mb-2" />
            <p>No se encontraron profesores</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProfesores.map(({ profesor, materias: materiasProf }) => (
              <Card key={profesor.cod_moodle} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">
                          {profesor.apellidos}, {profesor.nombre}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground truncate">
                          {profesor.cod_moodle}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openAddDialog(profesor)}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  {materiasProf.length === 0 ? (
                    <div className="flex h-20 flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                      <BookOpen className="h-5 w-5 mb-1" />
                      <p className="text-xs">Sin materias asignadas</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {materiasProf.map((asig) => (
                        <Badge
                          key={asig.id}
                          variant="secondary"
                          className="group flex items-center gap-1 pr-1 transition-colors hover:bg-destructive/10"
                        >
                          <span className="max-w-[150px] truncate" title={asig.materia?.nombre_largo || ""}>
                            {asig.materia?.nombre_corto || asig.codigo_materia}
                          </span>
                          {asig.materia?.curso_corto && (
                            <span className="text-xs opacity-60">
                              ({asig.materia.curso_corto})
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveMateria(asig.id)}
                            disabled={removingId === asig.id}
                            className="ml-1 rounded-full p-0.5 opacity-50 transition-opacity hover:bg-destructive hover:text-destructive-foreground hover:opacity-100 disabled:opacity-30"
                            title="Quitar materia"
                          >
                            {removingId === asig.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
                            )}
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog para agregar materia */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Agregar Materia
            </DialogTitle>
            <DialogDescription>
              {selectedProfesorForAdd && (
                <>Asignar materia a <strong>{selectedProfesorForAdd.apellidos}, {selectedProfesorForAdd.nombre}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="materia">Seleccionar Materia</Label>
              <Select value={selectedMateria} onValueChange={setSelectedMateria}>
                <SelectTrigger>
                  <SelectValue placeholder="Buscar y seleccionar materia..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[300px]">
                    {Object.entries(materiasPorCurso).map(([curso, materiasCurso]) => (
                      <div key={curso}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                          {curso}
                        </div>
                        {materiasCurso.map((materia) => (
                          <SelectItem key={materia.codigo} value={materia.codigo}>
                            <div className="flex flex-col">
                              <span>{materia.nombre_corto}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                                {materia.nombre_largo}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                    {materiasDisponibles.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No hay materias disponibles para asignar
                      </div>
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handleAddMateria} disabled={isSubmitting || !selectedMateria}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar Materia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
