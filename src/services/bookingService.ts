import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { geocodingService } from "./geocodingService";

export type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  transporter_name?: string;
  consumer_name?: string;
  transporter_earnings?: number;
  item_photos?: string[];
};
export type BookingStatus = Database["public"]["Enums"]["booking_status"];

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
  itemSize: string;
  itemDescription?: string;
  specialInstructions?: string;
  scheduledFor: string;
  itemPhotos?: string[];
}

interface PriceBreakdown {
  distanceKm: number;
  basePrice: number;
  distancePrice: number;
  extrasPrice: number;
  totalPrice: number;
  platformFee: number;
  transporterEarnings: number;
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
  return distance; // Distance in km
}

// Calculate price based on distance and item size
export function calculatePriceBreakdown(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  itemSize: string
): PriceBreakdown {
  const distance = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const roundedDistance = Math.round(distance * 100) / 100;
  
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
  const distancePrice = roundedDistance * 2;
  
  // Total price calculation
  const extrasPrice = 0; // Future implementation
  const subTotal = (basePrice + distancePrice) * sizeMultiplier + extrasPrice;
  const totalPrice = Math.round(subTotal * 100) / 100;
  
  // Fee calculation (20% platform fee)
  const platformFee = Math.round((totalPrice * 0.2) * 100) / 100;
  const transporterEarnings = Math.round((totalPrice - platformFee) * 100) / 100;
  
  return {
    distanceKm: roundedDistance,
    basePrice,
    distancePrice: Math.round(distancePrice * 100) / 100,
    extrasPrice,
    totalPrice,
    platformFee,
    transporterEarnings,
  };
}

// For frontend display compatibility
export function calculatePrice(
  pickupLat: number,
  pickupLng: number,
  dropoffLat: number,
  dropoffLng: number,
  itemSize: string
): number {
  const breakdown = calculatePriceBreakdown(pickupLat, pickupLng, dropoffLat, dropoffLng, itemSize);
  return breakdown.totalPrice;
}

export const bookingService = {
  // Create a new booking
  async createBooking(userId: string, formData: BookingFormData) {
    try {
      console.log("🚀 Creating booking with addresses:", {
        pickup: formData.pickupAddress,
        dropoff: formData.dropoffAddress,
      });

      // Geocode pickup address with validation
      console.log("📍 Geocoding pickup address...");
      const pickupCoords = await geocodingService.geocodeAddress(formData.pickupAddress);
      
      if (!pickupCoords) {
        throw new Error("Could not find pickup address. Please enter a valid address in Helsinki area.");
      }

      if (!geocodingService.validateCoordinates(pickupCoords)) {
        throw new Error("Invalid pickup coordinates. Please enter a specific street address.");
      }

      console.log("✅ Pickup coordinates validated:", pickupCoords);

      // Geocode dropoff address with validation
      console.log("📍 Geocoding dropoff address...");
      const dropoffCoords = await geocodingService.geocodeAddress(formData.dropoffAddress);
      
      if (!dropoffCoords) {
        throw new Error("Could not find dropoff address. Please enter a valid address in Helsinki area.");
      }

      if (!geocodingService.validateCoordinates(dropoffCoords)) {
        throw new Error("Invalid dropoff coordinates. Please enter a specific street address.");
      }

      console.log("✅ Dropoff coordinates validated:", dropoffCoords);

      // Calculate distance with real coordinates
      const distance = geocodingService.calculateDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        dropoffCoords.lat,
        dropoffCoords.lng
      );

      console.log("📏 Distance calculated:", distance, "km");

      // Validate distance is reasonable (not 0, not too large)
      if (distance === 0) {
        throw new Error("Pickup and dropoff addresses appear to be the same location. Please check the addresses.");
      }

      if (distance > 100) {
        throw new Error(`Distance (${distance} km) exceeds maximum allowed range. Please choose addresses within Helsinki metropolitan area.`);
      }

      // Calculate pricing with validated coordinates
      const pricing = calculatePriceBreakdown(
        pickupCoords.lat,
        pickupCoords.lng,
        dropoffCoords.lat,
        dropoffCoords.lng,
        formData.itemSize
      );

      console.log("💰 Pricing calculated:", pricing);

      // Create booking with validated data
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          consumer_id: userId,
          pickup_address: pickupCoords.formatted_address || formData.pickupAddress,
          pickup_lat: pickupCoords.lat,
          pickup_lng: pickupCoords.lng,
          dropoff_address: dropoffCoords.formatted_address || formData.dropoffAddress,
          dropoff_lat: dropoffCoords.lat,
          dropoff_lng: dropoffCoords.lng,
          item_size: formData.itemSize as "small" | "medium" | "large",
          item_description: formData.itemDescription || null,
          special_instructions: formData.specialInstructions || null,
          scheduled_at: formData.scheduledFor || null,
          item_photos: formData.itemPhotos || null,
          distance_km: distance,
          base_price: pricing.basePrice,
          distance_price: pricing.distancePrice,
          extras_price: pricing.extrasPrice,
          total_price: pricing.totalPrice,
          platform_fee: pricing.platformFee,
          transporter_earnings: pricing.transporterEarnings,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      console.log("✅ Booking created successfully:", data.id);
      return { success: true, data };
    } catch (error) {
      console.error("❌ Error creating booking:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to create booking" 
      };
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
        .select(`
          *,
          transporter:profiles!transporter_id(full_name)
        `)
        .eq("consumer_id", consumerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((booking: any) => ({
        ...booking,
        transporter_name: booking.transporter?.full_name
      }));
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

  // Get pending bookings (alias for getAvailableBookings)
  async getPendingBookings(): Promise<Booking[]> {
    return this.getAvailableBookings();
  },

  // Get all bookings for a transporter
  async getTransporterBookings(transporterId: string, statusFilter?: BookingStatus[]): Promise<Booking[]> {
    try {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          consumer:profiles!consumer_id(full_name)
        `)
        .eq("transporter_id", transporterId);

      if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter);
      }

      const { data, error } = await query.order("scheduled_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((booking: any) => ({
        ...booking,
        consumer_name: booking.consumer?.full_name
      }));
    } catch (error) {
      console.error("Error in getTransporterBookings:", error);
      return [];
    }
  },

  // Accept a booking (transporter)
  async acceptBooking(bookingId: string, transporterId: string): Promise<boolean> {
    try {
      // Update booking with optimistic locking
      // Only update if status is still 'pending' AND transporter_id is null
      const { data, error } = await supabase
        .from("bookings")
        .update({ 
          status: "accepted",
          transporter_id: transporterId 
        })
        .eq("id", bookingId)
        .eq("status", "pending")
        .is("transporter_id", null)
        .select();

      if (error) {
        console.error("Error accepting booking:", error);
        return false;
      }

      // Check if update was successful (at least one row updated)
      if (!data || data.length === 0) {
        console.log("Booking was already taken or doesn't exist");
        return false;
      }

      console.log("Booking accepted successfully:", data[0]);
      return true;
    } catch (error) {
      console.error("Error in acceptBooking:", error);
      return false;
    }
  },

  // Update booking status
  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus
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
        .update({ 
          status: "cancelled",
          cancelled_at: new Date().toISOString()
        })
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

  /**
   * Permanently delete a completed or cancelled booking
   */
  async deleteBooking(bookingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) {
        console.error("Error deleting booking:", error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error("Error deleting booking:", error);
      return false;
    }
  },
};