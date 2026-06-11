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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      filter_categories: {
        Row: {
          created_at: string
          id: string
          is_single_select: boolean
          key: string
          locked: boolean
          match_mode: string
          sort_order: number
          style: string
          title: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_single_select?: boolean
          key: string
          locked?: boolean
          match_mode?: string
          sort_order?: number
          style?: string
          title: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_single_select?: boolean
          key?: string
          locked?: boolean
          match_mode?: string
          sort_order?: number
          style?: string
          title?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      filter_options: {
        Row: {
          category: string
          created_at: string
          default_icon: string | null
          icon_url: string | null
          id: string
          label: string
          label_en: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          default_icon?: string | null
          icon_url?: string | null
          id?: string
          label: string
          label_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          default_icon?: string | null
          icon_url?: string | null
          id?: string
          label?: string
          label_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      spaces: {
        Row: {
          book_now_url: string | null
          book_now_url_en: string | null
          booking_room_number: number | null
          booking_url: string | null
          capacity: number | null
          category: string | null
          computers_url: string | null
          countmatters_sensor_id: string | null
          created_at: string
          description: string
          description_en: string | null
          equipment: string[]
          facilities: string[]
          floor: string | null
          floor_en: string | null
          group_booking_url: string | null
          group_booking_url_en: string | null
          id: string
          image_alts: string[]
          image_url: string | null
          images: string[]
          intent: string[]
          located_in: string | null
          located_in_en: string | null
          lokaltyp: string[]
          map_url: string | null
          name: string
          name_en: string | null
          noise: string[]
          notice: string | null
          notice_en: string | null
          show_capacity_publicly: boolean
          show_occupancy: boolean
          sort_order: number
          tags: Json
          updated_at: string
        }
        Insert: {
          book_now_url?: string | null
          book_now_url_en?: string | null
          booking_room_number?: number | null
          booking_url?: string | null
          capacity?: number | null
          category?: string | null
          computers_url?: string | null
          countmatters_sensor_id?: string | null
          created_at?: string
          description?: string
          description_en?: string | null
          equipment?: string[]
          facilities?: string[]
          floor?: string | null
          floor_en?: string | null
          group_booking_url?: string | null
          group_booking_url_en?: string | null
          id?: string
          image_alts?: string[]
          image_url?: string | null
          images?: string[]
          intent?: string[]
          located_in?: string | null
          located_in_en?: string | null
          lokaltyp?: string[]
          map_url?: string | null
          name: string
          name_en?: string | null
          noise?: string[]
          notice?: string | null
          notice_en?: string | null
          show_capacity_publicly?: boolean
          show_occupancy?: boolean
          sort_order?: number
          tags?: Json
          updated_at?: string
        }
        Update: {
          book_now_url?: string | null
          book_now_url_en?: string | null
          booking_room_number?: number | null
          booking_url?: string | null
          capacity?: number | null
          category?: string | null
          computers_url?: string | null
          countmatters_sensor_id?: string | null
          created_at?: string
          description?: string
          description_en?: string | null
          equipment?: string[]
          facilities?: string[]
          floor?: string | null
          floor_en?: string | null
          group_booking_url?: string | null
          group_booking_url_en?: string | null
          id?: string
          image_alts?: string[]
          image_url?: string | null
          images?: string[]
          intent?: string[]
          located_in?: string | null
          located_in_en?: string | null
          lokaltyp?: string[]
          map_url?: string | null
          name?: string
          name_en?: string | null
          noise?: string[]
          notice?: string | null
          notice_en?: string | null
          show_capacity_publicly?: boolean
          show_occupancy?: boolean
          sort_order?: number
          tags?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      rename_filter_option: {
        Args: { p_category: string; p_new_label: string; p_old_label: string }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
