export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _fase3_duplicates_log: {
        Row: {
          id: string
          negocio_id: string
          numero_orden: string
          ocurrencia: number
          snapshot_at: string
        }
        Insert: {
          id: string
          negocio_id: string
          numero_orden: string
          ocurrencia: number
          snapshot_at?: string
        }
        Update: {
          id?: string
          negocio_id?: string
          numero_orden?: string
          ocurrencia?: number
          snapshot_at?: string
        }
        Relationships: []
      }
      cf_alumnos: {
        Row: {
          altura_cm: number | null
          codigo_acceso: string
          created_at: string | null
          email: string | null
          estado: string | null
          fecha_nac: string | null
          id: string
          nombre: string
          notas: string | null
          objetivo: string | null
          profe_id: string | null
          telefono: string | null
        }
        Insert: {
          altura_cm?: number | null
          codigo_acceso: string
          created_at?: string | null
          email?: string | null
          estado?: string | null
          fecha_nac?: string | null
          id?: string
          nombre: string
          notas?: string | null
          objetivo?: string | null
          profe_id?: string | null
          telefono?: string | null
        }
        Update: {
          altura_cm?: number | null
          codigo_acceso?: string
          created_at?: string | null
          email?: string | null
          estado?: string | null
          fecha_nac?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          objetivo?: string | null
          profe_id?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_alumnos_profe_id_fkey"
            columns: ["profe_id"]
            isOneToOne: false
            referencedRelation: "cf_profes"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_asignaciones: {
        Row: {
          activa: boolean | null
          alumno_id: string | null
          fecha_inicio: string | null
          id: string
          rutina_id: string | null
          semana_actual: number | null
        }
        Insert: {
          activa?: boolean | null
          alumno_id?: string | null
          fecha_inicio?: string | null
          id?: string
          rutina_id?: string | null
          semana_actual?: number | null
        }
        Update: {
          activa?: boolean | null
          alumno_id?: string | null
          fecha_inicio?: string | null
          id?: string
          rutina_id?: string | null
          semana_actual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_asignaciones_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "cf_alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cf_asignaciones_rutina_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "cf_rutinas"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_completados: {
        Row: {
          alumno_id: string | null
          created_at: string | null
          fecha: string | null
          id: string
          rutina_ejercicio_id: string | null
        }
        Insert: {
          alumno_id?: string | null
          created_at?: string | null
          fecha?: string | null
          id?: string
          rutina_ejercicio_id?: string | null
        }
        Update: {
          alumno_id?: string | null
          created_at?: string | null
          fecha?: string | null
          id?: string
          rutina_ejercicio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_completados_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "cf_alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cf_completados_rutina_ejercicio_id_fkey"
            columns: ["rutina_ejercicio_id"]
            isOneToOne: false
            referencedRelation: "cf_rutina_ejercicios"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_ejercicios: {
        Row: {
          activo: boolean | null
          descripcion: string | null
          es_global: boolean | null
          grupo_muscular: string | null
          id: string
          nombre: string
          profe_id: string | null
          url_video: string | null
        }
        Insert: {
          activo?: boolean | null
          descripcion?: string | null
          es_global?: boolean | null
          grupo_muscular?: string | null
          id?: string
          nombre: string
          profe_id?: string | null
          url_video?: string | null
        }
        Update: {
          activo?: boolean | null
          descripcion?: string | null
          es_global?: boolean | null
          grupo_muscular?: string | null
          id?: string
          nombre?: string
          profe_id?: string | null
          url_video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_ejercicios_profe_id_fkey"
            columns: ["profe_id"]
            isOneToOne: false
            referencedRelation: "cf_profes"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_pagos: {
        Row: {
          alumno_id: string | null
          concepto: string | null
          fecha: string | null
          id: string
          medio_pago: string | null
          monto: number
          profe_id: string | null
        }
        Insert: {
          alumno_id?: string | null
          concepto?: string | null
          fecha?: string | null
          id?: string
          medio_pago?: string | null
          monto: number
          profe_id?: string | null
        }
        Update: {
          alumno_id?: string | null
          concepto?: string | null
          fecha?: string | null
          id?: string
          medio_pago?: string | null
          monto?: number
          profe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_pagos_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "cf_alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cf_pagos_profe_id_fkey"
            columns: ["profe_id"]
            isOneToOne: false
            referencedRelation: "cf_profes"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_profes: {
        Row: {
          activo: boolean | null
          bio: string | null
          created_at: string | null
          deporte: string | null
          email: string | null
          id: string
          nombre: string
          password_hash: string
          slug: string
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          bio?: string | null
          created_at?: string | null
          deporte?: string | null
          email?: string | null
          id?: string
          nombre: string
          password_hash: string
          slug: string
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          bio?: string | null
          created_at?: string | null
          deporte?: string | null
          email?: string | null
          id?: string
          nombre?: string
          password_hash?: string
          slug?: string
          telefono?: string | null
        }
        Relationships: []
      }
      cf_progreso: {
        Row: {
          alumno_id: string | null
          bicep_cm: number | null
          cadera: number | null
          cintura: number | null
          fecha: string | null
          id: string
          metrica1_nombre: string | null
          metrica1_valor: number | null
          metrica2_nombre: string | null
          metrica2_valor: number | null
          notas: string | null
          pecho_cm: number | null
          peso: number | null
          porcentaje_grasa: number | null
        }
        Insert: {
          alumno_id?: string | null
          bicep_cm?: number | null
          cadera?: number | null
          cintura?: number | null
          fecha?: string | null
          id?: string
          metrica1_nombre?: string | null
          metrica1_valor?: number | null
          metrica2_nombre?: string | null
          metrica2_valor?: number | null
          notas?: string | null
          pecho_cm?: number | null
          peso?: number | null
          porcentaje_grasa?: number | null
        }
        Update: {
          alumno_id?: string | null
          bicep_cm?: number | null
          cadera?: number | null
          cintura?: number | null
          fecha?: string | null
          id?: string
          metrica1_nombre?: string | null
          metrica1_valor?: number | null
          metrica2_nombre?: string | null
          metrica2_valor?: number | null
          notas?: string | null
          pecho_cm?: number | null
          peso?: number | null
          porcentaje_grasa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_progreso_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "cf_alumnos"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_rutina_ejercicios: {
        Row: {
          descanso_seg: number | null
          ejercicio_id: string | null
          id: string
          notas: string | null
          orden: number | null
          repeticiones: string | null
          semana_id: string | null
          series: number | null
        }
        Insert: {
          descanso_seg?: number | null
          ejercicio_id?: string | null
          id?: string
          notas?: string | null
          orden?: number | null
          repeticiones?: string | null
          semana_id?: string | null
          series?: number | null
        }
        Update: {
          descanso_seg?: number | null
          ejercicio_id?: string | null
          id?: string
          notas?: string | null
          orden?: number | null
          repeticiones?: string | null
          semana_id?: string | null
          series?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_rutina_ejercicios_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "cf_ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cf_rutina_ejercicios_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "cf_rutina_semanas"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_rutina_semanas: {
        Row: {
          id: string
          numero_semana: number
          rutina_id: string | null
        }
        Insert: {
          id?: string
          numero_semana: number
          rutina_id?: string | null
        }
        Update: {
          id?: string
          numero_semana?: number
          rutina_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_rutina_semanas_rutina_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "cf_rutinas"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_rutinas: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          profe_id: string | null
          semanas_total: number | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          profe_id?: string | null
          semanas_total?: number | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          profe_id?: string | null
          semanas_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_rutinas_profe_id_fkey"
            columns: ["profe_id"]
            isOneToOne: false
            referencedRelation: "cf_profes"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_turnos: {
        Row: {
          alumno_id: string | null
          duracion_min: number | null
          espacio: string | null
          estado: string | null
          fecha_hora: string
          id: string
          notas: string | null
          profe_id: string | null
        }
        Insert: {
          alumno_id?: string | null
          duracion_min?: number | null
          espacio?: string | null
          estado?: string | null
          fecha_hora: string
          id?: string
          notas?: string | null
          profe_id?: string | null
        }
        Update: {
          alumno_id?: string | null
          duracion_min?: number | null
          espacio?: string | null
          estado?: string | null
          fecha_hora?: string
          id?: string
          notas?: string | null
          profe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cf_turnos_alumno_id_fkey"
            columns: ["alumno_id"]
            isOneToOne: false
            referencedRelation: "cf_alumnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cf_turnos_profe_id_fkey"
            columns: ["profe_id"]
            isOneToOne: false
            referencedRelation: "cf_profes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string | null
          cuota: number | null
          estado: string | null
          id: string
          negocio_id: string | null
          nombre: string
          plan: string | null
          telefono: string | null
          vence: string | null
        }
        Insert: {
          created_at?: string | null
          cuota?: number | null
          estado?: string | null
          id?: string
          negocio_id?: string | null
          nombre: string
          plan?: string | null
          telefono?: string | null
          vence?: string | null
        }
        Update: {
          created_at?: string | null
          cuota?: number | null
          estado?: string | null
          id?: string
          negocio_id?: string | null
          nombre?: string
          plan?: string | null
          telefono?: string | null
          vence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      equipos: {
        Row: {
          acceso_token: string
          accesorios: string | null
          categoria: string
          cliente_id: string | null
          created_at: string | null
          estado: string | null
          fecha_entrega: string | null
          fecha_estimada_entrega: string | null
          fecha_ingreso: string | null
          id: string
          marca: string | null
          modelo: string | null
          negocio_id: string | null
          numero_orden: string
          numero_serie: string | null
          observaciones_internas: string | null
          precio_final: number | null
          presupuesto: number | null
          presupuesto_aceptado: boolean | null
          problema_reportado: string
          tecnico_asignado: string | null
        }
        Insert: {
          acceso_token?: string
          accesorios?: string | null
          categoria: string
          cliente_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_entrega?: string | null
          fecha_estimada_entrega?: string | null
          fecha_ingreso?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          negocio_id?: string | null
          numero_orden: string
          numero_serie?: string | null
          observaciones_internas?: string | null
          precio_final?: number | null
          presupuesto?: number | null
          presupuesto_aceptado?: boolean | null
          problema_reportado: string
          tecnico_asignado?: string | null
        }
        Update: {
          acceso_token?: string
          accesorios?: string | null
          categoria?: string
          cliente_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_entrega?: string | null
          fecha_estimada_entrega?: string | null
          fecha_ingreso?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          negocio_id?: string | null
          numero_orden?: string
          numero_serie?: string | null
          observaciones_internas?: string | null
          precio_final?: number | null
          presupuesto?: number | null
          presupuesto_aceptado?: boolean | null
          problema_reportado?: string
          tecnico_asignado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos: {
        Row: {
          created_at: string | null
          descripcion: string
          fecha: string
          id: string
          monto: number
          negocio_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          fecha: string
          id?: string
          monto: number
          negocio_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          fecha?: string
          id?: string
          monto?: number
          negocio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      negocio_miembros: {
        Row: {
          created_at: string
          negocio_id: string
          rol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          negocio_id: string
          rol: string
          user_id: string
        }
        Update: {
          created_at?: string
          negocio_id?: string
          rol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "negocio_miembros_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      negocio_orden_contadores: {
        Row: {
          negocio_id: string
          ultimo: number
        }
        Insert: {
          negocio_id: string
          ultimo?: number
        }
        Update: {
          negocio_id?: string
          ultimo?: number
        }
        Relationships: [
          {
            foreignKeyName: "negocio_orden_contadores_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: true
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: string
          nombre: string
          rubro: string
          slug: string
          telefono_admin: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre: string
          rubro: string
          slug: string
          telefono_admin?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          nombre?: string
          rubro?: string
          slug?: string
          telefono_admin?: string | null
        }
        Relationships: []
      }
      reparaciones_historial: {
        Row: {
          comentario: string | null
          equipo_id: string | null
          estado_anterior: string | null
          estado_nuevo: string
          fecha: string | null
          id: string
          negocio_id: string | null
          usuario: string | null
        }
        Insert: {
          comentario?: string | null
          equipo_id?: string | null
          estado_anterior?: string | null
          estado_nuevo: string
          fecha?: string | null
          id?: string
          negocio_id?: string | null
          usuario?: string | null
        }
        Update: {
          comentario?: string | null
          equipo_id?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string
          fecha?: string | null
          id?: string
          negocio_id?: string | null
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reparaciones_historial_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reparaciones_historial_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      reparaciones_repuestos: {
        Row: {
          cantidad: number | null
          costo: number | null
          descripcion: string
          equipo_id: string | null
          id: string
          negocio_id: string | null
          precio_cobrado: number | null
        }
        Insert: {
          cantidad?: number | null
          costo?: number | null
          descripcion: string
          equipo_id?: string | null
          id?: string
          negocio_id?: string | null
          precio_cobrado?: number | null
        }
        Update: {
          cantidad?: number | null
          costo?: number | null
          descripcion?: string
          equipo_id?: string | null
          id?: string
          negocio_id?: string | null
          precio_cobrado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reparaciones_repuestos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reparaciones_repuestos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          cliente_nombre: string
          created_at: string | null
          duracion: number | null
          estado: string | null
          fecha: string
          hora: string
          id: string
          negocio_id: string | null
          notas: string | null
          servicio: string
          telefono: string | null
        }
        Insert: {
          cliente_nombre: string
          created_at?: string | null
          duracion?: number | null
          estado?: string | null
          fecha: string
          hora: string
          id?: string
          negocio_id?: string | null
          notas?: string | null
          servicio: string
          telefono?: string | null
        }
        Update: {
          cliente_nombre?: string
          created_at?: string | null
          duracion?: number | null
          estado?: string | null
          fecha?: string
          hora?: string
          id?: string
          negocio_id?: string | null
          notas?: string | null
          servicio?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crear_negocio_con_owner: {
        Args: { p_nombre: string; p_rubro: string; p_slug: string }
        Returns: {
          activo: boolean | null
          created_at: string | null
          id: string
          nombre: string
          rubro: string
          slug: string
          telefono_admin: string | null
        }
        SetofOptions: {
          from: "*"
          to: "negocios"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generar_numero_orden: { Args: { p_negocio_id: string }; Returns: string }
      obtener_seguimiento_publico: {
        Args: { p_token: string }
        Returns: {
          categoria: string
          cliente_nombre: string
          estado: string
          fecha_entrega: string
          fecha_estimada_entrega: string
          fecha_ingreso: string
          historial: Json
          marca: string
          modelo: string
          negocio_nombre: string
          numero_orden: string
          precio_final: number
          presupuesto: number
          problema_reportado: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
