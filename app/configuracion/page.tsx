"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Upload, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function ConfiguracionPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [nombreInstitucion, setNombreInstitucion] = useState("U.E. Plena María Goretti II")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Cargar configuración existente
  useEffect(() => {
    const fetchConfiguracion = async () => {
      try {
        // Obtener la configuración de la institución
        const { data: configData } = await supabase.from("configuracion").select("*").single()

        if (configData) {
          if (configData.nombre_institucion) {
            setNombreInstitucion(configData.nombre_institucion)
          }

          if (configData.logo_url) {
            setLogoUrl(configData.logo_url)
          }
        }
      } catch (error) {
        console.error("Error al cargar configuración:", error)
      }
    }

    fetchConfiguracion()
  }, [])

  // Manejar cambio de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      // Validar que sea una imagen
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El archivo debe ser una imagen (PNG, JPG, JPEG).",
        })
        return
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "La imagen no debe superar los 2MB.",
        })
        return
      }

      setLogoFile(file)

      // Mostrar vista previa
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // Subir logo usando la API
  const handleUploadLogo = async () => {
    if (!logoFile) return

    setIsUploading(true)

    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData()
      formData.append("logo", logoFile)

      // Enviar a la API
      const response = await fetch("/api/configuracion/logo", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al subir el logo")
      }

      // Actualizar la URL del logo
      setLogoUrl(data.logo_url)

      toast({
        title: "Logo actualizado",
        description: "El logo se ha actualizado correctamente.",
      })
    } catch (error: any) {
      console.error("Error al subir logo:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo subir el logo.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Guardar configuración general usando la API
  const handleSaveConfig = async () => {
    setIsSaving(true)

    try {
      // Enviar a la API
      const response = await fetch("/api/configuracion/general", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nombre_institucion: nombreInstitucion }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar la configuración")
      }

      toast({
        title: "Configuración guardada",
        description: "La configuración se ha guardado correctamente.",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo guardar la configuración.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Configuración</h1>

        <Tabs defaultValue="general">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="apariencia">Apariencia</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                <CardDescription>Configura los datos generales de la institución.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre-institucion">Nombre de la Institución</Label>
                  <Input
                    id="nombre-institucion"
                    value={nombreInstitucion}
                    onChange={(e) => setNombreInstitucion(e.target.value)}
                  />
                </div>

                <Button onClick={handleSaveConfig} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Configuración
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apariencia" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Logo Institucional</CardTitle>
                <CardDescription>Sube el logo de la institución para los reportes y documentos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {logoUrl && (
                  <div className="mb-4 flex justify-center">
                    <div className="overflow-hidden rounded-md border p-2">
                      <img
                        src={logoUrl || "/placeholder.svg"}
                        alt="Logo institucional"
                        className="h-32 w-auto object-contain"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="logo">Seleccionar Logo</Label>
                  <Input id="logo" type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleFileChange} />
                  <p className="text-xs text-muted-foreground">
                    Formatos permitidos: PNG, JPG, JPEG. Tamaño máximo: 2MB.
                  </p>
                </div>

                <Button onClick={handleUploadLogo} disabled={!logoFile || isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Subir Logo
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
