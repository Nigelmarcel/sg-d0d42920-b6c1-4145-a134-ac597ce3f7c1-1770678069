import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface MobilePayPayment {
  paymentId: string;
  redirectUrl: string;
  amount: number;
}

export const paymentService = {
  /**
   * Create a Stripe Payment Intent for card payments
   */
  async createStripePaymentIntent(
    bookingId: string,
    amount: number
  ): Promise<{ success: boolean; data?: PaymentIntent; error?: string }> {
    try {
      // Call backend API to create payment intent
      const response = await fetch("/api/payment/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: "eur",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payment intent");
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error creating payment intent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment initialization failed",
      };
    }
  },

  /**
   * Create MobilePay payment
   */
  async createMobilePayPayment(
    bookingId: string,
    amount: number
  ): Promise<{ success: boolean; data?: MobilePayPayment; error?: string }> {
    try {
      // Call backend API to create MobilePay payment
      const response = await fetch("/api/payment/mobilepay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: "eur",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create MobilePay payment");
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error("Error creating MobilePay payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "MobilePay initialization failed",
      };
    }
  },

  /**
   * Confirm payment and update booking
   */
  async confirmPayment(
    bookingId: string,
    paymentIntentId: string
  ): Promise<boolean> {
    try {
      // Update payment status in database
      const { error } = await supabase
        .from("payments")
        .update({ status: "succeeded", updated_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", paymentIntentId);

      if (error) throw error;

      // Update booking status to accepted (payment confirmed)
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ status: "accepted" })
        .eq("id", bookingId);

      if (bookingError) throw bookingError;

      return true;
    } catch (error) {
      console.error("Error confirming payment:", error);
      return false;
    }
  },

  /**
   * Get payment details for a booking
   */
  async getPaymentByBooking(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching payment:", error);
      return null;
    }
  },

  /**
   * Record payment in database
   */
  async recordPayment(
    bookingId: string,
    paymentIntentId: string,
    amount: number,
    status: PaymentStatus = "pending"
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from("payments").insert({
        booking_id: bookingId,
        stripe_payment_intent_id: paymentIntentId,
        amount,
        currency: "EUR",
        status,
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error recording payment:", error);
      return false;
    }
  },

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentIntentId: string,
    status: PaymentStatus
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", paymentIntentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error updating payment status:", error);
      return false;
    }
  },

  /**
   * Process refund
   */
  async processRefund(
    paymentIntentId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch("/api/payment/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId,
          amount: Math.round(amount * 100), // Convert to cents
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Refund failed");
      }

      // Update payment status in database
      await this.updatePaymentStatus(paymentIntentId, "refunded");

      return { success: true };
    } catch (error) {
      console.error("Error processing refund:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Refund failed",
      };
    }
  },
};