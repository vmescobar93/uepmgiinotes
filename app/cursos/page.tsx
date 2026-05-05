"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Search, Pencil, Trash2, BookOpen, Users, GraduationCap } from "lucide-react"
import { supabase, sortCursos } from "@/lib/supabase"
import { useGestion } from "@/context/gestion-context"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]

interface CursoConMaterias extends Curso {
  materias: Materia[]
  alumnosCount: number
}

export default function CursosPage() {
  const { gestionActual } = useGestion()
  const { toast } = useToast()
  const [cursos, setCursos] = useState<CursoConMaterias[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCurso, setEditingCurso] = useState<CursoConMaterias | null>(null)
  const [deletingCurso, setDeletingCurso] = useState<CursoConMaterias | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    nombre_corto: "",
    nombre_largo: "",
    nivel: "Primaria"
  })

  const fetchCursos = async () => {
    if (!gestionActual) return
    setIsLoading(true)
    
    try {
      // Obtener cursos
      const { data: cursosData, error: cursosError } = await supabase
        .from("cursos")
        .select("*")
        .eq("gestion_id", gestionActual.id)

      if (cursosError) throw cursosError

      // Obtener materias
      const { data: materiasData } = await supabase
        .from("materias")
        .select("*")
        .eq("gestion_id", gestionActual.id)

      // Obtener conteo de alumnos por curso
      const { data: alumnosData } = await supabase
        .from("alumnos")
        .select("curso_corto")
        .eq("gestion_id", gestionActual.id)
        .eq("activo", true)

      // Combinar datos
      const cursosConMaterias: CursoConMaterias[] = (cursosData || []).map(curso => ({
        ...curso,
        materias: (materiasData || []).filter(m => m.curso_corto === curso.nombre_corto),
        alumnosCount: (alumnosData || []).filter(a => a.curso_corto === curso.nombre_corto).length
      }))

      setCursos(sortCursos(cursosConMaterias))
    } catch (error) {
      console.error("Error al obtener cursos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los cursos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCursos()
  }, [gestionActual])

  // Filtrar cursos
  const filteredCursos = cursos.filter(
    (curso) =>
      curso.nombre_corto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      curso.nombre_largo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      curso.nivel.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agrupar por nivel
  const cursosPrimaria = filteredCursos.filter(c => c.nivel === "Primaria")
  const cursosSecundaria = filteredCursos.filter(c => c.nivel === "Secundaria")

  // Handlers
  const openCreateDialog = () => {
    setFormData({
      nombre_corto: "",
      nombre_largo: "",
      nivel: "Primaria"
    })
    setCreateDialogOpen(true)
  }

  const openEditDialog = (curso: CursoConMaterias) => {
    setEditingCurso(curso)
    setFormData({
      nombre_corto: curso.nombre_corto,
      nombre_largo: curso.nombre_largo,
      nivel: curso.nivel
    })
    setEditDialogOpen(true)
  }

  const openDeleteDialog = (curso: CursoConMaterias) => {
    setDeletingCurso(curso)
    setDeleteDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!gestionActual || !formData.nombre_corto || !formData.nombre_largo) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase.from("cursos").insert({
        nombre_corto: formData.nombre_corto,
        nombre_largo: formData.nombre_largo,
        nivel: formData.nivel,
        gestion_id: gestionActual.id
      })

      if (error) throw error

      toast({
        title: "Curso creado",
        description: `El curso ${formData.nombre_corto} ha sido creado`,
      })

      setCreateDialogOpen(false)
      fetchCursos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el curso",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editingCurso || !formData.nombre_largo) {
      toast({
        title: "Error",
        description: "Complete todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("cursos")
        .update({
          nombre_largo: formData.nombre_largo,
          nivel: formData.nivel
        })
        .eq("nombre_corto", editingCurso.nombre_corto)
        .eq("gestion_id", gestionActual!.id)

      if (error) throw error

      toast({
        title: "Curso actualizado",
        description: `El curso ${editingCurso.nombre_corto} ha sido actualizado`,
      })

      setEditDialogOpen(false)
      setEditingCurso(null)
      fetchCursos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el curso",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCurso || !gestionActual) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("cursos")
        .delete()
        .eq("nombre_corto", deletingCurso.nombre_corto)
        .eq("gestion_id", gestionActual.id)

      if (error) throw error

      toast({
        title: "Curso eliminado",
        description: `El curso ${deletingCurso.nombre_corto} ha sido eliminado`,
      })

      setDeleteDialogOpen(false)
      setDeletingCurso(null)
      fetchCursos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el curso",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const CursoCard = ({ curso }: { curso: CursoConMaterias }) => (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{curso.nombre_corto}</CardTitle>
            <CardDescription>{curso.nombre_largo}</CardDescription>
          </div>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditDialog(curso)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => openDeleteDialog(curso)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Estadisticas */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{curso.alumnosCount} alumnos</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            <span>{curso.materias.length} materias</span>
          </div>
        </div>
        
        {/* Materias */}
        {curso.materias.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Materias asignadas:</p>
            <div className="flex flex-wrap gap-1">
              {curso.materias.slice(0, 8).map((materia) => (
                <Badge key={materia.codigo} variant="secondary" className="text-xs">
                  {materia.nombre_corto}
                </Badge>
              ))}
              {curso.materias.length > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{curso.materias.length - 8} mas
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sin materias asignadas</p>
        )}
      </CardContent>
    </Card>
  )

  const NivelSection = ({ nivel, cursos, icon }: { nivel: string; cursos: CursoConMaterias[]; icon: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-semibold">{nivel}</h2>
        <Badge variant="outline">{cursos.length} cursos</Badge>
      </div>
      {cursos.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cursos.map((curso) => (
            <CursoCard key={curso.nombre_corto} curso={curso} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex h-24 items-center justify-center text-muted-foreground">
            No hay cursos de {nivel.toLowerCase()}
          </CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold">Cursos</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Curso
          </Button>
        </div>

        {/* Busqueda */}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Contenido */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            <NivelSection 
              nivel="Primaria" 
              cursos={cursosPrimaria} 
              icon={<GraduationCap className="h-5 w-5 text-blue-500" />}
            />
            <NivelSection 
              nivel="Secundaria" 
              cursos={cursosSecundaria}
              icon={<GraduationCap className="h-5 w-5 text-green-500" />}
            />
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Curso</DialogTitle>
              <DialogDescription>
                Ingrese los datos del nuevo curso
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre_corto">Codigo / Nombre corto *</Label>
                <Input
                  id="nombre_corto"
                  placeholder="Ej: 1ro A"
                  value={formData.nombre_corto}
                  onChange={(e) => setFormData({ ...formData, nombre_corto: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre_largo">Nombre completo *</Label>
                <Input
                  id="nombre_largo"
                  placeholder="Ej: Primero de Primaria A"
                  value={formData.nombre_largo}
                  onChange={(e) => setFormData({ ...formData, nombre_largo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">Nivel *</Label>
                <Select
                  value={formData.nivel}
                  onValueChange={(v) => setFormData({ ...formData, nivel: v })}
                >
                  <SelectTrigger id="nivel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primaria">Primaria</SelectItem>
                    <SelectItem value="Secundaria">Secundaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Crear Curso
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Curso</DialogTitle>
              <DialogDescription>
                Modifique los datos del curso {editingCurso?.nombre_corto}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_nombre_corto">Codigo / Nombre corto</Label>
                <Input
                  id="edit_nombre_corto"
                  value={formData.nombre_corto}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  El codigo no puede modificarse porque esta vinculado a otras tablas
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_nombre_largo">Nombre completo *</Label>
                <Input
                  id="edit_nombre_largo"
                  placeholder="Ej: Primero de Primaria A"
                  value={formData.nombre_largo}
                  onChange={(e) => setFormData({ ...formData, nombre_largo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_nivel">Nivel *</Label>
                <Select
                  value={formData.nivel}
                  onValueChange={(v) => setFormData({ ...formData, nivel: v })}
                >
                  <SelectTrigger id="edit_nivel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primaria">Primaria</SelectItem>
                    <SelectItem value="Secundaria">Secundaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Curso</AlertDialogTitle>
              <AlertDialogDescription>
                Esta seguro de eliminar el curso <strong>{deletingCurso?.nombre_corto}</strong>?
                {deletingCurso && (deletingCurso.alumnosCount > 0 || deletingCurso.materias.length > 0) && (
                  <span className="mt-2 block text-destructive">
                    Advertencia: Este curso tiene {deletingCurso.alumnosCount} alumnos y{" "}
                    {deletingCurso.materias.length} materias asignadas.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  )
}
