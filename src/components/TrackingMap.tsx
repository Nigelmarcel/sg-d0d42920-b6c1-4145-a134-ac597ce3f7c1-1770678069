import { useState, useEffect, useCallback } from "react";
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Package } from "lucide-react";
import { locationService } from "@/services/locationService";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];

interface TrackingMapProps {
  booking: Booking;
  userRole: "consumer" | "transporter";
}

const mapContainerStyle = {
  width: "100%",
  height: "500px",
  borderRadius: "8px",
};

const defaultCenter = {
  lat: 60.1699, // Helsinki center
  lng: 24.9384,
};

export function TrackingMap({ booking, userRole }: TrackingMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [transporterLocation, setTransporterLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>("");
  const [distance, setDistance] = useState<string>("");

  // Parse addresses to coordinates (you'll need to use Geocoding API for real addresses)
  const pickupLocation = {
    lat: 60.1699 + Math.random() * 0.05, // Mock coordinates
    lng: 24.9384 + Math.random() * 0.05,
  };

  const dropoffLocation = {
    lat: 60.1699 + Math.random() * 0.05, // Mock coordinates
    lng: 24.9384 + Math.random() * 0.05,
  };

  // Fetch initial transporter location
  useEffect(() => {
    const fetchLocation = async () => {
      const location = await locationService.getLatestLocation(booking.id);
      if (location) {
        setTransporterLocation({
          lat: location.latitude,
          lng: location.longitude,
        });
      }
    };

    if (booking.status === "in_transit" || booking.status === "accepted") {
      fetchLocation();
    }
  }, [booking.id, booking.status]);

  // Subscribe to real-time location updates
  useEffect(() => {
    if (booking.status === "in_transit" || booking.status === "accepted") {
      const channel = locationService.subscribeToLocation(booking.id, (location) => {
        setTransporterLocation({
          lat: location.latitude,
          lng: location.longitude,
        });
      });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [booking.id, booking.status]);

  // Calculate route and directions
  useEffect(() => {
    if (map && transporterLocation && booking.status === "in_transit") {
      const directionsService = new google.maps.DirectionsService();

      directionsService.route(
        {
          origin: transporterLocation,
          destination: dropoffLocation,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
            const route = result.routes[0];
            if (route.legs[0]) {
              setEstimatedTime(route.legs[0].duration?.text || "");
              setDistance(route.legs[0].distance?.text || "");
            }
          }
        }
      );
    }
  }, [map, transporterLocation, booking.status]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  if (!apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Real-time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">Google Maps API key not configured</p>
            <p className="text-sm">
              Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Real-time Tracking
          </CardTitle>
          <div className="flex gap-2">
            {estimatedTime && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                ETA: {estimatedTime}
              </Badge>
            )}
            {distance && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {distance}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <LoadScript googleMapsApiKey={apiKey}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={transporterLocation || pickupLocation}
            zoom={13}
            onLoad={onLoad}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            {/* Pickup location marker */}
            <Marker
              position={pickupLocation}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                scaledSize: new google.maps.Size(40, 40),
              }}
              label="Pickup"
            />

            {/* Dropoff location marker */}
            <Marker
              position={dropoffLocation}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                scaledSize: new google.maps.Size(40, 40),
              }}
              label="Dropoff"
            />

            {/* Transporter current location */}
            {transporterLocation && (
              <Marker
                position={transporterLocation}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  scaledSize: new google.maps.Size(50, 50),
                }}
                label={userRole === "consumer" ? "Driver" : "You"}
                animation={google.maps.Animation.BOUNCE}
              />
            )}

            {/* Route line */}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
        </LoadScript>

        {/* Location info */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Pickup</p>
            <p className="text-gray-600 dark:text-gray-400">{booking.pickup_address}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Dropoff</p>
            <p className="text-gray-600 dark:text-gray-400">{booking.dropoff_address}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}