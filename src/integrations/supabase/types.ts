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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          facility_id: string
          id: string
          patient_id: string
          scheduled_at: string
          title: string
        }
        Insert: {
          facility_id: string
          id?: string
          patient_id: string
          scheduled_at: string
          title: string
        }
        Update: {
          facility_id?: string
          id?: string
          patient_id?: string
          scheduled_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          facility_id: string | null
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          facility_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          facility_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_log_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      cold_chain_readings: {
        Row: {
          breach: boolean
          created_at: string
          facility_id: string
          id: string
          temperature: number
        }
        Insert: {
          breach: boolean
          created_at?: string
          facility_id: string
          id?: string
          temperature: number
        }
        Update: {
          breach?: boolean
          created_at?: string
          facility_id?: string
          id?: string
          temperature?: number
        }
        Relationships: [
          {
            foreignKeyName: "cold_chain_readings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          code: string
          district: string
          id: string
          kind: string
          lat: number
          lng: number
          name: string
          user_id: string | null
          username: string
        }
        Insert: {
          code: string
          district: string
          id?: string
          kind: string
          lat: number
          lng: number
          name: string
          user_id?: string | null
          username: string
        }
        Update: {
          code?: string
          district?: string
          id?: string
          kind?: string
          lat?: number
          lng?: number
          name?: string
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      facility_settings: {
        Row: {
          auto_order_enabled: boolean
          expiry_months: number
          facility_id: string
          order_qty_mode: string
          threshold_count: number
          threshold_mode: string
          threshold_percent: number
        }
        Insert: {
          auto_order_enabled?: boolean
          expiry_months?: number
          facility_id: string
          order_qty_mode?: string
          threshold_count?: number
          threshold_mode?: string
          threshold_percent?: number
        }
        Update: {
          auto_order_enabled?: boolean
          expiry_months?: number
          facility_id?: string
          order_qty_mode?: string
          threshold_count?: number
          threshold_mode?: string
          threshold_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "facility_settings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          code: string
          condition: string
          id: string
          name: string
          unit: string
        }
        Insert: {
          code: string
          condition: string
          id?: string
          name: string
          unit?: string
        }
        Update: {
          code?: string
          condition?: string
          id?: string
          name?: string
          unit?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string | null
          facility_id: string
          id: string
          kind: string
          payload: Json | null
          status: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          dedupe_key?: string | null
          facility_id: string
          id?: string
          kind: string
          payload?: Json | null
          status?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string | null
          facility_id?: string
          id?: string
          kind?: string
          payload?: Json | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medicines: {
        Row: {
          dosage: string
          id: string
          medicine_id: string
          patient_id: string
        }
        Insert: {
          dosage: string
          id?: string
          medicine_id: string
          patient_id: string
        }
        Update: {
          dosage?: string
          id?: string
          medicine_id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_medicines_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_medicines_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          date_of_birth: string
          full_name: string
          home_facility_id: string
          id: string
          patient_number: string
          user_id: string | null
        }
        Insert: {
          date_of_birth: string
          full_name: string
          home_facility_id: string
          id?: string
          patient_number: string
          user_id?: string | null
        }
        Update: {
          date_of_birth?: string
          full_name?: string
          home_facility_id?: string
          id?: string
          patient_number?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_home_facility_id_fkey"
            columns: ["home_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_clock: {
        Row: {
          id: number
          offset_days: number
        }
        Insert: {
          id?: number
          offset_days?: number
        }
        Update: {
          id?: number
          offset_days?: number
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          batch_id: string
          catalogue_quantity: number
          counted_quantity: number
          created_at: string
          facility_id: string | null
          id: string
          reason: string
          variance: number
        }
        Insert: {
          batch_id: string
          catalogue_quantity: number
          counted_quantity: number
          created_at?: string
          facility_id?: string | null
          id?: string
          reason: string
          variance: number
        }
        Update: {
          batch_id?: string
          catalogue_quantity?: number
          counted_quantity?: number
          created_at?: string
          facility_id?: string | null
          id?: string
          reason?: string
          variance?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_batches: {
        Row: {
          avg_daily_use: number
          batch_number: string
          bin_location: string | null
          expiry_date: string
          facility_id: string
          id: string
          max_capacity: number
          medicine_id: string
          quantity: number
          storage: string
        }
        Insert: {
          avg_daily_use?: number
          batch_number: string
          bin_location?: string | null
          expiry_date: string
          facility_id: string
          id?: string
          max_capacity?: number
          medicine_id: string
          quantity?: number
          storage?: string
        }
        Update: {
          avg_daily_use?: number
          batch_number?: string
          bin_location?: string | null
          expiry_date?: string
          facility_id?: string
          id?: string
          max_capacity?: number
          medicine_id?: string
          quantity?: number
          storage?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_batches_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_batches_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          from_batch_id: string
          from_facility_id: string
          id: string
          medicine_id: string
          quantity: number
          requested_by_facility_id: string | null
          source: string
          status: string
          to_facility_id: string
          updated_at: string
          urgency: string
        }
        Insert: {
          created_at?: string
          from_batch_id: string
          from_facility_id: string
          id?: string
          medicine_id: string
          quantity: number
          requested_by_facility_id?: string | null
          source?: string
          status?: string
          to_facility_id: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          created_at?: string
          from_batch_id?: string
          from_facility_id?: string
          id?: string
          medicine_id?: string
          quantity?: number
          requested_by_facility_id?: string | null
          source?: string
          status?: string
          to_facility_id?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_batch_id_fkey"
            columns: ["from_batch_id"]
            isOneToOne: false
            referencedRelation: "stock_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_from_facility_id_fkey"
            columns: ["from_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_requested_by_facility_id_fkey"
            columns: ["requested_by_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_facility_id_fkey"
            columns: ["to_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_history: {
        Row: {
          action: string
          actor_facility_id: string | null
          created_at: string
          details: string | null
          id: string
          patient_request_id: string | null
          stock_transfer_id: string | null
        }
        Insert: {
          action: string
          actor_facility_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          patient_request_id?: string | null
          stock_transfer_id?: string | null
        }
        Update: {
          action?: string
          actor_facility_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          patient_request_id?: string | null
          stock_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_history_actor_facility_id_fkey"
            columns: ["actor_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_history_patient_request_id_fkey"
            columns: ["patient_request_id"]
            isOneToOne: false
            referencedRelation: "transfer_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_history_stock_transfer_id_fkey"
            columns: ["stock_transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_requests: {
        Row: {
          created_at: string
          id: string
          kind: string
          medicine_id: string | null
          patient_id: string
          status: string
          to_facility_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          medicine_id?: string | null
          patient_id: string
          status?: string
          to_facility_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          medicine_id?: string | null
          patient_id?: string
          status?: string
          to_facility_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_facility_id_fkey"
            columns: ["to_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      act_on_patient_request: {
        Args: { _id: string; _status: string }
        Returns: undefined
      }
      act_on_stock_transfer: {
        Args: { _action: string; _id: string }
        Returns: undefined
      }
      apply_stock_take: {
        Args: { _batch: string; _counted: number; _reason: string }
        Returns: undefined
      }
      create_stock_transfer: {
        Args: {
          _batch: string
          _from: string
          _medicine: string
          _qty: number
          _to: string
          _urgency: string
        }
        Returns: string
      }
      current_patient_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      log_action: {
        Args: { _action: string; _details: string; _facility: string }
        Returns: undefined
      }
      mark_all_read: { Args: never; Returns: undefined }
      my_facility_id: { Args: never; Returns: string }
      notification_action: {
        Args: { _action: string; _id: string }
        Returns: string
      }
      notify: {
        Args: {
          _body: string
          _facility: string
          _key: string
          _kind: string
          _payload: Json
          _title: string
        }
        Returns: undefined
      }
      run_automation: { Args: never; Returns: Json }
      sim_today: { Args: never; Returns: string }
      simulate_next_day: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "patient" | "facility"
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
    Enums: {
      app_role: ["patient", "facility"],
    },
  },
} as const
