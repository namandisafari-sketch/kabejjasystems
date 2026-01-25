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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      academic_terms: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          start_date: string
          tenant_id: string
          term_number: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          start_date: string
          tenant_id: string
          term_number: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          start_date?: string
          tenant_id?: string
          term_number?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "academic_terms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          priority: string
          published_at: string | null
          target_audience: string
          target_package_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          published_at?: string | null
          target_audience?: string
          target_package_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          priority?: string
          published_at?: string | null
          target_audience?: string
          target_package_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_target_package_id_fkey"
            columns: ["target_package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          balance: number | null
          bank_name: string | null
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          is_reconciled: boolean | null
          last_reconciliation_date: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number?: string | null
          balance?: number | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          is_reconciled?: boolean | null
          last_reconciliation_date?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string | null
          balance?: number | null
          bank_name?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          is_reconciled?: boolean | null
          last_reconciliation_date?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      business_modules: {
        Row: {
          applicable_business_types: string[] | null
          category: string
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_core: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          applicable_business_types?: string[] | null
          category?: string
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_core?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          applicable_business_types?: string[] | null
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_core?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      business_packages: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          features: Json | null
          id: string
          included_users: number
          is_active: boolean
          max_branches: number
          max_products: number | null
          max_users: number
          monthly_price: number
          name: string
          price_per_additional_user: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          included_users?: number
          is_active?: boolean
          max_branches?: number
          max_products?: number | null
          max_users?: number
          monthly_price?: number
          name: string
          price_per_additional_user?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          features?: Json | null
          id?: string
          included_users?: number
          is_active?: boolean
          max_branches?: number
          max_products?: number | null
          max_users?: number
          monthly_price?: number
          name?: string
          price_per_additional_user?: number
          updated_at?: string
        }
        Relationships: []
      }
      chart_of_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          balance: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          sub_type: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          balance?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          sub_type?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          balance?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          sub_type?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          product_id: string
          tenant_id: string
          times_purchased: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          product_id: string
          tenant_id: string
          times_purchased?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          product_id?: string
          tenant_id?: string
          times_purchased?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          received_by: string | null
          reference_number: string | null
          sale_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          received_by?: string | null
          reference_number?: string | null
          sale_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          received_by?: string | null
          reference_number?: string | null
          sale_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          current_balance: number | null
          customer_type: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_type?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_type?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_fingerprints: {
        Row: {
          block_reason: string | null
          blocked_at: string | null
          created_at: string | null
          device_id: string
          id: string
          is_blocked: boolean | null
          language: string | null
          last_seen_at: string | null
          platform: string | null
          screen_resolution: string | null
          tenant_id: string | null
          timezone: string | null
          trial_ended_at: string | null
          trial_started_at: string | null
          user_agent: string | null
        }
        Insert: {
          block_reason?: string | null
          blocked_at?: string | null
          created_at?: string | null
          device_id: string
          id?: string
          is_blocked?: boolean | null
          language?: string | null
          last_seen_at?: string | null
          platform?: string | null
          screen_resolution?: string | null
          tenant_id?: string | null
          timezone?: string | null
          trial_ended_at?: string | null
          trial_started_at?: string | null
          user_agent?: string | null
        }
        Update: {
          block_reason?: string | null
          blocked_at?: string | null
          created_at?: string | null
          device_id?: string
          id?: string
          is_blocked?: boolean | null
          language?: string | null
          last_seen_at?: string | null
          platform?: string | null
          screen_resolution?: string | null
          tenant_id?: string | null
          timezone?: string | null
          trial_ended_at?: string | null
          trial_started_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_fingerprints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_cases: {
        Row: {
          action_details: string | null
          action_taken: string
          case_number: string
          created_at: string
          created_by: string | null
          expulsion_date: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          id: string
          incident_date: string
          incident_description: string
          incident_type: string
          is_permanent_expulsion: boolean | null
          location: string | null
          parent_acknowledged: boolean | null
          parent_acknowledged_at: string | null
          parent_notified: boolean | null
          parent_notified_at: string | null
          parent_notified_by: string | null
          parent_response: string | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          student_id: string
          suspension_end_date: string | null
          suspension_start_date: string | null
          tenant_id: string
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          action_details?: string | null
          action_taken: string
          case_number: string
          created_at?: string
          created_by?: string | null
          expulsion_date?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          incident_date?: string
          incident_description: string
          incident_type: string
          is_permanent_expulsion?: boolean | null
          location?: string | null
          parent_acknowledged?: boolean | null
          parent_acknowledged_at?: string | null
          parent_notified?: boolean | null
          parent_notified_at?: string | null
          parent_notified_by?: string | null
          parent_response?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id: string
          suspension_end_date?: string | null
          suspension_start_date?: string | null
          tenant_id: string
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          action_details?: string | null
          action_taken?: string
          case_number?: string
          created_at?: string
          created_by?: string | null
          expulsion_date?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          incident_date?: string
          incident_description?: string
          incident_type?: string
          is_permanent_expulsion?: boolean | null
          location?: string | null
          parent_acknowledged?: boolean | null
          parent_acknowledged_at?: string | null
          parent_notified?: boolean | null
          parent_notified_at?: string | null
          parent_notified_by?: string | null
          parent_response?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          student_id?: string
          suspension_end_date?: string | null
          suspension_start_date?: string | null
          tenant_id?: string
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discipline_cases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      early_departure_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          gate_checkin_id: string | null
          id: string
          reason: string
          rejection_reason: string | null
          requested_at: string
          requested_by: string | null
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          gate_checkin_id?: string | null
          id?: string
          reason: string
          rejection_reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          gate_checkin_id?: string | null
          id?: string
          reason?: string
          rejection_reason?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "early_departure_requests_gate_checkin_id_fkey"
            columns: ["gate_checkin_id"]
            isOneToOne: false
            referencedRelation: "gate_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_departure_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "early_departure_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_activity_ratings: {
        Row: {
          activity_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating_code: string
          report_card_id: string
        }
        Insert: {
          activity_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating_code: string
          report_card_id: string
        }
        Update: {
          activity_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating_code?: string
          report_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecd_activity_ratings_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "ecd_learning_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_activity_ratings_report_card_id_fkey"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "ecd_report_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_class_roles: {
        Row: {
          badge_icon: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          badge_icon?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          badge_icon?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecd_class_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_learning_activities: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecd_learning_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_learning_areas: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecd_learning_areas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_learning_ratings: {
        Row: {
          created_at: string
          grade_remark: string | null
          id: string
          learning_area_id: string
          numeric_score: number | null
          rating_code: string
          remark: string | null
          report_card_id: string
        }
        Insert: {
          created_at?: string
          grade_remark?: string | null
          id?: string
          learning_area_id: string
          numeric_score?: number | null
          rating_code: string
          remark?: string | null
          report_card_id: string
        }
        Update: {
          created_at?: string
          grade_remark?: string | null
          id?: string
          learning_area_id?: string
          numeric_score?: number | null
          rating_code?: string
          remark?: string | null
          report_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecd_learning_ratings_learning_area_id_fkey"
            columns: ["learning_area_id"]
            isOneToOne: false
            referencedRelation: "ecd_learning_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_learning_ratings_report_card_id_fkey"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "ecd_report_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_monthly_attendance: {
        Row: {
          created_at: string
          days_absent: number | null
          days_present: number | null
          id: string
          month: number
          student_id: string
          tenant_id: string
          term_id: string
          total_days: number | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          days_absent?: number | null
          days_present?: number | null
          id?: string
          month: number
          student_id: string
          tenant_id: string
          term_id: string
          total_days?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          days_absent?: number | null
          days_present?: number | null
          id?: string
          month?: number
          student_id?: string
          tenant_id?: string
          term_id?: string
          total_days?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ecd_monthly_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_monthly_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_monthly_attendance_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_rating_scale: {
        Row: {
          code: string
          color: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          label: string
          numeric_value: number | null
          tenant_id: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          numeric_value?: number | null
          tenant_id: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          numeric_value?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecd_rating_scale_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_report_cards: {
        Row: {
          average_score: number | null
          behavior_comment: string | null
          class_id: string | null
          class_rank: number | null
          created_at: string
          created_by: string | null
          days_absent: number | null
          days_present: number | null
          fees_balance: number | null
          head_teacher_comment: string | null
          head_teacher_name: string | null
          id: string
          is_prefect: boolean | null
          monthly_attendance: Json | null
          next_term_fees: number | null
          next_term_start_date: string | null
          parent_feedback: string | null
          published_at: string | null
          status: string | null
          student_id: string
          teacher_comment: string | null
          teacher_name: string | null
          teacher_signature_url: string | null
          tenant_id: string
          term_closing_date: string | null
          term_id: string
          total_school_days: number | null
          total_score: number | null
          total_students_in_class: number | null
          updated_at: string
        }
        Insert: {
          average_score?: number | null
          behavior_comment?: string | null
          class_id?: string | null
          class_rank?: number | null
          created_at?: string
          created_by?: string | null
          days_absent?: number | null
          days_present?: number | null
          fees_balance?: number | null
          head_teacher_comment?: string | null
          head_teacher_name?: string | null
          id?: string
          is_prefect?: boolean | null
          monthly_attendance?: Json | null
          next_term_fees?: number | null
          next_term_start_date?: string | null
          parent_feedback?: string | null
          published_at?: string | null
          status?: string | null
          student_id: string
          teacher_comment?: string | null
          teacher_name?: string | null
          teacher_signature_url?: string | null
          tenant_id: string
          term_closing_date?: string | null
          term_id: string
          total_school_days?: number | null
          total_score?: number | null
          total_students_in_class?: number | null
          updated_at?: string
        }
        Update: {
          average_score?: number | null
          behavior_comment?: string | null
          class_id?: string | null
          class_rank?: number | null
          created_at?: string
          created_by?: string | null
          days_absent?: number | null
          days_present?: number | null
          fees_balance?: number | null
          head_teacher_comment?: string | null
          head_teacher_name?: string | null
          id?: string
          is_prefect?: boolean | null
          monthly_attendance?: Json | null
          next_term_fees?: number | null
          next_term_start_date?: string | null
          parent_feedback?: string | null
          published_at?: string | null
          status?: string | null
          student_id?: string
          teacher_comment?: string | null
          teacher_name?: string | null
          teacher_signature_url?: string | null
          tenant_id?: string
          term_closing_date?: string | null
          term_id?: string
          total_school_days?: number | null
          total_score?: number | null
          total_students_in_class?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecd_report_cards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_report_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_report_cards_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_report_settings: {
        Row: {
          created_at: string
          footer_message: string | null
          id: string
          primary_color: string | null
          report_title: string | null
          secondary_color: string | null
          show_attendance: boolean | null
          show_parent_tips: boolean | null
          show_photo: boolean | null
          show_roles: boolean | null
          show_skills: boolean | null
          show_values: boolean | null
          tenant_id: string
          theme: string | null
          updated_at: string
          watermark_text: string | null
        }
        Insert: {
          created_at?: string
          footer_message?: string | null
          id?: string
          primary_color?: string | null
          report_title?: string | null
          secondary_color?: string | null
          show_attendance?: boolean | null
          show_parent_tips?: boolean | null
          show_photo?: boolean | null
          show_roles?: boolean | null
          show_skills?: boolean | null
          show_values?: boolean | null
          tenant_id: string
          theme?: string | null
          updated_at?: string
          watermark_text?: string | null
        }
        Update: {
          created_at?: string
          footer_message?: string | null
          id?: string
          primary_color?: string | null
          report_title?: string | null
          secondary_color?: string | null
          show_attendance?: boolean | null
          show_parent_tips?: boolean | null
          show_photo?: boolean | null
          show_roles?: boolean | null
          show_skills?: boolean | null
          show_values?: boolean | null
          tenant_id?: string
          theme?: string | null
          updated_at?: string
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecd_report_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_skills_ratings: {
        Row: {
          created_at: string
          id: string
          is_achieved: boolean | null
          rating_code: string | null
          remark: string | null
          report_card_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_achieved?: boolean | null
          rating_code?: string | null
          remark?: string | null
          report_card_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_achieved?: boolean | null
          rating_code?: string | null
          remark?: string | null
          report_card_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecd_skills_ratings_report_card_id_fkey"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "ecd_report_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_skills_ratings_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "ecd_skills_values"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_skills_values: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecd_skills_values_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ecd_student_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          is_active: boolean | null
          role_id: string
          student_id: string
          tenant_id: string
          term_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          role_id: string
          student_id: string
          tenant_id: string
          term_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          role_id?: string
          student_id?: string
          tenant_id?: string
          term_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecd_student_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "ecd_class_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_student_roles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_student_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecd_student_roles_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          branch_id: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          role: string
          salary: number | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          salary?: number | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          salary?: number | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: string | null
          receipt_url: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          branch_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: string | null
          receipt_url?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          receipt_number: string | null
          received_by: string | null
          reference_number: string | null
          student_fee_id: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          received_by?: string | null
          reference_number?: string | null
          student_fee_id: string
          student_id: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          received_by?: string | null
          reference_number?: string | null
          student_fee_id?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_fee_id_fkey"
            columns: ["student_fee_id"]
            isOneToOne: false
            referencedRelation: "student_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          amount: number
          created_at: string
          fee_type: string
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          level: string
          name: string
          tenant_id: string
          term_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          fee_type: string
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          level: string
          name: string
          tenant_id: string
          term_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee_type?: string
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          level?: string
          name?: string
          tenant_id?: string
          term_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_statements_cache: {
        Row: {
          created_at: string | null
          generated_at: string | null
          id: string
          period_end: string
          period_start: string
          statement_json: Json
          statement_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          period_end: string
          period_start: string
          statement_json: Json
          statement_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          statement_json?: Json
          statement_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_statements_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_checkins: {
        Row: {
          check_type: string
          checked_at: string
          checked_by: string | null
          created_at: string
          id: string
          is_late: boolean | null
          notes: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          check_type?: string
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          id?: string
          is_late?: boolean | null
          notes?: string | null
          student_id: string
          tenant_id: string
        }
        Update: {
          check_type?: string
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          id?: string
          is_late?: boolean | null
          notes?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gate_checkins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      general_ledger: {
        Row: {
          approval_status: string | null
          created_at: string | null
          created_by: string | null
          credit_account: string | null
          credit_amount: number | null
          date: string
          debit_account: string | null
          debit_amount: number | null
          description: string | null
          id: string
          modified_at: string | null
          modified_by: string | null
          notes: string | null
          reference_id: string | null
          reference_number: string | null
          tenant_id: string
          timestamp: string | null
          transaction_type: string
        }
        Insert: {
          approval_status?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_account?: string | null
          credit_amount?: number | null
          date: string
          debit_account?: string | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          modified_at?: string | null
          modified_by?: string | null
          notes?: string | null
          reference_id?: string | null
          reference_number?: string | null
          tenant_id: string
          timestamp?: string | null
          transaction_type: string
        }
        Update: {
          approval_status?: string | null
          created_at?: string | null
          created_by?: string | null
          credit_account?: string | null
          credit_amount?: number | null
          date?: string
          debit_account?: string | null
          debit_amount?: number | null
          description?: string | null
          id?: string
          modified_at?: string | null
          modified_by?: string | null
          notes?: string | null
          reference_id?: string | null
          reference_number?: string | null
          tenant_id?: string
          timestamp?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rooms: {
        Row: {
          amenities: Json | null
          capacity: number | null
          created_at: string
          floor: string | null
          id: string
          is_active: boolean | null
          price_per_night: number
          room_number: string
          room_type: string
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amenities?: Json | null
          capacity?: number | null
          created_at?: string
          floor?: string | null
          id?: string
          is_active?: boolean | null
          price_per_night?: number
          room_number: string
          room_type?: string
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amenities?: Json | null
          capacity?: number | null
          created_at?: string
          floor?: string | null
          id?: string
          is_active?: boolean | null
          price_per_night?: number
          room_number?: string
          room_type?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          installation_id: string
          installment_number: number
          notes: string | null
          payment_date: string
          payment_method: string
          received_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          installation_id: string
          installment_number?: number
          notes?: string | null
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          installation_id?: string
          installment_number?: number
          notes?: string | null
          payment_date?: string
          payment_method?: string
          received_by?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installation_payments_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "installation_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_purchases: {
        Row: {
          amount_paid: number
          business_name: string
          business_type: string
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string
          deposit_amount: number
          first_payment_due_date: string | null
          free_months: number
          id: string
          installation_date: string | null
          installation_notes: string | null
          package_id: string | null
          payment_plan: string
          refund_amount: number | null
          refund_reason: string | null
          refund_requested: boolean | null
          refund_requested_at: string | null
          refunded_at: string | null
          satisfaction_confirmed: boolean | null
          satisfaction_confirmed_at: string | null
          selected_subscription_id: string | null
          status: string
          subscription_start_date: string | null
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          business_name: string
          business_type: string
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          deposit_amount?: number
          first_payment_due_date?: string | null
          free_months?: number
          id?: string
          installation_date?: string | null
          installation_notes?: string | null
          package_id?: string | null
          payment_plan?: string
          refund_amount?: number | null
          refund_reason?: string | null
          refund_requested?: boolean | null
          refund_requested_at?: string | null
          refunded_at?: string | null
          satisfaction_confirmed?: boolean | null
          satisfaction_confirmed_at?: string | null
          selected_subscription_id?: string | null
          status?: string
          subscription_start_date?: string | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          business_name?: string
          business_type?: string
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          deposit_amount?: number
          first_payment_due_date?: string | null
          free_months?: number
          id?: string
          installation_date?: string | null
          installation_notes?: string | null
          package_id?: string | null
          payment_plan?: string
          refund_amount?: number | null
          refund_reason?: string | null
          refund_requested?: boolean | null
          refund_requested_at?: string | null
          refunded_at?: string | null
          satisfaction_confirmed?: boolean | null
          satisfaction_confirmed_at?: string | null
          selected_subscription_id?: string | null
          status?: string
          subscription_start_date?: string | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_purchases_selected_subscription_id_fkey"
            columns: ["selected_subscription_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installation_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          layaway_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          received_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          layaway_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          received_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          layaway_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_payments_layaway_id_fkey"
            columns: ["layaway_id"]
            isOneToOne: false
            referencedRelation: "layaway_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_stock_usage: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reason: string
          recorded_by: string | null
          tenant_id: string
          usage_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          reason: string
          recorded_by?: string | null
          tenant_id: string
          usage_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string
          recorded_by?: string | null
          tenant_id?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_stock_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_stock_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_valuation: {
        Row: {
          as_of_date: string
          created_at: string | null
          id: string
          product_id: string | null
          quantity_on_hand: number | null
          tenant_id: string
          total_value: number | null
          unit_cost: number | null
          valuation_method: string | null
        }
        Insert: {
          as_of_date: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity_on_hand?: number | null
          tenant_id: string
          total_value?: number | null
          unit_cost?: number | null
          valuation_method?: string | null
        }
        Update: {
          as_of_date?: string
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity_on_hand?: number | null
          tenant_id?: string
          total_value?: number | null
          unit_cost?: number | null
          valuation_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_valuation_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_valuation_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      layaway_items: {
        Row: {
          created_at: string
          id: string
          layaway_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          layaway_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          layaway_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "layaway_items_layaway_id_fkey"
            columns: ["layaway_id"]
            isOneToOne: false
            referencedRelation: "layaway_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layaway_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      layaway_plans: {
        Row: {
          amount_paid: number
          created_at: string
          created_by: string | null
          customer_id: string
          deposit_amount: number
          due_date: string | null
          id: string
          installment_count: number
          notes: string | null
          sale_id: string | null
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          deposit_amount?: number
          due_date?: string | null
          id?: string
          installment_count?: number
          notes?: string | null
          sale_id?: string | null
          status?: string
          tenant_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deposit_amount?: number
          due_date?: string | null
          id?: string
          installment_count?: number
          notes?: string | null
          sale_id?: string | null
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "layaway_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layaway_plans_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "layaway_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          auto_renew: boolean | null
          billing_period: string | null
          created_at: string
          created_by: string | null
          deposit_amount: number | null
          deposit_months: number | null
          deposit_paid: number | null
          end_date: string
          id: string
          late_fee_amount: number | null
          late_fee_grace_days: number | null
          lease_number: string
          loss_marked_at: string | null
          loss_marked_by: string | null
          marked_as_loss: boolean | null
          monthly_rent: number
          move_in_date: string | null
          move_out_date: string | null
          outstanding_balance: number | null
          payment_due_day: number | null
          renewal_reminder_days: number | null
          rental_tenant_id: string
          special_conditions: string | null
          start_date: string
          status: string
          tenant_id: string
          termination_reason: string | null
          terms_and_conditions: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean | null
          billing_period?: string | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          deposit_months?: number | null
          deposit_paid?: number | null
          end_date: string
          id?: string
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          lease_number: string
          loss_marked_at?: string | null
          loss_marked_by?: string | null
          marked_as_loss?: boolean | null
          monthly_rent: number
          move_in_date?: string | null
          move_out_date?: string | null
          outstanding_balance?: number | null
          payment_due_day?: number | null
          renewal_reminder_days?: number | null
          rental_tenant_id: string
          special_conditions?: string | null
          start_date: string
          status?: string
          tenant_id: string
          termination_reason?: string | null
          terms_and_conditions?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean | null
          billing_period?: string | null
          created_at?: string
          created_by?: string | null
          deposit_amount?: number | null
          deposit_months?: number | null
          deposit_paid?: number | null
          end_date?: string
          id?: string
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          lease_number?: string
          loss_marked_at?: string | null
          loss_marked_by?: string | null
          marked_as_loss?: boolean | null
          monthly_rent?: number
          move_in_date?: string | null
          move_out_date?: string | null
          outstanding_balance?: number | null
          payment_due_day?: number | null
          renewal_reminder_days?: number | null
          rental_tenant_id?: string
          special_conditions?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          termination_reason?: string | null
          terms_and_conditions?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_rental_tenant_id_fkey"
            columns: ["rental_tenant_id"]
            isOneToOne: false
            referencedRelation: "rental_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "rental_units"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_settings: {
        Row: {
          created_at: string
          custom_footer_image_url: string | null
          custom_header_image_url: string | null
          font_family: string | null
          font_size: number | null
          footer_text: string | null
          header_text: string | null
          id: string
          line_spacing: number | null
          logo_position: string | null
          margin_bottom: number | null
          margin_left: number | null
          margin_right: number | null
          margin_top: number | null
          show_address: boolean | null
          show_email: boolean | null
          show_logo: boolean | null
          show_phone: boolean | null
          show_school_name: boolean | null
          show_signature_line: boolean | null
          show_stamp_area: boolean | null
          signature_title: string | null
          tenant_id: string
          updated_at: string
          use_custom_footer: boolean | null
          use_custom_header: boolean | null
        }
        Insert: {
          created_at?: string
          custom_footer_image_url?: string | null
          custom_header_image_url?: string | null
          font_family?: string | null
          font_size?: number | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          line_spacing?: number | null
          logo_position?: string | null
          margin_bottom?: number | null
          margin_left?: number | null
          margin_right?: number | null
          margin_top?: number | null
          show_address?: boolean | null
          show_email?: boolean | null
          show_logo?: boolean | null
          show_phone?: boolean | null
          show_school_name?: boolean | null
          show_signature_line?: boolean | null
          show_stamp_area?: boolean | null
          signature_title?: string | null
          tenant_id: string
          updated_at?: string
          use_custom_footer?: boolean | null
          use_custom_header?: boolean | null
        }
        Update: {
          created_at?: string
          custom_footer_image_url?: string | null
          custom_header_image_url?: string | null
          font_family?: string | null
          font_size?: number | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          line_spacing?: number | null
          logo_position?: string | null
          margin_bottom?: number | null
          margin_left?: number | null
          margin_right?: number | null
          margin_top?: number | null
          show_address?: boolean | null
          show_email?: boolean | null
          show_logo?: boolean | null
          show_phone?: boolean | null
          show_school_name?: boolean | null
          show_signature_line?: boolean | null
          show_stamp_area?: boolean | null
          signature_title?: string | null
          tenant_id?: string
          updated_at?: string
          use_custom_footer?: boolean | null
          use_custom_header?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "letter_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      letters: {
        Row: {
          class_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          letter_date: string | null
          letter_type: string
          reference_number: string | null
          status: string | null
          student_id: string | null
          subject: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          letter_date?: string | null
          letter_type?: string
          reference_number?: string | null
          status?: string | null
          student_id?: string | null
          subject?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          letter_date?: string | null
          letter_type?: string
          reference_number?: string | null
          status?: string | null
          student_id?: string | null
          subject?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "letters_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          category: string
          completed_date: string | null
          contractor_name: string | null
          contractor_phone: string | null
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          priority: string
          rental_tenant_id: string | null
          reported_by: string | null
          request_number: string
          resolution_notes: string | null
          scheduled_date: string | null
          status: string
          tenant_id: string
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string
          completed_date?: string | null
          contractor_name?: string | null
          contractor_phone?: string | null
          created_at?: string
          description: string
          estimated_cost?: number | null
          id?: string
          priority?: string
          rental_tenant_id?: string | null
          reported_by?: string | null
          request_number: string
          resolution_notes?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id: string
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string
          completed_date?: string | null
          contractor_name?: string | null
          contractor_phone?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          priority?: string
          rental_tenant_id?: string | null
          reported_by?: string | null
          request_number?: string
          resolution_notes?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_rental_tenant_id_fkey"
            columns: ["rental_tenant_id"]
            isOneToOne: false
            referencedRelation: "rental_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "rental_units"
            referencedColumns: ["id"]
          },
        ]
      }
      marketers: {
        Row: {
          approved_signups: number | null
          created_at: string | null
          daily_rate: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          referral_code: string
          total_earned: number | null
          total_referrals: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approved_signups?: number | null
          created_at?: string | null
          daily_rate?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          referral_code: string
          total_earned?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approved_signups?: number | null
          created_at?: string | null
          daily_rate?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          referral_code?: string
          total_earned?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          branch_limit: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          display_order: number | null
          free_months_with_installation: number | null
          id: string
          includes_hardware: Json | null
          is_active: boolean | null
          is_one_time: boolean
          is_subscription: boolean | null
          modules_allowed: Json | null
          name: string
          package_type: string
          price: number
          training_days: number | null
          updated_at: string | null
          user_limit: number | null
          validity_days: number | null
        }
        Insert: {
          branch_limit?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          free_months_with_installation?: number | null
          id?: string
          includes_hardware?: Json | null
          is_active?: boolean | null
          is_one_time?: boolean
          is_subscription?: boolean | null
          modules_allowed?: Json | null
          name: string
          package_type?: string
          price: number
          training_days?: number | null
          updated_at?: string | null
          user_limit?: number | null
          validity_days?: number | null
        }
        Update: {
          branch_limit?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          display_order?: number | null
          free_months_with_installation?: number | null
          id?: string
          includes_hardware?: Json | null
          is_active?: boolean | null
          is_one_time?: boolean
          is_subscription?: boolean | null
          modules_allowed?: Json | null
          name?: string
          package_type?: string
          price?: number
          training_days?: number | null
          updated_at?: string | null
          user_limit?: number | null
          validity_days?: number | null
        }
        Relationships: []
      }
      parent_issues: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          parent_id: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          response: string | null
          status: string
          student_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          id?: string
          parent_id: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
          student_id: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          parent_id?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_issues_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_issues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_issues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          is_primary_contact: boolean | null
          parent_id: string
          relationship: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          parent_id: string
          relationship?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean | null
          parent_id?: string
          relationship?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          occupation: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          occupation?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          occupation?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          full_name: string
          gender: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          medical_notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name: string
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          medical_notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          medical_notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_uploads: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          package_id: string
          payment_method: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          tenant_id: string
          transaction_ref: string | null
          uploader_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          package_id: string
          payment_method?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tenant_id: string
          transaction_ref?: string | null
          uploader_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          package_id?: string
          payment_method?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tenant_id?: string
          transaction_ref?: string | null
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_uploads_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_uploads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          billing_email: string | null
          billing_phone: string | null
          confirmation_code: string | null
          created_at: string | null
          currency: string | null
          id: string
          package_id: string | null
          payment_method: string | null
          payment_status: string | null
          pesapal_merchant_reference: string | null
          pesapal_tracking_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_email?: string | null
          billing_phone?: string | null
          confirmation_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          package_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pesapal_merchant_reference?: string | null
          pesapal_tracking_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_email?: string | null
          billing_phone?: string | null
          confirmation_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          package_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pesapal_merchant_reference?: string | null
          pesapal_tracking_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          advances_deducted: number
          base_salary: number
          bonuses: number
          created_at: string
          created_by: string | null
          deductions: number
          employee_id: string
          id: string
          net_salary: number
          notes: string | null
          pay_period_end: string
          pay_period_start: string
          payment_date: string | null
          payment_method: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          advances_deducted?: number
          base_salary?: number
          bonuses?: number
          created_at?: string
          created_by?: string | null
          deductions?: number
          employee_id: string
          id?: string
          net_salary?: number
          notes?: string | null
          pay_period_end: string
          pay_period_start: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          advances_deducted?: number
          base_salary?: number
          bonuses?: number
          created_at?: string
          created_by?: string | null
          deductions?: number
          employee_id?: string
          id?: string
          net_salary?: number
          notes?: string | null
          pay_period_end?: string
          pay_period_start?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_queue: {
        Row: {
          called_at: string | null
          completed_at: string | null
          created_at: string
          customer_name: string | null
          id: string
          items: Json
          queue_number: number
          status: string
          tenant_id: string
          total_amount: number
        }
        Insert: {
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          items?: Json
          queue_number: number
          status?: string
          tenant_id: string
          total_amount?: number
        }
        Update: {
          called_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          items?: Json
          queue_number?: number
          status?: string
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          dispensed_quantity: number | null
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          medication_name: string
          notes: string | null
          prescription_id: string
          product_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          dispensed_quantity?: number | null
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          medication_name: string
          notes?: string | null
          prescription_id: string
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          dispensed_quantity?: number | null
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          medication_name?: string
          notes?: string | null
          prescription_id?: string
          product_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          created_by: string | null
          dispensed_at: string | null
          dispensed_by: string | null
          doctor_name: string | null
          doctor_phone: string | null
          expiry_date: string | null
          hospital_clinic: string | null
          id: string
          notes: string | null
          patient_id: string
          prescription_date: string
          prescription_number: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dispensed_at?: string | null
          dispensed_by?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          expiry_date?: string | null
          hospital_clinic?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          prescription_date?: string
          prescription_number: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dispensed_at?: string | null
          dispensed_by?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          expiry_date?: string | null
          hospital_clinic?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          prescription_date?: string
          prescription_number?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          business_type: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          tenant_id: string | null
        }
        Insert: {
          business_type?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          tenant_id?: string | null
        }
        Update: {
          business_type?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          allow_custom_price: boolean | null
          barcode: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          min_stock_level: number | null
          name: string
          product_type: string | null
          sku: string | null
          stock_quantity: number | null
          supplier: string | null
          tenant_id: string
          unit_of_measure: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          allow_custom_price?: boolean | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          min_stock_level?: number | null
          name: string
          product_type?: string | null
          sku?: string | null
          stock_quantity?: number | null
          supplier?: string | null
          tenant_id: string
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          allow_custom_price?: boolean | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          min_stock_level?: number | null
          name?: string
          product_type?: string | null
          sku?: string | null
          stock_quantity?: number | null
          supplier?: string | null
          tenant_id?: string
          unit_of_measure?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      property_inspections: {
        Row: {
          created_at: string
          findings: Json | null
          id: string
          inspection_date: string
          inspection_type: string
          inspector_name: string | null
          lease_id: string | null
          manager_signature_url: string | null
          notes: string | null
          overall_condition: string | null
          tenant_id: string
          tenant_signature_url: string | null
          unit_id: string
        }
        Insert: {
          created_at?: string
          findings?: Json | null
          id?: string
          inspection_date: string
          inspection_type?: string
          inspector_name?: string | null
          lease_id?: string | null
          manager_signature_url?: string | null
          notes?: string | null
          overall_condition?: string | null
          tenant_id: string
          tenant_signature_url?: string | null
          unit_id: string
        }
        Update: {
          created_at?: string
          findings?: Json | null
          id?: string
          inspection_date?: string
          inspection_type?: string
          inspector_name?: string | null
          lease_id?: string | null
          manager_signature_url?: string | null
          notes?: string | null
          overall_condition?: string | null
          tenant_id?: string
          tenant_signature_url?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_inspections_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inspections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inspections_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "rental_units"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          purchase_order_id: string
          quantity?: number
          received_quantity?: number
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_settings: {
        Row: {
          created_at: string
          footer_message: string | null
          id: string
          logo_alignment: string | null
          next_receipt_number: number | null
          receipt_copies: number | null
          receipt_prefix: string | null
          receipt_title: string | null
          school_motto: string | null
          seasonal_remark: string | null
          show_address: boolean | null
          show_balance_info: boolean | null
          show_cashier: boolean | null
          show_class_info: boolean | null
          show_customer: boolean | null
          show_date_time: boolean | null
          show_email: boolean | null
          show_footer_message: boolean | null
          show_logo: boolean | null
          show_payment_method: boolean | null
          show_phone: boolean | null
          show_school_motto: boolean | null
          show_seasonal_remark: boolean | null
          show_signature_line: boolean | null
          show_stamp_area: boolean | null
          show_term_info: boolean | null
          show_verification_qr: boolean | null
          show_whatsapp_qr: boolean | null
          signature_title: string | null
          stamp_title: string | null
          tenant_id: string
          updated_at: string
          watermark_text: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          footer_message?: string | null
          id?: string
          logo_alignment?: string | null
          next_receipt_number?: number | null
          receipt_copies?: number | null
          receipt_prefix?: string | null
          receipt_title?: string | null
          school_motto?: string | null
          seasonal_remark?: string | null
          show_address?: boolean | null
          show_balance_info?: boolean | null
          show_cashier?: boolean | null
          show_class_info?: boolean | null
          show_customer?: boolean | null
          show_date_time?: boolean | null
          show_email?: boolean | null
          show_footer_message?: boolean | null
          show_logo?: boolean | null
          show_payment_method?: boolean | null
          show_phone?: boolean | null
          show_school_motto?: boolean | null
          show_seasonal_remark?: boolean | null
          show_signature_line?: boolean | null
          show_stamp_area?: boolean | null
          show_term_info?: boolean | null
          show_verification_qr?: boolean | null
          show_whatsapp_qr?: boolean | null
          signature_title?: string | null
          stamp_title?: string | null
          tenant_id: string
          updated_at?: string
          watermark_text?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          footer_message?: string | null
          id?: string
          logo_alignment?: string | null
          next_receipt_number?: number | null
          receipt_copies?: number | null
          receipt_prefix?: string | null
          receipt_title?: string | null
          school_motto?: string | null
          seasonal_remark?: string | null
          show_address?: boolean | null
          show_balance_info?: boolean | null
          show_cashier?: boolean | null
          show_class_info?: boolean | null
          show_customer?: boolean | null
          show_date_time?: boolean | null
          show_email?: boolean | null
          show_footer_message?: boolean | null
          show_logo?: boolean | null
          show_payment_method?: boolean | null
          show_phone?: boolean | null
          show_school_motto?: boolean | null
          show_seasonal_remark?: boolean | null
          show_signature_line?: boolean | null
          show_stamp_area?: boolean | null
          show_term_info?: boolean | null
          show_verification_qr?: boolean | null
          show_whatsapp_qr?: boolean | null
          signature_title?: string | null
          stamp_title?: string | null
          tenant_id?: string
          updated_at?: string
          watermark_text?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          document_url: string
          id: string
          lease_id: string | null
          property_id: string | null
          rental_tenant_id: string | null
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          document_url: string
          id?: string
          lease_id?: string | null
          property_id?: string | null
          rental_tenant_id?: string | null
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          document_url?: string
          id?: string
          lease_id?: string | null
          property_id?: string | null
          rental_tenant_id?: string | null
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_documents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_documents_rental_tenant_id_fkey"
            columns: ["rental_tenant_id"]
            isOneToOne: false
            referencedRelation: "rental_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_id_cards: {
        Row: {
          card_number: string
          created_at: string
          current_holder_id: string | null
          deactivated_at: string | null
          deactivation_reason: string | null
          id: string
          issued_at: string | null
          status: string
          tenant_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          card_number: string
          created_at?: string
          current_holder_id?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          id?: string
          issued_at?: string | null
          status?: string
          tenant_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          card_number?: string
          created_at?: string
          current_holder_id?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          id?: string
          issued_at?: string | null
          status?: string
          tenant_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_id_cards_current_holder_id_fkey"
            columns: ["current_holder_id"]
            isOneToOne: false
            referencedRelation: "rental_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_id_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_id_cards_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "rental_units"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          lease_id: string | null
          message: string
          parent_message_id: string | null
          rental_tenant_id: string | null
          sender_id: string | null
          sender_type: string
          subject: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          lease_id?: string | null
          message: string
          parent_message_id?: string | null
          rental_tenant_id?: string | null
          sender_id?: string | null
          sender_type?: string
          subject: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          lease_id?: string | null
          message?: string
          parent_message_id?: string | null
          rental_tenant_id?: string | null
          sender_id?: string | null
          sender_type?: string
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_messages_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "rental_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_messages_rental_tenant_id_fkey"
            columns: ["rental_tenant_id"]
            isOneToOne: false
            referencedRelation: "rental_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_packages: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          included_users: number
          is_active: boolean | null
          max_properties: number
          max_units: number
          max_units_per_property: number
          monthly_price: number
          name: string
          price_per_additional_user: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          included_users?: number
          is_active?: boolean | null
          max_properties?: number
          max_units?: number
          max_units_per_property?: number
          monthly_price?: number
          name: string
          price_per_additional_user?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          included_users?: number
          is_active?: boolean | null
          max_properties?: number
          max_units?: number
          max_units_per_property?: number
          monthly_price?: number
          name?: string
          price_per_additional_user?: number
          updated_at?: string
        }
        Relationships: []
      }
      rental_payment_proofs: {
        Row: {
          amount: number
          card_id: string
          created_at: string
          id: string
          lease_id: string | null
          notes: string | null
          payer_name: string
          payment_date: string
          payment_provider: string
          rejection_reason: string | null
          status: string
          tenant_id: string
          transaction_reference: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          card_id: string
          created_at?: string
          id?: string
          lease_id?: string | null
          notes?: string | null
          payer_name: string
          payment_date?: string
          payment_provider: string
          rejection_reason?: string | null
          status?: string
          tenant_id: string
          transaction_reference?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          card_id?: string
          created_at?: string
          id?: string
          lease_id?: string | null
          notes?: string | null
          payer_name?: string
          payment_date?: string
          payment_provider?: string
          rejection_reason?: string | null
          status?: string
          tenant_id?: string
          transaction_reference?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_payment_proofs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "rental_id_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payment_proofs_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payment_proofs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          late_fee_applied: number | null
          lease_id: string
          months_covered: number | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_type: string
          period_end: string | null
          period_start: string | null
          receipt_number: string | null
          received_by: string | null
          reference_number: string | null
          rental_tenant_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          late_fee_applied?: number | null
          lease_id: string
          months_covered?: number | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          period_end?: string | null
          period_start?: string | null
          receipt_number?: string | null
          received_by?: string | null
          reference_number?: string | null
          rental_tenant_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          late_fee_applied?: number | null
          lease_id?: string
          months_covered?: number | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          period_end?: string | null
          period_start?: string | null
          receipt_number?: string | null
          received_by?: string | null
          reference_number?: string | null
          rental_tenant_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_rental_tenant_id_fkey"
            columns: ["rental_tenant_id"]
            isOneToOne: false
            referencedRelation: "rental_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_properties: {
        Row: {
          address: string
          amenities: Json | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          property_type: string
          tenant_id: string
          total_units: number
          updated_at: string
          year_built: number | null
        }
        Insert: {
          address: string
          amenities?: Json | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          property_type?: string
          tenant_id: string
          total_units?: number
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          address?: string
          amenities?: Json | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          property_type?: string
          tenant_id?: string
          total_units?: number
          updated_at?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_subscriptions: {
        Row: {
          additional_users: number | null
          addon_amount: number
          created_at: string
          current_properties: number | null
          current_units: number | null
          expires_at: string | null
          id: string
          monthly_amount: number
          next_billing_date: string | null
          package_id: string
          payment_status: string
          started_at: string | null
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          additional_users?: number | null
          addon_amount?: number
          created_at?: string
          current_properties?: number | null
          current_units?: number | null
          expires_at?: string | null
          id?: string
          monthly_amount?: number
          next_billing_date?: string | null
          package_id: string
          payment_status?: string
          started_at?: string | null
          status?: string
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          additional_users?: number | null
          addon_amount?: number
          created_at?: string
          current_properties?: number | null
          current_units?: number | null
          expires_at?: string | null
          id?: string
          monthly_amount?: number
          next_billing_date?: string | null
          package_id?: string
          payment_status?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "rental_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_tenants: {
        Row: {
          access_pin: string | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employer: string | null
          full_name: string
          id: string
          id_number: string | null
          id_type: string | null
          monthly_income: number | null
          notes: string | null
          occupation: string | null
          phone: string | null
          previous_address: string | null
          previous_landlord_contact: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_pin?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          monthly_income?: number | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          previous_address?: string | null
          previous_landlord_contact?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_pin?: string | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          monthly_income?: number | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          previous_address?: string | null
          previous_landlord_contact?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_units: {
        Row: {
          amenities: Json | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          deposit_amount: number | null
          floor_number: number | null
          id: string
          is_active: boolean | null
          monthly_rent: number
          property_id: string
          size_sqm: number | null
          status: string
          tenant_id: string
          unit_number: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          amenities?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          deposit_amount?: number | null
          floor_number?: number | null
          id?: string
          is_active?: boolean | null
          monthly_rent?: number
          property_id: string
          size_sqm?: number | null
          status?: string
          tenant_id: string
          unit_number: string
          unit_type?: string
          updated_at?: string
        }
        Update: {
          amenities?: Json | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          deposit_amount?: number | null
          floor_number?: number | null
          id?: string
          is_active?: boolean | null
          monthly_rent?: number
          property_id?: string
          size_sqm?: number | null
          status?: string
          tenant_id?: string
          unit_number?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_job_items: {
        Row: {
          cost_price: number
          created_at: string
          description: string
          id: string
          item_id: string | null
          item_type: string
          job_id: string
          quantity: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          cost_price?: number
          created_at?: string
          description: string
          id?: string
          item_id?: string | null
          item_type: string
          job_id: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Update: {
          cost_price?: number
          created_at?: string
          description?: string
          id?: string
          item_id?: string | null
          item_type?: string
          job_id?: string
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "repair_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_job_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          job_id: string
          notes: string | null
          payment_date: string
          payment_method: string
          payment_reference: string | null
          receipt_number: string | null
          received_by: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          receipt_number?: string | null
          received_by?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          receipt_number?: string | null
          received_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_job_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "repair_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_job_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_jobs: {
        Row: {
          amount_paid: number
          assigned_to: string | null
          balance_due: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivered_at: string | null
          device_imei: string | null
          device_model: string | null
          device_serial_number: string | null
          device_state_before: string | null
          device_type: string
          diagnosis: string | null
          due_date: string | null
          fault_description: string
          id: string
          job_ref: string
          priority: string
          qr_code_data: string | null
          status: string
          technician_fee: number
          technician_paid: boolean
          technician_paid_at: string | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          assigned_to?: string | null
          balance_due?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          device_imei?: string | null
          device_model?: string | null
          device_serial_number?: string | null
          device_state_before?: string | null
          device_type: string
          diagnosis?: string | null
          due_date?: string | null
          fault_description: string
          id?: string
          job_ref: string
          priority?: string
          qr_code_data?: string | null
          status?: string
          technician_fee?: number
          technician_paid?: boolean
          technician_paid_at?: string | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          assigned_to?: string | null
          balance_due?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          device_imei?: string | null
          device_model?: string | null
          device_serial_number?: string | null
          device_state_before?: string | null
          device_type?: string
          diagnosis?: string | null
          due_date?: string | null
          fault_description?: string
          id?: string
          job_ref?: string
          priority?: string
          qr_code_data?: string | null
          status?: string
          technician_fee?: number
          technician_paid?: boolean
          technician_paid_at?: string | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_jobs_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_activities: {
        Row: {
          activity_name: string
          activity_type: string
          average_score: number | null
          created_at: string | null
          grade: string | null
          id: string
          performance: string | null
          remark: string | null
          report_card_id: string
          teacher_initials: string | null
        }
        Insert: {
          activity_name: string
          activity_type: string
          average_score?: number | null
          created_at?: string | null
          grade?: string | null
          id?: string
          performance?: string | null
          remark?: string | null
          report_card_id: string
          teacher_initials?: string | null
        }
        Update: {
          activity_name?: string
          activity_type?: string
          average_score?: number | null
          created_at?: string | null
          grade?: string | null
          id?: string
          performance?: string | null
          remark?: string | null
          report_card_id?: string
          teacher_initials?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_card_activities_report_card_id_fkey"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "student_report_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_scores: {
        Row: {
          competency_score: number | null
          created_at: string | null
          eot_score: number | null
          formative_a1: number | null
          formative_a2: number | null
          formative_a3: number | null
          formative_avg: number | null
          formative_score: number | null
          grade: string | null
          grade_descriptor: string | null
          id: string
          report_card_id: string
          school_based_score: number | null
          subject_id: string
          subject_remark: string | null
          summative_grade: string | null
          teacher_initials: string | null
          teacher_name: string | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          competency_score?: number | null
          created_at?: string | null
          eot_score?: number | null
          formative_a1?: number | null
          formative_a2?: number | null
          formative_a3?: number | null
          formative_avg?: number | null
          formative_score?: number | null
          grade?: string | null
          grade_descriptor?: string | null
          id?: string
          report_card_id: string
          school_based_score?: number | null
          subject_id: string
          subject_remark?: string | null
          summative_grade?: string | null
          teacher_initials?: string | null
          teacher_name?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          competency_score?: number | null
          created_at?: string | null
          eot_score?: number | null
          formative_a1?: number | null
          formative_a2?: number | null
          formative_a3?: number | null
          formative_avg?: number | null
          formative_score?: number | null
          grade?: string | null
          grade_descriptor?: string | null
          id?: string
          report_card_id?: string
          school_based_score?: number | null
          subject_id?: string
          subject_remark?: string | null
          summative_grade?: string | null
          teacher_initials?: string | null
          teacher_name?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_card_scores_report_card_id_fkey"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "student_report_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_scores_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "school_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_skills: {
        Row: {
          created_at: string | null
          id: string
          rating: string | null
          remark: string | null
          report_card_id: string
          skill_category: string | null
          skill_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating?: string | null
          remark?: string | null
          report_card_id: string
          skill_category?: string | null
          skill_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: string | null
          remark?: string | null
          report_card_id?: string
          skill_category?: string | null
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_card_skills_report_card_id_fkey"
            columns: ["report_card_id"]
            isOneToOne: false
            referencedRelation: "student_report_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          status: string | null
          table_number: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          status?: string | null
          table_number: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          status?: string | null
          table_number?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      room_bookings: {
        Row: {
          actual_check_in: string | null
          actual_check_out: string | null
          amount_paid: number | null
          check_in_date: string
          check_out_date: string
          created_at: string
          created_by: string | null
          guest_email: string | null
          guest_id_number: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          notes: string | null
          room_id: string
          status: string | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          amount_paid?: number | null
          check_in_date: string
          check_out_date: string
          created_at?: string
          created_by?: string | null
          guest_email?: string | null
          guest_id_number?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          room_id: string
          status?: string | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          amount_paid?: number | null
          check_in_date?: string
          check_out_date?: string
          created_at?: string
          created_by?: string | null
          guest_email?: string | null
          guest_id_number?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          notes?: string | null
          room_id?: string
          status?: string | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          advance_date: string
          amount: number
          approved_by: string | null
          created_at: string
          deducted_in_payroll_id: string | null
          employee_id: string
          id: string
          is_deducted: boolean
          reason: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          advance_date?: string
          amount: number
          approved_by?: string | null
          created_at?: string
          deducted_in_payroll_id?: string | null
          employee_id: string
          id?: string
          is_deducted?: boolean
          reason?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          advance_date?: string
          amount?: number
          approved_by?: string | null
          created_at?: string
          deducted_in_payroll_id?: string | null
          employee_id?: string
          id?: string
          is_deducted?: boolean
          reason?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_deducted_in_payroll_id_fkey"
            columns: ["deducted_in_payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_method: string
          reference_number: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_method: string
          reference_number?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          reference_number?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_return_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          refund_amount: number
          restock: boolean
          return_id: string
          sale_item_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          refund_amount: number
          restock?: boolean
          return_id: string
          sale_item_id?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          refund_amount?: number
          restock?: boolean
          return_id?: string
          sale_item_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sale_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_return_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_returns: {
        Row: {
          created_at: string
          exchange_sale_id: string | null
          id: string
          notes: string | null
          processed_by: string | null
          reason: string
          return_type: string
          sale_id: string
          status: string
          tenant_id: string
          total_refund_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          exchange_sale_id?: string | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          reason: string
          return_type: string
          sale_id: string
          status?: string
          tenant_id: string
          total_refund_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          exchange_sale_id?: string | null
          id?: string
          notes?: string | null
          processed_by?: string | null
          reason?: string
          return_type?: string
          sale_id?: string
          status?: string
          tenant_id?: string
          total_refund_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_returns_exchange_sale_id_fkey"
            columns: ["exchange_sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_number: number | null
          order_status: string | null
          order_type: string | null
          payment_method: string | null
          payment_status: string | null
          return_status: string | null
          sale_date: string | null
          table_id: string | null
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: number | null
          order_status?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          return_status?: string | null
          sale_date?: string | null
          table_id?: string | null
          tax_amount?: number | null
          tenant_id: string
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: number | null
          order_status?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          return_status?: string | null
          sale_date?: string | null
          table_id?: string | null
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          capacity: number | null
          class_teacher_id: string | null
          created_at: string
          grade: string
          id: string
          is_active: boolean | null
          level: string
          name: string
          section: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          grade: string
          id?: string
          is_active?: boolean | null
          level: string
          name: string
          section?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          grade?: string
          id?: string
          is_active?: boolean | null
          level?: string
          name?: string
          section?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      school_packages: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_per_term: number
          school_level: string
          student_limit: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_per_term: number
          school_level: string
          student_limit?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_per_term?: number
          school_level?: string
          student_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      school_settings: {
        Row: {
          admission_format: string | null
          admission_prefix: string | null
          class_naming_format: string | null
          created_at: string
          id: string
          streams: string[]
          student_id_digits: number | null
          student_id_prefix: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admission_format?: string | null
          admission_prefix?: string | null
          class_naming_format?: string | null
          created_at?: string
          id?: string
          streams?: string[]
          student_id_digits?: number | null
          student_id_prefix?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admission_format?: string | null
          admission_prefix?: string | null
          class_naming_format?: string | null
          created_at?: string
          id?: string
          streams?: string[]
          student_id_digits?: number | null
          student_id_prefix?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subjects: {
        Row: {
          category: string | null
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          level: string
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          level?: string
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subscriptions: {
        Row: {
          activated_at: string | null
          amount_paid: number
          created_at: string
          expires_at: string | null
          id: string
          package_id: string
          payment_status: string | null
          tenant_id: string
          term_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          amount_paid?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id: string
          payment_status?: string | null
          tenant_id: string
          term_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          amount_paid?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          package_id?: string
          payment_status?: string | null
          tenant_id?: string
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_subscriptions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "school_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      send_home_records: {
        Row: {
          cleared_at: string | null
          cleared_by: string | null
          cleared_reason: string | null
          created_at: string
          created_by: string | null
          gate_blocked: boolean | null
          id: string
          is_active: boolean | null
          notified_at: string | null
          notified_parent: boolean | null
          reason: string
          reason_category: string
          send_home_date: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cleared_at?: string | null
          cleared_by?: string | null
          cleared_reason?: string | null
          created_at?: string
          created_by?: string | null
          gate_blocked?: boolean | null
          id?: string
          is_active?: boolean | null
          notified_at?: string | null
          notified_parent?: boolean | null
          reason: string
          reason_category?: string
          send_home_date?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cleared_at?: string | null
          cleared_by?: string | null
          cleared_reason?: string | null
          created_at?: string
          created_by?: string | null
          gate_blocked?: boolean | null
          id?: string
          is_active?: boolean | null
          notified_at?: string | null
          notified_parent?: boolean | null
          reason?: string
          reason_category?: string
          send_home_date?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_home_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "send_home_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      spare_parts: {
        Row: {
          barcode: string | null
          category: string | null
          compatible_devices: string[] | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          quantity: number
          reorder_level: number | null
          selling_price: number
          sku: string | null
          supplier: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          compatible_devices?: string[] | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          quantity?: number
          reorder_level?: number | null
          selling_price?: number
          sku?: string | null
          supplier?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          compatible_devices?: string[] | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          quantity?: number
          reorder_level?: number | null
          selling_price?: number
          sku?: string | null
          supplier?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spare_parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          allowed_modules: string[]
          branch_id: string | null
          created_at: string
          email: string
          expires_at: string
          full_name: string
          generated_password: string | null
          id: string
          invited_by: string | null
          status: string
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          allowed_modules?: string[]
          branch_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          full_name: string
          generated_password?: string | null
          id?: string
          invited_by?: string | null
          status?: string
          tenant_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          allowed_modules?: string[]
          branch_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string
          generated_password?: string | null
          id?: string
          invited_by?: string | null
          status?: string
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          allowed_modules: string[]
          branch_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          profile_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allowed_modules?: string[]
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          profile_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allowed_modules?: string[]
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          profile_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status: string
          student_id: string
          tenant_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fees: {
        Row: {
          amount_paid: number
          balance: number | null
          created_at: string
          due_date: string | null
          id: string
          status: string
          student_id: string
          tenant_id: string
          term_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          status?: string
          student_id: string
          tenant_id: string
          term_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance?: number | null
          created_at?: string
          due_date?: string | null
          id?: string
          status?: string
          student_id?: string
          tenant_id?: string
          term_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_grades: {
        Row: {
          assessment_type: string
          created_at: string
          grade: string | null
          id: string
          max_score: number
          recorded_by: string | null
          remarks: string | null
          score: number
          student_id: string
          subject_id: string
          tenant_id: string
          term_id: string
          updated_at: string
        }
        Insert: {
          assessment_type: string
          created_at?: string
          grade?: string | null
          id?: string
          max_score?: number
          recorded_by?: string | null
          remarks?: string | null
          score: number
          student_id: string
          subject_id: string
          tenant_id: string
          term_id: string
          updated_at?: string
        }
        Update: {
          assessment_type?: string
          created_at?: string
          grade?: string | null
          id?: string
          max_score?: number
          recorded_by?: string | null
          remarks?: string | null
          score?: number
          student_id?: string
          subject_id?: string
          tenant_id?: string
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_monthly_attendance: {
        Row: {
          created_at: string | null
          days_absent: number | null
          days_present: number | null
          id: string
          month: number
          student_id: string
          tenant_id: string
          term_id: string
          total_days: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          days_absent?: number | null
          days_present?: number | null
          id?: string
          month: number
          student_id: string
          tenant_id: string
          term_id: string
          total_days?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          days_absent?: number | null
          days_present?: number | null
          id?: string
          month?: number
          student_id?: string
          tenant_id?: string
          term_id?: string
          total_days?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_monthly_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_monthly_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_monthly_attendance_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_report_cards: {
        Row: {
          average_score: number | null
          class_id: string | null
          class_rank: number | null
          class_teacher_comment: string | null
          class_teacher_signature: string | null
          created_at: string | null
          created_by: string | null
          days_absent: number | null
          days_present: number | null
          discipline_remark: string | null
          fees_balance: number | null
          head_teacher_comment: string | null
          head_teacher_signature: string | null
          id: string
          is_prefect: boolean | null
          next_term_fees: number | null
          next_term_start_date: string | null
          overall_achievement: string | null
          overall_grade: string | null
          overall_identifier: string | null
          prefect_title: string | null
          published_at: string | null
          roll_number: string | null
          status: string | null
          stream: string | null
          student_combination: string | null
          student_id: string
          tenant_id: string
          term_end_date: string | null
          term_id: string
          total_school_days: number | null
          total_score: number | null
          total_students_in_class: number | null
          updated_at: string | null
        }
        Insert: {
          average_score?: number | null
          class_id?: string | null
          class_rank?: number | null
          class_teacher_comment?: string | null
          class_teacher_signature?: string | null
          created_at?: string | null
          created_by?: string | null
          days_absent?: number | null
          days_present?: number | null
          discipline_remark?: string | null
          fees_balance?: number | null
          head_teacher_comment?: string | null
          head_teacher_signature?: string | null
          id?: string
          is_prefect?: boolean | null
          next_term_fees?: number | null
          next_term_start_date?: string | null
          overall_achievement?: string | null
          overall_grade?: string | null
          overall_identifier?: string | null
          prefect_title?: string | null
          published_at?: string | null
          roll_number?: string | null
          status?: string | null
          stream?: string | null
          student_combination?: string | null
          student_id: string
          tenant_id: string
          term_end_date?: string | null
          term_id: string
          total_school_days?: number | null
          total_score?: number | null
          total_students_in_class?: number | null
          updated_at?: string | null
        }
        Update: {
          average_score?: number | null
          class_id?: string | null
          class_rank?: number | null
          class_teacher_comment?: string | null
          class_teacher_signature?: string | null
          created_at?: string | null
          created_by?: string | null
          days_absent?: number | null
          days_present?: number | null
          discipline_remark?: string | null
          fees_balance?: number | null
          head_teacher_comment?: string | null
          head_teacher_signature?: string | null
          id?: string
          is_prefect?: boolean | null
          next_term_fees?: number | null
          next_term_start_date?: string | null
          overall_achievement?: string | null
          overall_grade?: string | null
          overall_identifier?: string | null
          prefect_title?: string | null
          published_at?: string | null
          roll_number?: string | null
          status?: string | null
          stream?: string | null
          student_combination?: string | null
          student_id?: string
          tenant_id?: string
          term_end_date?: string | null
          term_id?: string
          total_school_days?: number | null
          total_score?: number | null
          total_students_in_class?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_report_cards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_report_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_report_cards_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      student_term_requirements: {
        Row: {
          created_at: string
          fulfilled_at: string | null
          id: string
          is_fulfilled: boolean | null
          notes: string | null
          requirement_id: string
          student_id: string
          tenant_id: string
          term_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          is_fulfilled?: boolean | null
          notes?: string | null
          requirement_id: string
          student_id: string
          tenant_id: string
          term_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          is_fulfilled?: boolean | null
          notes?: string | null
          requirement_id?: string
          student_id?: string
          tenant_id?: string
          term_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_term_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "term_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_term_requirements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_term_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_term_requirements_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          academic_report_notes: string | null
          address: string | null
          admission_date: string | null
          admission_notes: string | null
          admission_number: string
          admission_status: string
          admitted_by: string | null
          allergies: string | null
          authorized_pickups: Json | null
          birth_certificate_number: string | null
          blood_group: string | null
          boarding_status: string
          class_id: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          disabilities: string | null
          ecd_level: string | null
          ecd_role_badge: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          father_name: string | null
          father_national_id: string | null
          father_occupation: string | null
          father_phone: string | null
          full_name: string
          gender: string | null
          guardian_address: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_national_id: string | null
          guardian_occupation: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          home_district: string | null
          id: string
          immunization_status: string | null
          is_active: boolean | null
          medical_conditions: string | null
          mother_name: string | null
          mother_national_id: string | null
          mother_occupation: string | null
          mother_phone: string | null
          nationality: string | null
          nin_optional: string | null
          orientation_completed: boolean | null
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          parent_portal_access: boolean | null
          payment_status: string | null
          photo_url: string | null
          place_of_birth: string | null
          previous_class: string | null
          previous_school_address: string | null
          previous_school_leaving_reason: string | null
          previous_school_name: string | null
          religion: string | null
          student_national_id: string | null
          suggested_class_level: string | null
          talent: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          academic_report_notes?: string | null
          address?: string | null
          admission_date?: string | null
          admission_notes?: string | null
          admission_number: string
          admission_status?: string
          admitted_by?: string | null
          allergies?: string | null
          authorized_pickups?: Json | null
          birth_certificate_number?: string | null
          blood_group?: string | null
          boarding_status?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          disabilities?: string | null
          ecd_level?: string | null
          ecd_role_badge?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          father_name?: string | null
          father_national_id?: string | null
          father_occupation?: string | null
          father_phone?: string | null
          full_name: string
          gender?: string | null
          guardian_address?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_national_id?: string | null
          guardian_occupation?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          home_district?: string | null
          id?: string
          immunization_status?: string | null
          is_active?: boolean | null
          medical_conditions?: string | null
          mother_name?: string | null
          mother_national_id?: string | null
          mother_occupation?: string | null
          mother_phone?: string | null
          nationality?: string | null
          nin_optional?: string | null
          orientation_completed?: boolean | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_portal_access?: boolean | null
          payment_status?: string | null
          photo_url?: string | null
          place_of_birth?: string | null
          previous_class?: string | null
          previous_school_address?: string | null
          previous_school_leaving_reason?: string | null
          previous_school_name?: string | null
          religion?: string | null
          student_national_id?: string | null
          suggested_class_level?: string | null
          talent?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          academic_report_notes?: string | null
          address?: string | null
          admission_date?: string | null
          admission_notes?: string | null
          admission_number?: string
          admission_status?: string
          admitted_by?: string | null
          allergies?: string | null
          authorized_pickups?: Json | null
          birth_certificate_number?: string | null
          blood_group?: string | null
          boarding_status?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          disabilities?: string | null
          ecd_level?: string | null
          ecd_role_badge?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          father_name?: string | null
          father_national_id?: string | null
          father_occupation?: string | null
          father_phone?: string | null
          full_name?: string
          gender?: string | null
          guardian_address?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_national_id?: string | null
          guardian_occupation?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          home_district?: string | null
          id?: string
          immunization_status?: string | null
          is_active?: boolean | null
          medical_conditions?: string | null
          mother_name?: string | null
          mother_national_id?: string | null
          mother_occupation?: string | null
          mother_phone?: string | null
          nationality?: string | null
          nin_optional?: string | null
          orientation_completed?: boolean | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_portal_access?: boolean | null
          payment_status?: string | null
          photo_url?: string | null
          place_of_birth?: string | null
          previous_class?: string | null
          previous_school_address?: string | null
          previous_school_leaving_reason?: string | null
          previous_school_name?: string | null
          religion?: string | null
          student_national_id?: string | null
          suggested_class_level?: string | null
          talent?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_core: boolean | null
          level: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_core?: boolean | null
          level: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_core?: boolean | null
          level?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_packages: {
        Row: {
          billing_cycle_months: number | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string | null
        }
        Insert: {
          billing_cycle_months?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Update: {
          billing_cycle_months?: number | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          billing_cycle: string
          billing_email: string
          billing_phone: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          package_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          billing_cycle: string
          billing_email: string
          billing_phone: string
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          package_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          billing_cycle?: string
          billing_email?: string
          billing_phone?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          package_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "subscription_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id?: string | null
          sender_type?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          tenant_id: string | null
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          tenant_id?: string | null
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          tenant_id?: string | null
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_tracking: {
        Row: {
          created_at: string | null
          id: string
          payment_date: string | null
          period_end: string
          period_start: string
          reference_number: string | null
          status: string | null
          tax_amount: number
          tax_base: number
          tax_rate: number
          tax_type: string
          tenant_id: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payment_date?: string | null
          period_end: string
          period_start: string
          reference_number?: string | null
          status?: string | null
          tax_amount: number
          tax_base: number
          tax_rate: number
          tax_type: string
          tenant_id: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payment_date?: string | null
          period_end?: string
          period_start?: string
          reference_number?: string | null
          status?: string | null
          tax_amount?: number
          tax_base?: number
          tax_rate?: number
          tax_type?: string
          tenant_id?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_backups: {
        Row: {
          backup_data: Json
          business_type: string | null
          created_at: string
          deleted_at: string
          deleted_by: string | null
          id: string
          reason: string | null
          tenant_id: string
          tenant_name: string
        }
        Insert: {
          backup_data: Json
          business_type?: string | null
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          reason?: string | null
          tenant_id: string
          tenant_name: string
        }
        Update: {
          backup_data?: Json
          business_type?: string | null
          created_at?: string
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          reason?: string | null
          tenant_id?: string
          tenant_name?: string
        }
        Relationships: []
      }
      tenant_modules: {
        Row: {
          created_at: string | null
          enabled_at: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean | null
          module_code: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
          module_code: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
          module_code?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activated_at: string | null
          address: string | null
          business_code: string
          business_type: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          fee_balance_threshold: number | null
          id: string
          is_trial: boolean | null
          late_arrival_minutes: number | null
          logo_url: string | null
          name: string
          package_id: string | null
          parent_login_code: string | null
          phone: string | null
          referral_code: string | null
          referred_by_code: string | null
          rental_package_id: string | null
          require_early_departure_reason: boolean | null
          school_end_time: string | null
          school_start_time: string | null
          status: Database["public"]["Enums"]["tenant_status"] | null
          subscription_end_date: string | null
          subscription_status: string | null
          trial_days: number | null
          trial_end_date: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          address?: string | null
          business_code: string
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          fee_balance_threshold?: number | null
          id?: string
          is_trial?: boolean | null
          late_arrival_minutes?: number | null
          logo_url?: string | null
          name: string
          package_id?: string | null
          parent_login_code?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          rental_package_id?: string | null
          require_early_departure_reason?: boolean | null
          school_end_time?: string | null
          school_start_time?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          trial_days?: number | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          address?: string | null
          business_code?: string
          business_type?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          fee_balance_threshold?: number | null
          id?: string
          is_trial?: boolean | null
          late_arrival_minutes?: number | null
          logo_url?: string | null
          name?: string
          package_id?: string | null
          parent_login_code?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          rental_package_id?: string | null
          require_early_departure_reason?: boolean | null
          school_end_time?: string | null
          school_start_time?: string | null
          status?: Database["public"]["Enums"]["tenant_status"] | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          trial_days?: number | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_rental_package_id_fkey"
            columns: ["rental_package_id"]
            isOneToOne: false
            referencedRelation: "rental_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      term_requirements: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number | null
          frequency: string
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          name: string
          price: number | null
          tenant_id: string
          term_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          name: string
          price?: number | null
          tenant_id: string
          term_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          name?: string
          price?: number | null
          tenant_id?: string
          term_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_requirements_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_name: string | null
          content: string
          created_at: string
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          name: string
          photo_url: string | null
          proof_description: string | null
          rating: number | null
          role: string | null
          submitter_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string | null
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          name: string
          photo_url?: string | null
          proof_description?: string | null
          rating?: number | null
          role?: string | null
          submitter_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string | null
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          name?: string
          photo_url?: string | null
          proof_description?: string | null
          rating?: number | null
          role?: string | null
          submitter_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_audit_trail: {
        Row: {
          action: string
          created_at: string | null
          general_ledger_id: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          general_ledger_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          general_ledger_id?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_audit_trail_general_ledger_id_fkey"
            columns: ["general_ledger_id"]
            isOneToOne: false
            referencedRelation: "general_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_audit_trail_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_register: {
        Row: {
          badge_number: string | null
          check_in_time: string
          check_out_time: string | null
          checked_in_by: string | null
          checked_out_by: string | null
          created_at: string
          id: string
          id_number: string | null
          notes: string | null
          phone: string | null
          purpose: string
          student_id: string | null
          tenant_id: string
          visiting_who: string | null
          visitor_name: string
        }
        Insert: {
          badge_number?: string | null
          check_in_time?: string
          check_out_time?: string | null
          checked_in_by?: string | null
          checked_out_by?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          purpose: string
          student_id?: string | null
          tenant_id: string
          visiting_who?: string | null
          visitor_name: string
        }
        Update: {
          badge_number?: string | null
          check_in_time?: string
          check_out_time?: string | null
          checked_in_by?: string | null
          checked_out_by?: string | null
          created_at?: string
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          purpose?: string
          student_id?: string | null
          tenant_id?: string
          visiting_who?: string | null
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_register_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_register_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_device_trial_status: {
        Args: { p_device_id: string }
        Returns: Json
      }
      create_profile_for_signup: {
        Args: {
          p_full_name: string
          p_phone: string
          p_tenant_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_rental_signup_data: {
        Args: { p_package_id: string; p_tenant_id: string }
        Returns: string
      }
      create_school_signup_data: {
        Args: { p_package_id: string; p_tenant_id: string }
        Returns: string
      }
      create_tenant_for_signup: {
        Args: {
          p_address: string
          p_business_type: string
          p_email: string
          p_name: string
          p_package_id: string
          p_phone: string
          p_referred_by_code: string
        }
        Returns: string
      }
      generate_business_code: { Args: never; Returns: string }
      generate_parent_login_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_rental_card_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_next_receipt_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_user_tenant_info: {
        Args: { user_id: string }
        Returns: {
          role: string
          tenant_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      link_parent_to_student: {
        Args: {
          p_is_primary_contact: boolean
          p_parent_id: string
          p_relationship: string
          p_student_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      register_platform_admin: {
        Args: {
          admin_email: string
          admin_name: string
          admin_password: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "superadmin"
        | "admin"
        | "tenant_owner"
        | "branch_manager"
        | "staff"
        | "accountant"
        | "marketer"
        | "customer"
      payment_status: "pending" | "approved" | "rejected"
      tenant_status: "pending" | "active" | "suspended" | "rejected"
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
      app_role: [
        "superadmin",
        "admin",
        "tenant_owner",
        "branch_manager",
        "staff",
        "accountant",
        "marketer",
        "customer",
      ],
      payment_status: ["pending", "approved", "rejected"],
      tenant_status: ["pending", "active", "suspended", "rejected"],
    },
  },
} as const
