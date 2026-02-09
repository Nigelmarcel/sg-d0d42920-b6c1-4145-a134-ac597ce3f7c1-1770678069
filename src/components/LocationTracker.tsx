import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, AlertCircle } from "lucide-react";
import { locationService } from "@/services/locationService";
import { useToast } from "@/hooks/use-toast";

interface LocationTrackerProps {
  bookingId: string;
  transporterId: string;
  isActive: boolean;
  onTrackingStart?: () => void;
  onTrackingStop?: () => void;
}

export function LocationTracker({
  bookingId,
  transporterId,
  isActive,
  onTrackingStart,
  onTrackingStop,
}: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "prompt">("prompt");
  const { toast } = useToast();

  // Check location permission
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setPermissionStatus(result.state as "granted" | "denied" | "prompt");
      });
    }
  }, []);

  // Start tracking when job becomes active
  useEffect(() => {
    if (isActive && !isTracking) {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }
  }, [isActive]);

  const startTracking = async () => {
    // Request location permission
    const position = await locationService.getCurrentPosition();
    
    if (!position) {
      toast({
        title: "Location Access Denied",
        description: "Please enable location services to share your location with customers.",
        variant: "destructive",
      });
      return;
    }

    setCurrentLocation(position);
    setIsTracking(true);

    // Initial location update
    await locationService.updateLocation(
      bookingId,
      transporterId,
      position.latitude,
      position.longitude
    );

    // Start continuous tracking
    const interval = locationService.startContinuousTracking(
      bookingId,
      transporterId,
      (location) => {
        setCurrentLocation(location);
      }
    );

    setTrackingInterval(interval);

    toast({
      title: "Location Tracking Started",
      description: "Your location is now being shared with the customer.",
    });

    if (onTrackingStart) {
      onTrackingStart();
    }
  };

  const stopTracking = () => {
    if (trackingInterval) {
      locationService.stopContinuousTracking(trackingInterval);
      setTrackingInterval(null);
    }

    setIsTracking(false);
    setCurrentLocation(null);

    toast({
      title: "Location Tracking Stopped",
      description: "Your location is no longer being shared.",
    });

    if (onTrackingStop) {
      onTrackingStop();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Location Tracking
          </CardTitle>
          {isTracking ? (
            <Badge className="bg-green-500">
              <span className="mr-1">●</span> Active
            </Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission warning */}
        {permissionStatus === "denied" && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="text-sm text-red-600 dark:text-red-400">
              <p className="font-semibold">Location access denied</p>
              <p>Please enable location services in your browser settings to use this feature.</p>
            </div>
          </div>
        )}

        {/* Current location display */}
        {currentLocation && (
          <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="text-sm text-green-600 dark:text-green-400">
              <p className="font-semibold">Location Shared</p>
              <p className="text-xs mt-1">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
              <p className="text-xs mt-1 opacity-75">
                Updates every 10 seconds
              </p>
            </div>
          </div>
        )}

        {/* Tracking controls */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button
              onClick={startTracking}
              disabled={!isActive || permissionStatus === "denied"}
              className="flex-1"
            >
              <Navigation className="w-4 h-4 mr-2" />
              Start Sharing Location
            </Button>
          ) : (
            <Button
              onClick={stopTracking}
              variant="destructive"
              className="flex-1"
            >
              Stop Sharing Location
            </Button>
          )}
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isActive
            ? "Your location will be shared with the customer in real-time during the delivery."
            : "Location sharing will start automatically when you begin the delivery."}
        </p>
      </CardContent>
    </Card>
  );
}