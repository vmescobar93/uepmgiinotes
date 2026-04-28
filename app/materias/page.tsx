"use client"

import { useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Loader2, Plus, Search, Upload, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGestion } from "@/context/gestion-context"
import { useToast } from "@/components/ui/use-toast"
import { CsvImportDialog } from "@/components/csv-import-dialog"
import { BulkActionBar } from "@/components/bulk-action-bar"
import type { Database } from "@/types/supabase"
import Link from "next/link"

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
  const [filterCurso, setFilterCurso] = useState<string>("all")
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  // Edit state
  const [editingMateria, setEditingMateria] = useState<Materia | null>(null)
  const [editForm, setEditForm] = useState({
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
          .eq("gestion_id", gestionActual.id)
          .order("orden"),
      ])

      if (materiasRes.data) setMaterias(materiasRes.data)
      if (cursosRes.data) setCursos(cursosRes.data)
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

  const filteredMaterias = materias.filter((materia) => {
    const matchesSearch =
      materia.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      materia.nombre_corto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      materia.nombre_largo.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCurso = filterCurso === "all" || materia.curso_corto === filterCurso
    
    return matchesSearch && matchesCurso
  })

  const getAreaName = (areaId: string | null | undefined) => {
    if (!areaId) return null
    const area = areas.find((a) => a.id === areaId)
    return area?.nombre
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

  // Edit handlers
  const openEditDialog = (materia: Materia) => {
    setEditingMateria(materia)
    setEditForm({
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
            <Link href="/materias/nueva">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Materia
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Materias ({filteredMaterias.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por codigo, nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={filterCurso} onValueChange={setFilterCurso}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {cursos.map((curso) => (
                    <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                      {curso.nombre_corto}
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
                      <TableHead>Curso</TableHead>
                      <TableHead>Area</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterias.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No se encontraron materias.
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
                          <TableCell>{materia.nombre_corto}</TableCell>
                          <TableCell>{materia.nombre_largo}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{materia.curso_corto || "-"}</Badge>
                          </TableCell>
                          <TableCell>
                            {getAreaName(materia.id_area) ? (
                              <Badge variant="secondary">{getAreaName(materia.id_area)}</Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(materia)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => openDeleteDialog(materia)}
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
                  value={editForm.curso_corto}
                  onValueChange={(v) => setEditForm({ ...editForm, curso_corto: v })}
                >
                  <SelectTrigger id="edit_curso">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
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
                  value={editForm.id_area}
                  onValueChange={(v) => setEditForm({ ...editForm, id_area: v })}
                >
                  <SelectTrigger id="edit_area">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin area</SelectItem>
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
