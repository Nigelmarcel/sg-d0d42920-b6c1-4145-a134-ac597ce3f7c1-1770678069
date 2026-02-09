import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
type ItemType = Database["public"]["Enums"]["item_type"];
type ItemSize = Database["public"]["Enums"]["item_size"];

export interface BookingFormData {
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  itemType: string;
  itemSize: string;
  itemDescription?: string;
  scheduledFor: string;
  notes?: string;
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

// Calculate price based on distance and item size
export function calculatePrice(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  itemSize: string
): number {
  const distance = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
  
  // Base price in EUR
  const basePrice = 25;
  
  // Size multiplier
  const sizeMultipliers: Record<string, number> = {
    small: 1,
    medium: 1.5,
    large: 2,
  };
  
  const sizeMultiplier = sizeMultipliers[itemSize] || 1;
  
  // Distance pricing: €2 per km
  const distancePrice = distance * 2;
  
  // Total price
  const totalPrice = (basePrice + distancePrice) * sizeMultiplier;
  
  return Math.round(totalPrice * 100) / 100; // Round to 2 decimals
}

export const bookingService = {
  // Create a new booking
  async createBooking(formData: BookingFormData): Promise<Booking | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return null;
      }

      const estimatedPrice = calculatePrice(
        formData.pickupLat,
        formData.pickupLng,
        formData.dropoffLat,
        formData.dropoffLng,
        formData.itemSize
      );

      const bookingData: BookingInsert = {
        consumer_id: user.id,
        pickup_address: formData.pickupAddress,
        pickup_lat: formData.pickupLat,
        pickup_lng: formData.pickupLng,
        dropoff_address: formData.dropoffAddress,
        dropoff_lat: formData.dropoffLat,
        dropoff_lng: formData.dropoffLng,
        item_type: formData.itemType as ItemType,
        item_size: formData.itemSize as ItemSize,
        item_description: formData.itemDescription,
        scheduled_for: formData.scheduledFor,
        notes: formData.notes,
        estimated_price: estimatedPrice,
        status: "pending",
      };

      const { data, error } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Error creating booking:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in createBooking:", error);
      return null;
    }
  },

  // Get booking by ID
  async getBookingById(bookingId: string): Promise<Booking | null> {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching booking:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getBookingById:", error);
      return null;
    }
  },

  // Get all bookings for a consumer
  async getConsumerBookings(consumerId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("consumer_id", consumerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching consumer bookings:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getConsumerBookings:", error);
      return [];
    }
  },

  // Get available bookings for transporters
  async getAvailableBookings(): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching available bookings:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getAvailableBookings:", error);
      return [];
    }
  },

  // Get all bookings for a transporter
  async getTransporterBookings(transporterId: string): Promise<Booking[]> {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("transporter_id", transporterId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching transporter bookings:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getTransporterBookings:", error);
      return [];
    }
  },

  // Accept a booking (transporter)
  async acceptBooking(bookingId: string, transporterId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          transporter_id: transporterId,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("status", "pending");

      if (error) {
        console.error("Error accepting booking:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in acceptBooking:", error);
      return false;
    }
  },

  // Update booking status
  async updateBookingStatus(
    bookingId: string,
    status: Database["public"]["Enums"]["booking_status"]
  ): Promise<boolean> {
    try {
      const updates: BookingUpdate = { status };

      // Add timestamps for specific statuses
      if (status === "delivered") {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", bookingId);

      if (error) {
        console.error("Error updating booking status:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in updateBookingStatus:", error);
      return false;
    }
  },

  // Cancel booking
  async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) {
        console.error("Error cancelling booking:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in cancelBooking:", error);
      return false;
    }
  },
};