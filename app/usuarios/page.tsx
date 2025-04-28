"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Search, Pencil, Trash2, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Usuario = Database["public"]["Tables"]["usuarios"]["Row"]

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentUsuario, setCurrentUsuario] = useState<Usuario | null>(null)
  const [formData, setFormData] = useState({
    id: "",
    email: "",
    nombre: "",
    apellido: "",
    rol: "transcriptor",
    activo: true,
    password: "",
    confirmPassword: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [resetPasswordData, setResetPasswordData] = useState({
    email: "",
    newPassword: "",
    confirmNewPassword: "",
  })
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const fetchUsuarios = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("usuarios").select("*").order("nombre", { ascending: true })

      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error("Error al obtener usuarios:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleResetPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setResetPasswordData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, activo: checked }))
  }

  const handleRolChange = (value: string) => {
    setFormData((prev) => ({ ...prev, rol: value }))
  }

  const resetForm = () => {
    setFormData({
      id: "",
      email: "",
      nombre: "",
      apellido: "",
      rol: "transcriptor",
      activo: true,
      password: "",
      confirmPassword: "",
    })
    setIsEditing(false)
    setCurrentUsuario(null)
  }

  const openNewDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (usuario: Usuario) => {
    setCurrentUsuario(usuario)
    setFormData({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre.split(" ")[0] || "",
      apellido: usuario.nombre.split(" ").slice(1).join(" ") || "",
      rol: usuario.rol,
      activo: usuario.activo,
      password: "",
      confirmPassword: "",
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const openResetPasswordDialog = (usuario: Usuario) => {
    setResetPasswordData({
      email: usuario.email,
      newPassword: "",
      confirmNewPassword: "",
    })
    setIsResetDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const nombreCompleto = `${formData.nombre} ${formData.apellido}`.trim()

      // Validar contraseñas si es un nuevo usuario
      if (!isEditing && formData.password !== formData.confirmPassword) {
        throw new Error("Las contraseñas no coinciden")
      }

      if (!isEditing && formData.password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      if (isEditing && currentUsuario) {
        // Actualizar usuario existente
        const { error } = await supabase
          .from("usuarios")
          .update({
            email: formData.email,
            nombre: nombreCompleto,
            rol: formData.rol,
            activo: formData.activo,
          })
          .eq("id", currentUsuario.id)

        if (error) throw error

        // Si se proporcionó una nueva contraseña, actualizarla
        if (formData.password && formData.password === formData.confirmPassword) {
          // Llamar a la API para actualizar la contraseña
          const response = await fetch("/api/usuarios/update-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
            }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.error || "Error al actualizar la contraseña")
          }
        }

        toast({
          title: "Usuario actualizado",
          description: "El usuario ha sido actualizado exitosamente.",
        })
      } else {
        // Crear nuevo usuario con autenticación
        const response = await fetch("/api/usuarios/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nombre: nombreCompleto,
            rol: formData.rol,
            activo: formData.activo,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Error al crear el usuario")
        }

        toast({
          title: "Usuario creado",
          description: "El usuario ha sido creado exitosamente.",
        })
      }

      // Cerrar diálogo y actualizar lista
      setIsDialogOpen(false)
      fetchUsuarios()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ha ocurrido un error al guardar el usuario.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsResettingPassword(true)

    try {
      if (resetPasswordData.newPassword !== resetPasswordData.confirmNewPassword) {
        throw new Error("Las contraseñas no coinciden")
      }

      if (resetPasswordData.newPassword.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      // Llamar a la API para restablecer la contraseña
      const response = await fetch("/api/usuarios/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: resetPasswordData.email,
          password: resetPasswordData.newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al restablecer la contraseña")
      }

      toast({
        title: "Contraseña restablecida",
        description: "La contraseña ha sido restablecida exitosamente.",
      })

      setIsResetDialogOpen(false)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ha ocurrido un error al restablecer la contraseña.",
      })
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este usuario?")) return

    try {
      // Primero obtener el email del usuario
      const { data: userData, error: userError } = await supabase.from("usuarios").select("email").eq("id", id).single()

      if (userError) throw userError

      // Eliminar el usuario de la tabla usuarios
      const { error } = await supabase.from("usuarios").delete().eq("id", id)

      if (error) throw error

      // Llamar a la API para eliminar el usuario de autenticación
      if (userData?.email) {
        const response = await fetch("/api/usuarios/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userData.email,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          console.error("Error al eliminar usuario de autenticación:", data.error)
          // No lanzamos error aquí para no interrumpir el flujo si falla la eliminación de autenticación
        }
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente.",
      })

      fetchUsuarios()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ha ocurrido un error al eliminar el usuario.",
      })
    }
  }

  const filteredUsuarios = usuarios.filter(
    (usuario) =>
      usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.rol.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <Button onClick={openNewDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
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
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsuarios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No se encontraron usuarios.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsuarios.map((usuario) => (
                        <TableRow key={usuario.id}>
                          <TableCell>{usuario.nombre}</TableCell>
                          <TableCell>{usuario.email}</TableCell>
                          <TableCell>
                            <Badge variant={usuario.rol === "admin" ? "default" : "outline"}>
                              {usuario.rol === "admin"
                                ? "Administrador"
                                : usuario.rol === "transcriptor"
                                  ? "Transcriptor"
                                  : usuario.rol}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {usuario.activo ? <Badge>Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openResetPasswordDialog(usuario)}
                                title="Restablecer contraseña"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(usuario)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(usuario.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      {/* Diálogo para crear/editar usuario */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Actualice los datos del usuario." : "Complete los datos para crear un nuevo usuario."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="password">Contraseña</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nombre" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apellido" className="text-right">
                    Apellido
                  </Label>
                  <Input
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                    disabled={isEditing} // No permitir cambiar el email en edición
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rol" className="text-right">
                    Rol
                  </Label>
                  <Select value={formData.rol} onValueChange={handleRolChange}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="transcriptor">Transcriptor</SelectItem>
                      <SelectItem value="profesor">Profesor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="activo" className="text-right">
                    Activo
                  </Label>
                  <div className="col-span-3 flex items-center">
                    <Switch id="activo" checked={formData.activo} onCheckedChange={handleSwitchChange} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="password" className="space-y-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="col-span-3"
                    required={!isEditing} // Requerido solo para nuevos usuarios
                    minLength={6}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="confirmPassword" className="text-right">
                    Confirmar Contraseña
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="col-span-3"
                    required={!isEditing} // Requerido solo para nuevos usuarios
                    minLength={6}
                  />
                </div>
                {isEditing && (
                  <p className="text-sm text-muted-foreground col-span-4 text-center">
                    Deje los campos en blanco si no desea cambiar la contraseña.
                  </p>
                )}
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo para restablecer contraseña */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Restablecer Contraseña</DialogTitle>
            <DialogDescription>Ingrese la nueva contraseña para el usuario.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={resetPasswordData.email}
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newPassword" className="text-right">
                  Nueva Contraseña
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={handleResetPasswordChange}
                  className="col-span-3"
                  required
                  minLength={6}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirmNewPassword" className="text-right">
                  Confirmar Contraseña
                </Label>
                <Input
                  id="confirmNewPassword"
                  name="confirmNewPassword"
                  type="password"
                  value={resetPasswordData.confirmNewPassword}
                  onChange={handleResetPasswordChange}
                  className="col-span-3"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsResetDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isResettingPassword}>
                {isResettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restableciendo...
                  </>
                ) : (
                  "Restablecer Contraseña"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
