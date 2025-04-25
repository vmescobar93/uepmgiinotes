"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"

export default function NuevoProfesorPage() {
  const [formData, setFormData] = useState({
    cod_moodle: "",
    nombre: "",
    apellidos: "",
    ci: "",
    activo: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, activo: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.from("profesores").insert([formData])

      if (error) throw error

      toast({
        title: "Profesor creado",
        description: "El profesor ha sido creado exitosamente.",
      })

      router.push("/profesores")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al crear profesor",
        description: error.message || "Ha ocurrido un error al crear el profesor.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/profesores">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Nuevo Profesor</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información del Profesor</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cod_moodle">Código Moodle</Label>
                  <Input
                    id="cod_moodle"
                    name="cod_moodle"
                    value={formData.cod_moodle}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ci">CI</Label>
                  <Input id="ci" name="ci" value={formData.ci} onChange={handleChange} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input id="apellidos" name="apellidos" value={formData.apellidos} onChange={handleChange} required />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="activo" checked={formData.activo} onCheckedChange={handleSwitchChange} />
                  <Label htmlFor="activo">Activo</Label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Link href="/profesores">
                <Button variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </MainLayout>
  )
}
