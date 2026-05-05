"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Plus, Search, X, User, Book } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGestion } from "@/context/gestion-context"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/supabase"

type Profesor = Database["public"]["Tables"]["profesores"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Asignacion = Database["public"]["Tables"]["materias_profesores"]["Row"]

interface AsignacionConDetalles extends Asignacion {
  profesor?: Profesor
  materia?: Materia
}

export default function AsignacionesPage() {
  const { gestionActual } = useGestion()
  const { toast } = useToast()
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [asignaciones, setAsignaciones] = useState<AsignacionConDetalles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterProfesor, setFilterProfesor] = useState<string>("all")
  
  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedProfesor, setSelectedProfesor] = useState("")
  const [selectedMateria, setSelectedMateria] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const fetchData = async () => {
    if (!gestionActual) return
    setIsLoading(true)
    
    try {
      const [profesoresRes, materiasRes, asignacionesRes] = await Promise.all([
        supabase
          .from("profesores")
          .select("*")
          .eq("gestion_id", gestionActual.id)
          .eq("activo", true)
          .order("apellidos"),
        supabase
          .from("materias")
          .select("*")
          .eq("gestion_id", gestionActual.id)
          .order("curso_corto")
          .order("nombre_corto"),
        supabase
          .from("materias_profesores")
          .select("*")
          .eq("gestion_id", gestionActual.id),
      ])

      if (profesoresRes.data) setProfesores(profesoresRes.data)
      if (materiasRes.data) setMaterias(materiasRes.data)
      
      // Combinar asignaciones con detalles
      if (asignacionesRes.data && profesoresRes.data && materiasRes.data) {
        const asignacionesConDetalles = asignacionesRes.data.map((a) => ({
          ...a,
          profesor: profesoresRes.data.find((p) => p.cod_moodle === a.cod_moodle_profesor),
          materia: materiasRes.data.find((m) => m.codigo === a.codigo_materia),
        }))
        setAsignaciones(asignacionesConDetalles)
      }
    } catch (error) {
      console.error("Error al obtener datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [gestionActual])

  // Agrupar asignaciones por profesor
  const asignacionesPorProfesor = profesores.map((profesor) => ({
    profesor,
    materias: asignaciones
      .filter((a) => a.cod_moodle_profesor === profesor.cod_moodle)
      .map((a) => a.materia)
      .filter(Boolean) as Materia[],
  }))

  const filteredAsignaciones = asignacionesPorProfesor.filter((ap) => {
    const matchesSearch =
      ap.profesor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ap.profesor.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ap.materias.some((m) => m.nombre_largo.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesProfesor = filterProfesor === "all" || ap.profesor.cod_moodle === filterProfesor
    
    return matchesSearch && matchesProfesor
  })

  // Obtener materias no asignadas al profesor seleccionado
  const getMateriasDisponibles = () => {
    if (!selectedProfesor) return materias
    
    const materiasAsignadas = asignaciones
      .filter((a) => a.cod_moodle_profesor === selectedProfesor)
      .map((a) => a.codigo_materia)
    
    return materias.filter((m) => !materiasAsignadas.includes(m.codigo))
  }

  const handleAddAsignacion = async () => {
    if (!selectedProfesor || !selectedMateria || !gestionActual) return
    setIsAdding(true)
    
    try {
      const { error } = await supabase.from("materias_profesores").insert({
        cod_moodle_profesor: selectedProfesor,
        codigo_materia: selectedMateria,
        gestion_id: gestionActual.id,
      })
      
      if (error) throw error
      
      toast({ title: "Asignacion creada", description: "La materia fue asignada al profesor" })
      setAddDialogOpen(false)
      setSelectedProfesor("")
      setSelectedMateria("")
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveAsignacion = async (profesorId: string, materiaId: string) => {
    try {
      const { error } = await supabase
        .from("materias_profesores")
        .delete()
        .eq("cod_moodle_profesor", profesorId)
        .eq("codigo_materia", materiaId)
        .eq("gestion_id", gestionActual?.id)
      
      if (error) throw error
      
      toast({ title: "Asignacion eliminada" })
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const quickAddMateria = async (profesorId: string, materiaId: string) => {
    if (!gestionActual) return
    
    try {
      const { error } = await supabase.from("materias_profesores").insert({
        cod_moodle_profesor: profesorId,
        codigo_materia: materiaId,
        gestion_id: gestionActual.id,
      })
      
      if (error) throw error
      
      toast({ title: "Materia asignada" })
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Asignaciones</h1>
            <p className="text-muted-foreground">Gestiona las materias asignadas a cada profesor</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Asignacion
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por profesor o materia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={filterProfesor} onValueChange={setFilterProfesor}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filtrar por profesor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los profesores</SelectItem>
              {profesores.map((profesor) => (
                <SelectItem key={profesor.cod_moodle} value={profesor.cod_moodle}>
                  {profesor.apellidos}, {profesor.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAsignaciones.map(({ profesor, materias: materiasAsignadas }) => (
              <Card key={profesor.cod_moodle}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {profesor.apellidos}, {profesor.nombre}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {profesor.cod_moodle}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">{materiasAsignadas.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {materiasAsignadas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin materias asignadas</p>
                    ) : (
                      <ScrollArea className="h-[150px]">
                        <div className="space-y-2 pr-4">
                          {materiasAsignadas.map((materia) => (
                            <div
                              key={materia.codigo}
                              className="flex items-center justify-between rounded-lg border px-3 py-2"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Book className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="overflow-hidden">
                                  <p className="truncate text-sm font-medium">{materia.nombre_corto}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {materia.curso_corto}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => handleRemoveAsignacion(profesor.cod_moodle, materia.codigo)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    
                    {/* Quick add materia */}
                    <Select
                      onValueChange={(value) => quickAddMateria(profesor.cod_moodle, value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="+ Agregar materia" />
                      </SelectTrigger>
                      <SelectContent>
                        {materias
                          .filter((m) => !materiasAsignadas.some((ma) => ma.codigo === m.codigo))
                          .map((materia) => (
                            <SelectItem key={materia.codigo} value={materia.codigo}>
                              {materia.nombre_corto} ({materia.curso_corto})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredAsignaciones.length === 0 && !isLoading && (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">No se encontraron profesores</p>
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Asignacion</DialogTitle>
            <DialogDescription>
              Asigna una materia a un profesor
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="profesor">Profesor</Label>
              <Select value={selectedProfesor} onValueChange={setSelectedProfesor}>
                <SelectTrigger id="profesor">
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  {profesores.map((profesor) => (
                    <SelectItem key={profesor.cod_moodle} value={profesor.cod_moodle}>
                      {profesor.apellidos}, {profesor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="materia">Materia</Label>
              <Select
                value={selectedMateria}
                onValueChange={setSelectedMateria}
                disabled={!selectedProfesor}
              >
                <SelectTrigger id="materia">
                  <SelectValue placeholder="Seleccionar materia" />
                </SelectTrigger>
                <SelectContent>
                  {getMateriasDisponibles().map((materia) => (
                    <SelectItem key={materia.codigo} value={materia.codigo}>
                      {materia.nombre_corto} - {materia.curso_corto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddAsignacion}
              disabled={!selectedProfesor || !selectedMateria || isAdding}
            >
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
