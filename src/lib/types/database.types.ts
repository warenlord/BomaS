/**
 * Types de la base de données Supabase, écrits à la main pour correspondre à
 * `supabase/migrations/0001_init.sql`. À remplacer par le résultat de
 * `supabase gen types typescript` une fois le projet Supabase réel créé.
 */

export type SubscriptionPlanCode = "free" | "etudiant" | "premium" | "pro";
export type CreditPackCode = "pack_s" | "pack_m" | "pack_l";
export type SubscriptionStatus = "active" | "past_due" | "canceled";
export type CreditTransactionType = "usage" | "purchase" | "subscription_renewal" | "bonus" | "refund";
export type CreditFeature =
  | "chat"
  | "document_analysis"
  | "summary"
  | "qcm"
  | "revision_sheet"
  | "flashcards"
  | "exam"
  | "memoire_analysis";
export type DocumentFileType = "pdf" | "docx";
export type DocumentStatus = "pending" | "processing" | "ready" | "error";
export type MessageRole = "user" | "assistant" | "system";
export type GeneratedContentType =
  | "qcm"
  | "flashcards"
  | "summary"
  | "revision_sheet"
  | "exam"
  | "memoire_analysis";
export type PaymentKind = "subscription" | "credit_pack";
export type PaymentStatus = "pending" | "success" | "failed" | "canceled";

export interface Database {
  public: {
    Tables: {
      subscription_plans: {
        Row: {
          id: string;
          code: SubscriptionPlanCode;
          name: string;
          price_fcfa: number;
          monthly_credits: number;
          max_pdfs: number | null;
          has_ads: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscription_plans"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["subscription_plans"]["Row"]>;
        Relationships: [];
      };
      credit_packs: {
        Row: {
          id: string;
          code: CreditPackCode;
          name: string;
          credits: number;
          price_fcfa: number;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["credit_packs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["credit_packs"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: SubscriptionStatus;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          saspay_customer_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_subscriptions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["user_subscriptions"]["Row"]>;
        Relationships: [];
      };
      credit_wallets: {
        Row: {
          user_id: string;
          balance: number;
          monthly_allowance: number;
          period_start: string;
          period_end: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["credit_wallets"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["credit_wallets"]["Row"]>;
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          balance_after: number;
          type: CreditTransactionType;
          feature: CreditFeature | null;
          reference_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["credit_transactions"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["credit_transactions"]["Row"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          subject: string | null;
          file_path: string;
          file_type: DocumentFileType;
          status: DocumentStatus;
          error_message: string | null;
          page_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
        Relationships: [];
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          chunk_index: number;
          content: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["document_chunks"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["document_chunks"]["Row"]>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          citations: unknown | null;
          credits_used: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
        Relationships: [];
      };
      generated_content: {
        Row: {
          id: string;
          user_id: string;
          document_id: string | null;
          document_ids: string[];
          type: GeneratedContentType;
          title: string;
          content: unknown;
          credits_used: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["generated_content"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["generated_content"]["Row"]>;
        Relationships: [];
      };
      qcm_attempts: {
        Row: {
          id: string;
          generated_content_id: string;
          user_id: string;
          score: number;
          total: number;
          answers: unknown;
          completed_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["qcm_attempts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["qcm_attempts"]["Row"]>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          kind: PaymentKind;
          plan_id: string | null;
          credit_pack_id: string | null;
          reference: string;
          provider_transaction_id: string | null;
          amount_fcfa: number;
          status: PaymentStatus;
          raw_payload: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      deduct_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_feature: CreditFeature;
          p_reference_id?: string | null;
          p_description?: string | null;
        };
        Returns: number;
      };
      add_credits: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_type: "purchase" | "bonus" | "refund" | "subscription_renewal";
          p_reference_id?: string | null;
          p_description?: string | null;
        };
        Returns: number;
      };
      reset_due_credit_wallets: {
        Args: Record<string, never>;
        Returns: number;
      };
      match_document_chunks: {
        Args: {
          p_document_id: string;
          p_query_embedding: number[];
          p_match_count?: number;
        };
        Returns: {
          id: string;
          chunk_index: number;
          content: string;
          similarity: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
