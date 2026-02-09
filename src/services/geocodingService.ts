import { supabase } from "@/integrations/supabase/client";

// Mock coordinates for Helsinki center (fallback only)
const HELSINKI_CENTER = {
  lat: 60.1699,
  lng: 24.9384,
};

export interface Coordinates {
  lat: number;
  lng: number;
  formatted_address?: string;
}

export const geocodingService = {
  // Geocode an address to coordinates using Google Maps Geocoding API
  async geocodeAddress(address: string): Promise<Coordinates | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error("Google Maps API key not configured");
      return null; // Don't use mock - return null to force error
    }

    try {
      console.log("🔍 Geocoding address:", address);
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${apiKey}`
      );

      const data = await response.json();
      console.log("📍 Geocoding response status:", data.status);

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const formattedAddress = data.results[0].formatted_address;
        
        const coords = {
          lat: location.lat,
          lng: location.lng,
          formatted_address: formattedAddress,
        };
        
        console.log("✅ Real coordinates:", coords);
        return coords;
      }

      if (data.status === "ZERO_RESULTS") {
        console.error("❌ Address not found:", address);
        return null; // No mock fallback - force user to fix address
      }

      if (data.status === "REQUEST_DENIED") {
        console.error("❌ Google API error:", data.error_message);
        return null; // No mock fallback - API configuration issue
      }

      console.warn("⚠️ Geocoding failed with status:", data.status);
      return null; // No mock fallback - let booking fail with clear error
    } catch (error) {
      console.error("❌ Geocoding error:", error);
      return null; // No mock fallback on network errors
    }
  },

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  // Validate that coordinates are not default/mock values
  validateCoordinates(coords: Coordinates): boolean {
    // Check if coordinates are the default Helsinki center (mock data)
    const isMock = 
      coords.lat === HELSINKI_CENTER.lat && 
      coords.lng === HELSINKI_CENTER.lng;
    
    if (isMock) {
      console.error("❌ Coordinates validation failed: Using mock/default values");
      return false;
    }

    // Check if coordinates are valid numbers
    if (!coords.lat || !coords.lng || isNaN(coords.lat) || isNaN(coords.lng)) {
      console.error("❌ Coordinates validation failed: Invalid values");
      return false;
    }

    // Check if coordinates are within Finland bounds (rough check)
    const isInFinland = 
      coords.lat >= 59.0 && coords.lat <= 70.5 && 
      coords.lng >= 19.0 && coords.lng <= 32.0;
    
    if (!isInFinland) {
      console.warn("⚠️ Coordinates appear to be outside Finland:", coords);
    }

    return true;
  },
};