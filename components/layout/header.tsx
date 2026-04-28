"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useGestion } from "@/context/gestion-context"
import { Menu, LogOut, Calendar } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { signOut, user } = useAuth()
  const { gestionActual, gestiones, setGestionActual } = useGestion()
  const { toast } = useToast()

  const handleGestionChange = (value: string) => {
    const gestion = gestiones.find(g => g.id === parseInt(value))
    if (gestion) {
      setGestionActual(gestion)
      toast({
        title: "Gestión cambiada",
        description: `Ahora estás viendo ${gestion.nombre}`,
      })
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al cerrar sesión",
        description: "Ha ocurrido un error al intentar cerrar sesión.",
      })
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <h1 className="text-lg font-semibold md:text-xl">Sistema de Gestión Académica</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {/* Selector de Gestión */}
        {gestionActual && gestiones.length > 0 && (
          <div className="flex items-center gap-2">
            <Calendar className="hidden h-4 w-4 text-muted-foreground md:block" />
            <Select
              value={gestionActual.id.toString()}
              onValueChange={handleGestionChange}
            >
              <SelectTrigger className="h-9 w-[130px] md:w-[160px]">
                <SelectValue placeholder="Gestión" />
              </SelectTrigger>
              <SelectContent>
                {gestiones.map((gestion) => (
                  <SelectItem key={gestion.id} value={gestion.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{gestion.nombre}</span>
                      {gestion.activa && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          Activa
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {user && (
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Cerrar sesión</span>
        </Button>
      </div>
    </header>
  )
}
