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
      clientes: {
        Row: {
          created_at: string | null
          cuota: number | null
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
      cobros: {
        Row: {
          cliente_id: string
          concepto: string | null
          created_at: string
          fecha: string
          id: string
          medio_pago: string
          monto: number
          negocio_id: string
        }
        Insert: {
          cliente_id: string
          concepto?: string | null
          created_at?: string
          fecha: string
          id?: string
          medio_pago: string
          monto: number
          negocio_id: string
        }
        Update: {
          cliente_id?: string
          concepto?: string | null
          created_at?: string
          fecha?: string
          id?: string
          medio_pago?: string
          monto?: number
          negocio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_negocio_id_fkey"
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
      gym_alumnos: {
        Row: {
          altura_cm: number | null
          cliente_id: string
          codigo_acceso: string | null
          created_at: string
          fecha_nac: string | null
          negocio_id: string
          notas: string | null
          objetivo: string | null
          portal_token: string
        }
        Insert: {
          altura_cm?: number | null
          cliente_id: string
          codigo_acceso?: string | null
          created_at?: string
          fecha_nac?: string | null
          negocio_id: string
          notas?: string | null
          objetivo?: string | null
          portal_token?: string
        }
        Update: {
          altura_cm?: number | null
          cliente_id?: string
          codigo_acceso?: string | null
          created_at?: string
          fecha_nac?: string | null
          negocio_id?: string
          notas?: string | null
          objetivo?: string | null
          portal_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_alumnos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_alumnos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_asignaciones: {
        Row: {
          activa: boolean
          cliente_id: string
          fecha_inicio: string
          id: string
          negocio_id: string
          rutina_id: string
          sesion_actual: number
        }
        Insert: {
          activa?: boolean
          cliente_id: string
          fecha_inicio?: string
          id?: string
          negocio_id: string
          rutina_id: string
          sesion_actual?: number
        }
        Update: {
          activa?: boolean
          cliente_id?: string
          fecha_inicio?: string
          id?: string
          negocio_id?: string
          rutina_id?: string
          sesion_actual?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_asignaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_asignaciones_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_asignaciones_rutina_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "gym_rutinas"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_completados: {
        Row: {
          cliente_id: string
          created_at: string
          fecha: string
          id: string
          negocio_id: string
          rutina_ejercicio_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          fecha: string
          id?: string
          negocio_id: string
          rutina_ejercicio_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          fecha?: string
          id?: string
          negocio_id?: string
          rutina_ejercicio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_completados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_completados_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_completados_rutina_ejercicio_id_fkey"
            columns: ["rutina_ejercicio_id"]
            isOneToOne: false
            referencedRelation: "gym_rutina_ejercicios"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_ejercicios: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          grupo_muscular: string | null
          id: string
          negocio_id: string | null
          nombre: string
          url_video: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          grupo_muscular?: string | null
          id?: string
          negocio_id?: string | null
          nombre: string
          url_video?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          grupo_muscular?: string | null
          id?: string
          negocio_id?: string | null
          nombre?: string
          url_video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_ejercicios_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_progreso: {
        Row: {
          bicep_cm: number | null
          cadera: number | null
          cintura: number | null
          cliente_id: string
          created_at: string
          fecha: string
          id: string
          metrica1_nombre: string | null
          metrica1_valor: number | null
          metrica2_nombre: string | null
          metrica2_valor: number | null
          negocio_id: string
          notas: string | null
          pecho_cm: number | null
          peso: number
          porcentaje_grasa: number | null
        }
        Insert: {
          bicep_cm?: number | null
          cadera?: number | null
          cintura?: number | null
          cliente_id: string
          created_at?: string
          fecha: string
          id?: string
          metrica1_nombre?: string | null
          metrica1_valor?: number | null
          metrica2_nombre?: string | null
          metrica2_valor?: number | null
          negocio_id: string
          notas?: string | null
          pecho_cm?: number | null
          peso: number
          porcentaje_grasa?: number | null
        }
        Update: {
          bicep_cm?: number | null
          cadera?: number | null
          cintura?: number | null
          cliente_id?: string
          created_at?: string
          fecha?: string
          id?: string
          metrica1_nombre?: string | null
          metrica1_valor?: number | null
          metrica2_nombre?: string | null
          metrica2_valor?: number | null
          negocio_id?: string
          notas?: string | null
          pecho_cm?: number | null
          peso?: number
          porcentaje_grasa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_progreso_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_progreso_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_rutina_ejercicios: {
        Row: {
          descanso_seg: number | null
          ejercicio_id: string
          id: string
          negocio_id: string
          notas: string | null
          orden: number
          repeticiones: string | null
          series: number | null
          sesion_id: string
        }
        Insert: {
          descanso_seg?: number | null
          ejercicio_id: string
          id?: string
          negocio_id: string
          notas?: string | null
          orden?: number
          repeticiones?: string | null
          series?: number | null
          sesion_id: string
        }
        Update: {
          descanso_seg?: number | null
          ejercicio_id?: string
          id?: string
          negocio_id?: string
          notas?: string | null
          orden?: number
          repeticiones?: string | null
          series?: number | null
          sesion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_rutina_ejercicios_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "gym_ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_rutina_ejercicios_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_rutina_ejercicios_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "gym_rutina_sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_rutina_sesiones: {
        Row: {
          id: string
          negocio_id: string
          numero_sesion: number
          rutina_id: string
        }
        Insert: {
          id?: string
          negocio_id: string
          numero_sesion: number
          rutina_id: string
        }
        Update: {
          id?: string
          negocio_id?: string
          numero_sesion?: number
          rutina_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_rutina_sesiones_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_rutina_sesiones_rutina_id_fkey"
            columns: ["rutina_id"]
            isOneToOne: false
            referencedRelation: "gym_rutinas"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_rutinas: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          negocio_id: string
          nombre: string
          sesiones_total: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          negocio_id: string
          nombre: string
          sesiones_total: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          negocio_id?: string
          nombre?: string
          sesiones_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_rutinas_negocio_id_fkey"
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
          cliente_id: string | null
          cliente_nombre: string
          created_at: string | null
          duracion: number | null
          estado: string | null
          fecha: string
          hora: string
          id: string
          lugar: string | null
          negocio_id: string | null
          notas: string | null
          servicio: string
          telefono: string | null
        }
        Insert: {
          cliente_id?: string | null
          cliente_nombre: string
          created_at?: string | null
          duracion?: number | null
          estado?: string | null
          fecha: string
          hora: string
          id?: string
          lugar?: string | null
          negocio_id?: string | null
          notas?: string | null
          servicio: string
          telefono?: string | null
        }
        Update: {
          cliente_id?: string | null
          cliente_nombre?: string
          created_at?: string | null
          duracion?: number | null
          estado?: string | null
          fecha?: string
          hora?: string
          id?: string
          lugar?: string | null
          negocio_id?: string | null
          notas?: string | null
          servicio?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turnos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
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
      agregar_miembro: {
        Args: { p_email: string; p_negocio_id: string; p_rol: string }
        Returns: undefined
      }
      avanzar_sesion_portal: { Args: { p_token: string }; Returns: Json }
      cambiar_rol_miembro: {
        Args: { p_negocio_id: string; p_rol: string; p_user_id: string }
        Returns: undefined
      }
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
      desmarcar_completado_portal: {
        Args: {
          p_fecha: string
          p_rutina_ejercicio_id: string
          p_token: string
        }
        Returns: Json
      }
      generar_numero_orden: { Args: { p_negocio_id: string }; Returns: string }
      listar_miembros: {
        Args: { p_negocio_id: string }
        Returns: {
          created_at: string
          email: string
          rol: string
          user_id: string
        }[]
      }
      marcar_completado_portal: {
        Args: {
          p_fecha: string
          p_rutina_ejercicio_id: string
          p_token: string
        }
        Returns: Json
      }
      obtener_portal_alumno: { Args: { p_token: string }; Returns: Json }
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
      quitar_miembro: {
        Args: { p_negocio_id: string; p_user_id: string }
        Returns: undefined
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
