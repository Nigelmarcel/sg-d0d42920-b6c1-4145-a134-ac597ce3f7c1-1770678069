import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SavedPaymentMethod = Database["public"]["Tables"]["saved_payment_methods"]["Row"];
type SavedPaymentMethodInsert = Database["public"]["Tables"]["saved_payment_methods"]["Insert"];

export const savedPaymentMethodService = {
  /**
   * Get all saved payment methods for the current user
   */
  async getUserPaymentMethods(userId: string) {
    try {
      const { data, error } = await supabase
        .from("saved_payment_methods")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Fetched saved payment methods:", { count: data?.length });
      return { data: data || [], error: null };
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return {
        data: [],
        error: error instanceof Error ? error.message : "Failed to fetch payment methods",
      };
    }
  },

  /**
   * Get the default payment method for a user
   */
  async getDefaultPaymentMethod(userId: string) {
    try {
      const { data, error } = await supabase
        .from("saved_payment_methods")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error fetching default payment method:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to fetch default payment method",
      };
    }
  },

  /**
   * Save a new payment method
   */
  async savePaymentMethod(paymentMethod: SavedPaymentMethodInsert) {
    try {
      const { data, error } = await supabase
        .from("saved_payment_methods")
        .insert(paymentMethod)
        .select()
        .single();

      if (error) throw error;

      console.log("Saved payment method:", { id: data.id, last4: data.card_last4 });
      return { data, error: null };
    } catch (error) {
      console.error("Error saving payment method:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to save payment method",
      };
    }
  },

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(paymentMethodId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from("saved_payment_methods")
        .update({ is_default: true })
        .eq("id", paymentMethodId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      console.log("Set default payment method:", { id: paymentMethodId });
      return { data, error: null };
    } catch (error) {
      console.error("Error setting default payment method:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Failed to set default payment method",
      };
    }
  },

  /**
   * Delete a saved payment method
   */
  async deletePaymentMethod(paymentMethodId: string, userId: string) {
    try {
      const { error } = await supabase
        .from("saved_payment_methods")
        .delete()
        .eq("id", paymentMethodId)
        .eq("user_id", userId);

      if (error) throw error;

      console.log("Deleted payment method:", { id: paymentMethodId });
      return { error: null };
    } catch (error) {
      console.error("Error deleting payment method:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to delete payment method",
      };
    }
  },

  /**
   * Check if card already exists (by last 4 digits and expiry)
   */
  async checkDuplicateCard(
    userId: string,
    last4: string,
    expMonth: number,
    expYear: number
  ) {
    try {
      const { data, error } = await supabase
        .from("saved_payment_methods")
        .select("id")
        .eq("user_id", userId)
        .eq("card_last4", last4)
        .eq("card_exp_month", expMonth)
        .eq("card_exp_year", expYear)
        .maybeSingle();

      if (error) throw error;

      return { exists: !!data, error: null };
    } catch (error) {
      console.error("Error checking duplicate card:", error);
      return {
        exists: false,
        error: error instanceof Error ? error.message : "Failed to check duplicate card",
      };
    }
  },
};