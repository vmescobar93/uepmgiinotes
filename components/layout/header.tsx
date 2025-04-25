"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { Menu, LogOut } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { signOut, user } = useAuth()
  const { toast } = useToast()

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
      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden items-center gap-2 md:flex">
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
