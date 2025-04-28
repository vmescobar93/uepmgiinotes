import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determina el estado de una nota según los rangos establecidos
 * @param nota Calificación numérica
 * @returns Objeto con color y texto descriptivo del estado
 */
export function getEstadoNota(nota: number) {
  if (nota <= 49.0) {
    return { color: "red", texto: "Reprobado" }
  } else if (nota >= 49.01 && nota <= 50.99) {
    return { color: "#f59e0b", texto: "No Concluyente" } // Amber-500
  } else {
    return { color: "inherit", texto: "Aprobado" }
  }
}

/**
 * Aplica estilos a una celda de PDF según el estado de la nota
 * @param nota Calificación numérica
 * @param currentStyles Estilos actuales de la celda
 * @returns Objeto con los estilos actualizados
 */
export function getEstiloNotaPDF(nota: number, currentStyles: any = {}) {
  const styles = { ...currentStyles }

  if (nota <= 49.0) {
    styles.textColor = [255, 0, 0] // Rojo
  } else if (nota >= 49.01 && nota <= 50.99) {
    styles.textColor = [245, 158, 11] // Amber-500
  } else {
    styles.textColor = [0, 0, 0] // Negro (normal)
  }

  return styles
}
