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
import { Loader2, HelpCircle } from "lucide-react"
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
  const { toast } = useToast()

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
        </Tabs>
      </div>
    </MainLayout>
  )
}
