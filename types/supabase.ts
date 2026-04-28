export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      gestiones: {
        Row: {
          id: number
          anio: number
          nombre: string
          activa: boolean
          created_at: string
        }
        Insert: {
          id?: number
          anio: number
          nombre: string
          activa?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          anio?: number
          nombre?: string
          activa?: boolean
          created_at?: string
        }
      }
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
          gestion_id: number
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
          gestion_id: number
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
          gestion_id?: number
        }
      }
      profesores: {
        Row: {
          cod_moodle: string
          nombre: string
          apellidos: string
          ci: string | null
          activo: boolean
          gestion_id: number
        }
        Insert: {
          cod_moodle: string
          nombre: string
          apellidos: string
          ci?: string | null
          activo?: boolean
          gestion_id: number
        }
        Update: {
          cod_moodle?: string
          nombre?: string
          apellidos?: string
          ci?: string | null
          activo?: boolean
          gestion_id?: number
        }
      }
      cursos: {
        Row: {
          nombre_corto: string
          nombre_largo: string
          nivel: string
          gestion_id: number
        }
        Insert: {
          nombre_corto: string
          nombre_largo: string
          nivel: string
          gestion_id: number
        }
        Update: {
          nombre_corto?: string
          nombre_largo?: string
          nivel?: string
          gestion_id?: number
        }
      }
      materias: {
        Row: {
          codigo: string
          nombre_corto: string
          nombre_largo: string
          curso_corto: string | null
          id_area?: string | null
          orden: number | null
          gestion_id: number
        }
        Insert: {
          codigo: string
          nombre_corto: string
          nombre_largo: string
          curso_corto?: string | null
          id_area?: string | null
          orden?: number | null
          gestion_id: number
        }
        Update: {
          codigo?: string
          nombre_corto?: string
          nombre_largo?: string
          curso_corto?: string | null
          id_area?: string | null
          orden?: number | null
          gestion_id?: number
        }
      }
      areas: {
        Row: {
          id: string
          nombre: string
          gestion_id: number
        }
        Insert: {
          id?: string
          nombre: string
          gestion_id: number
        }
        Update: {
          id?: string
          nombre?: string
          gestion_id?: number
        }
      }
      materias_profesores: {
        Row: {
          id: number
          cod_moodle_profesor: string | null
          codigo_materia: string | null
          gestion_id: number
        }
        Insert: {
          id?: number
          cod_moodle_profesor?: string | null
          codigo_materia?: string | null
          gestion_id: number
        }
        Update: {
          id?: number
          cod_moodle_profesor?: string | null
          codigo_materia?: string | null
          gestion_id?: number
        }
      }
      calificaciones: {
        Row: {
          id: number
          alumno_id: string | null
          materia_id: string | null
          trimestre: number | null
          nota: number | null
          gestion_id: number
        }
        Insert: {
          id?: number
          alumno_id?: string | null
          materia_id?: string | null
          trimestre?: number | null
          nota?: number | null
          gestion_id: number
        }
        Update: {
          id?: number
          alumno_id?: string | null
          materia_id?: string | null
          trimestre?: number | null
          nota?: number | null
          gestion_id?: number
        }
      }
      agrupaciones_materias: {
        Row: {
          id: number
          nombre_grupo: string
          nombre_mostrar: string
          curso_corto: string | null
          materia_codigo: string | null
          gestion_id: number
        }
        Insert: {
          id?: number
          nombre_grupo: string
          nombre_mostrar: string
          curso_corto?: string | null
          materia_codigo?: string | null
          gestion_id: number
        }
        Update: {
          id?: number
          nombre_grupo?: string
          nombre_mostrar?: string
          curso_corto?: string | null
          materia_codigo?: string | null
          gestion_id?: number
        }
      }
      configuracion: {
        Row: {
          id: number
          nombre_institucion: string
          logo_url: string | null
        }
        Insert: {
          id: number
          nombre_institucion: string
          logo_url?: string | null
        }
        Update: {
          id?: number
          nombre_institucion?: string
          logo_url?: string | null
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
