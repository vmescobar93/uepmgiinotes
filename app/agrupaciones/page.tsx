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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, Plus, MoreHorizontal, Pencil, Trash2, Layers } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGestion } from "@/context/gestion-context"
import { useToast } from "@/components/ui/use-toast"
import type { Database } from "@/types/supabase"

type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Agrupacion = Database["public"]["Tables"]["agrupaciones_materias"]["Row"]

interface AgrupacionConDetalles extends Agrupacion {
  materia?: Materia
}

export default function AgrupacionesPage() {
  const { gestionActual } = useGestion()
  const { toast } = useToast()
  const [cursos, setCursos] = useState<Curso[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [agrupaciones, setAgrupaciones] = useState<AgrupacionConDetalles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCurso, setSelectedCurso] = useState<string>("")
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAgrupacion, setEditingAgrupacion] = useState<AgrupacionConDetalles | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    nombre_grupo: "",
    nombre_mostrar: "",
    curso_corto: "",
    materia_codigo: "",
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchData = async () => {
    if (!gestionActual) return
    setIsLoading(true)
    
    try {
      const [cursosRes, materiasRes, agrupacionesRes] = await Promise.all([
        supabase
          .from("cursos")
          .select("*")
          .eq("gestion_id", gestionActual.id)
          .order("nombre_corto"),
        supabase
          .from("materias")
          .select("*")
          .eq("gestion_id", gestionActual.id)
          .order("nombre_corto"),
        supabase
          .from("agrupaciones_materias")
          .select("*")
          .eq("gestion_id", gestionActual.id),
      ])

      if (cursosRes.data) {
        setCursos(cursosRes.data)
        if (!selectedCurso && cursosRes.data.length > 0) {
          setSelectedCurso(cursosRes.data[0].nombre_corto)
        }
      }
      if (materiasRes.data) setMaterias(materiasRes.data)
      
      if (agrupacionesRes.data && materiasRes.data) {
        const agrupacionesConDetalles = agrupacionesRes.data.map((a) => ({
          ...a,
          materia: materiasRes.data.find((m) => m.codigo === a.materia_codigo),
        }))
        setAgrupaciones(agrupacionesConDetalles)
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

  // Filter agrupaciones by selected curso
  const filteredAgrupaciones = agrupaciones.filter((a) => a.curso_corto === selectedCurso)

  // Group by nombre_grupo
  const groupedAgrupaciones = filteredAgrupaciones.reduce((acc, agr) => {
    if (!acc[agr.nombre_grupo]) {
      acc[agr.nombre_grupo] = {
        nombre_grupo: agr.nombre_grupo,
        nombre_mostrar: agr.nombre_mostrar,
        items: [],
      }
    }
    acc[agr.nombre_grupo].items.push(agr)
    return acc
  }, {} as Record<string, { nombre_grupo: string; nombre_mostrar: string; items: AgrupacionConDetalles[] }>)

  // Get materias for selected curso
  const materiasDelCurso = materias.filter((m) => m.curso_corto === selectedCurso)

  const openCreateDialog = () => {
    setEditingAgrupacion(null)
    setFormData({
      nombre_grupo: "",
      nombre_mostrar: "",
      curso_corto: selectedCurso,
      materia_codigo: "",
    })
    setDialogOpen(true)
  }

  const openEditDialog = (agrupacion: AgrupacionConDetalles) => {
    setEditingAgrupacion(agrupacion)
    setFormData({
      nombre_grupo: agrupacion.nombre_grupo,
      nombre_mostrar: agrupacion.nombre_mostrar,
      curso_corto: agrupacion.curso_corto || selectedCurso,
      materia_codigo: agrupacion.materia_codigo || "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!gestionActual) return
    setIsSaving(true)
    
    try {
      if (editingAgrupacion) {
        // Update
        const { error } = await supabase
          .from("agrupaciones_materias")
          .update({
            nombre_grupo: formData.nombre_grupo,
            nombre_mostrar: formData.nombre_mostrar,
            curso_corto: formData.curso_corto,
            materia_codigo: formData.materia_codigo || null,
          })
          .eq("id", editingAgrupacion.id)
        
        if (error) throw error
        toast({ title: "Agrupacion actualizada" })
      } else {
        // Create
        const { error } = await supabase.from("agrupaciones_materias").insert({
          nombre_grupo: formData.nombre_grupo,
          nombre_mostrar: formData.nombre_mostrar,
          curso_corto: formData.curso_corto,
          materia_codigo: formData.materia_codigo || null,
          gestion_id: gestionActual.id,
        })
        
        if (error) throw error
        toast({ title: "Agrupacion creada" })
      }
      
      setDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const openDeleteDialog = (id: number) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    
    try {
      const { error } = await supabase
        .from("agrupaciones_materias")
        .delete()
        .eq("id", deletingId)
      
      if (error) throw error
      
      toast({ title: "Agrupacion eliminada" })
      setDeleteDialogOpen(false)
      setDeletingId(null)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Agrupaciones de Materias</h1>
            <p className="text-muted-foreground">
              Organiza como se muestran las materias en los reportes
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Agrupacion
          </Button>
        </div>

        {/* Selector de curso */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seleccionar Curso</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCurso} onValueChange={setSelectedCurso}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Seleccionar curso" />
              </SelectTrigger>
              <SelectContent>
                {cursos.map((curso) => (
                  <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                    {curso.nombre_corto} - {curso.nombre_largo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Vista por grupos */}
            {Object.keys(groupedAgrupaciones).length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Object.values(groupedAgrupaciones).map((grupo) => (
                  <Card key={grupo.nombre_grupo}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Layers className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{grupo.nombre_mostrar}</CardTitle>
                            <CardDescription className="text-xs">
                              Grupo: {grupo.nombre_grupo}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary">{grupo.items.length} item(s)</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Materia</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grupo.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {item.materia ? (
                                  <div>
                                    <p className="font-medium">{item.materia.nombre_corto}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.materia.nombre_largo}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {item.materia_codigo || "Sin materia"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu modal={false}>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={() => openEditDialog(item)}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onSelect={() => openDeleteDialog(item.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <Layers className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    No hay agrupaciones para este curso
                  </p>
                  <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primera agrupacion
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAgrupacion ? "Editar Agrupacion" : "Nueva Agrupacion"}
            </DialogTitle>
            <DialogDescription>
              {editingAgrupacion
                ? "Modifica los datos de la agrupacion"
                : "Crea una nueva agrupacion de materias"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre_grupo">Nombre del Grupo</Label>
              <Input
                id="nombre_grupo"
                value={formData.nombre_grupo}
                onChange={(e) => setFormData({ ...formData, nombre_grupo: e.target.value })}
                placeholder="ej: matematicas_basicas"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nombre_mostrar">Nombre a Mostrar</Label>
              <Input
                id="nombre_mostrar"
                value={formData.nombre_mostrar}
                onChange={(e) => setFormData({ ...formData, nombre_mostrar: e.target.value })}
                placeholder="ej: Matematicas Basicas"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="curso">Curso</Label>
              <Select
                value={formData.curso_corto}
                onValueChange={(v) => setFormData({ ...formData, curso_corto: v })}
              >
                <SelectTrigger id="curso">
                  <SelectValue placeholder="Seleccionar curso" />
                </SelectTrigger>
                <SelectContent>
                  {cursos.map((curso) => (
                    <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                      {curso.nombre_corto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="materia">Materia</Label>
              <Select
                value={formData.materia_codigo}
                onValueChange={(v) => setFormData({ ...formData, materia_codigo: v })}
              >
                <SelectTrigger id="materia">
                  <SelectValue placeholder="Seleccionar materia" />
                </SelectTrigger>
                <SelectContent>
                  {materiasDelCurso.map((materia) => (
                    <SelectItem key={materia.codigo} value={materia.codigo}>
                      {materia.nombre_corto} - {materia.nombre_largo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.nombre_grupo || !formData.nombre_mostrar}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAgrupacion ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Agrupacion</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. La agrupacion sera eliminada permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
