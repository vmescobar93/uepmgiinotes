"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function NuevaMateriaPage() {
  const [formData, setFormData] = useState({
    codigo: "",
    nombre_corto: "",
    nombre_largo: "",
    curso_corto: "",
  })
  const [cursos, setCursos] = useState<{ nombre_corto: string; nombre_largo: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchCursos = async () => {
      const { data } = await supabase.from("cursos").select("nombre_corto, nombre_largo")
      if (data) setCursos(data)
    }
    fetchCursos()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, curso_corto: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.from("materias").insert([formData])

      if (error) throw error

      toast({
        title: "Materia creada",
        description: "La materia ha sido creada exitosamente.",
      })

      router.push("/materias")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al crear materia",
        description: error.message || "Ha ocurrido un error al crear la materia.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/materias">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Nueva Materia</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información de la Materia</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código</Label>
                  <Input id="codigo" name="codigo" value={formData.codigo} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="curso_corto">Curso</Label>
                  <Select onValueChange={handleSelectChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {cursos.map((curso) => (
                        <SelectItem key={curso.nombre_corto} value={curso.nombre_corto}>
                          {curso.nombre_largo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre_corto">Nombre Corto</Label>
                  <Input
                    id="nombre_corto"
                    name="nombre_corto"
                    value={formData.nombre_corto}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nombre_largo">Nombre Largo</Label>
                  <Input
                    id="nombre_largo"
                    name="nombre_largo"
                    value={formData.nombre_largo}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Link href="/materias">
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
