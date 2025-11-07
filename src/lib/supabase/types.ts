export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      hackathon_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          hackathon_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          hackathon_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          hackathon_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_categories_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathons: {
        Row: {
          created_at: string
          description: string | null
          end_at: string
          id: string
          is_active: boolean
          name: string
          registration_close_at: string | null
          registration_open_at: string | null
          slug: string
          start_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_at: string
          id?: string
          is_active?: boolean
          name: string
          registration_close_at?: string | null
          registration_open_at?: string | null
          slug: string
          start_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_at?: string
          id?: string
          is_active?: boolean
          name?: string
          registration_close_at?: string | null
          registration_open_at?: string | null
          slug?: string
          start_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      judge_assignments: {
        Row: {
          created_at: string
          hackathon_id: string
          id: string
          judge_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hackathon_id: string
          id?: string
          judge_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hackathon_id?: string
          id?: string
          judge_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "judge_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      judging_criteria: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          hackathon_id: string
          id: string
          name: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          hackathon_id: string
          id?: string
          name: string
          updated_at?: string
          weight: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          hackathon_id?: string
          id?: string
          name?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "judging_criteria_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      judging_scores: {
        Row: {
          created_at: string
          criterion_id: string
          hackathon_id: string
          id: string
          judge_id: string
          notes: string | null
          score: number
          submitted_at: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criterion_id: string
          hackathon_id: string
          id?: string
          judge_id: string
          notes?: string | null
          score: number
          submitted_at?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criterion_id?: string
          hackathon_id?: string
          id?: string
          judge_id?: string
          notes?: string | null
          score?: number
          submitted_at?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judging_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "judging_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judging_scores_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judging_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "judging_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          last_name: string | null
          organization: string | null
          role: Database["public"]["Enums"]["user_role"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          organization?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          organization?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_submissions: {
        Row: {
          category_id: string
          created_at: string
          demo_url: string | null
          hackathon_id: string
          id: string
          last_submitted_at: string | null
          name: string
          repo_url: string
          status: Database["public"]["Enums"]["submission_status"]
          summary: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          demo_url?: string | null
          hackathon_id: string
          id?: string
          last_submitted_at?: string | null
          name: string
          repo_url: string
          status?: Database["public"]["Enums"]["submission_status"]
          summary?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          demo_url?: string | null
          hackathon_id?: string
          id?: string
          last_submitted_at?: string | null
          name?: string
          repo_url?: string
          status?: Database["public"]["Enums"]["submission_status"]
          summary?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "hackathon_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "team_scores"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "project_submissions_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "team_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "project_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          is_owner: boolean
          joined_at: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          is_owner?: boolean
          joined_at?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          is_owner?: boolean
          joined_at?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_scores"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          hackathon_id: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          hackathon_id: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          hackathon_id?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      team_scores: {
        Row: {
          average_score: number | null
          category_id: string | null
          category_name: string | null
          hackathon_id: string | null
          judge_count: number | null
          team_id: string | null
          team_name: string | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_assigned_judge: { Args: { target_team_id: string }; Returns: boolean }
      is_judge: { Args: never; Returns: boolean }
      is_team_member: { Args: { target_team_id: string }; Returns: boolean }
      is_team_owner: { Args: { target_team_id: string }; Returns: boolean }
    }
    Enums: {
      submission_status: "draft" | "submitted"
      user_role: "admin" | "participant" | "judge"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      submission_status: ["draft", "submitted"],
      user_role: ["admin", "participant", "judge"],
    },
  },
} as const

