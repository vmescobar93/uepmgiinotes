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
import { Loader2 } from "lucide-react"
import { LogoPreview } from "@/components/configuracion/logo-preview"

interface Configuracion {
  id: number
  nombre_institucion: string
  logo_url: string | null
}

export default function ConfiguracionPage() {
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null)
  const [nombreInstitucion, setNombreInstitucion] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchConfiguracion() {
      try {
        setIsLoading(true)
        console.log("Obteniendo configuración...")
        const response = await fetch("/api/configuracion/general")

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al cargar la configuración")
        }

        const data = await response.json()
        console.log("Configuración obtenida:", data)
        setConfiguracion(data)
        setNombreInstitucion(data.nombre_institucion || "")
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

    setIsUploading(true)
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
      setIsUploading(false)
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
                      disabled={isUploading}
                    />
                    <p className="text-sm text-gray-500">Formatos permitidos: PNG, JPG, JPEG. Tamaño máximo: 2MB.</p>
                  </div>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      "Subir Logo"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
