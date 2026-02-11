 
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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          accepted_at: string | null
          base_price: number
          cancelled_at: string | null
          completed_at: string | null
          consumer_id: string
          consumer_rating: number | null
          consumer_review: string | null
          created_at: string | null
          distance_km: number
          distance_price: number
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          extras_price: number | null
          id: string
          item_description: string | null
          item_photos: string[] | null
          item_size: Database["public"]["Enums"]["item_size"]
          item_type: Database["public"]["Enums"]["item_type"] | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee: number
          saved: boolean | null
          scheduled_at: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          transporter_earnings: number
          transporter_id: string | null
          transporter_rating: number | null
          transporter_review: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          base_price: number
          cancelled_at?: string | null
          completed_at?: string | null
          consumer_id: string
          consumer_rating?: number | null
          consumer_review?: string | null
          created_at?: string | null
          distance_km: number
          distance_price: number
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          extras_price?: number | null
          id?: string
          item_description?: string | null
          item_photos?: string[] | null
          item_size: Database["public"]["Enums"]["item_size"]
          item_type?: Database["public"]["Enums"]["item_type"] | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee: number
          saved?: boolean | null
          scheduled_at?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          transporter_earnings: number
          transporter_id?: string | null
          transporter_rating?: number | null
          transporter_review?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          base_price?: number
          cancelled_at?: string | null
          completed_at?: string | null
          consumer_id?: string
          consumer_rating?: number | null
          consumer_review?: string | null
          created_at?: string | null
          distance_km?: number
          distance_price?: number
          dropoff_address?: string
          dropoff_lat?: number
          dropoff_lng?: number
          extras_price?: number | null
          id?: string
          item_description?: string | null
          item_photos?: string[] | null
          item_size?: Database["public"]["Enums"]["item_size"]
          item_type?: Database["public"]["Enums"]["item_type"] | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          platform_fee?: number
          saved?: boolean | null
          scheduled_at?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number
          transporter_earnings?: number
          transporter_id?: string | null
          transporter_rating?: number | null
          transporter_review?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_updates: {
        Row: {
          booking_id: string
          created_at: string | null
          heading: number | null
          id: string
          lat: number
          lng: number
          speed: number | null
          transporter_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          heading?: number | null
          id?: string
          lat: number
          lng: number
          speed?: number | null
          transporter_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          speed?: number | null
          transporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_updates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_updates_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string
          content: string
          created_at: string | null
          id: string
          message_type: string | null
          photo_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          booking_id: string
          content: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          photo_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          booking_id?: string
          content?: string
          created_at?: string | null
          id?: string
          message_type?: string | null
          photo_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          currency: string | null
          id: string
          refund_amount: number | null
          status: Database["public"]["Enums"]["payment_status"] | null
          stripe_payment_intent_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          refund_amount?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_payment_intent_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          refund_amount?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          stripe_payment_intent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_online: boolean | null
          language: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_online?: boolean | null
          language?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          language?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_payment_methods: {
        Row: {
          card_brand: string
          card_exp_month: number
          card_exp_year: number
          card_last4: string
          cardholder_name: string
          created_at: string | null
          id: string
          is_default: boolean
          stripe_payment_method_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_brand: string
          card_exp_month: number
          card_exp_year: number
          card_last4: string
          cardholder_name: string
          created_at?: string | null
          id?: string
          is_default?: boolean
          stripe_payment_method_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_brand?: string
          card_exp_month?: number
          card_exp_year?: number
          card_last4?: string
          cardholder_name?: string
          created_at?: string | null
          id?: string
          is_default?: boolean
          stripe_payment_method_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transporter_applications: {
        Row: {
          address_city: string | null
          address_postal_code: string | null
          address_street: string | null
          admin_notes: string | null
          background_check_date: string | null
          background_check_status: string | null
          bank_account_iban: string
          compliance_status: string | null
          created_at: string | null
          documents_verified_date: string | null
          driver_license_expiry: string | null
          driver_license_number: string | null
          driver_license_url: string | null
          driver_license_validated: boolean | null
          full_name: string | null
          id: string
          insurance_company: string | null
          insurance_expiry: string | null
          insurance_policy_number: string | null
          insurance_url: string | null
          insurance_validated: boolean | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_security_number: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          submitted_at: string | null
          user_id: string
          van_license_plate: string
          van_make: string
          van_model: string
          van_register_number: string | null
          van_year: number
          vehicle_registration_url: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Insert: {
          address_city?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          admin_notes?: string | null
          background_check_date?: string | null
          background_check_status?: string | null
          bank_account_iban: string
          compliance_status?: string | null
          created_at?: string | null
          documents_verified_date?: string | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          driver_license_url?: string | null
          driver_license_validated?: boolean | null
          full_name?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_url?: string | null
          insurance_validated?: boolean | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_security_number?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string | null
          user_id: string
          van_license_plate: string
          van_make: string
          van_model: string
          van_register_number?: string | null
          van_year: number
          vehicle_registration_url?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Update: {
          address_city?: string | null
          address_postal_code?: string | null
          address_street?: string | null
          admin_notes?: string | null
          background_check_date?: string | null
          background_check_status?: string | null
          bank_account_iban?: string
          compliance_status?: string | null
          created_at?: string | null
          documents_verified_date?: string | null
          driver_license_expiry?: string | null
          driver_license_number?: string | null
          driver_license_url?: string | null
          driver_license_validated?: boolean | null
          full_name?: string | null
          id?: string
          insurance_company?: string | null
          insurance_expiry?: string | null
          insurance_policy_number?: string | null
          insurance_url?: string | null
          insurance_validated?: boolean | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_security_number?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string | null
          user_id?: string
          van_license_plate?: string
          van_make?: string
          van_model?: string
          van_register_number?: string | null
          van_year?: number
          vehicle_registration_url?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "transporter_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transporter_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transporter_availability: {
        Row: {
          id: string
          is_online: boolean | null
          last_location_lat: number | null
          last_location_lng: number | null
          transporter_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_online?: boolean | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          transporter_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_online?: boolean | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          transporter_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transporter_availability_transporter_id_fkey"
            columns: ["transporter_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status: "pending" | "approved" | "rejected"
      booking_status:
        | "pending"
        | "accepted"
        | "en_route_pickup"
        | "picked_up"
        | "en_route_dropoff"
        | "delivered"
        | "cancelled"
      item_size: "small" | "medium" | "large"
      item_type:
        | "small_furniture"
        | "large_furniture"
        | "appliances"
        | "fragile"
        | "home_move"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      user_role: "consumer" | "transporter" | "admin"
      vehicle_type: "van" | "stw" | "truck"
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
    Enums: {
      application_status: ["pending", "approved", "rejected"],
      booking_status: [
        "pending",
        "accepted",
        "en_route_pickup",
        "picked_up",
        "en_route_dropoff",
        "delivered",
        "cancelled",
      ],
      item_size: ["small", "medium", "large"],
      item_type: [
        "small_furniture",
        "large_furniture",
        "appliances",
        "fragile",
        "home_move",
      ],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      user_role: ["consumer", "transporter", "admin"],
      vehicle_type: ["van", "stw", "truck"],
    },
  },
} as const
