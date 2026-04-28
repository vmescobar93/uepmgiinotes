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
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Search, Upload, MoreHorizontal, Pencil, Trash2, ArrowRightLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGestion } from "@/context/gestion-context"
import { useToast } from "@/components/ui/use-toast"
import { CsvImportDialog } from "@/components/csv-import-dialog"
import { BulkActionBar } from "@/components/bulk-action-bar"
import type { Database } from "@/types/supabase"
import Link from "next/link"

type Alumno = Database["public"]["Tables"]["alumnos"]["Row"]
type Curso = Database["public"]["Tables"]["cursos"]["Row"]

const CSV_COLUMNS = [
  { key: "cod_moodle", label: "Codigo Moodle", required: true },
  { key: "nombres", label: "Nombres", required: true },
  { key: "apellidos", label: "Apellidos", required: true },
  { key: "curso_corto", label: "Curso", required: false },
  { key: "ci", label: "CI", required: false },
  { key: "rude", label: "RUDE", required: false },
  { key: "activo", label: "Activo", required: false },
]

export default function AlumnosPage() {
  const { gestionActual } = useGestion()
  const { toast } = useToast()
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCurso, setFilterCurso] = useState<string>("all")
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  // Edit state
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null)
  const [editForm, setEditForm] = useState({
    nombres: "",
    apellidos: "",
    curso_corto: "",
    ci: "",
    rude: "",
    activo: true,
  })
  
  // Move state
  const [targetCurso, setTargetCurso] = useState("")
  const [isMoving, setIsMoving] = useState(false)
  
  // Delete state
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchData = async () => {
    if (!gestionActual) return
    setIsLoading(true)
    
    try {
      const [alumnosRes, cursosRes] = await Promise.all([
        supabase
          .from("alumnos")
          .select("*")
          .eq("gestion_id", gestionActual.id)
          .order("apellidos", { ascending: true }),
        supabase
          .from("cursos")
          .select("*")
          .eq("gestion_id", gestionActual.id)
          .order("nombre_corto"),
      ])

      if (alumnosRes.data) setAlumnos(alumnosRes.data)
      if (cursosRes.data) setCursos(cursosRes.data)
    } catch (error) {
      console.error("Error al obtener datos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [gestionActual])

  const filteredAlumnos = alumnos.filter((alumno) => {
    const matchesSearch =
      alumno.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.ci?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.rude?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alumno.cod_moodle.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCurso = filterCurso === "all" || alumno.curso_corto === filterCurso
    
    return matchesSearch && matchesCurso
  })

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAlumnos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAlumnos.map((a) => a.cod_moodle)))
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
    
    const response = await fetch("/api/import/alumnos", {
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
  const openEditDialog = (alumno: Alumno) => {
    setEditingAlumno(alumno)
    setEditForm({
      nombres: alumno.nombres,
      apellidos: alumno.apellidos,
      curso_corto: alumno.curso_corto || "",
      ci: alumno.ci || "",
      rude: alumno.rude || "",
      activo: alumno.activo,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingAlumno) return
    setIsSaving(true)
    
    try {
      const { error } = await supabase
        .from("alumnos")
        .update({
          nombres: editForm.nombres,
          apellidos: editForm.apellidos,
          curso_corto: editForm.curso_corto || null,
          ci: editForm.ci || null,
          rude: editForm.rude || null,
          activo: editForm.activo,
        })
        .eq("cod_moodle", editingAlumno.cod_moodle)
      
      if (error) throw error
      
      toast({ title: "Alumno actualizado", description: "Los datos se guardaron correctamente" })
      setEditDialogOpen(false)
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // Move handlers
  const openMoveDialog = () => {
    setTargetCurso("")
    setMoveDialogOpen(true)
  }

  const handleMove = async () => {
    if (!targetCurso || selectedIds.size === 0) return
    setIsMoving(true)
    
    try {
      const { error } = await supabase
        .from("alumnos")
        .update({ curso_corto: targetCurso })
        .in("cod_moodle", Array.from(selectedIds))
      
      if (error) throw error
      
      toast({
        title: "Alumnos movidos",
        description: `${selectedIds.size} alumno(s) movido(s) a ${targetCurso}`,
      })
      setMoveDialogOpen(false)
      setSelectedIds(new Set())
      await fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setIsMoving(false)
    }
  }

  // Delete handlers
  const openDeleteDialog = (alumno?: Alumno) => {
    if (alumno) {
      setSelectedIds(new Set([alumno.cod_moodle]))
    }
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    
    try {
      const { error } = await supabase
        .from("alumnos")
        .delete()
        .in("cod_moodle", Array.from(selectedIds))
      
      if (error) throw error
      
      toast({
        title: "Alumnos eliminados",
        description: `${selectedIds.size} alumno(s) eliminado(s)`,
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
          <h1 className="text-3xl font-bold">Alumnos</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Link href="/alumnos/nuevo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Alumno
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Alumnos ({filteredAlumnos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, CI, codigo..."
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
                          checked={selectedIds.size === filteredAlumnos.length && filteredAlumnos.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Codigo</TableHead>
                      <TableHead>Nombres</TableHead>
                      <TableHead>Apellidos</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>CI</TableHead>
                      <TableHead>RUDE</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlumnos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          No se encontraron alumnos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAlumnos.map((alumno) => (
                        <TableRow
                          key={alumno.cod_moodle}
                          className={selectedIds.has(alumno.cod_moodle) ? "bg-muted/50" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(alumno.cod_moodle)}
                              onCheckedChange={() => toggleSelect(alumno.cod_moodle)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{alumno.cod_moodle}</TableCell>
                          <TableCell>{alumno.nombres}</TableCell>
                          <TableCell>{alumno.apellidos}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{alumno.curso_corto || "-"}</Badge>
                          </TableCell>
                          <TableCell>{alumno.ci || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{alumno.rude || "-"}</TableCell>
                          <TableCell>
                            {alumno.activo ? (
                              <Badge>Activo</Badge>
                            ) : (
                              <Badge variant="destructive">Inactivo</Badge>
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
                                <DropdownMenuItem onClick={() => openEditDialog(alumno)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => openDeleteDialog(alumno)}
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
            label: "Mover de curso",
            icon: <ArrowRightLeft className="mr-2 h-4 w-4" />,
            onClick: openMoveDialog,
          },
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
        title="Importar Alumnos"
        description="Importa alumnos desde un archivo CSV. Descarga la plantilla para ver el formato correcto."
        columns={CSV_COLUMNS}
        templateFileName="plantilla_alumnos.csv"
        onImport={handleImport}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Alumno</DialogTitle>
            <DialogDescription>
              Modifica los datos del alumno {editingAlumno?.cod_moodle}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_nombres">Nombres</Label>
              <Input
                id="edit_nombres"
                value={editForm.nombres}
                onChange={(e) => setEditForm({ ...editForm, nombres: e.target.value })}
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
              <Label htmlFor="edit_curso">Curso</Label>
              <Select
                value={editForm.curso_corto}
                onValueChange={(v) => setEditForm({ ...editForm, curso_corto: v })}
              >
                <SelectTrigger id="edit_curso">
                  <SelectValue placeholder="Seleccionar curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {cursos.map((curso) => (
                    <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                      {curso.nombre_corto} - {curso.nombre_largo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_ci">CI</Label>
                <Input
                  id="edit_ci"
                  value={editForm.ci}
                  onChange={(e) => setEditForm({ ...editForm, ci: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_rude">RUDE</Label>
                <Input
                  id="edit_rude"
                  value={editForm.rude}
                  onChange={(e) => setEditForm({ ...editForm, rude: e.target.value })}
                />
              </div>
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

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover Alumnos de Curso</DialogTitle>
            <DialogDescription>
              Mover {selectedIds.size} alumno(s) seleccionado(s) a otro curso
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="target_curso">Curso destino</Label>
            <Select value={targetCurso} onValueChange={setTargetCurso}>
              <SelectTrigger id="target_curso" className="mt-2">
                <SelectValue placeholder="Seleccionar curso destino" />
              </SelectTrigger>
              <SelectContent>
                {cursos.map((curso) => (
                  <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                    {curso.nombre_corto} - {curso.nombre_largo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMove} disabled={!targetCurso || isMoving}>
              {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mover Alumnos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Alumnos</DialogTitle>
            <DialogDescription>
              Esta accion eliminara {selectedIds.size} alumno(s). Esta accion no se puede deshacer.
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
