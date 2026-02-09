// Google Geocoding API service for address to coordinates conversion

interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export const geocodingService = {
  /**
   * Convert address string to GPS coordinates using Google Geocoding API
   */
  async geocodeAddress(address: string): Promise<GeocodingResult | null> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error("Google Maps API key not found");
      return null;
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
        };
      } else {
        console.error("Geocoding failed:", data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
      return null;
    }
  },

  /**
   * Calculate distance between two GPS coordinates in kilometers
   * Uses Haversine formula for great circle distance
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  },

  /**
   * Convert degrees to radians
   */
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Get distance between two addresses using geocoding
   */
  async getDistanceBetweenAddresses(
    pickupAddress: string,
    dropoffAddress: string
  ): Promise<number | null> {
    const pickupCoords = await this.geocodeAddress(pickupAddress);
    const dropoffCoords = await this.geocodeAddress(dropoffAddress);

    if (!pickupCoords || !dropoffCoords) {
      return null;
    }

    return this.calculateDistance(
      pickupCoords.lat,
      pickupCoords.lng,
      dropoffCoords.lat,
      dropoffCoords.lng
    );
  },
};