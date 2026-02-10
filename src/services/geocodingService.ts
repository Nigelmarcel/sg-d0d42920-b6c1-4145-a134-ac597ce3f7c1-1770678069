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
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number; formatted_address: string } | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error("❌ Google Maps API key not configured");
      return null;
    }

    try {
      // Smart address formatting for Helsinki
      let searchAddress = address.trim();
      
      // If address doesn't contain Finland, Suomi, or a city name, add Helsinki bias
      const hasCityOrCountry = /helsinki|espoo|vantaa|finland|suomi/i.test(searchAddress);
      if (!hasCityOrCountry) {
        searchAddress = `${searchAddress}, Helsinki, Finland`;
      } else if (!searchAddress.toLowerCase().includes('finland') && !searchAddress.toLowerCase().includes('suomi')) {
        searchAddress = `${searchAddress}, Finland`;
      }

      console.log("🔍 Geocoding address:", address);
      console.log("🔍 Searching for:", searchAddress);
      console.log("🔑 API Key (first 20 chars):", apiKey.substring(0, 20) + "...");

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchAddress)}&key=${apiKey}&region=fi&language=fi`;
      console.log("🌐 Full URL:", url.replace(apiKey, "***KEY***"));

      const response = await fetch(url);
      const data = await response.json();

      console.log("📍 API Response Status:", data.status);
      console.log("📍 Results count:", data.results?.length || 0);

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        const coordinates = {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formatted_address: result.formatted_address
        };
        console.log("✅ Geocoding successful:", coordinates);
        return coordinates;
      }

      // Handle specific error cases
      if (data.status === "ZERO_RESULTS") {
        console.log("❌ No results found for:", searchAddress);
        console.log("💡 Try: Full address with street name, or add 'Helsinki'");
        return null;
      }

      if (data.status === "REQUEST_DENIED") {
        console.error("❌ API request denied:", data.error_message);
        console.error("💡 Check: Geocoding API enabled? API key restrictions?");
        return null;
      }

      if (data.status === "OVER_QUERY_LIMIT") {
        console.error("❌ API quota exceeded");
        console.error("💡 Wait a few minutes and try again");
        return null;
      }

      console.error("❌ Geocoding failed:", data.status, data.error_message);
      return null;

    } catch (error) {
      console.error("❌ Geocoding error:", error);
      return null;
    }
  },

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  async validateCoordinates(lat: number, lng: number): Promise<boolean> {
    // Basic validation for Helsinki area roughly
    // Helsinki approx: Lat 60.1-60.3, Lng 24.8-25.2
    // We'll be lenient for now
    return lat >= 59 && lat <= 71 && lng >= 19 && lng <= 32;
  }
};