"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, HelpCircle, Download, Upload, Trash2, AlertTriangle, FileSpreadsheet, FileText, Calendar, Copy, Plus, Check } from "lucide-react"
import { useGestion, type Gestion } from "@/context/gestion-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LogoPreview } from "@/components/configuracion/logo-preview"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { PiePaginaPreview } from "@/components/configuracion/pie-pagina-preview"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Configuracion {
  id: number
  nombre_institucion: string
  logo_url: string | null
  pie_pagina_url: string | null
  pie_pagina_altura: number
  pie_pagina_ajuste: string
}

export default function ConfiguracionPage() {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null)
  const [nombreInstitucion, setNombreInstitucion] = useState("")
  const [piePaginaAltura, setPiePaginaAltura] = useState(80)
  const [piePaginaAjuste, setPiePaginaAjuste] = useState("proporcional")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingPiePagina, setIsUploadingPiePagina] = useState(false)
  const [isSavingPiePaginaConfig, setIsSavingPiePaginaConfig] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [backupStats, setBackupStats] = useState<any>(null)
  const [selectedTable, setSelectedTable] = useState<string>("all")
  const [exportFormat, setExportFormat] = useState<string>("xlsx")
  const [isExportingTable, setIsExportingTable] = useState(false)
  
  // Estado para gestiones
  const { gestionActual, gestiones, refetchGestiones } = useGestion()
  const [newGestionAnio, setNewGestionAnio] = useState<number>(new Date().getFullYear() + 1)
  const [sourceGestionId, setSourceGestionId] = useState<string>("")
  const [isCopyingGestion, setIsCopyingGestion] = useState(false)
  const [isCreatingGestion, setIsCreatingGestion] = useState(false)
  const [copyOptions, setCopyOptions] = useState({
    cursos: true,
    materias: true,
    areas: true,
    profesores: true,
    alumnos: true,
    promoverAlumnos: true,
    asignaciones: true,
    agrupaciones: true
  })
  
  const { toast } = useToast()

  const TABLES = [
    { value: "all", label: "Todas las tablas" },
    { value: "cursos", label: "Cursos" },
    { value: "areas", label: "Areas" },
    { value: "profesores", label: "Profesores" },
    { value: "alumnos", label: "Alumnos" },
    { value: "materias", label: "Materias" },
    { value: "materias_profesores", label: "Asignaciones (Materias-Profesores)" },
    { value: "calificaciones", label: "Calificaciones" },
    { value: "agrupaciones_materias", label: "Agrupaciones de Materias" },
    { value: "configuracion", label: "Configuracion" },
    { value: "usuarios", label: "Usuarios" },
  ]

  useEffect(() => {
    async function fetchConfiguracion() {
      try {
        setIsLoading(true)
        console.log("Obteniendo configuración...")
        const response = await fetch("/api/configuracion/get")

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al cargar la configuración")
        }

        const data = await response.json()
        console.log("Configuración obtenida:", data)
        setConfiguracion(data)
        setNombreInstitucion(data.nombre_institucion || "")
        setPiePaginaAltura(data.pie_pagina_altura || 80)
        setPiePaginaAjuste(data.pie_pagina_ajuste || "proporcional")
      } catch (error: any) {
        console.error("Error:", error)
        toast({
          title: "Error",
          description: error.message || "No se pudo cargar la configuración",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfiguracion()
  }, [toast])

  const handleSaveConfig = async () => {
    if (!nombreInstitucion.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la institución no puede estar vacío",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/configuracion/general", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre_institucion: nombreInstitucion }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al guardar la configuración")
      }

      const data = await response.json()
      setConfiguracion(data)
      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente",
      })
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadLogo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement

    if (!fileInput.files || fileInput.files.length === 0) {
      toast({
        title: "Error",
        description: "Por favor seleccione un archivo",
        variant: "destructive",
      })
      return
    }

    setIsUploadingLogo(true)
    try {
      console.log("Subiendo logo...")
      const response = await fetch("/api/configuracion/logo", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al subir el logo")
      }

      const data = await response.json()
      console.log("Logo subido:", data)
      setConfiguracion((prev) => (prev ? { ...prev, logo_url: data.logo_url } : null))
      toast({
        title: "Logo actualizado",
        description: "El logo se ha actualizado correctamente",
      })

      // Limpiar el input de archivo
      fileInput.value = ""
    } catch (error: any) {
      console.error("Error al subir logo:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo subir el logo",
        variant: "destructive",
      })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleUploadPiePagina = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement

    if (!fileInput.files || fileInput.files.length === 0) {
      toast({
        title: "Error",
        description: "Por favor seleccione un archivo",
        variant: "destructive",
      })
      return
    }

    setIsUploadingPiePagina(true)
    try {
      console.log("Subiendo imagen de pie de página...")
      const response = await fetch("/api/configuracion/pie-pagina", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al subir la imagen")
      }

      const data = await response.json()
      console.log("Imagen de pie de página subida:", data)
      setConfiguracion((prev) => (prev ? { ...prev, pie_pagina_url: data.pie_pagina_url } : null))
      toast({
        title: "Imagen actualizada",
        description: "La imagen de pie de página se ha actualizado correctamente",
      })

      // Limpiar el input de archivo
      fileInput.value = ""
    } catch (error: any) {
      console.error("Error al subir imagen de pie de página:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo subir la imagen",
        variant: "destructive",
      })
    } finally {
      setIsUploadingPiePagina(false)
    }
  }

  const handleExportBackup = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/backup/export")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al exportar backup")
      }

      const backup = await response.json()
      setBackupStats(backup.estadisticas)

      // Crear y descargar el archivo
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `backup_gestion_${backup.gestion}_${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Backup exportado",
        description: `Se ha descargado el backup de la gestión ${backup.gestion}`,
      })
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo exportar el backup",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsRestoring(true)
    try {
      const content = await file.text()
      const backup = JSON.parse(content)

      if (!backup.version || !backup.datos) {
        throw new Error("El archivo no tiene el formato correcto de backup")
      }

      const confirmRestore = window.confirm(
        `¿Está seguro de restaurar el backup de la gestión ${backup.gestion}?\n\n` +
        `Fecha del backup: ${new Date(backup.fecha_backup).toLocaleString()}\n\n` +
        `Esto reemplazará TODOS los datos actuales:\n` +
        `- ${backup.estadisticas?.total_alumnos || 0} alumnos\n` +
        `- ${backup.estadisticas?.total_profesores || 0} profesores\n` +
        `- ${backup.estadisticas?.total_calificaciones || 0} calificaciones\n\n` +
        `Esta acción no se puede deshacer.`
      )

      if (!confirmRestore) {
        setIsRestoring(false)
        e.target.value = ""
        return
      }

      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.errores?.join(", ") || "Error al restaurar")
      }

      toast({
        title: "Backup restaurado",
        description: `Se han restaurado los datos de la gestión ${backup.gestion}`,
      })

      // Recargar la página para mostrar los nuevos datos
      window.location.reload()
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo restaurar el backup",
        variant: "destructive",
      })
    } finally {
      setIsRestoring(false)
      e.target.value = ""
    }
  }

  const handleExportTable = async () => {
    setIsExportingTable(true)
    try {
      const format = selectedTable === "all" ? "xlsx" : exportFormat
      const url = `/api/backup/export-table?table=${selectedTable}&format=${format}`
      
      // Usar un enlace directo para descargar
      const link = document.createElement("a")
      link.href = url
      link.download = ""
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Exportacion iniciada",
        description: `Descargando ${selectedTable === "all" ? "todas las tablas" : selectedTable} en formato ${format.toUpperCase()}`,
      })
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo exportar",
        variant: "destructive",
      })
    } finally {
      setIsExportingTable(false)
    }
  }

  const handleCreateGestion = async () => {
    setIsCreatingGestion(true)
    try {
      const response = await fetch("/api/gestiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anio: newGestionAnio }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al crear gestión")
      }

      toast({
        title: "Gestión creada",
        description: `Se ha creado la Gestión ${newGestionAnio}`,
      })

      await refetchGestiones()
      setNewGestionAnio(newGestionAnio + 1)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la gestión",
        variant: "destructive",
      })
    } finally {
      setIsCreatingGestion(false)
    }
  }

  const handleCopyGestion = async () => {
    if (!sourceGestionId) {
      toast({
        title: "Error",
        description: "Seleccione una gestión de origen",
        variant: "destructive",
      })
      return
    }

    setIsCopyingGestion(true)
    try {
      const response = await fetch("/api/gestiones/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceGestionId: parseInt(sourceGestionId),
          newAnio: newGestionAnio,
          copyOptions
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al copiar gestión")
      }

      toast({
        title: "Gestión copiada",
        description: `Se ha creado la Gestión ${newGestionAnio} con ${result.stats.cursos} cursos, ${result.stats.materias} materias, ${result.stats.profesores} profesores y ${result.stats.alumnos} alumnos.`,
      })

      await refetchGestiones()
      setNewGestionAnio(newGestionAnio + 1)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo copiar la gestión",
        variant: "destructive",
      })
    } finally {
      setIsCopyingGestion(false)
    }
  }

  const handleSetGestionActiva = async (gestionId: number) => {
    try {
      const response = await fetch("/api/gestiones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: gestionId, activa: true }),
      })

      if (!response.ok) {
        throw new Error("Error al actualizar gestión")
      }

      toast({
        title: "Gestión actualizada",
        description: "La gestión activa ha sido actualizada",
      })

      await refetchGestiones()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleClearGestion = async () => {
    const confirmClear = window.confirm(
      "¿Está seguro de limpiar los datos de la gestión actual?\n\n" +
      "Esto eliminará:\n" +
      "- TODAS las calificaciones\n\n" +
      "Se mantendrán:\n" +
      "- Cursos, Materias, Profesores, Alumnos\n" +
      "- Configuración del sistema\n\n" +
      "Esta acción no se puede deshacer. Se recomienda hacer un backup primero."
    )

    if (!confirmClear) return

    setIsClearing(true)
    try {
      const response = await fetch("/api/backup/clear-gestion", {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error al limpiar datos")
      }

      toast({
        title: "Gestión limpiada",
        description: "Se han eliminado las calificaciones. El sistema está listo para la nueva gestión.",
      })
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo limpiar la gestión",
        variant: "destructive",
      })
    } finally {
      setIsClearing(false)
    }
  }

  const handleSavePiePaginaConfig = async () => {
    setIsSavingPiePaginaConfig(true)
    try {
      const response = await fetch("/api/configuracion/pie-pagina-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pie_pagina_altura: piePaginaAltura,
          pie_pagina_ajuste: piePaginaAjuste,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al guardar la configuración")
      }

      const data = await response.json()
      setConfiguracion((prev) => (prev ? { ...prev, ...data } : null))
      toast({
        title: "Configuración guardada",
        description: "Los ajustes de la imagen de pie de página se han guardado correctamente",
      })
    } catch (error: any) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsSavingPiePaginaConfig(false)
    }
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Configuración del Sistema</h1>

        <Tabs defaultValue="general">
          <TabsList className="mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
            <TabsTrigger value="gestiones">Gestiones</TabsTrigger>
            <TabsTrigger value="backup">Backup / Datos</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>Configure los ajustes generales del sistema académico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre_institucion">Nombre de la Institución</Label>
                  <Input
                    id="nombre_institucion"
                    value={nombreInstitucion}
                    onChange={(e) => setNombreInstitucion(e.target.value)}
                    placeholder="Nombre de la institución"
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveConfig} disabled={isLoading || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Configuración"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="apariencia">
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personalice la apariencia del sistema académico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Logo Actual</Label>
                  <LogoPreview logoUrl={configuracion?.logo_url || null} className="mx-auto" height={150} width={300} />
                </div>

                <form onSubmit={handleUploadLogo} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="logo">Subir Nuevo Logo</Label>
                    <Input
                      id="logo"
                      name="logo"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      disabled={isUploadingLogo}
                    />
                    <p className="text-sm text-gray-500">Formatos permitidos: PNG, JPG, JPEG. Tamaño máximo: 2MB.</p>
                  </div>
                  <Button type="submit" disabled={isUploadingLogo}>
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      "Subir Logo"
                    )}
                  </Button>
                </form>

                <div className="border-t pt-6 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Imagen de Pie de Página Actual</Label>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-1">
                            <HelpCircle className="h-4 w-4" />
                            <span>Ayuda</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Recomendaciones para la imagen de pie de página</DialogTitle>
                            <DialogDescription>
                              Consejos para obtener los mejores resultados con la imagen de pie de página
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <h3 className="text-lg font-medium">Dimensiones recomendadas</h3>
                            <p>
                              Para obtener los mejores resultados, recomendamos usar una imagen con las siguientes
                              características:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                              <li>
                                <strong>Proporción:</strong> Aproximadamente 5:1 (ancho:alto). Por ejemplo, si la imagen
                                tiene 1000px de ancho, debería tener alrededor de 200px de alto.
                              </li>
                              <li>
                                <strong>Resolución:</strong> Al menos 1000px de ancho para mantener buena calidad en el
                                PDF.
                              </li>
                              <li>
                                <strong>Formato:</strong> PNG o JPG con fondo transparente o blanco.
                              </li>
                            </ul>

                            <h3 className="text-lg font-medium mt-6">Tipos de ajuste</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="border rounded-md p-4 space-y-2">
                                <h4 className="font-medium">Proporcional</h4>
                                <p className="text-sm text-gray-600">
                                  Mantiene la proporción de la imagen y la ajusta para que no exceda la altura máxima ni
                                  el ancho de la página.
                                </p>
                                <p className="text-sm text-blue-600">Recomendado para la mayoría de los casos.</p>
                              </div>
                              <div className="border rounded-md p-4 space-y-2">
                                <h4 className="font-medium">Altura Fija</h4>
                                <p className="text-sm text-gray-600">
                                  Establece una altura específica para la imagen y ajusta el ancho proporcionalmente.
                                </p>
                                <p className="text-sm text-blue-600">
                                  Útil cuando necesitas controlar exactamente la altura.
                                </p>
                              </div>
                              <div className="border rounded-md p-4 space-y-2">
                                <h4 className="font-medium">Ancho Completo</h4>
                                <p className="text-sm text-gray-600">
                                  Extiende la imagen al ancho completo de la página y ajusta la altura
                                  proporcionalmente.
                                </p>
                                <p className="text-sm text-blue-600">
                                  Ideal para imágenes que deben ocupar todo el ancho disponible.
                                </p>
                              </div>
                            </div>

                            <h3 className="text-lg font-medium mt-6">Ejemplo de imagen ideal</h3>
                            <div className="border rounded-md p-4">
                              <div className="bg-gray-100 h-24 flex items-center justify-center">
                                <div className="bg-gray-300 w-5/6 h-16 flex items-center justify-center">
                                  <p className="text-gray-600 text-sm">Proporción aproximada 5:1</p>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 mt-2 text-center">
                                Una imagen con esta proporción se ajustará perfectamente como pie de página
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {configuracion?.pie_pagina_url ? (
                      <div className="mx-auto border rounded-md p-2 max-w-xl">
                        <img
                          src={configuracion.pie_pagina_url || "/placeholder.svg"}
                          alt="Pie de página"
                          className="w-full h-auto"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            console.error("Error al cargar la imagen de pie de página")
                            e.currentTarget.style.display = "none"
                            e.currentTarget.parentElement!.innerHTML +=
                              '<p class="text-red-500 text-sm">Error al cargar la imagen</p>'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center bg-gray-100 rounded-md border border-dashed border-gray-300 h-24 mx-auto max-w-xl">
                        <p className="text-gray-500 text-sm">No hay imagen de pie de página</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleUploadPiePagina} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="pie_pagina">Subir Nueva Imagen de Pie de Página</Label>
                      <Input
                        id="pie_pagina"
                        name="pie_pagina"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        disabled={isUploadingPiePagina}
                      />
                      <p className="text-sm text-gray-500">
                        Esta imagen reemplazará las líneas de firma en los boletines. Formatos permitidos: PNG, JPG,
                        JPEG. Tamaño máximo: 2MB.
                      </p>
                      <p className="text-sm text-blue-600">
                        Recomendación: Use una imagen con proporción aproximada de 5:1 (ancho:alto) para mejores
                        resultados.
                      </p>
                    </div>
                    <Button type="submit" disabled={isUploadingPiePagina}>
                      {isUploadingPiePagina ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        "Subir Imagen de Pie de Página"
                      )}
                    </Button>
                  </form>

                  {configuracion?.pie_pagina_url && (
                    <div className="mt-6 space-y-4 border-t pt-6">
                      <h3 className="text-lg font-medium">Ajustes de la Imagen de Pie de Página</h3>

                      {/* Vista previa del pie de página */}
                      <div className="mb-6">
                        <Label className="mb-2 block">Vista Previa</Label>
                        <PiePaginaPreview
                          imageUrl={configuracion.pie_pagina_url}
                          altura={piePaginaAltura}
                          ajuste={piePaginaAjuste}
                          className="mx-auto"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pie_pagina_ajuste">Tipo de Ajuste</Label>
                        <Select value={piePaginaAjuste} onValueChange={setPiePaginaAjuste} disabled={isLoading}>
                          <SelectTrigger id="pie_pagina_ajuste" className="w-full">
                            <SelectValue placeholder="Seleccione un tipo de ajuste" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="proporcional">Proporcional (mantiene aspecto)</SelectItem>
                            <SelectItem value="altura_fija">Altura Fija</SelectItem>
                            <SelectItem value="ancho_completo">Ancho Completo</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-500">Define cómo se ajustará la imagen en el documento.</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="pie_pagina_altura">Altura de la Imagen (px)</Label>
                          <span className="text-sm font-medium">{piePaginaAltura}px</span>
                        </div>
                        <Slider
                          id="pie_pagina_altura"
                          min={30}
                          max={200}
                          step={5}
                          value={[piePaginaAltura]}
                          onValueChange={(values) => setPiePaginaAltura(values[0])}
                          disabled={isLoading || piePaginaAjuste === "ancho_completo"}
                          className={piePaginaAjuste === "ancho_completo" ? "opacity-50" : ""}
                        />
                        <p className="text-sm text-gray-500">
                          {piePaginaAjuste === "ancho_completo"
                            ? "La altura se ajustará automáticamente al usar ancho completo."
                            : "Ajusta la altura de la imagen en el documento."}
                        </p>
                      </div>

                      <Button
                        onClick={handleSavePiePaginaConfig}
                        disabled={isLoading || isSavingPiePaginaConfig}
                        className="mt-2"
                      >
                        {isSavingPiePaginaConfig ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          "Guardar Ajustes de Imagen"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
</TabsContent>

          <TabsContent value="gestiones">
            <div className="space-y-6">
              {/* Lista de Gestiones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Gestiones Registradas
                  </CardTitle>
                  <CardDescription>
                    Gestiones (años escolares) disponibles en el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gestiones.map((gestion) => (
                      <div
                        key={gestion.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          gestion.activa ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{gestion.nombre}</p>
                            <p className="text-sm text-muted-foreground">Año {gestion.anio}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {gestion.activa ? (
                            <span className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                              <Check className="h-3 w-3" />
                              Activa
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetGestionActiva(gestion.id)}
                            >
                              Establecer como activa
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {gestiones.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        No hay gestiones registradas
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Crear Nueva Gestión */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Crear Nueva Gestión
                  </CardTitle>
                  <CardDescription>
                    Crea una nueva gestión vacía o copia datos de una gestión existente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="new_gestion_anio">Año de la nueva gestión</Label>
                      <Input
                        id="new_gestion_anio"
                        type="number"
                        min={2020}
                        max={2100}
                        value={newGestionAnio}
                        onChange={(e) => setNewGestionAnio(parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="source_gestion">Copiar datos desde (opcional)</Label>
                      <Select value={sourceGestionId} onValueChange={setSourceGestionId}>
                        <SelectTrigger id="source_gestion">
                          <SelectValue placeholder="Crear vacía (sin copiar)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="empty">Crear vacía (sin copiar)</SelectItem>
                          {gestiones.map((gestion) => (
                            <SelectItem key={gestion.id} value={gestion.id.toString()}>
                              {gestion.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {sourceGestionId && sourceGestionId !== "empty" && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <p className="text-sm font-medium">Opciones de copia</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="copy_cursos"
                            checked={copyOptions.cursos}
                            onCheckedChange={(checked) =>
                              setCopyOptions((prev) => ({ ...prev, cursos: checked as boolean }))
                            }
                          />
                          <Label htmlFor="copy_cursos" className="text-sm">Cursos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="copy_materias"
                            checked={copyOptions.materias}
                            onCheckedChange={(checked) =>
                              setCopyOptions((prev) => ({ ...prev, materias: checked as boolean }))
                            }
                          />
                          <Label htmlFor="copy_materias" className="text-sm">Materias</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="copy_areas"
                            checked={copyOptions.areas}
                            onCheckedChange={(checked) =>
                              setCopyOptions((prev) => ({ ...prev, areas: checked as boolean }))
                            }
                          />
                          <Label htmlFor="copy_areas" className="text-sm">Áreas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="copy_profesores"
                            checked={copyOptions.profesores}
                            onCheckedChange={(checked) =>
                              setCopyOptions((prev) => ({ ...prev, profesores: checked as boolean }))
                            }
                          />
                          <Label htmlFor="copy_profesores" className="text-sm">Profesores</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="copy_asignaciones"
                            checked={copyOptions.asignaciones}
                            onCheckedChange={(checked) =>
                              setCopyOptions((prev) => ({ ...prev, asignaciones: checked as boolean }))
                            }
                          />
                          <Label htmlFor="copy_asignaciones" className="text-sm">Asignaciones Profesor-Materia</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="copy_agrupaciones"
                            checked={copyOptions.agrupaciones}
                            onCheckedChange={(checked) =>
                              setCopyOptions((prev) => ({ ...prev, agrupaciones: checked as boolean }))
                            }
                          />
                          <Label htmlFor="copy_agrupaciones" className="text-sm">Agrupaciones de Materias</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="copy_alumnos"
                            checked={copyOptions.alumnos}
                            onCheckedChange={(checked) =>
                              setCopyOptions((prev) => ({ ...prev, alumnos: checked as boolean }))
                            }
                          />
                          <Label htmlFor="copy_alumnos" className="text-sm">Alumnos</Label>
                        </div>
                        {copyOptions.alumnos && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="promover_alumnos"
                              checked={copyOptions.promoverAlumnos}
                              onCheckedChange={(checked) =>
                                setCopyOptions((prev) => ({ ...prev, promoverAlumnos: checked as boolean }))
                              }
                            />
                            <Label htmlFor="promover_alumnos" className="text-sm">Promover alumnos al siguiente curso</Label>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2">
                  {(!sourceGestionId || sourceGestionId === "empty") ? (
                    <Button onClick={handleCreateGestion} disabled={isCreatingGestion}>
                      {isCreatingGestion ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Crear Gestión Vacía
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={handleCopyGestion} disabled={isCopyingGestion}>
                      {isCopyingGestion ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Copiando...
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar y Crear Gestión {newGestionAnio}
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="backup">
            <div className="space-y-6">
              {/* Exportar Backup */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Exportar Backup
                  </CardTitle>
                  <CardDescription>
                    Descarga un archivo con todos los datos del sistema para respaldarlo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    El backup incluye: cursos, materias, profesores, alumnos, calificaciones, 
                    asignaciones y configuración del sistema.
                  </p>
                  {backupStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{backupStats.total_alumnos}</p>
                        <p className="text-sm text-muted-foreground">Alumnos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{backupStats.total_profesores}</p>
                        <p className="text-sm text-muted-foreground">Profesores</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{backupStats.total_materias}</p>
                        <p className="text-sm text-muted-foreground">Materias</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{backupStats.total_calificaciones}</p>
                        <p className="text-sm text-muted-foreground">Calificaciones</p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={handleExportBackup} disabled={isExporting}>
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Descargar Backup (JSON)
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Exportar a Excel/CSV */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Exportar a Excel / CSV
                  </CardTitle>
                  <CardDescription>
                    Exporta tablas individuales o todas las tablas en formato Excel o CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="export_table">Tabla a exportar</Label>
                      <Select value={selectedTable} onValueChange={setSelectedTable}>
                        <SelectTrigger id="export_table">
                          <SelectValue placeholder="Seleccione una tabla" />
                        </SelectTrigger>
                        <SelectContent>
                          {TABLES.map((table) => (
                            <SelectItem key={table.value} value={table.value}>
                              {table.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedTable !== "all" && (
                      <div className="space-y-2">
                        <Label htmlFor="export_format">Formato</Label>
                        <Select value={exportFormat} onValueChange={setExportFormat}>
                          <SelectTrigger id="export_format">
                            <SelectValue placeholder="Seleccione formato" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="xlsx">
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4" />
                                Excel (.xlsx)
                              </div>
                            </SelectItem>
                            <SelectItem value="csv">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                CSV (.csv)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {selectedTable === "all" && (
                    <p className="text-sm text-muted-foreground">
                      Al exportar todas las tablas, se generara un archivo Excel con una hoja por cada tabla.
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={handleExportTable} disabled={isExportingTable}>
                    {isExportingTable ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Exportar {selectedTable === "all" ? "Todo (Excel)" : exportFormat.toUpperCase()}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Restaurar Backup */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Restaurar Backup
                  </CardTitle>
                  <CardDescription>
                    Carga un archivo de backup para restaurar los datos del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Advertencia</AlertTitle>
                    <AlertDescription>
                      Restaurar un backup reemplazará TODOS los datos actuales del sistema.
                      Esta acción no se puede deshacer.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="backup_file">Archivo de Backup</Label>
                    <Input
                      id="backup_file"
                      type="file"
                      accept=".json"
                      onChange={handleRestoreBackup}
                      disabled={isRestoring}
                    />
                    <p className="text-sm text-muted-foreground">
                      Seleccione un archivo .json de backup generado anteriormente
                    </p>
                  </div>
                  {isRestoring && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Restaurando datos... Por favor espere
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cambio de Gestión */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Cambio de Gestión
                  </CardTitle>
                  <CardDescription>
                    Prepara el sistema para una nueva gestión escolar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Recomendación</AlertTitle>
                    <AlertDescription>
                      Antes de limpiar los datos, asegúrese de haber descargado un backup completo
                      de la gestión actual.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Esta acción eliminará:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Todas las calificaciones registradas</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Se mantendrán:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Cursos y materias</li>
                      <li>Profesores y sus asignaciones</li>
                      <li>Lista de alumnos</li>
                      <li>Configuración del sistema</li>
                    </ul>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="destructive" onClick={handleClearGestion} disabled={isClearing}>
                    {isClearing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Limpiando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Limpiar para Nueva Gestión
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
