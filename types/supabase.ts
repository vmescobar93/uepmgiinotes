export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      alumnos: {
        Row: {
          cod_moodle: string
          nombres: string
          apellidos: string
          curso_corto: string | null
          ci: string | null
          rude: string | null
          activo: boolean
          fecha_retiro: string | null
        }
        Insert: {
          cod_moodle: string
          nombres: string
          apellidos: string
          curso_corto?: string | null
          ci?: string | null
          rude?: string | null
          activo?: boolean
          fecha_retiro?: string | null
        }
        Update: {
          cod_moodle?: string
          nombres?: string
          apellidos?: string
          curso_corto?: string | null
          ci?: string | null
          rude?: string | null
          activo?: boolean
          fecha_retiro?: string | null
        }
      }
      profesores: {
        Row: {
          cod_moodle: string
          nombre: string
          apellidos: string
          ci: string | null
          activo: boolean
        }
        Insert: {
          cod_moodle: string
          nombre: string
          apellidos: string
          ci?: string | null
          activo?: boolean
        }
        Update: {
          cod_moodle?: string
          nombre?: string
          apellidos?: string
          ci?: string | null
          activo?: boolean
        }
      }
      cursos: {
        Row: {
          nombre_corto: string
          nombre_largo: string
          nivel: string
        }
        Insert: {
          nombre_corto: string
          nombre_largo: string
          nivel: string
        }
        Update: {
          nombre_corto?: string
          nombre_largo?: string
          nivel?: string
        }
      }
      materias: {
        Row: {
          codigo: string
          nombre_corto: string
          nombre_largo: string
          curso_corto: string | null
        }
        Insert: {
          codigo: string
          nombre_corto: string
          nombre_largo: string
          curso_corto?: string | null
        }
        Update: {
          codigo?: string
          nombre_corto?: string
          nombre_largo?: string
          curso_corto?: string | null
        }
      }
      materias_profesores: {
        Row: {
          id: number
          cod_moodle_profesor: string | null
          codigo_materia: string | null
        }
        Insert: {
          id?: number
          cod_moodle_profesor?: string | null
          codigo_materia?: string | null
        }
        Update: {
          id?: number
          cod_moodle_profesor?: string | null
          codigo_materia?: string | null
        }
      }
      calificaciones: {
        Row: {
          id: number
          alumno_id: string | null
          materia_id: string | null
          trimestre: number | null
          nota: number | null
        }
        Insert: {
          id?: number
          alumno_id?: string | null
          materia_id?: string | null
          trimestre?: number | null
          nota?: number | null
        }
        Update: {
          id?: number
          alumno_id?: string | null
          materia_id?: string | null
          trimestre?: number | null
          nota?: number | null
        }
      }
      agrupaciones_materias: {
        Row: {
          id: number
          id_area: number
          nombre_grupo: string
          nombre_mostrar: string
          curso_corto: string | null
          materia_corta: string | null
        }
        Insert: {
          id?: number
          id_area: number
          nombre_grupo: string
          nombre_mostrar: string
          curso_corto?: string | null
          materia_corta?: string | null
        }
        Update: {
          id?: number
          id_area?: number
          nombre_grupo?: string
          nombre_mostrar?: string
          curso_corto?: string | null
          materia_corta?: string | null
        }
      }
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string
          rol: string
          activo: boolean
        }
        Insert: {
          id: string
          email: string
          nombre: string
          rol?: string
          activo?: boolean
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          rol?: string
          activo?: boolean
        }
      }
    }
  }
}
