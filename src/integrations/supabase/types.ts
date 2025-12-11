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
      access_requests: {
        Row: {
          collaborator_id: string
          created_at: string | null
          event_id: string
          id: string
          reason: string | null
          requested_permissions: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string | null
          event_id: string
          id?: string
          reason?: string | null
          requested_permissions: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string | null
          event_id?: string
          id?: string
          reason?: string | null
          requested_permissions?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "event_collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          event_id: string | null
          id: string
          is_read: boolean | null
          user_id: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          user_id?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_name: string | null
          category: string | null
          created_at: string | null
          event_id: string
          id: string
          is_pinned: boolean | null
          is_published: boolean | null
          message: string
          scheduled_for: string | null
          title: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          author_name?: string | null
          category?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          message: string
          scheduled_for?: string | null
          title?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          author_name?: string | null
          category?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          message?: string
          scheduled_for?: string | null
          title?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      api_requests: {
        Row: {
          blocked_until: string | null
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_permanent: boolean
          reason: string | null
          violation_count: number
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address: unknown
          is_permanent?: boolean
          reason?: string | null
          violation_count?: number
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_permanent?: boolean
          reason?: string | null
          violation_count?: number
        }
        Relationships: []
      }
      collaborator_audit_log: {
        Row: {
          action: string
          collaborator_id: string | null
          created_at: string | null
          details: Json | null
          event_id: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          collaborator_id?: string | null
          created_at?: string | null
          details?: Json | null
          event_id: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          collaborator_id?: string | null
          created_at?: string | null
          details?: Json | null
          event_id?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_audit_log_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "event_collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          declined_at: string | null
          delivery_method: string | null
          email: string
          event_id: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string
          name: string | null
          note: string | null
          permissions: Json
          phone: string | null
          role: Database["public"]["Enums"]["collaborator_role"]
          scope: string
          sms_sent_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          delivery_method?: string | null
          email: string
          event_id: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by: string
          name?: string | null
          note?: string | null
          permissions: Json
          phone?: string | null
          role: Database["public"]["Enums"]["collaborator_role"]
          scope?: string
          sms_sent_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          declined_at?: string | null
          delivery_method?: string | null
          email?: string
          event_id?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string
          name?: string | null
          note?: string | null
          permissions?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["collaborator_role"]
          scope?: string
          sms_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          amount: number
          contributor_name: string
          created_at: string | null
          event_id: string
          id: string
          note: string | null
          payment_method: string | null
        }
        Insert: {
          amount: number
          contributor_name: string
          created_at?: string | null
          event_id: string
          id?: string
          note?: string | null
          payment_method?: string | null
        }
        Update: {
          amount?: number
          contributor_name?: string
          created_at?: string | null
          event_id?: string
          id?: string
          note?: string | null
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          event_id: string
          expires_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          last_active_at: string | null
          notification_settings: Json | null
          permissions: Json | null
          role: Database["public"]["Enums"]["collaborator_role"]
          scope: string
          status: Database["public"]["Enums"]["collaborator_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          event_id: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active_at?: string | null
          notification_settings?: Json | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["collaborator_role"]
          scope?: string
          status?: Database["public"]["Enums"]["collaborator_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          event_id?: string
          expires_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active_at?: string | null
          notification_settings?: Json | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["collaborator_role"]
          scope?: string
          status?: Database["public"]["Enums"]["collaborator_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_comments: {
        Row: {
          comment_text: string
          commenter_email: string | null
          commenter_name: string
          country_code: string | null
          created_at: string
          event_id: string
          guest_phone: string | null
          id: string
          is_host_reply: boolean
          parent_comment_id: string | null
          reply_count: number
          rsvp_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          comment_text: string
          commenter_email?: string | null
          commenter_name: string
          country_code?: string | null
          created_at?: string
          event_id: string
          guest_phone?: string | null
          id?: string
          is_host_reply?: boolean
          parent_comment_id?: string | null
          reply_count?: number
          rsvp_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          comment_text?: string
          commenter_email?: string | null
          commenter_name?: string
          country_code?: string | null
          created_at?: string
          event_id?: string
          guest_phone?: string | null
          id?: string
          is_host_reply?: boolean
          parent_comment_id?: string | null
          reply_count?: number
          rsvp_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "event_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: false
            referencedRelation: "rsvps"
            referencedColumns: ["id"]
          },
        ]
      }
      event_items: {
        Row: {
          category: string | null
          claimed_by: string | null
          claimed_by_name: string | null
          created_at: string | null
          current_amount: number | null
          current_quantity: number | null
          dietary_other: string | null
          dietary_tags: string[] | null
          event_id: string
          fulfillment_status:
            | Database["public"]["Enums"]["fulfillment_status"]
            | null
          goal_amount: number | null
          goal_quantity: number | null
          goal_type: Database["public"]["Enums"]["goal_type"] | null
          id: string
          include_in_export: boolean | null
          is_guest_added: boolean | null
          is_host_provided: boolean | null
          is_pwac_origin: boolean | null
          is_suggested: boolean | null
          link_url: string | null
          name: string
          notes: string | null
          quantity: number | null
          serves_per_unit: number | null
          suggested_by: string[] | null
          suggested_count: number | null
          suggestion_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          claimed_by?: string | null
          claimed_by_name?: string | null
          created_at?: string | null
          current_amount?: number | null
          current_quantity?: number | null
          dietary_other?: string | null
          dietary_tags?: string[] | null
          event_id: string
          fulfillment_status?:
            | Database["public"]["Enums"]["fulfillment_status"]
            | null
          goal_amount?: number | null
          goal_quantity?: number | null
          goal_type?: Database["public"]["Enums"]["goal_type"] | null
          id?: string
          include_in_export?: boolean | null
          is_guest_added?: boolean | null
          is_host_provided?: boolean | null
          is_pwac_origin?: boolean | null
          is_suggested?: boolean | null
          link_url?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          serves_per_unit?: number | null
          suggested_by?: string[] | null
          suggested_count?: number | null
          suggestion_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          claimed_by?: string | null
          claimed_by_name?: string | null
          created_at?: string | null
          current_amount?: number | null
          current_quantity?: number | null
          dietary_other?: string | null
          dietary_tags?: string[] | null
          event_id?: string
          fulfillment_status?:
            | Database["public"]["Enums"]["fulfillment_status"]
            | null
          goal_amount?: number | null
          goal_quantity?: number | null
          goal_type?: Database["public"]["Enums"]["goal_type"] | null
          id?: string
          include_in_export?: boolean | null
          is_guest_added?: boolean | null
          is_host_provided?: boolean | null
          is_pwac_origin?: boolean | null
          is_suggested?: boolean | null
          link_url?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          serves_per_unit?: number | null
          suggested_by?: string[] | null
          suggested_count?: number | null
          suggestion_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_items_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "item_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_kpi_settings: {
        Row: {
          created_at: string
          custom_title: string | null
          display_order: number
          event_id: string
          id: string
          is_visible: boolean
          kpi_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_title?: string | null
          display_order?: number
          event_id: string
          id?: string
          is_visible?: boolean
          kpi_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_title?: string | null
          display_order?: number
          event_id?: string
          id?: string
          is_visible?: boolean
          kpi_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_kpi_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          accessibility_info: string | null
          allow_guest_items: boolean | null
          allow_plus_ones: boolean | null
          archive_delay_days: number | null
          archived_at: string | null
          auto_saved_at: string | null
          contribution_goal: number | null
          contribution_message: string | null
          contribution_methods: Json | null
          contribution_minimum_amount: number | null
          contribution_per_guest: number | null
          contribution_policy_note: string | null
          contribution_suggested_amount: number | null
          contribution_type: string | null
          contributions_enabled: boolean | null
          created_at: string | null
          credit_card_payments_enabled: boolean | null
          date_updated_at: string | null
          description: string | null
          dress_code: string | null
          enable_activity_feed: boolean | null
          enable_comments: boolean | null
          end_time: string | null
          event_code: string | null
          event_date: string | null
          event_type: string | null
          host_name: string | null
          id: string
          is_all_day: boolean | null
          is_archived: boolean | null
          is_draft: boolean | null
          item_claim_eligibility: string | null
          item_suggest_eligibility: string | null
          items_section_label: string | null
          location: string | null
          max_attendees: number | null
          max_guest_claims_per_item: number | null
          max_plus_ones: number | null
          name: string
          parking_instructions: string | null
          privacy_setting: string | null
          published_at: string | null
          pwac_share_token: string | null
          reminder_settings: Json | null
          reminders_enabled: boolean | null
          require_email_for_messages: boolean | null
          require_email_for_rsvp: boolean | null
          rsvp_deadline: string | null
          show_contribution_goal: boolean | null
          show_guest_list: boolean | null
          show_needs_most_hint: boolean | null
          single_reminder_limit: number | null
          single_reminders_sent: number | null
          skip_external_link_interstitial: boolean | null
          sms_broadcast_limit: number | null
          sms_broadcasts_sent: number | null
          special_requests: string | null
          start_time: string | null
          theme_color: string | null
          updated_at: string | null
          user_id: string
          welcome_announcement: string | null
        }
        Insert: {
          accessibility_info?: string | null
          allow_guest_items?: boolean | null
          allow_plus_ones?: boolean | null
          archive_delay_days?: number | null
          archived_at?: string | null
          auto_saved_at?: string | null
          contribution_goal?: number | null
          contribution_message?: string | null
          contribution_methods?: Json | null
          contribution_minimum_amount?: number | null
          contribution_per_guest?: number | null
          contribution_policy_note?: string | null
          contribution_suggested_amount?: number | null
          contribution_type?: string | null
          contributions_enabled?: boolean | null
          created_at?: string | null
          credit_card_payments_enabled?: boolean | null
          date_updated_at?: string | null
          description?: string | null
          dress_code?: string | null
          enable_activity_feed?: boolean | null
          enable_comments?: boolean | null
          end_time?: string | null
          event_code?: string | null
          event_date?: string | null
          event_type?: string | null
          host_name?: string | null
          id?: string
          is_all_day?: boolean | null
          is_archived?: boolean | null
          is_draft?: boolean | null
          item_claim_eligibility?: string | null
          item_suggest_eligibility?: string | null
          items_section_label?: string | null
          location?: string | null
          max_attendees?: number | null
          max_guest_claims_per_item?: number | null
          max_plus_ones?: number | null
          name: string
          parking_instructions?: string | null
          privacy_setting?: string | null
          published_at?: string | null
          pwac_share_token?: string | null
          reminder_settings?: Json | null
          reminders_enabled?: boolean | null
          require_email_for_messages?: boolean | null
          require_email_for_rsvp?: boolean | null
          rsvp_deadline?: string | null
          show_contribution_goal?: boolean | null
          show_guest_list?: boolean | null
          show_needs_most_hint?: boolean | null
          single_reminder_limit?: number | null
          single_reminders_sent?: number | null
          skip_external_link_interstitial?: boolean | null
          sms_broadcast_limit?: number | null
          sms_broadcasts_sent?: number | null
          special_requests?: string | null
          start_time?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id: string
          welcome_announcement?: string | null
        }
        Update: {
          accessibility_info?: string | null
          allow_guest_items?: boolean | null
          allow_plus_ones?: boolean | null
          archive_delay_days?: number | null
          archived_at?: string | null
          auto_saved_at?: string | null
          contribution_goal?: number | null
          contribution_message?: string | null
          contribution_methods?: Json | null
          contribution_minimum_amount?: number | null
          contribution_per_guest?: number | null
          contribution_policy_note?: string | null
          contribution_suggested_amount?: number | null
          contribution_type?: string | null
          contributions_enabled?: boolean | null
          created_at?: string | null
          credit_card_payments_enabled?: boolean | null
          date_updated_at?: string | null
          description?: string | null
          dress_code?: string | null
          enable_activity_feed?: boolean | null
          enable_comments?: boolean | null
          end_time?: string | null
          event_code?: string | null
          event_date?: string | null
          event_type?: string | null
          host_name?: string | null
          id?: string
          is_all_day?: boolean | null
          is_archived?: boolean | null
          is_draft?: boolean | null
          item_claim_eligibility?: string | null
          item_suggest_eligibility?: string | null
          items_section_label?: string | null
          location?: string | null
          max_attendees?: number | null
          max_guest_claims_per_item?: number | null
          max_plus_ones?: number | null
          name?: string
          parking_instructions?: string | null
          privacy_setting?: string | null
          published_at?: string | null
          pwac_share_token?: string | null
          reminder_settings?: Json | null
          reminders_enabled?: boolean | null
          require_email_for_messages?: boolean | null
          require_email_for_rsvp?: boolean | null
          rsvp_deadline?: string | null
          show_contribution_goal?: boolean | null
          show_guest_list?: boolean | null
          show_needs_most_hint?: boolean | null
          single_reminder_limit?: number | null
          single_reminders_sent?: number | null
          skip_external_link_interstitial?: boolean | null
          sms_broadcast_limit?: number | null
          sms_broadcasts_sent?: number | null
          special_requests?: string | null
          start_time?: string | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string
          welcome_announcement?: string | null
        }
        Relationships: []
      }
      grocery_lists: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string
          guest_count: number | null
          id: string
          is_public: boolean | null
          items: Json
          name: string
          notes: string | null
          serving_multiplier: number | null
          share_token: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id: string
          guest_count?: number | null
          id?: string
          is_public?: boolean | null
          items?: Json
          name?: string
          notes?: string | null
          serving_multiplier?: number | null
          share_token?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          guest_count?: number | null
          id?: string
          is_public?: boolean | null
          items?: Json
          name?: string
          notes?: string | null
          serving_multiplier?: number | null
          share_token?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grocery_lists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_preferences: {
        Row: {
          country_code: string | null
          created_at: string | null
          email_enabled: boolean | null
          event_id: string
          guest_email: string | null
          guest_phone: string | null
          guest_token: string
          id: string
          push_enabled: boolean | null
          sms_consent_given_at: string | null
          sms_enabled: boolean | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          event_id: string
          guest_email?: string | null
          guest_phone?: string | null
          guest_token: string
          id?: string
          push_enabled?: boolean | null
          sms_consent_given_at?: string | null
          sms_enabled?: boolean | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          event_id?: string
          guest_email?: string | null
          guest_phone?: string | null
          guest_token?: string
          id?: string
          push_enabled?: boolean | null
          sms_consent_given_at?: string | null
          sms_enabled?: boolean | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sms_log: {
        Row: {
          character_count: number | null
          created_at: string
          event_id: string
          guest_id: string
          id: string
          message_text: string | null
          reminder_type: string
          sent_at: string
        }
        Insert: {
          character_count?: number | null
          created_at?: string
          event_id: string
          guest_id: string
          id?: string
          message_text?: string | null
          reminder_type: string
          sent_at?: string
        }
        Update: {
          character_count?: number | null
          created_at?: string
          event_id?: string
          guest_id?: string
          id?: string
          message_text?: string | null
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_sms_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_sms_log_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "rsvps"
            referencedColumns: ["id"]
          },
        ]
      }
      host_message_replies: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_status: string | null
          event_id: string
          id: string
          message_id: string
          reply_text: string
          sent_at: string | null
          sent_via: string
          twilio_sid: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivery_status?: string | null
          event_id: string
          id?: string
          message_id: string
          reply_text: string
          sent_at?: string | null
          sent_via?: string
          twilio_sid?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivery_status?: string | null
          event_id?: string
          id?: string
          message_id?: string
          reply_text?: string
          sent_at?: string | null
          sent_via?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "host_message_replies_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "host_message_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "host_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      host_messages: {
        Row: {
          country_code: string | null
          created_at: string
          event_id: string
          id: string
          is_read: boolean
          message_body: string
          message_subject: string | null
          priority: string
          replied_at: string | null
          reply_count: number | null
          sender_email: string
          sender_name: string
          sender_phone: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_read?: boolean
          message_body: string
          message_subject?: string | null
          priority?: string
          replied_at?: string | null
          reply_count?: number | null
          sender_email: string
          sender_name: string
          sender_phone: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_read?: boolean
          message_body?: string
          message_subject?: string | null
          priority?: string
          replied_at?: string | null
          reply_count?: number | null
          sender_email?: string
          sender_name?: string
          sender_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      item_claims: {
        Row: {
          amount_contributed: number | null
          claim_type: string
          contributor_email: string | null
          contributor_name: string
          contributor_phone: string | null
          country_code: string | null
          created_at: string | null
          event_id: string
          id: string
          item_id: string
          payment_method: string | null
          payment_verified: boolean | null
          quantity_claimed: number | null
          rsvp_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_contributed?: number | null
          claim_type: string
          contributor_email?: string | null
          contributor_name: string
          contributor_phone?: string | null
          country_code?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          item_id: string
          payment_method?: string | null
          payment_verified?: boolean | null
          quantity_claimed?: number | null
          rsvp_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_contributed?: number | null
          claim_type?: string
          contributor_email?: string | null
          contributor_name?: string
          contributor_phone?: string | null
          country_code?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          item_id?: string
          payment_method?: string | null
          payment_verified?: boolean | null
          quantity_claimed?: number | null
          rsvp_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_claims_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "event_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_claims_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: false
            referencedRelation: "rsvps"
            referencedColumns: ["id"]
          },
        ]
      }
      item_suggestions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          dietary_other: string | null
          dietary_tags: string[] | null
          estimated_quantity: number | null
          estimated_value: number | null
          event_id: string
          goal_amount: number | null
          goal_quantity: number | null
          goal_type: string | null
          id: string
          item_name: string
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rsvp_id: string | null
          serves_per_unit: number | null
          status: string
          suggested_by_email: string | null
          suggested_by_name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          dietary_other?: string | null
          dietary_tags?: string[] | null
          estimated_quantity?: number | null
          estimated_value?: number | null
          event_id: string
          goal_amount?: number | null
          goal_quantity?: number | null
          goal_type?: string | null
          id?: string
          item_name: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rsvp_id?: string | null
          serves_per_unit?: number | null
          status?: string
          suggested_by_email?: string | null
          suggested_by_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          dietary_other?: string | null
          dietary_tags?: string[] | null
          estimated_quantity?: number | null
          estimated_value?: number | null
          event_id?: string
          goal_amount?: number | null
          goal_quantity?: number | null
          goal_type?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rsvp_id?: string | null
          serves_per_unit?: number | null
          status?: string
          suggested_by_email?: string | null
          suggested_by_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_suggestions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_suggestions_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: false
            referencedRelation: "rsvps"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_type: string
          attempted_at: string
          created_at: string
          id: string
          identifier: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          attempt_type: string
          attempted_at?: string
          created_at?: string
          id?: string
          identifier: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          attempted_at?: string
          created_at?: string
          id?: string
          identifier?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          event_id: string
          id: string
          is_read: boolean
          metadata: Json
          notification_type: string
          priority: number
          reference_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          is_read?: boolean
          metadata?: Json
          notification_type: string
          priority?: number
          reference_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          is_read?: boolean
          metadata?: Json
          notification_type?: string
          priority?: number
          reference_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_verifications: {
        Row: {
          contribution_id: string
          created_at: string
          event_id: string
          id: string
          status: string
          submitted_by: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          contribution_id: string
          created_at?: string
          event_id: string
          id?: string
          status?: string
          submitted_by: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          contribution_id?: string
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          submitted_by?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_verifications_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_verifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_interest: {
        Row: {
          created_at: string
          email: string
          event_id: string | null
          feature: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          event_id?: string | null
          feature: string
          id?: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string | null
          feature?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_interest_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          default_payment_methods: Json | null
          display_name: string | null
          has_completed_host_onboarding: boolean | null
          id: string
          notification_preferences: Json | null
          onboarding_step: number | null
          phone_number: string | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          default_payment_methods?: Json | null
          display_name?: string | null
          has_completed_host_onboarding?: boolean | null
          id: string
          notification_preferences?: Json | null
          onboarding_step?: number | null
          phone_number?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          default_payment_methods?: Json | null
          display_name?: string | null
          has_completed_host_onboarding?: boolean | null
          id?: string
          notification_preferences?: Json | null
          onboarding_step?: number | null
          phone_number?: string | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reminder_logs: {
        Row: {
          actioned_at: string | null
          delivery_status: string
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_identifier: string
          reminder_id: string
          sent_at: string | null
        }
        Insert: {
          actioned_at?: string | null
          delivery_status?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_identifier: string
          reminder_id: string
          sent_at?: string | null
        }
        Update: {
          actioned_at?: string | null
          delivery_status?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_identifier?: string
          reminder_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string
          id: string
          message_template: string
          message_title: string | null
          metadata: Json | null
          recipients: Json | null
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id: string
          id?: string
          message_template: string
          message_title?: string | null
          metadata?: Json | null
          recipients?: Json | null
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          id?: string
          message_template?: string
          message_title?: string | null
          metadata?: Json | null
          recipients?: Json | null
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_audit_log: {
        Row: {
          changed_at: string
          changed_fields: Json
          event_id: string
          id: string
          ip_address: unknown
          new_values: Json
          old_values: Json
          rsvp_id: string
          user_agent: string | null
        }
        Insert: {
          changed_at?: string
          changed_fields?: Json
          event_id: string
          id?: string
          ip_address?: unknown
          new_values?: Json
          old_values?: Json
          rsvp_id: string
          user_agent?: string | null
        }
        Update: {
          changed_at?: string
          changed_fields?: Json
          event_id?: string
          id?: string
          ip_address?: unknown
          new_values?: Json
          old_values?: Json
          rsvp_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvp_audit_log_rsvp_id_fkey"
            columns: ["rsvp_id"]
            isOneToOne: false
            referencedRelation: "rsvps"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          additional_guests: Json | null
          country_code: string | null
          created_at: string
          dietary_allergy: string | null
          dietary_other: string | null
          dietary_preferences: string[] | null
          event_id: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guest_token: string
          id: string
          message: string | null
          rsvp_status: string
          source: string | null
          updated_at: string
        }
        Insert: {
          additional_guests?: Json | null
          country_code?: string | null
          created_at?: string
          dietary_allergy?: string | null
          dietary_other?: string | null
          dietary_preferences?: string[] | null
          event_id: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          guest_token?: string
          id?: string
          message?: string | null
          rsvp_status: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          additional_guests?: Json | null
          country_code?: string | null
          created_at?: string
          dietary_allergy?: string | null
          dietary_other?: string | null
          dietary_preferences?: string[] | null
          event_id?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          guest_token?: string
          id?: string
          message?: string | null
          rsvp_status?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_analytics: {
        Row: {
          created_at: string
          event_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_analytics_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_broadcasts: {
        Row: {
          created_at: string
          event_id: string
          failed_count: number
          id: string
          message_text: string
          recipients_count: number
          sent_at: string
          sent_by: string
          successful_count: number
          target_audience: string
        }
        Insert: {
          created_at?: string
          event_id: string
          failed_count?: number
          id?: string
          message_text: string
          recipients_count?: number
          sent_at?: string
          sent_by: string
          successful_count?: number
          target_audience: string
        }
        Update: {
          created_at?: string
          event_id?: string
          failed_count?: number
          id?: string
          message_text?: string
          recipients_count?: number
          sent_at?: string
          sent_by?: string
          successful_count?: number
          target_audience?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_broadcasts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_payments: {
        Row: {
          amount_gross: number
          amount_net: number
          completed_at: string | null
          contributor_email: string | null
          contributor_name: string
          created_at: string | null
          event_id: string
          id: string
          item_claim_id: string | null
          platform_fee: number
          status: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_gross: number
          amount_net: number
          completed_at?: string | null
          contributor_email?: string | null
          contributor_name: string
          created_at?: string | null
          event_id: string
          id?: string
          item_claim_id?: string | null
          platform_fee: number
          status?: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_gross?: number
          amount_net?: number
          completed_at?: string | null
          contributor_email?: string | null
          contributor_name?: string
          created_at?: string | null
          event_id?: string
          id?: string
          item_claim_id?: string | null
          platform_fee?: number
          status?: string
          stripe_checkout_session_id?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_payments_item_claim_id_fkey"
            columns: ["item_claim_id"]
            isOneToOne: false
            referencedRelation: "item_claims"
            referencedColumns: ["id"]
          },
        ]
      }
      task_categories: {
        Row: {
          color: string | null
          created_at: string | null
          event_id: string
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      task_notes: {
        Row: {
          created_at: string | null
          id: string
          note: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          note: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          is_system_template: boolean | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          sort_order: number | null
          timeline_group: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          is_system_template?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          sort_order?: number | null
          timeline_group: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          is_system_template?: boolean | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          sort_order?: number | null
          timeline_group?: string
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          category_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          due_relative_days: number | null
          event_id: string
          id: string
          include_in_export: boolean | null
          is_pwac_origin: boolean | null
          is_template: boolean | null
          parent_task_id: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          sort_order: number | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_relative_days?: number | null
          event_id: string
          id?: string
          include_in_export?: boolean | null
          is_pwac_origin?: boolean | null
          is_template?: boolean | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          category_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_relative_days?: number | null
          event_id?: string
          id?: string
          include_in_export?: boolean | null
          is_pwac_origin?: boolean | null
          is_template?: boolean | null
          parent_task_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_given: boolean
          consent_timestamp: string
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          policy_version: string
          user_id: string
        }
        Insert: {
          consent_given?: boolean
          consent_timestamp?: string
          consent_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          policy_version?: string
          user_id: string
        }
        Update: {
          consent_given?: boolean
          consent_timestamp?: string
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          policy_version?: string
          user_id?: string
        }
        Relationships: []
      }
      user_templates: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          tasks: Json
          template_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          tasks?: Json
          template_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          tasks?: Json
          template_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_collaborator_invite: {
        Args: { _invite_token: string; _user_id: string }
        Returns: Json
      }
      approve_item_suggestion: {
        Args: { p_host_user_id: string; p_suggestion_id: string }
        Returns: string
      }
      auto_block_abusive_ip: {
        Args: { p_ip_address: unknown; p_reason?: string }
        Returns: undefined
      }
      can_guest_claim: {
        Args: { _event_id: string; _rsvp_id: string }
        Returns: boolean
      }
      can_update_rsvp: {
        Args: { _guest_token: string; _rsvp_id: string }
        Returns: boolean
      }
      check_guest_sms_limit: {
        Args: { p_event_id: string; p_guest_id: string; p_max_per_day?: number }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      check_rsvp_status: {
        Args: { p_event_id: string; p_guest_token: string }
        Returns: {
          country_code: string
          guest_email: string
          guest_name: string
          guest_phone: string
          id: string
          rsvp_status: string
        }[]
      }
      check_sms_consent_global: {
        Args: { p_country_code?: string; p_phone: string }
        Returns: boolean
      }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      create_item_reminder: {
        Args: {
          p_event_id: string
          p_event_name: string
          p_host_email: string
          p_unfulfilled_items: Json
        }
        Returns: string
      }
      delete_my_claim: {
        Args: { p_claim_id: string; p_guest_token: string }
        Returns: boolean
      }
      delete_my_item_claim: {
        Args: { p_claim_id: string; p_event_id: string; p_guest_token: string }
        Returns: boolean
      }
      delete_my_suggested_item: {
        Args: { p_event_id: string; p_guest_token: string; p_item_id: string }
        Returns: boolean
      }
      delete_user_account: { Args: never; Returns: undefined }
      expire_collaborators: { Args: never; Returns: undefined }
      find_my_rsvp: {
        Args: {
          p_country_code: string
          p_event_id: string
          p_guest_name: string
          p_guest_phone: string
        }
        Returns: {
          additional_guests: Json
          country_code: string
          created_at: string
          dietary_allergy: string
          dietary_other: string
          dietary_preferences: string[]
          event_id: string
          guest_email: string
          guest_name: string
          guest_phone: string
          guest_token: string
          id: string
          message: string
          rsvp_status: string
          updated_at: string
        }[]
      }
      generate_event_code: { Args: never; Returns: string }
      generate_item_followup_reminders: {
        Args: never
        Returns: {
          event_id: string
          event_name: string
          host_email: string
          unfulfilled_items: Json
        }[]
      }
      get_collaborator_role: {
        Args: { _event_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["collaborator_role"]
      }
      get_default_notification_preferences: { Args: never; Returns: Json }
      get_default_permissions: {
        Args: { _role: Database["public"]["Enums"]["collaborator_role"] }
        Returns: Json
      }
      get_dietary_summary: { Args: { p_event_id: string }; Returns: Json }
      get_event_collaborator_count: {
        Args: { _event_id: string }
        Returns: number
      }
      get_failed_login_count: {
        Args: { p_identifier: string; p_minutes?: number }
        Returns: number
      }
      get_invite_by_token: { Args: { _invite_token: string }; Returns: Json }
      get_my_rsvp: {
        Args: { p_event_id: string; p_guest_token: string }
        Returns: {
          additional_guests: Json
          country_code: string
          created_at: string
          dietary_allergy: string
          dietary_other: string
          dietary_preferences: string[]
          event_id: string
          guest_email: string
          guest_name: string
          guest_phone: string
          guest_token: string
          id: string
          message: string
          rsvp_status: string
          updated_at: string
        }[]
      }
      get_my_rsvp_full: {
        Args: { p_event_id: string; p_guest_token: string }
        Returns: {
          additional_guests: Json | null
          country_code: string | null
          created_at: string
          dietary_allergy: string | null
          dietary_other: string | null
          dietary_preferences: string[] | null
          event_id: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guest_token: string
          id: string
          message: string | null
          rsvp_status: string
          source: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rsvps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_guest_list: {
        Args: { p_event_id: string }
        Returns: {
          additional_guests: Json
          dietary_preferences: string[]
          guest_name: string
          rsvp_status: string
        }[]
      }
      get_reminder_stats: { Args: { p_event_id: string }; Returns: Json }
      get_rsvp_id_from_token: {
        Args: { p_event_id: string; p_guest_token: string }
        Returns: string
      }
      get_sms_consent_date: {
        Args: { p_country_code?: string; p_phone: string }
        Returns: string
      }
      has_permission: {
        Args: { _event_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
      increment_single_reminder_count: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      increment_sms_broadcast_count: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      is_event_collaborator: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_event_owner: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_ip_blocked: { Args: { p_ip_address: unknown }; Returns: boolean }
      log_activity: {
        Args: {
          p_activity_data?: Json
          p_activity_type: string
          p_event_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      post_public_comment: {
        Args: {
          p_comment_text: string
          p_commenter_email: string
          p_commenter_name: string
          p_country_code: string
          p_event_id: string
          p_guest_phone: string
          p_guest_token: string
        }
        Returns: string
      }
      record_login_attempt: {
        Args: {
          p_attempt_type: string
          p_identifier: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: undefined
      }
      suggest_event_item: {
        Args: {
          p_category: string
          p_description?: string
          p_estimated_quantity?: number
          p_estimated_value?: number
          p_event_id: string
          p_guest_token: string
          p_item_name: string
          p_suggested_by_email: string
          p_suggested_by_name: string
        }
        Returns: string
      }
      update_monetary_claim: {
        Args: {
          p_amount_contributed: number
          p_claim_id: string
          p_contributor_email: string
        }
        Returns: {
          amount_contributed: number | null
          claim_type: string
          contributor_email: string | null
          contributor_name: string
          contributor_phone: string | null
          country_code: string | null
          created_at: string | null
          event_id: string
          id: string
          item_id: string
          payment_method: string | null
          payment_verified: boolean | null
          quantity_claimed: number | null
          rsvp_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "item_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_claim: {
        Args: {
          p_amount_contributed?: number
          p_claim_id: string
          p_guest_token: string
          p_quantity_claimed?: number
        }
        Returns: {
          amount_contributed: number | null
          claim_type: string
          contributor_email: string | null
          contributor_name: string
          contributor_phone: string | null
          country_code: string | null
          created_at: string | null
          event_id: string
          id: string
          item_id: string
          payment_method: string | null
          payment_verified: boolean | null
          quantity_claimed: number | null
          rsvp_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "item_claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_rsvp: {
        Args: {
          p_additional_guests: Json
          p_country_code: string
          p_dietary_allergy: string
          p_dietary_other: string
          p_dietary_preferences: string[]
          p_event_id: string
          p_guest_email: string
          p_guest_name: string
          p_guest_phone: string
          p_guest_token: string
          p_message: string
          p_rsvp_status: string
        }
        Returns: {
          additional_guests: Json | null
          country_code: string | null
          created_at: string
          dietary_allergy: string | null
          dietary_other: string | null
          dietary_preferences: string[] | null
          event_id: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          guest_token: string
          id: string
          message: string | null
          rsvp_status: string
          source: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rsvps"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_suggested_item: {
        Args: {
          p_category: string
          p_dietary_other?: string
          p_dietary_tags?: string[]
          p_event_id: string
          p_goal_amount?: number
          p_goal_quantity?: number
          p_goal_type?: Database["public"]["Enums"]["goal_type"]
          p_guest_token: string
          p_item_id: string
          p_name: string
          p_notes?: string
          p_serves_per_unit?: number
        }
        Returns: {
          category: string | null
          claimed_by: string | null
          claimed_by_name: string | null
          created_at: string | null
          current_amount: number | null
          current_quantity: number | null
          dietary_other: string | null
          dietary_tags: string[] | null
          event_id: string
          fulfillment_status:
            | Database["public"]["Enums"]["fulfillment_status"]
            | null
          goal_amount: number | null
          goal_quantity: number | null
          goal_type: Database["public"]["Enums"]["goal_type"] | null
          id: string
          include_in_export: boolean | null
          is_guest_added: boolean | null
          is_host_provided: boolean | null
          is_pwac_origin: boolean | null
          is_suggested: boolean | null
          link_url: string | null
          name: string
          notes: string | null
          quantity: number | null
          serves_per_unit: number | null
          suggested_by: string[] | null
          suggested_count: number | null
          suggestion_id: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "event_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      collaborator_role: "owner" | "co_host" | "editor" | "viewer"
      collaborator_status: "active" | "pending" | "suspended" | "revoked"
      fulfillment_status: "unfulfilled" | "partially_fulfilled" | "fulfilled"
      goal_type: "quantity" | "monetary" | "both"
      task_priority: "low" | "medium" | "high"
      task_status: "todo" | "in_progress" | "done"
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
      collaborator_role: ["owner", "co_host", "editor", "viewer"],
      collaborator_status: ["active", "pending", "suspended", "revoked"],
      fulfillment_status: ["unfulfilled", "partially_fulfilled", "fulfilled"],
      goal_type: ["quantity", "monetary", "both"],
      task_priority: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done"],
    },
  },
} as const
