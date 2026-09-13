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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      appointment_requests: {
        Row: {
          alternative_dates: Json | null
          appointment_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          expires_at: string | null
          id: string
          notes: string | null
          organization_id: string
          preferred_date: string
          preferred_staff_id: string | null
          preferred_time: string
          rejection_reason: string | null
          service_id: string
          source: string
          status: Database["public"]["Enums"]["request_status"] | null
        }
        Insert: {
          alternative_dates?: Json | null
          appointment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          preferred_date: string
          preferred_staff_id?: string | null
          preferred_time: string
          rejection_reason?: string | null
          service_id: string
          source: string
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Update: {
          alternative_dates?: Json | null
          appointment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          preferred_date?: string
          preferred_staff_id?: string | null
          preferred_time?: string
          rejection_reason?: string | null
          service_id?: string
          source?: string
          status?: Database["public"]["Enums"]["request_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_preferred_staff_id_fkey"
            columns: ["preferred_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          appointment_date: string
          appointment_number: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_confirmed_at: string | null
          confirmation_sent_at: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          end_time: string
          feedback: string | null
          id: string
          internal_notes: string | null
          notes: string | null
          organization_id: string
          payment_method: string | null
          price_charged: number | null
          rating: number | null
          reminder_method: Database["public"]["Enums"]["reminder_method"] | null
          reminder_sent_at: string | null
          service_id: string
          source: Database["public"]["Enums"]["appointment_source"] | null
          staff_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          timezone: string | null
          updated_at: string | null
          was_paid: boolean | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          appointment_date: string
          appointment_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_confirmed_at?: string | null
          confirmation_sent_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          end_time: string
          feedback?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          organization_id: string
          payment_method?: string | null
          price_charged?: number | null
          rating?: number | null
          reminder_method?:
            | Database["public"]["Enums"]["reminder_method"]
            | null
          reminder_sent_at?: string | null
          service_id: string
          source?: Database["public"]["Enums"]["appointment_source"] | null
          staff_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          timezone?: string | null
          updated_at?: string | null
          was_paid?: boolean | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          appointment_date?: string
          appointment_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_confirmed_at?: string | null
          confirmation_sent_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          end_time?: string
          feedback?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          organization_id?: string
          payment_method?: string | null
          price_charged?: number | null
          rating?: number | null
          reminder_method?:
            | Database["public"]["Enums"]["reminder_method"]
            | null
          reminder_sent_at?: string | null
          service_id?: string
          source?: Database["public"]["Enums"]["appointment_source"] | null
          staff_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          timezone?: string | null
          updated_at?: string | null
          was_paid?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          allow_online_booking: boolean | null
          allow_same_day_booking: boolean | null
          booking_page_enabled: boolean | null
          booking_page_url: string | null
          business_hours_config: Json | null
          cancellation_policy_hours: number | null
          created_at: string | null
          daily_summary_time: string | null
          default_appointment_color: string | null
          deposit_instructions: string | null
          enable_daily_summary: boolean | null
          enable_rating_request: boolean | null
          enable_reminders: boolean | null
          enable_waitlist: boolean | null
          id: string
          max_advance_booking_days: number | null
          min_advance_booking_hours: number | null
          openwa_session_id: string | null
          organization_id: string
          reminder_settings: Json | null
          require_approval: boolean | null
          seat_booking_enabled: boolean
          seat_booking_hold_hours: number
          slot_duration_minutes: number | null
          updated_at: string | null
          whatsapp_bot_number: string | null
          whatsapp_integration_enabled: boolean | null
        }
        Insert: {
          allow_online_booking?: boolean | null
          allow_same_day_booking?: boolean | null
          booking_page_enabled?: boolean | null
          booking_page_url?: string | null
          business_hours_config?: Json | null
          cancellation_policy_hours?: number | null
          created_at?: string | null
          daily_summary_time?: string | null
          default_appointment_color?: string | null
          deposit_instructions?: string | null
          enable_daily_summary?: boolean | null
          enable_rating_request?: boolean | null
          enable_reminders?: boolean | null
          enable_waitlist?: boolean | null
          id?: string
          max_advance_booking_days?: number | null
          min_advance_booking_hours?: number | null
          openwa_session_id?: string | null
          organization_id: string
          reminder_settings?: Json | null
          require_approval?: boolean | null
          seat_booking_enabled?: boolean
          seat_booking_hold_hours?: number
          slot_duration_minutes?: number | null
          updated_at?: string | null
          whatsapp_bot_number?: string | null
          whatsapp_integration_enabled?: boolean | null
        }
        Update: {
          allow_online_booking?: boolean | null
          allow_same_day_booking?: boolean | null
          booking_page_enabled?: boolean | null
          booking_page_url?: string | null
          business_hours_config?: Json | null
          cancellation_policy_hours?: number | null
          created_at?: string | null
          daily_summary_time?: string | null
          default_appointment_color?: string | null
          deposit_instructions?: string | null
          enable_daily_summary?: boolean | null
          enable_rating_request?: boolean | null
          enable_reminders?: boolean | null
          enable_waitlist?: boolean | null
          id?: string
          max_advance_booking_days?: number | null
          min_advance_booking_hours?: number | null
          openwa_session_id?: string | null
          organization_id?: string
          reminder_settings?: Json | null
          require_approval?: boolean | null
          seat_booking_enabled?: boolean
          seat_booking_hold_hours?: number
          slot_duration_minutes?: number | null
          updated_at?: string | null
          whatsapp_bot_number?: string | null
          whatsapp_integration_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "business_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_history: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          last_appointment_date: string | null
          last_name: string
          last_reactivation_sent_at: string | null
          missed_appointments: number | null
          notes: string | null
          organization_id: string
          phone: string
          phone_country_code: string | null
          photo_url: string | null
          preferred_staff_id: string | null
          tags: string[] | null
          total_appointments: number | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_appointment_date?: string | null
          last_name: string
          last_reactivation_sent_at?: string | null
          missed_appointments?: number | null
          notes?: string | null
          organization_id: string
          phone: string
          phone_country_code?: string | null
          photo_url?: string | null
          preferred_staff_id?: string | null
          tags?: string[] | null
          total_appointments?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_appointment_date?: string | null
          last_name?: string
          last_reactivation_sent_at?: string | null
          missed_appointments?: number | null
          notes?: string | null
          organization_id?: string
          phone?: string
          phone_country_code?: string | null
          photo_url?: string | null
          preferred_staff_id?: string | null
          tags?: string[] | null
          total_appointments?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_preferred_staff_id_fkey"
            columns: ["preferred_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component_stack: string | null
          context: Json | null
          error_count: number | null
          error_message: string
          error_stack: string | null
          id: string
          last_occurrence: string | null
          organization_id: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          timestamp: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          context?: Json | null
          error_count?: number | null
          error_message: string
          error_stack?: string | null
          id?: string
          last_occurrence?: string | null
          organization_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          context?: Json | null
          error_count?: number | null
          error_message?: string
          error_stack?: string | null
          id?: string
          last_occurrence?: string | null
          organization_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          appointment_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_read: boolean | null
          message: string
          organization_id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          appointment_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          organization_id: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          appointment_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          organization_id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          appointments_module_enabled: boolean
          created_at: string
          currency: string
          id: string
          is_active: boolean
          license_end_date: string | null
          license_start_date: string | null
          name: string
          slug: string
          subscription_platform: string | null
          subscription_product_id: string | null
          subscription_status: string | null
          subscription_updated_at: string | null
          timezone: string
          trips_module_enabled: boolean
          whatsapp_phone: string | null
        }
        Insert: {
          appointments_module_enabled?: boolean
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          license_end_date?: string | null
          license_start_date?: string | null
          name: string
          slug: string
          subscription_platform?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_updated_at?: string | null
          timezone?: string
          trips_module_enabled?: boolean
          whatsapp_phone?: string | null
        }
        Update: {
          appointments_module_enabled?: boolean
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          license_end_date?: string | null
          license_start_date?: string | null
          name?: string
          slug?: string
          subscription_platform?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_updated_at?: string | null
          timezone?: string
          trips_module_enabled?: boolean
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      reminder_logs: {
        Row: {
          appointment_id: string
          delivered_at: string | null
          error_message: string | null
          id: string
          message_content: string | null
          method: Database["public"]["Enums"]["reminder_method"]
          read_at: string | null
          reminder_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          method: Database["public"]["Enums"]["reminder_method"]
          read_at?: string | null
          reminder_type: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string | null
          method?: Database["public"]["Enums"]["reminder_method"]
          read_at?: string | null
          reminder_type?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          available_for_online_booking: boolean | null
          buffer_time_minutes: number | null
          category_id: string | null
          color: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean | null
          max_advance_booking_days: number | null
          min_advance_booking_hours: number | null
          name: string
          organization_id: string
          price: number | null
          requires_approval: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          available_for_online_booking?: boolean | null
          buffer_time_minutes?: number | null
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_advance_booking_days?: number | null
          min_advance_booking_hours?: number | null
          name: string
          organization_id: string
          price?: number | null
          requires_approval?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          available_for_online_booking?: boolean | null
          buffer_time_minutes?: number | null
          category_id?: string | null
          color?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_advance_booking_days?: number | null
          min_advance_booking_hours?: number | null
          name?: string
          organization_id?: string
          price?: number | null
          requires_approval?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          effective_from: string | null
          effective_until: string | null
          end_time: string
          id: string
          is_available: boolean | null
          staff_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          effective_from?: string | null
          effective_until?: string | null
          end_time: string
          id?: string
          is_available?: boolean | null
          staff_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          effective_from?: string | null
          effective_until?: string | null
          end_time?: string
          id?: string
          is_available?: boolean | null
          staff_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_exceptions: {
        Row: {
          created_at: string | null
          description: string | null
          end_datetime: string
          exception_type: Database["public"]["Enums"]["schedule_exception_type"]
          id: string
          is_recurring: boolean | null
          organization_id: string
          staff_id: string | null
          start_datetime: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_datetime: string
          exception_type: Database["public"]["Enums"]["schedule_exception_type"]
          id?: string
          is_recurring?: boolean | null
          organization_id: string
          staff_id?: string | null
          start_datetime: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_datetime?: string
          exception_type?: Database["public"]["Enums"]["schedule_exception_type"]
          id?: string
          is_recurring?: boolean | null
          organization_id?: string
          staff_id?: string | null
          start_datetime?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_exceptions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          accepts_online_bookings: boolean | null
          bio: string | null
          color: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean | null
          is_bookable: boolean | null
          last_name: string
          nickname: string | null
          organization_id: string
          phone: string | null
          photo_url: string | null
          sort_order: number | null
          specialties: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accepts_online_bookings?: boolean | null
          bio?: string | null
          color?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean | null
          is_bookable?: boolean | null
          last_name: string
          nickname?: string | null
          organization_id: string
          phone?: string | null
          photo_url?: string | null
          sort_order?: number | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accepts_online_bookings?: boolean | null
          bio?: string | null
          color?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          is_bookable?: boolean | null
          last_name?: string
          nickname?: string | null
          organization_id?: string
          phone?: string | null
          photo_url?: string | null
          sort_order?: number | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          created_at: string | null
          id: string
          proficiency_level:
            | Database["public"]["Enums"]["proficiency_level"]
            | null
          service_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          proficiency_level?:
            | Database["public"]["Enums"]["proficiency_level"]
            | null
          service_id: string
          staff_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          proficiency_level?:
            | Database["public"]["Enums"]["proficiency_level"]
            | null
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          created_at: string
          environment: string | null
          event_id: string
          event_type: string
          expiration_at: string | null
          id: string
          organization_id: string | null
          product_id: string | null
          raw_payload: Json
          store: string | null
        }
        Insert: {
          created_at?: string
          environment?: string | null
          event_id: string
          event_type: string
          expiration_at?: string | null
          id?: string
          organization_id?: string | null
          product_id?: string | null
          raw_payload: Json
          store?: string | null
        }
        Update: {
          created_at?: string
          environment?: string | null
          event_id?: string
          event_type?: string
          expiration_at?: string | null
          id?: string
          organization_id?: string | null
          product_id?: string | null
          raw_payload?: Json
          store?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_bookings: {
        Row: {
          amount_paid: number
          booking_number: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          deposit_amount: number | null
          deposit_method: string | null
          deposit_paid_at: string | null
          deposit_status: Database["public"]["Enums"]["trip_deposit_status"]
          extra_amount: number
          extra_description: string | null
          hold_expires_at: string | null
          id: string
          internal_notes: string | null
          notes: string | null
          organization_id: string
          passenger_names: string[]
          pickup_point_id: string | null
          price_total: number | null
          seats: number
          source: Database["public"]["Enums"]["appointment_source"]
          status: Database["public"]["Enums"]["trip_booking_status"]
          trip_id: string
          trip_type: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          booking_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          deposit_amount?: number | null
          deposit_method?: string | null
          deposit_paid_at?: string | null
          deposit_status?: Database["public"]["Enums"]["trip_deposit_status"]
          extra_amount?: number
          extra_description?: string | null
          hold_expires_at?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          organization_id: string
          passenger_names?: string[]
          pickup_point_id?: string | null
          price_total?: number | null
          seats: number
          source?: Database["public"]["Enums"]["appointment_source"]
          status?: Database["public"]["Enums"]["trip_booking_status"]
          trip_id: string
          trip_type?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          booking_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deposit_amount?: number | null
          deposit_method?: string | null
          deposit_paid_at?: string | null
          deposit_status?: Database["public"]["Enums"]["trip_deposit_status"]
          extra_amount?: number
          extra_description?: string | null
          hold_expires_at?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          organization_id?: string
          passenger_names?: string[]
          pickup_point_id?: string | null
          price_total?: number | null
          seats?: number
          source?: Database["public"]["Enums"]["appointment_source"]
          status?: Database["public"]["Enums"]["trip_booking_status"]
          trip_id?: string
          trip_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_bookings_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "trip_pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_pickup_points: {
        Row: {
          created_at: string
          deposit_per_seat: number
          details: string | null
          id: string
          name: string
          organization_id: string
          pickup_time: string | null
          price_per_seat: number
          price_round_trip: number | null
          sort_order: number
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_per_seat?: number
          details?: string | null
          id?: string
          name: string
          organization_id: string
          pickup_time?: string | null
          price_per_seat?: number
          price_round_trip?: number | null
          sort_order?: number
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_per_seat?: number
          details?: string | null
          id?: string
          name?: string
          organization_id?: string
          pickup_time?: string | null
          price_per_seat?: number
          price_round_trip?: number | null
          sort_order?: number
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_pickup_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_pickup_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_pickup_points_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          booking_closes_at: string | null
          booking_opens_at: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          departure_date: string
          departure_time: string
          deposit_per_seat: number
          description: string | null
          driver_name: string | null
          driver_phone: string | null
          id: string
          internal_notes: string | null
          is_published: boolean
          max_seats_per_booking: number
          organization_id: string
          pickup_location: string | null
          price_per_seat: number
          price_round_trip: number | null
          requires_approval: boolean
          return_time: string | null
          round_trip_enabled: boolean
          timezone: string
          title: string
          total_seats: number
          updated_at: string
          vehicle_description: string | null
          vehicle_photo_path: string | null
        }
        Insert: {
          booking_closes_at?: string | null
          booking_opens_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          departure_date: string
          departure_time: string
          deposit_per_seat?: number
          description?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          internal_notes?: string | null
          is_published?: boolean
          max_seats_per_booking?: number
          organization_id: string
          pickup_location?: string | null
          price_per_seat?: number
          price_round_trip?: number | null
          requires_approval?: boolean
          return_time?: string | null
          round_trip_enabled?: boolean
          timezone?: string
          title: string
          total_seats: number
          updated_at?: string
          vehicle_description?: string | null
          vehicle_photo_path?: string | null
        }
        Update: {
          booking_closes_at?: string | null
          booking_opens_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          departure_date?: string
          departure_time?: string
          deposit_per_seat?: number
          description?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          internal_notes?: string | null
          is_published?: boolean
          max_seats_per_booking?: number
          organization_id?: string
          pickup_location?: string | null
          price_per_seat?: number
          price_round_trip?: number | null
          requires_approval?: boolean
          return_time?: string | null
          round_trip_enabled?: boolean
          timezone?: string
          title?: string
          total_seats?: number
          updated_at?: string
          vehicle_description?: string | null
          vehicle_photo_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          organization_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_outbound_messages: {
        Row: {
          appointment_id: string | null
          body: string | null
          chat_id: string
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          intent: Database["public"]["Enums"]["wa_outbound_intent"]
          message_id: string | null
          organization_id: string
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["wa_outbound_status"]
          trip_booking_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          body?: string | null
          chat_id: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          intent: Database["public"]["Enums"]["wa_outbound_intent"]
          message_id?: string | null
          organization_id: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["wa_outbound_status"]
          trip_booking_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          body?: string | null
          chat_id?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          intent?: Database["public"]["Enums"]["wa_outbound_intent"]
          message_id?: string | null
          organization_id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["wa_outbound_status"]
          trip_booking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_outbound_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_outbound_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_outbound_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_outbound_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_outbound_messages_trip_booking_id_fkey"
            columns: ["trip_booking_id"]
            isOneToOne: false
            referencedRelation: "trip_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_processed_events: {
        Row: {
          event_type: string | null
          idempotency_key: string
          organization_id: string | null
          processed_at: string | null
        }
        Insert: {
          event_type?: string | null
          idempotency_key: string
          organization_id?: string | null
          processed_at?: string | null
        }
        Update: {
          event_type?: string | null
          idempotency_key?: string
          organization_id?: string | null
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_processed_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_processed_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string | null
          customer_id: string
          expires_at: string | null
          flexible_dates: boolean | null
          flexible_times: boolean | null
          id: string
          notes: string | null
          notified_at: string | null
          organization_id: string
          preferred_date: string
          preferred_staff_id: string | null
          preferred_time: string | null
          priority: number | null
          service_id: string
          status: Database["public"]["Enums"]["waitlist_status"] | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          expires_at?: string | null
          flexible_dates?: boolean | null
          flexible_times?: boolean | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          organization_id: string
          preferred_date: string
          preferred_staff_id?: string | null
          preferred_time?: string | null
          priority?: number | null
          service_id: string
          status?: Database["public"]["Enums"]["waitlist_status"] | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          expires_at?: string | null
          flexible_dates?: boolean | null
          flexible_times?: boolean | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          organization_id?: string
          preferred_date?: string
          preferred_staff_id?: string | null
          preferred_time?: string | null
          priority?: number | null
          service_id?: string
          status?: Database["public"]["Enums"]["waitlist_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_preferred_staff_id_fkey"
            columns: ["preferred_staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      appointments_with_details: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          appointment_date: string | null
          appointment_number: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_confirmed_at: string | null
          confirmation_sent_at: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_first_name: string | null
          customer_id: string | null
          customer_last_name: string | null
          customer_phone: string | null
          duration_minutes: number | null
          end_time: string | null
          feedback: string | null
          id: string | null
          internal_notes: string | null
          notes: string | null
          organization_id: string | null
          organization_name: string | null
          organization_timezone: string | null
          payment_method: string | null
          price_charged: number | null
          rating: number | null
          reminder_method: Database["public"]["Enums"]["reminder_method"] | null
          reminder_sent_at: string | null
          service_id: string | null
          service_name: string | null
          service_price: number | null
          source: Database["public"]["Enums"]["appointment_source"] | null
          staff_first_name: string | null
          staff_id: string | null
          staff_last_name: string | null
          staff_nickname: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          timezone: string | null
          updated_at: string | null
          was_paid: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations_with_license_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_members"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations_with_license_status: {
        Row: {
          appointments_module_enabled: boolean | null
          created_at: string | null
          currency: string | null
          days_remaining: number | null
          id: string | null
          is_active: boolean | null
          is_usable: boolean | null
          license_end_date: string | null
          license_message: string | null
          license_start_date: string | null
          license_status: Database["public"]["Enums"]["license_status"] | null
          name: string | null
          slug: string | null
          subscription_platform: string | null
          subscription_product_id: string | null
          subscription_status: string | null
          subscription_updated_at: string | null
          timezone: string | null
          trips_module_enabled: boolean | null
          whatsapp_phone: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_revenuecat_event: {
        Args: {
          p_environment: string
          p_event_id: string
          p_event_type: string
          p_expiration_at: string
          p_organization_id: string
          p_payload: Json
          p_product_id: string
          p_store: string
        }
        Returns: Json
      }
      auth_user_role: { Args: never; Returns: string }
      booking_min_to_time: { Args: { p_min: number }; Returns: string }
      booking_phone_key: {
        Args: { p_country_code: string; p_phone: string }
        Returns: string
      }
      booking_time_to_min: { Args: { p_time: string }; Returns: number }
      check_license_status: {
        Args: { grace_period_days?: number; org_id: string }
        Returns: {
          days_remaining: number
          is_usable: boolean
          message: string
          status: Database["public"]["Enums"]["license_status"]
        }[]
      }
      cleanup_wa_processed_events: { Args: never; Returns: undefined }
      create_organization_with_owner: {
        Args: {
          license_end_date?: string
          license_start_date?: string
          org_name: string
          org_slug: string
          org_timezone?: string
          org_whatsapp_phone?: string
          owner_email?: string
          owner_user_id?: string
        }
        Returns: Json
      }
      create_public_booking: {
        Args: {
          p_date: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_notes: string
          p_org_id: string
          p_phone: string
          p_service_id: string
          p_staff_id: string
          p_start: string
        }
        Returns: Json
      }
      create_trip_booking: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_notes: string
          p_org_id: string
          p_passenger_names: string[]
          p_phone: string
          p_pickup_point_id?: string
          p_round_trip?: boolean
          p_seats: number
          p_trip_id: string
        }
        Returns: Json
      }
      generate_appointment_number: { Args: { org_id: string }; Returns: string }
      generate_trip_booking_number: {
        Args: { p_org_id: string }
        Returns: string
      }
      get_admin_platform_stats: { Args: never; Returns: Json }
      get_error_stats: {
        Args: { p_days?: number; p_organization_id?: string }
        Returns: {
          errors_today: number
          most_common_error: string
          resolved_errors: number
          total_errors: number
          unique_errors: number
          unresolved_errors: number
        }[]
      }
      get_my_organization_license_status: {
        Args: { grace_period_days?: number }
        Returns: {
          days_remaining: number
          is_usable: boolean
          message: string
          organization_id: string
          organization_name: string
          status: Database["public"]["Enums"]["license_status"]
        }[]
      }
      get_organization_analytics: {
        Args: {
          p_end_date: string
          p_organization_id?: string
          p_start_date: string
        }
        Returns: Json
      }
      initialize_business_settings: {
        Args: { org_id: string }
        Returns: undefined
      }
      is_admin_or_owner_check: { Args: never; Returns: boolean }
      is_staff_slot_free: {
        Args: {
          p_date: string
          p_occupied_minutes: number
          p_staff_id: string
          p_start: string
        }
        Returns: boolean
      }
      org_license_usable: { Args: { p_org_id: string }; Returns: boolean }
      ping: { Args: never; Returns: string }
      public_booking_info: { Args: { p_slug: string }; Returns: Json }
      public_booking_org_open: { Args: { p_org_id: string }; Returns: boolean }
      public_booking_slots: {
        Args: {
          p_date: string
          p_org_id: string
          p_service_id: string
          p_staff_id: string
        }
        Returns: {
          staff_id: string
          start_time: string
        }[]
      }
      public_booking_staff_for_service: {
        Args: { p_org_id: string; p_service_id: string }
        Returns: {
          sort_order: number
          staff_id: string
        }[]
      }
      public_trips_info: { Args: { p_slug: string }; Returns: Json }
      public_trips_org_open: { Args: { p_org_id: string }; Returns: boolean }
      queue_wa_trip: {
        Args: { p_booking_id: string; p_intent: string; p_org_id: string }
        Returns: undefined
      }
      release_expired_trip_holds: { Args: never; Returns: number }
      save_staff_schedule: {
        Args: { p_ranges: Json; p_service_ids: string[]; p_staff_id: string }
        Returns: undefined
      }
      search_customers_fulltext: {
        Args: {
          p_is_active?: boolean
          p_limit?: number
          p_offset?: number
          p_organization_id: string
          p_search_term: string
        }
        Returns: {
          created_at: string | null
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          last_appointment_date: string | null
          last_name: string
          last_reactivation_sent_at: string | null
          missed_appointments: number | null
          notes: string | null
          organization_id: string
          phone: string
          phone_country_code: string | null
          photo_url: string | null
          preferred_staff_id: string | null
          tags: string[] | null
          total_appointments: number | null
          updated_at: string | null
          whatsapp_number: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      trip_booking_window_open: {
        Args: { p_trip_id: string }
        Returns: boolean
      }
      trip_seat_price: {
        Args: {
          p_pickup_point_id: string
          p_round_trip: boolean
          p_trip_id: string
        }
        Returns: {
          deposit: number
          price: number
        }[]
      }
      trip_seats_taken: { Args: { p_trip_id: string }; Returns: number }
      wa_appointments_in_window: {
        Args: { p_end: string; p_start: string }
        Returns: {
          appointment_date: string
          id: string
          organization_id: string
          reminder_sent_at: string
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
        }[]
      }
    }
    Enums: {
      appointment_source: "web" | "whatsapp" | "phone" | "walk_in" | "admin"
      appointment_status:
        | "pending"
        | "confirmed"
        | "reminded"
        | "client_confirmed"
        | "checked_in"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
        | "rescheduled"
      license_status: "active" | "grace_period" | "expired" | "no_license"
      proficiency_level: "junior" | "intermediate" | "senior" | "expert"
      reminder_method: "whatsapp" | "sms" | "email" | "call" | "push"
      request_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
        | "expired"
      schedule_exception_type:
        | "time_off"
        | "holiday"
        | "special_hours"
        | "blocked"
      time_off_type: "vacation" | "sick_leave" | "personal" | "unpaid" | "other"
      trip_booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      trip_deposit_status: "pending" | "paid" | "refunded" | "waived"
      user_role: "admin" | "owner" | "staff" | "special"
      wa_outbound_intent:
        | "confirm"
        | "reminder_24h"
        | "reminder_1h"
        | "notify_business_new"
        | "notify_business_cancel"
        | "notify_business_confirm"
        | "cancel_ack"
        | "confirm_ack"
        | "reminder_manual"
        | "clarify"
        | "daily_summary"
        | "rating_request"
        | "rating_ack"
        | "reactivation"
        | "waitlist_slot"
        | "approved"
        | "trip_booked"
        | "trip_approved"
        | "trip_deposit_paid"
        | "trip_notify_business"
        | "trip_booking_cancelled"
        | "trip_departure_cancelled"
      wa_outbound_status: "pending" | "sent" | "delivered" | "read" | "failed"
      waitlist_status:
        | "active"
        | "notified"
        | "booked"
        | "expired"
        | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appointment_source: ["web", "whatsapp", "phone", "walk_in", "admin"],
      appointment_status: [
        "pending",
        "confirmed",
        "reminded",
        "client_confirmed",
        "checked_in",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      license_status: ["active", "grace_period", "expired", "no_license"],
      proficiency_level: ["junior", "intermediate", "senior", "expert"],
      reminder_method: ["whatsapp", "sms", "email", "call", "push"],
      request_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "expired",
      ],
      schedule_exception_type: [
        "time_off",
        "holiday",
        "special_hours",
        "blocked",
      ],
      time_off_type: ["vacation", "sick_leave", "personal", "unpaid", "other"],
      trip_booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      trip_deposit_status: ["pending", "paid", "refunded", "waived"],
      user_role: ["admin", "owner", "staff", "special"],
      wa_outbound_intent: [
        "confirm",
        "reminder_24h",
        "reminder_1h",
        "notify_business_new",
        "notify_business_cancel",
        "notify_business_confirm",
        "cancel_ack",
        "confirm_ack",
        "reminder_manual",
        "clarify",
        "daily_summary",
        "rating_request",
        "rating_ack",
        "reactivation",
        "waitlist_slot",
        "approved",
        "trip_booked",
        "trip_approved",
        "trip_deposit_paid",
        "trip_notify_business",
        "trip_booking_cancelled",
        "trip_departure_cancelled",
      ],
      wa_outbound_status: ["pending", "sent", "delivered", "read", "failed"],
      waitlist_status: ["active", "notified", "booked", "expired", "cancelled"],
    },
  },
} as const
