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
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, X, Layers, Pencil, Trash2, BookOpen } from "lucide-react"
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

interface GrupoAgrupado {
  nombre_grupo: string
  nombre_mostrar: string
  items: AgrupacionConDetalles[]
}

export default function AgrupacionesPage() {
  const { gestionActual } = useGestion()
  const { toast } = useToast()
  const [cursos, setCursos] = useState<Curso[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [agrupaciones, setAgrupaciones] = useState<AgrupacionConDetalles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCurso, setSelectedCurso] = useState<string>("")
  
  // Dialog para crear nuevo grupo
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false)
  const [newGroupData, setNewGroupData] = useState({
    nombre_grupo: "",
    nombre_mostrar: "",
  })
  
  // Dialog para agregar materias a un grupo
  const [addMateriasDialogOpen, setAddMateriasDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GrupoAgrupado | null>(null)
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([])
  
  // Dialog para editar grupo
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GrupoAgrupado | null>(null)
  const [editGroupData, setEditGroupData] = useState({
    nombre_grupo: "",
    nombre_mostrar: "",
  })
  
  // Dialog para eliminar grupo
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState<GrupoAgrupado | null>(null)
  
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
  }, {} as Record<string, GrupoAgrupado>)

  // Get materias for selected curso
  const materiasDelCurso = materias.filter((m) => m.curso_corto === selectedCurso)

  // Get materias that are NOT in any group for this curso
  const materiasEnGrupos = new Set(filteredAgrupaciones.map((a) => a.materia_codigo))
  const materiasDisponibles = materiasDelCurso.filter((m) => !materiasEnGrupos.has(m.codigo))

  // Get materias not in the selected group (for adding)
  const getMateriasParaAgregar = (grupo: GrupoAgrupado) => {
    const materiasEnEsteGrupo = new Set(grupo.items.map((i) => i.materia_codigo))
    return materiasDelCurso.filter((m) => !materiasEnEsteGrupo.has(m.codigo))
  }

  // === Create Group ===
  const openCreateGroupDialog = () => {
    setNewGroupData({ nombre_grupo: "", nombre_mostrar: "" })
    setCreateGroupDialogOpen(true)
  }

  const handleCreateGroup = async () => {
    if (!gestionActual || !newGroupData.nombre_grupo || !newGroupData.nombre_mostrar) return
    setIsSaving(true)
    
    try {
      // Crear un registro inicial sin materia para establecer el grupo
      const { error } = await supabase.from("agrupaciones_materias").insert({
        nombre_grupo: newGroupData.nombre_grupo,
        nombre_mostrar: newGroupData.nombre_mostrar,
        curso_corto: selectedCurso,
        materia_codigo: null,
        gestion_id: gestionActual.id,
      })
      
      if (error) throw error
      
      toast({ title: "Grupo creado", description: "Ahora puedes agregar materias al grupo" })
      setCreateGroupDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // === Add Materias to Group ===
  const openAddMateriasDialog = (grupo: GrupoAgrupado) => {
    setSelectedGroup(grupo)
    setSelectedMaterias([])
    setAddMateriasDialogOpen(true)
  }

  const handleAddMaterias = async () => {
    if (!gestionActual || !selectedGroup || selectedMaterias.length === 0) return
    setIsSaving(true)
    
    try {
      // Insertar una agrupacion por cada materia seleccionada
      const inserts = selectedMaterias.map((codigo) => ({
        nombre_grupo: selectedGroup.nombre_grupo,
        nombre_mostrar: selectedGroup.nombre_mostrar,
        curso_corto: selectedCurso,
        materia_codigo: codigo,
        gestion_id: gestionActual.id,
      }))
      
      const { error } = await supabase.from("agrupaciones_materias").insert(inserts)
      
      if (error) throw error
      
      toast({ title: "Materias agregadas", description: `Se agregaron ${selectedMaterias.length} materia(s) al grupo` })
      setAddMateriasDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // === Remove Materia from Group ===
  const handleRemoveMateria = async (agrupacionId: number) => {
    try {
      const { error } = await supabase
        .from("agrupaciones_materias")
        .delete()
        .eq("id", agrupacionId)
      
      if (error) throw error
      
      toast({ title: "Materia removida del grupo" })
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  // === Edit Group ===
  const openEditGroupDialog = (grupo: GrupoAgrupado) => {
    setEditingGroup(grupo)
    setEditGroupData({
      nombre_grupo: grupo.nombre_grupo,
      nombre_mostrar: grupo.nombre_mostrar,
    })
    setEditGroupDialogOpen(true)
  }

  const handleEditGroup = async () => {
    if (!editingGroup || !editGroupData.nombre_grupo || !editGroupData.nombre_mostrar) return
    setIsSaving(true)
    
    try {
      // Actualizar todos los registros del grupo
      const ids = editingGroup.items.map((i) => i.id)
      
      const { error } = await supabase
        .from("agrupaciones_materias")
        .update({
          nombre_grupo: editGroupData.nombre_grupo,
          nombre_mostrar: editGroupData.nombre_mostrar,
        })
        .in("id", ids)
      
      if (error) throw error
      
      toast({ title: "Grupo actualizado" })
      setEditGroupDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // === Delete Group ===
  const openDeleteGroupDialog = (grupo: GrupoAgrupado) => {
    setDeletingGroup(grupo)
    setDeleteGroupDialogOpen(true)
  }

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return
    setIsDeleting(true)
    
    try {
      const ids = deletingGroup.items.map((i) => i.id)
      
      const { error } = await supabase
        .from("agrupaciones_materias")
        .delete()
        .in("id", ids)
      
      if (error) throw error
      
      toast({ title: "Grupo eliminado" })
      setDeleteGroupDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleMateriaSelection = (codigo: string) => {
    setSelectedMaterias((prev) =>
      prev.includes(codigo)
        ? prev.filter((c) => c !== codigo)
        : [...prev, codigo]
    )
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
          <Button onClick={openCreateGroupDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Grupo
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
            {/* Materias sin agrupar */}
            {materiasDisponibles.length > 0 && (
              <Card className="border-dashed border-orange-300 bg-orange-50/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-orange-500" />
                    <CardTitle className="text-base text-orange-700">
                      Materias sin agrupar ({materiasDisponibles.length})
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Estas materias no estan en ninguna agrupacion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {materiasDisponibles.map((materia) => (
                      <Badge key={materia.codigo} variant="outline" className="bg-white">
                        {materia.nombre_corto}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Grupos de agrupaciones */}
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
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditGroupDialog(grupo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteGroupDialog(grupo)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Materias en el grupo */}
                      <div className="flex flex-wrap gap-2">
                        {grupo.items
                          .filter((item) => item.materia_codigo)
                          .map((item) => (
                            <Badge
                              key={item.id}
                              variant="secondary"
                              className="flex items-center gap-1 pr-1"
                            >
                              {item.materia?.nombre_corto || item.materia_codigo}
                              <button
                                onClick={() => handleRemoveMateria(item.id)}
                                className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        {grupo.items.filter((item) => item.materia_codigo).length === 0 && (
                          <span className="text-sm text-muted-foreground">
                            Sin materias asignadas
                          </span>
                        )}
                      </div>
                      
                      {/* Boton para agregar materias */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => openAddMateriasDialog(grupo)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Materias
                      </Button>
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
                  <Button variant="outline" className="mt-4" onClick={openCreateGroupDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primer grupo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog: Crear Grupo */}
      <Dialog open={createGroupDialogOpen} onOpenChange={setCreateGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Grupo de Agrupacion</DialogTitle>
            <DialogDescription>
              Crea un nuevo grupo para organizar materias en {selectedCurso}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre_grupo">Identificador del Grupo</Label>
              <Input
                id="nombre_grupo"
                value={newGroupData.nombre_grupo}
                onChange={(e) => setNewGroupData({ ...newGroupData, nombre_grupo: e.target.value })}
                placeholder="ej: comunicacion_lenguajes"
              />
              <p className="text-xs text-muted-foreground">
                Identificador interno (sin espacios ni caracteres especiales)
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nombre_mostrar">Nombre a Mostrar</Label>
              <Input
                id="nombre_mostrar"
                value={newGroupData.nombre_mostrar}
                onChange={(e) => setNewGroupData({ ...newGroupData, nombre_mostrar: e.target.value })}
                placeholder="ej: Comunicacion y Lenguajes"
              />
              <p className="text-xs text-muted-foreground">
                Nombre que aparecera en los reportes
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGroupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={isSaving || !newGroupData.nombre_grupo || !newGroupData.nombre_mostrar}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Agregar Materias */}
      <Dialog open={addMateriasDialogOpen} onOpenChange={setAddMateriasDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Materias al Grupo</DialogTitle>
            <DialogDescription>
              Selecciona las materias para agregar a &quot;{selectedGroup?.nombre_mostrar}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto py-4">
            {selectedGroup && getMateriasParaAgregar(selectedGroup).length > 0 ? (
              <div className="space-y-2">
                {getMateriasParaAgregar(selectedGroup).map((materia) => (
                  <div
                    key={materia.codigo}
                    className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      id={materia.codigo}
                      checked={selectedMaterias.includes(materia.codigo)}
                      onCheckedChange={() => toggleMateriaSelection(materia.codigo)}
                    />
                    <label
                      htmlFor={materia.codigo}
                      className="flex-1 cursor-pointer"
                    >
                      <p className="font-medium">{materia.nombre_corto}</p>
                      <p className="text-xs text-muted-foreground">{materia.nombre_largo}</p>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No hay materias disponibles para agregar
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMateriasDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddMaterias}
              disabled={isSaving || selectedMaterias.length === 0}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agregar {selectedMaterias.length > 0 && `(${selectedMaterias.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Grupo */}
      <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>
              Modifica el nombre del grupo
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_nombre_grupo">Identificador del Grupo</Label>
              <Input
                id="edit_nombre_grupo"
                value={editGroupData.nombre_grupo}
                onChange={(e) => setEditGroupData({ ...editGroupData, nombre_grupo: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_nombre_mostrar">Nombre a Mostrar</Label>
              <Input
                id="edit_nombre_mostrar"
                value={editGroupData.nombre_mostrar}
                onChange={(e) => setEditGroupData({ ...editGroupData, nombre_mostrar: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleEditGroup}
              disabled={isSaving || !editGroupData.nombre_grupo || !editGroupData.nombre_mostrar}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Eliminar Grupo */}
      <Dialog open={deleteGroupDialogOpen} onOpenChange={setDeleteGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Grupo</DialogTitle>
            <DialogDescription>
              Estas seguro de eliminar el grupo &quot;{deletingGroup?.nombre_mostrar}&quot;?
              <br />
              Se eliminaran {deletingGroup?.items.length} registro(s) de agrupacion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar Grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
