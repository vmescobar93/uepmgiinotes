"use client"

import { useEffect, useState, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { Loader2, Plus, Search, Trash2, BookOpen, GraduationCap } from "lucide-react"
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

export default function AsignacionesPage() {
  const [asignaciones, setAsignaciones] = useState<AsignacionConDetalles[]>([])
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedProfesor, setSelectedProfesor] = useState<string>("")
  const [selectedMateria, setSelectedMateria] = useState<string>("")
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Fetch all data in parallel
      const [asignacionesRes, profesoresRes, materiasRes] = await Promise.all([
        supabase.from("materias_profesores").select("*"),
        supabase.from("profesores").select("*").eq("activo", true).order("apellidos"),
        supabase.from("materias").select("*").order("codigo")
      ])

      if (asignacionesRes.error) throw asignacionesRes.error
      if (profesoresRes.error) throw profesoresRes.error
      if (materiasRes.error) throw materiasRes.error

      setProfesores(profesoresRes.data || [])
      setMaterias(materiasRes.data || [])

      // Combine data for display
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

  const handleCreateAsignacion = async () => {
    if (!selectedProfesor || !selectedMateria) {
      toast({
        title: "Error",
        description: "Debe seleccionar un profesor y una materia",
        variant: "destructive"
      })
      return
    }

    // Check if assignment already exists
    const existingAsignacion = asignaciones.find(
      a => a.cod_moodle_profesor === selectedProfesor && a.codigo_materia === selectedMateria
    )

    if (existingAsignacion) {
      toast({
        title: "Error",
        description: "Esta asignacion ya existe",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("materias_profesores").insert({
        cod_moodle_profesor: selectedProfesor,
        codigo_materia: selectedMateria
      })

      if (error) throw error

      toast({
        title: "Exito",
        description: "Asignacion creada correctamente"
      })

      setIsDialogOpen(false)
      setSelectedProfesor("")
      setSelectedMateria("")
      fetchData()
    } catch (error) {
      console.error("Error al crear asignacion:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la asignacion",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAsignacion = async () => {
    if (!deleteId) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("materias_profesores").delete().eq("id", deleteId)

      if (error) throw error

      toast({
        title: "Exito",
        description: "Asignacion eliminada correctamente"
      })

      setIsDeleteDialogOpen(false)
      setDeleteId(null)
      fetchData()
    } catch (error) {
      console.error("Error al eliminar asignacion:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la asignacion",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredAsignaciones = asignaciones.filter((asig) => {
    const searchLower = searchTerm.toLowerCase()
    const profesorNombre = asig.profesor ? `${asig.profesor.nombre} ${asig.profesor.apellidos}`.toLowerCase() : ""
    const materiaNombre = asig.materia ? `${asig.materia.nombre_corto} ${asig.materia.nombre_largo}`.toLowerCase() : ""
    const cursoCodigo = asig.materia?.curso_corto?.toLowerCase() || ""
    
    return profesorNombre.includes(searchLower) || 
           materiaNombre.includes(searchLower) || 
           cursoCodigo.includes(searchLower)
  })

  // Group by professor for better visualization
  const asignacionesPorProfesor = filteredAsignaciones.reduce((acc, asig) => {
    const key = asig.cod_moodle_profesor || "sin_profesor"
    if (!acc[key]) {
      acc[key] = {
        profesor: asig.profesor,
        materias: []
      }
    }
    acc[key].materias.push(asig)
    return acc
  }, {} as Record<string, { profesor?: Profesor; materias: AsignacionConDetalles[] }>)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Asignaciones</h1>
            <p className="text-muted-foreground">Gestiona la relacion entre profesores y materias</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Asignacion
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profesores y sus Materias</CardTitle>
            <CardDescription>
              Total: {asignaciones.length} asignaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por profesor, materia o curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : Object.keys(asignacionesPorProfesor).length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mb-2" />
                <p>No se encontraron asignaciones</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(asignacionesPorProfesor).map(([key, { profesor, materias: materiasAsig }]) => (
                  <Card key={key} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          {profesor ? `${profesor.apellidos}, ${profesor.nombre}` : "Profesor no encontrado"}
                        </CardTitle>
                        <Badge variant="secondary">{materiasAsig.length} materias</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Codigo</TableHead>
                              <TableHead>Materia</TableHead>
                              <TableHead>Curso</TableHead>
                              <TableHead className="w-[100px]">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {materiasAsig.map((asig) => (
                              <TableRow key={asig.id}>
                                <TableCell className="font-mono text-sm">
                                  {asig.codigo_materia}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    {asig.materia?.nombre_largo || asig.materia?.nombre_corto || "-"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {asig.materia?.curso_corto ? (
                                    <Badge variant="outline">{asig.materia.curso_corto}</Badge>
                                  ) : "-"}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setDeleteId(asig.id)
                                      setIsDeleteDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para crear asignacion */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Asignacion</DialogTitle>
            <DialogDescription>
              Asigna una materia a un profesor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profesor">Profesor</Label>
              <Select value={selectedProfesor} onValueChange={setSelectedProfesor}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label htmlFor="materia">Materia</Label>
              <Select value={selectedMateria} onValueChange={setSelectedMateria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar materia" />
                </SelectTrigger>
                <SelectContent>
                  {materias.map((materia) => (
                    <SelectItem key={materia.codigo} value={materia.codigo}>
                      {materia.nombre_largo} ({materia.curso_corto || "Sin curso"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAsignacion} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Asignacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar eliminacion */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminacion</DialogTitle>
            <DialogDescription>
              Esta seguro de que desea eliminar esta asignacion? Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAsignacion} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
