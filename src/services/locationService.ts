import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LocationUpdate = Database["public"]["Tables"]["location_updates"]["Row"];
type LocationInsert = Database["public"]["Tables"]["location_updates"]["Insert"];

export const locationService = {
  // Start tracking transporter location (called when job starts)
  async startTracking(bookingId: string, transporterId: string) {
    try {
      // Check if location tracking is already active
      const { data: existing } = await supabase
        .from("location_updates")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("transporter_id", transporterId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        console.log("Location tracking already active for this booking");
        return true;
      }

      return true;
    } catch (error) {
      console.error("Error starting location tracking:", error);
      return false;
    }
  },

  // Update transporter location (called periodically)
  async updateLocation(
    bookingId: string,
    transporterId: string,
    latitude: number,
    longitude: number
  ) {
    try {
      const locationData: LocationInsert = {
        booking_id: bookingId,
        transporter_id: transporterId,
        lat: latitude,
        lng: longitude,
      };

      const { data, error } = await supabase
        .from("location_updates")
        .insert(locationData)
        .select()
        .single();

      if (error) {
        console.error("Error updating location:", error);
        return null;
      }

      console.log("Location updated:", data);
      return data;
    } catch (error) {
      console.error("Error in updateLocation:", error);
      return null;
    }
  },

  // Get latest location for a booking
  async getLatestLocation(bookingId: string): Promise<LocationUpdate | null> {
    try {
      const { data, error } = await supabase
        .from("location_updates")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(); // ← Changed from .single() to handle 0 or 1 results

      if (error) {
        console.error("Error fetching latest location:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getLatestLocation:", error);
      return null;
    }
  },

  // Subscribe to location updates for a booking
  subscribeToLocation(
    bookingId: string,
    callback: (location: LocationUpdate) => void
  ) {
    const channel = supabase
      .channel(`location:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "location_updates",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          console.log("Location update received:", payload.new);
          callback(payload.new as LocationUpdate);
        }
      )
      .subscribe();

    return channel;
  },

  // Request browser geolocation
  async getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error("Geolocation is not supported by this browser");
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  },

  // Start continuous location tracking (updates every 10 seconds)
  startContinuousTracking(
    bookingId: string,
    transporterId: string,
    onUpdate?: (location: { latitude: number; longitude: number }) => void
  ): NodeJS.Timeout {
    const intervalId = setInterval(async () => {
      const position = await this.getCurrentPosition();
      if (position) {
        await this.updateLocation(
          bookingId,
          transporterId,
          position.latitude,
          position.longitude
        );
        if (onUpdate) {
          onUpdate(position);
        }
      }
    }, 10000); // Update every 10 seconds

    return intervalId;
  },

  // Stop continuous tracking
  stopContinuousTracking(intervalId: NodeJS.Timeout) {
    clearInterval(intervalId);
  },
};