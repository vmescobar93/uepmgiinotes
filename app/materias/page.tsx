"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2, Plus, Search, Upload, MoreHorizontal, Pencil, Trash2, BookOpen, Grid3X3, List } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGestion } from "@/context/gestion-context"
import { useToast } from "@/components/ui/use-toast"
import { CsvImportDialog } from "@/components/csv-import-dialog"
import { BulkActionBar } from "@/components/bulk-action-bar"
import type { Database } from "@/types/supabase"

type Materia = Database["public"]["Tables"]["materias"]["Row"]
type Curso = Database["public"]["Tables"]["cursos"]["Row"]
type Area = Database["public"]["Tables"]["areas"]["Row"]

const CSV_COLUMNS = [
  { key: "codigo", label: "Codigo", required: true },
  { key: "nombre_corto", label: "Nombre Corto", required: true },
  { key: "nombre_largo", label: "Nombre Largo", required: true },
  { key: "curso_corto", label: "Curso", required: false },
  { key: "id_area", label: "ID Area", required: false },
  { key: "orden", label: "Orden", required: false },
]

export default function MateriasPage() {
  const { gestionActual } = useGestion()
  const { toast } = useToast()
  const [materias, setMaterias] = useState<Materia[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCurso, setSelectedCurso] = useState<string>("")
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  
  // Edit state
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null)
  const [editForm, setEditForm] = useState({
    codigo: "",
    nombre_corto: "",
    nombre_largo: "",
    curso_corto: "",
    id_area: "",
    orden: 0,
  })
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchData = async () => {
    if (!gestionActual) return
    setIsLoading(true)
    
    try {
      const [materiasRes, cursosRes, areasRes] = await Promise.all([
        supabase
          .from("materias")
          .select("*")
          .eq("gestion_id", gestionActual.id)
          .order("curso_corto")
          .order("orden"),
        supabase
          .from("cursos")
          .select("*")
          .eq("gestion_id", gestionActual.id)
          .order("nombre_corto"),
        supabase
          .from("areas")
          .select("*")
          .eq("gestion_id", gestionActual.id),
      ])

      if (materiasRes.data) setMaterias(materiasRes.data)
      if (cursosRes.data) {
        setCursos(cursosRes.data)
        // Seleccionar el primer curso por defecto
        if (cursosRes.data.length > 0 && !selectedCurso) {
          setSelectedCurso(cursosRes.data[0].nombre_corto)
        }
      }
      if (areasRes.data) setAreas(areasRes.data)
    } catch (error) {
      console.error("Error al obtener datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [gestionActual])

  // Materias filtradas por el curso seleccionado
  const materiasCurso = materias.filter((m) => m.curso_corto === selectedCurso)
  
  // Filtrar por búsqueda
  const filteredMaterias = materiasCurso.filter((materia) =>
    materia.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    materia.nombre_corto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    materia.nombre_largo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agrupar materias por área
  const materiasPorArea = filteredMaterias.reduce((acc, materia) => {
    const areaId = materia.id_area || "sin_area"
    if (!acc[areaId]) {
      acc[areaId] = []
    }
    acc[areaId].push(materia)
    return acc
  }, {} as Record<string, Materia[]>)

  const getAreaName = (areaId: string | null | undefined) => {
    if (!areaId || areaId === "sin_area") return "Sin Area Asignada"
    const area = areas.find((a) => a.id === areaId)
    return area?.nombre || "Area Desconocida"
  }

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMaterias.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMaterias.map((m) => m.codigo)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Import handler
  const handleImport = async (data: Record<string, any>[]) => {
    if (!gestionActual) return { success: false, message: "No hay gestion seleccionada" }
    
    const response = await fetch("/api/import/materias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, gestionId: gestionActual.id }),
    })
    
    const result = await response.json()
    
    if (result.success) {
      await fetchData()
    }
    
    return result
  }

  // Create handler
  const openCreateDialog = () => {
    setEditingMateria(null)
    setEditForm({
      codigo: "",
      nombre_corto: "",
      nombre_largo: "",
      curso_corto: selectedCurso,
      id_area: "",
      orden: materiasCurso.length + 1,
    })
    setCreateDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!gestionActual || !editForm.codigo || !editForm.nombre_corto) {
      toast({ title: "Error", description: "Codigo y Nombre Corto son requeridos", variant: "destructive" })
      return
    }
    setIsSaving(true)
    
    try {
      const { error } = await supabase
        .from("materias")
        .insert({
          codigo: editForm.codigo,
          nombre_corto: editForm.nombre_corto,
          nombre_largo: editForm.nombre_largo || editForm.nombre_corto,
          curso_corto: editForm.curso_corto || null,
          id_area: editForm.id_area || null,
          orden: editForm.orden,
          gestion_id: gestionActual.id,
        })
      
      if (error) throw error
      
      toast({ title: "Materia creada", description: "La materia se creo correctamente" })
      setCreateDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // Edit handlers
  const openEditDialog = (materia: Materia) => {
    setEditingMateria(materia)
    setEditForm({
      codigo: materia.codigo,
      nombre_corto: materia.nombre_corto,
      nombre_largo: materia.nombre_largo,
      curso_corto: materia.curso_corto || "",
      id_area: materia.id_area || "",
      orden: materia.orden || 0,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingMateria) return
    setIsSaving(true)
    
    try {
      const { error } = await supabase
        .from("materias")
        .update({
          nombre_corto: editForm.nombre_corto,
          nombre_largo: editForm.nombre_largo,
          curso_corto: editForm.curso_corto || null,
          id_area: editForm.id_area || null,
          orden: editForm.orden,
        })
        .eq("codigo", editingMateria.codigo)
      
      if (error) throw error
      
      toast({ title: "Materia actualizada", description: "Los datos se guardaron correctamente" })
      setEditDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete handlers
  const openDeleteDialog = (materia?: Materia) => {
    if (materia) {
      setSelectedIds(new Set([materia.codigo]))
    }
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    
    try {
      const { error } = await supabase
        .from("materias")
        .delete()
        .in("codigo", Array.from(selectedIds))
      
      if (error) throw error
      
      toast({
        title: "Materias eliminadas",
        description: `${selectedIds.size} materia(s) eliminada(s)`,
      })
      setDeleteDialogOpen(false)
      setSelectedIds(new Set())
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
          <h1 className="text-3xl font-bold">Materias</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Materia
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : cursos.length === 0 ? (
          <Card>
            <CardContent className="flex h-40 items-center justify-center">
              <p className="text-muted-foreground">No hay cursos registrados en esta gestion.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tabs de Cursos */}
            <Tabs value={selectedCurso} onValueChange={setSelectedCurso}>
              <div className="flex items-center justify-between gap-4">
                <TabsList className="flex-wrap h-auto">
                  {cursos.map((curso) => {
                    const count = materias.filter((m) => m.curso_corto === curso.nombre_corto).length
                    return (
                      <TabsTrigger key={curso.nombre_corto} value={curso.nombre_corto} className="gap-2">
                        {curso.nombre_corto}
                        <Badge variant="secondary" className="ml-1">{count}</Badge>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "cards" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("cards")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("table")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {cursos.map((curso) => (
                <TabsContent key={curso.nombre_corto} value={curso.nombre_corto} className="mt-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{curso.nombre_largo}</CardTitle>
                          <CardDescription>
                            {filteredMaterias.length} materia(s) en este curso
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar materia..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {viewMode === "cards" ? (
                        // Vista de tarjetas agrupadas por área
                        <div className="space-y-6">
                          {Object.entries(materiasPorArea).map(([areaId, materiasArea]) => (
                            <div key={areaId} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-lg">{getAreaName(areaId)}</h3>
                                <Badge variant="outline">{materiasArea.length}</Badge>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {materiasArea.map((materia) => (
                                  <div
                                    key={materia.codigo}
                                    className={`group relative rounded-lg border p-4 hover:border-primary transition-colors ${
                                      selectedIds.has(materia.codigo) ? "border-primary bg-primary/5" : ""
                                    }`}
                                  >
                                    <div className="absolute right-2 top-2 flex items-center gap-1">
                                      <Checkbox
                                        checked={selectedIds.has(materia.codigo)}
                                        onCheckedChange={() => toggleSelect(materia.codigo)}
                                      />
                                      <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onSelect={() => openEditDialog(materia)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onSelect={() => openDeleteDialog(materia)}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    <div className="pr-16">
                                      <p className="font-mono text-xs text-muted-foreground">{materia.codigo}</p>
                                      <p className="font-medium">{materia.nombre_corto}</p>
                                      <p className="text-sm text-muted-foreground line-clamp-1">{materia.nombre_largo}</p>
                                    </div>
                                    {materia.orden && (
                                      <Badge variant="secondary" className="mt-2">
                                        Orden: {materia.orden}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {filteredMaterias.length === 0 && (
                            <div className="flex h-32 items-center justify-center text-muted-foreground">
                              No hay materias en este curso
                            </div>
                          )}
                        </div>
                      ) : (
                        // Vista de tabla
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">
                                  <Checkbox
                                    checked={selectedIds.size === filteredMaterias.length && filteredMaterias.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                  />
                                </TableHead>
                                <TableHead>Codigo</TableHead>
                                <TableHead>Nombre Corto</TableHead>
                                <TableHead>Nombre Largo</TableHead>
                                <TableHead>Area</TableHead>
                                <TableHead>Orden</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredMaterias.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={7} className="h-24 text-center">
                                    No hay materias en este curso.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredMaterias.map((materia) => (
                                  <TableRow
                                    key={materia.codigo}
                                    className={selectedIds.has(materia.codigo) ? "bg-muted/50" : ""}
                                  >
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedIds.has(materia.codigo)}
                                        onCheckedChange={() => toggleSelect(materia.codigo)}
                                      />
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">{materia.codigo}</TableCell>
                                    <TableCell className="font-medium">{materia.nombre_corto}</TableCell>
                                    <TableCell>{materia.nombre_largo}</TableCell>
                                    <TableCell>
                                      {materia.id_area ? (
                                        <Badge variant="secondary">{getAreaName(materia.id_area)}</Badge>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </TableCell>
                                    <TableCell>{materia.orden || "-"}</TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onSelect={() => openEditDialog(materia)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onSelect={() => openDeleteDialog(materia)}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            label: "Eliminar",
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            onClick: () => setDeleteDialogOpen(true),
            variant: "destructive",
          },
        ]}
      />

      {/* Import Dialog */}
      <CsvImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Importar Materias"
        description="Importa materias desde un archivo CSV. Descarga la plantilla para ver el formato correcto."
        columns={CSV_COLUMNS}
        templateFileName="plantilla_materias.csv"
        onImport={handleImport}
      />

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Materia</DialogTitle>
            <DialogDescription>
              Agrega una nueva materia al curso {selectedCurso}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create_codigo">Codigo *</Label>
              <Input
                id="create_codigo"
                placeholder="Ej: MAT-1A-001"
                value={editForm.codigo}
                onChange={(e) => setEditForm({ ...editForm, codigo: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_nombre_corto">Nombre Corto *</Label>
              <Input
                id="create_nombre_corto"
                placeholder="Ej: Matematicas"
                value={editForm.nombre_corto}
                onChange={(e) => setEditForm({ ...editForm, nombre_corto: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_nombre_largo">Nombre Largo</Label>
              <Input
                id="create_nombre_largo"
                placeholder="Ej: Matematicas Basica"
                value={editForm.nombre_largo}
                onChange={(e) => setEditForm({ ...editForm, nombre_largo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create_curso">Curso</Label>
                <Select
                  value={editForm.curso_corto}
                  onValueChange={(v) => setEditForm({ ...editForm, curso_corto: v })}
                >
                  <SelectTrigger id="create_curso">
                    <SelectValue placeholder="Seleccionar" />
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
                <Label htmlFor="create_area">Area</Label>
                <Select
                  value={editForm.id_area || "none"}
                  onValueChange={(v) => setEditForm({ ...editForm, id_area: v === "none" ? "" : v })}
                >
                  <SelectTrigger id="create_area">
                    <SelectValue placeholder="Sin area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin area</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create_orden">Orden</Label>
              <Input
                id="create_orden"
                type="number"
                value={editForm.orden}
                onChange={(e) => setEditForm({ ...editForm, orden: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Materia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Materia</DialogTitle>
            <DialogDescription>
              Modifica los datos de la materia {editingMateria?.codigo}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_nombre_corto">Nombre Corto</Label>
              <Input
                id="edit_nombre_corto"
                value={editForm.nombre_corto}
                onChange={(e) => setEditForm({ ...editForm, nombre_corto: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_nombre_largo">Nombre Largo</Label>
              <Input
                id="edit_nombre_largo"
                value={editForm.nombre_largo}
                onChange={(e) => setEditForm({ ...editForm, nombre_largo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_curso">Curso</Label>
                <Select
                  value={editForm.curso_corto || "none"}
                  onValueChange={(v) => setEditForm({ ...editForm, curso_corto: v === "none" ? "" : v })}
                >
                  <SelectTrigger id="edit_curso">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {cursos.map((curso) => (
                      <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                        {curso.nombre_corto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_area">Area</Label>
                <Select
                  value={editForm.id_area || "none"}
                  onValueChange={(v) => setEditForm({ ...editForm, id_area: v === "none" ? "" : v })}
                >
                  <SelectTrigger id="edit_area">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin area</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_orden">Orden</Label>
              <Input
                id="edit_orden"
                type="number"
                value={editForm.orden}
                onChange={(e) => setEditForm({ ...editForm, orden: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Materias</DialogTitle>
            <DialogDescription>
              Esta accion eliminara {selectedIds.size} materia(s). Esta accion no se puede deshacer.
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
