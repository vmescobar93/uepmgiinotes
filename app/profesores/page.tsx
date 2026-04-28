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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Search, Upload, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGestion } from "@/context/gestion-context"
import { useToast } from "@/components/ui/use-toast"
import { CsvImportDialog } from "@/components/csv-import-dialog"
import { BulkActionBar } from "@/components/bulk-action-bar"
import type { Database } from "@/types/supabase"
import Link from "next/link"

type Profesor = Database["public"]["Tables"]["profesores"]["Row"]

const CSV_COLUMNS = [
  { key: "cod_moodle", label: "Codigo Moodle", required: true },
  { key: "nombre", label: "Nombre", required: true },
  { key: "apellidos", label: "Apellidos", required: true },
  { key: "ci", label: "CI", required: false },
  { key: "activo", label: "Activo", required: false },
]

export default function ProfesoresPage() {
  const { gestionActual } = useGestion()
  const { toast } = useToast()
  const [profesores, setProfesores] = useState<Profesor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  // Edit state
  const [editingProfesor, setEditingProfesor] = useState<Profesor | null>(null)
  const [editForm, setEditForm] = useState({
    nombre: "",
    apellidos: "",
    ci: "",
    activo: true,
  })
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchData = async () => {
    if (!gestionActual) return
    setIsLoading(true)
    
    try {
      const { data, error } = await supabase
        .from("profesores")
        .select("*")
        .eq("gestion_id", gestionActual.id)
        .order("apellidos", { ascending: true })

      if (error) throw error
      setProfesores(data || [])
    } catch (error) {
      console.error("Error al obtener profesores:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [gestionActual])

  const filteredProfesores = profesores.filter(
    (profesor) =>
      profesor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profesor.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profesor.ci?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profesor.cod_moodle.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProfesores.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProfesores.map((p) => p.cod_moodle)))
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
    
    const response = await fetch("/api/import/profesores", {
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
  const openEditDialog = (profesor: Profesor) => {
    setEditingProfesor(profesor)
    setEditForm({
      nombre: profesor.nombre,
      apellidos: profesor.apellidos,
      ci: profesor.ci || "",
      activo: profesor.activo,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingProfesor) return
    setIsSaving(true)
    
    try {
      const { error } = await supabase
        .from("profesores")
        .update({
          nombre: editForm.nombre,
          apellidos: editForm.apellidos,
          ci: editForm.ci || null,
          activo: editForm.activo,
        })
        .eq("cod_moodle", editingProfesor.cod_moodle)
      
      if (error) throw error
      
      toast({ title: "Profesor actualizado", description: "Los datos se guardaron correctamente" })
      setEditDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete handlers
  const openDeleteDialog = (profesor?: Profesor) => {
    if (profesor) {
      setSelectedIds(new Set([profesor.cod_moodle]))
    }
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    
    try {
      const { error } = await supabase
        .from("profesores")
        .delete()
        .in("cod_moodle", Array.from(selectedIds))
      
      if (error) throw error
      
      toast({
        title: "Profesores eliminados",
        description: `${selectedIds.size} profesor(es) eliminado(s)`,
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
          <h1 className="text-3xl font-bold">Profesores</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Link href="/profesores/nuevo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Profesor
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Profesores ({filteredProfesores.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, CI, codigo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
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
                          checked={selectedIds.size === filteredProfesores.length && filteredProfesores.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Apellidos</TableHead>
                      <TableHead>CI</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfesores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No se encontraron profesores.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProfesores.map((profesor) => (
                        <TableRow
                          key={profesor.cod_moodle}
                          className={selectedIds.has(profesor.cod_moodle) ? "bg-muted/50" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(profesor.cod_moodle)}
                              onCheckedChange={() => toggleSelect(profesor.cod_moodle)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{profesor.cod_moodle}</TableCell>
                          <TableCell>{profesor.nombre}</TableCell>
                          <TableCell>{profesor.apellidos}</TableCell>
                          <TableCell>{profesor.ci || "-"}</TableCell>
                          <TableCell>
                            {profesor.activo ? (
                              <Badge>Activo</Badge>
                            ) : (
                              <Badge variant="destructive">Inactivo</Badge>
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
                                <DropdownMenuItem onSelect={() => openEditDialog(profesor)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={() => openDeleteDialog(profesor)}
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
        title="Importar Profesores"
        description="Importa profesores desde un archivo CSV. Descarga la plantilla para ver el formato correcto."
        columns={CSV_COLUMNS}
        templateFileName="plantilla_profesores.csv"
        onImport={handleImport}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Profesor</DialogTitle>
            <DialogDescription>
              Modifica los datos del profesor {editingProfesor?.cod_moodle}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_nombre">Nombre</Label>
              <Input
                id="edit_nombre"
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_apellidos">Apellidos</Label>
              <Input
                id="edit_apellidos"
                value={editForm.apellidos}
                onChange={(e) => setEditForm({ ...editForm, apellidos: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_ci">CI</Label>
              <Input
                id="edit_ci"
                value={editForm.ci}
                onChange={(e) => setEditForm({ ...editForm, ci: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_activo"
                checked={editForm.activo}
                onCheckedChange={(checked) => setEditForm({ ...editForm, activo: checked })}
              />
              <Label htmlFor="edit_activo">Activo</Label>
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
            <DialogTitle>Eliminar Profesores</DialogTitle>
            <DialogDescription>
              Esta accion eliminara {selectedIds.size} profesor(es). Esta accion no se puede deshacer.
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
