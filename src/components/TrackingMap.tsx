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
  lat: 60.1699,
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
  const [isLoaded, setIsLoaded] = useState(false);

  // Validate and convert coordinates
  const pickupLocation = booking.pickup_lat && booking.pickup_lng ? {
    lat: Number(booking.pickup_lat),
    lng: Number(booking.pickup_lng),
  } : null;

  const dropoffLocation = booking.dropoff_lat && booking.dropoff_lng ? {
    lat: Number(booking.dropoff_lat),
    lng: Number(booking.dropoff_lng),
  } : null;

  // Check if coordinates are valid (not null and not default mock values)
  const hasValidCoordinates = pickupLocation && dropoffLocation &&
    !(pickupLocation.lat === 60.1699 && pickupLocation.lng === 24.9384) &&
    !(dropoffLocation.lat === 60.1699 && dropoffLocation.lng === 24.9384);

  useEffect(() => {
    const fetchLocation = async () => {
      const location = await locationService.getLatestLocation(booking.id);
      if (location) {
        setTransporterLocation({
          lat: location.lat,
          lng: location.lng,
        });
      }
    };

    if (
      booking.status === "en_route_pickup" || 
      booking.status === "picked_up" || 
      booking.status === "en_route_dropoff" || 
      booking.status === "accepted"
    ) {
      fetchLocation();
    }
  }, [booking.id, booking.status]);

  useEffect(() => {
    if (
      booking.status === "en_route_pickup" || 
      booking.status === "picked_up" || 
      booking.status === "en_route_dropoff" || 
      booking.status === "accepted"
    ) {
      const channel = locationService.subscribeToLocation(booking.id, (location) => {
        setTransporterLocation({
          lat: location.lat,
          lng: location.lng,
        });
      });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [booking.id, booking.status]);

  useEffect(() => {
    if (
      isLoaded &&
      map && 
      transporterLocation && 
      dropoffLocation &&
      (booking.status === "en_route_pickup" || 
       booking.status === "picked_up" || 
       booking.status === "en_route_dropoff")
    ) {
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
  }, [isLoaded, map, transporterLocation, booking.status, dropoffLocation]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onLoadScript = useCallback(() => {
    setIsLoaded(true);
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

  if (!hasValidCoordinates) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Real-time Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Location data unavailable</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This booking was created with invalid coordinates.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 text-sm text-left">
              <p className="font-semibold mb-1">📍 Addresses on file:</p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Pickup:</strong> {booking.pickup_address}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Dropoff:</strong> {booking.dropoff_address}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mapCenter = transporterLocation || pickupLocation || defaultCenter;

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
        <LoadScript googleMapsApiKey={apiKey} onLoad={onLoadScript}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={13}
            onLoad={onLoad}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            {isLoaded && pickupLocation && (
              <Marker
                position={pickupLocation}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
                  scaledSize: new google.maps.Size(40, 40),
                }}
                label={{
                  text: "Pickup",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              />
            )}

            {isLoaded && dropoffLocation && (
              <Marker
                position={dropoffLocation}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  scaledSize: new google.maps.Size(40, 40),
                }}
                label={{
                  text: "Dropoff",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              />
            )}

            {isLoaded && transporterLocation && (
              <Marker
                position={transporterLocation}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  scaledSize: new google.maps.Size(50, 50),
                }}
                label={{
                  text: userRole === "consumer" ? "Driver" : "You",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
                animation={google.maps.Animation.BOUNCE}
              />
            )}

            {isLoaded && directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
        </LoadScript>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Pickup</p>
            <p className="text-gray-600 dark:text-gray-400">{booking.pickup_address}</p>
            {pickupLocation && (
              <p className="text-xs text-gray-500 mt-1">
                {pickupLocation.lat.toFixed(6)}, {pickupLocation.lng.toFixed(6)}
              </p>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Dropoff</p>
            <p className="text-gray-600 dark:text-gray-400">{booking.dropoff_address}</p>
            {dropoffLocation && (
              <p className="text-xs text-gray-500 mt-1">
                {dropoffLocation.lat.toFixed(6)}, {dropoffLocation.lng.toFixed(6)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}