import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { bookingService } from "@/services/bookingService";
import { geocodingService } from "@/services/geocodingService";
import { authService } from "@/services/authService";
import {
  MapPin,
  Calendar,
  Package,
  FileText,
  Loader2,
  ArrowRight,
  Check,
  Box,
  Package2,
  Boxes,
  CheckCircle2,
  Clock,
  X,
  Navigation
} from "lucide-react";

type DeliverySize = "small" | "medium" | "large";

const SIZE_OPTIONS = [
  {
    value: "small" as DeliverySize,
    label: "Small (S)",
    badge: "S",
    color: "bg-navy-900/10 text-navy-900 border-navy-900/20",
    hoverColor: "hover:bg-navy-900/20 hover:border-navy-900/30",
    selectedColor: "ring-2 ring-navy-900 bg-navy-900/5",
    examples: [
      "Chair or small table",
      "TV (<55″)",
      "Microwave or small appliance",
      "Boxes (1-3)",
      "Suitcases or bags"
    ],
    icon: "📦"
  },
  {
    value: "medium" as DeliverySize,
    label: "Medium (M)",
    badge: "M",
    color: "bg-orange-100 text-orange-700 border-orange-300",
    hoverColor: "hover:bg-orange-200 hover:border-orange-400",
    selectedColor: "ring-2 ring-orange-500 bg-orange-50",
    examples: [
      "Single wardrobe",
      "TV (55″+)",
      "Office desk",
      "2-seater sofa",
      "Washing machine or fridge"
    ],
    icon: "📺"
  },
  {
    value: "large" as DeliverySize,
    label: "Large (L)",
    badge: "L",
    color: "bg-red-100 text-red-700 border-red-300",
    hoverColor: "hover:bg-red-200 hover:border-red-400",
    selectedColor: "ring-2 ring-red-500 bg-red-50",
    examples: [
      "3-seater sofa",
      "Large wardrobe",
      "Dining table (6+ seats)",
      "King-size mattress",
      "Multiple large items (home move)"
    ],
    icon: "🛋️"
  }
];

export default function BookMove() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  // Form state
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [deliverySize, setDeliverySize] = useState<DeliverySize>("medium");
  const [itemDescription, setItemDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [useAsap, setUseAsap] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  // Price calculation
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const session = await authService.getCurrentSession();
    if (session?.user) {
      setUserId(session.user.id);
      setUser(session.user);
    }
  };

  const calculatePriceFromDistance = (distanceKm: number, size: DeliverySize) => {
    const sizeMultipliers = {
      small: 1.0,
      medium: 1.5,
      large: 2.0
    };

    const basePrice = 25 * sizeMultipliers[size];
    const distancePrice = distanceKm * 2; // 2€ per km
    return Math.round((basePrice + distancePrice) * 100) / 100;
  };

  const calculatePrice = async () => {
    if (!pickupAddress || !dropoffAddress) {
      setEstimatedPrice(null);
      setDistance(null);
      return;
    }

    try {
      console.log("🔍 Calculating price for:", { pickupAddress, dropoffAddress });

      const pickupCoords = await geocodingService.geocodeAddress(pickupAddress);
      const dropoffCoords = await geocodingService.geocodeAddress(dropoffAddress);

      if (!pickupCoords || !dropoffCoords) {
        console.log("⚠️ Could not geocode addresses - will retry on submit");
        setEstimatedPrice(null);
        setDistance(null);
        return;
      }

      console.log("✅ Coordinates:", { pickupCoords, dropoffCoords });

      const calculatedDistance = geocodingService.calculateDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        dropoffCoords.lat,
        dropoffCoords.lng
      );

      setDistance(calculatedDistance);

      // Size-based pricing
      const sizeMultipliers = {
        small: 1.0,
        medium: 1.5,
        large: 2.0
      };

      const basePrice = 25 * sizeMultipliers[deliverySize];
      const distancePrice = calculatedDistance * 2;
      const total = basePrice + distancePrice;

      setEstimatedPrice(total);
      console.log("💰 Price calculated:", { distance: calculatedDistance, price: total });
    } catch (error) {
      console.log("⚠️ Price calculation failed - will retry on submit:", error);
      setEstimatedPrice(null);
      setDistance(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePrice();
    }, 500);
    return () => clearTimeout(timer);
  }, [pickupAddress, dropoffAddress, deliverySize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book a move.",
        variant: "destructive"
      });
      router.push("/auth/login");
      return;
    }

    setLoading(true);

    try {
      // Show validation toast
      toast({
        title: "Validating addresses...",
        description: "Please wait while we locate your addresses",
      });

      console.log("🚀 Starting booking creation...");
      console.log("📍 Geocoding pickup address:", pickupAddress);
      console.log("📍 Geocoding dropoff address:", dropoffAddress);

      // Validate and geocode pickup address with retry
      let pickupCoords = null;
      let retries = 2;
      
      while (retries > 0 && !pickupCoords) {
        pickupCoords = await geocodingService.geocodeAddress(pickupAddress);
        if (!pickupCoords) {
          retries--;
          if (retries > 0) {
            console.log(`⏳ Retrying pickup geocoding... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          }
        }
      }

      if (!pickupCoords) {
        toast({
          title: "Pickup Address Not Found",
          description: `Could not locate "${pickupAddress}". Try: "Mannerheimintie 1, Helsinki" or "Kamppi, Helsinki"`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log("✅ Pickup coordinates:", pickupCoords);

      // Validate and geocode dropoff address with retry
      let dropoffCoords = null;
      retries = 2;
      
      while (retries > 0 && !dropoffCoords) {
        dropoffCoords = await geocodingService.geocodeAddress(dropoffAddress);
        if (!dropoffCoords) {
          retries--;
          if (retries > 0) {
            console.log(`⏳ Retrying dropoff geocoding... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          }
        }
      }

      if (!dropoffCoords) {
        toast({
          title: "Dropoff Address Not Found",
          description: `Could not locate "${dropoffAddress}". Try: "Kallio, Helsinki" or "Aleksanterinkatu 52, Helsinki"`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      console.log("✅ Dropoff coordinates:", dropoffCoords);

      // Calculate distance and price
      const calculatedDistance = geocodingService.calculateDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        dropoffCoords.lat,
        dropoffCoords.lng
      );

      const sizeMultipliers = {
        small: 1.0,
        medium: 1.5,
        large: 2.0
      };

      const basePrice = 25 * sizeMultipliers[deliverySize];
      const distancePrice = calculatedDistance * 2;
      const total = basePrice + distancePrice;

      console.log("📊 Distance:", calculatedDistance, "km");
      console.log("💰 Price:", total, "€");

      // Prepare scheduled time
      let scheduledAt: string | undefined;
      if (!useAsap && scheduledDate && scheduledTime) {
        scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
      }

      console.log("📝 Creating booking with data:", {
        pickupAddress,
        pickupCoords,
        dropoffAddress,
        dropoffCoords,
        deliverySize,
        scheduledAt
      });

      await bookingService.createBooking(userId, {
        pickupAddress,
        pickupLat: pickupCoords.lat,
        pickupLng: pickupCoords.lng,
        dropoffAddress,
        dropoffLat: dropoffCoords.lat,
        dropoffLng: dropoffCoords.lng,
        itemSize: deliverySize,
        itemDescription: itemDescription || undefined,
        specialInstructions: specialInstructions || undefined,
        scheduledFor: scheduledAt,
        itemPhotos: photos.length > 0 ? photos : undefined
      });

      console.log("✅ Booking created successfully!");

      toast({
        title: "✅ Booking Created",
        description: useAsap ? "Your move request is now live! Transporters will be notified." : "Your move has been scheduled successfully!",
      });

      router.push("/consumer/dashboard");
    } catch (error) {
      console.error("❌ Error creating booking:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not create booking. Please try again.";
      toast({
        title: "Booking Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    if (window.confirm("Are you sure you want to discard this booking? All fields will be cleared.")) {
      setPickupAddress("");
      setDropoffAddress("");
      setDeliverySize("medium");
      setItemDescription("");
      setSpecialInstructions("");
      setScheduledDate("");
      setScheduledTime("");
      setUseAsap(false);
      setPhotos([]);
      setEstimatedPrice(null);
      setDistance(null);
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 2); // Minimum 2 hours from now
    return now.toISOString().slice(0, 16);
  };

  const handleDiscardForm = () => {
    if (pickupAddress || dropoffAddress || itemDescription || specialInstructions) {
      const confirmed = window.confirm(
        "Are you sure you want to discard this booking? All entered information will be lost."
      );
      if (!confirmed) return;
    }
    
    // Reset all fields
    setPickupAddress("");
    setDropoffAddress("");
    setDeliverySize("medium");
    setItemDescription("");
    setSpecialInstructions("");
    setScheduledDate("");
    setScheduledTime("");
    setUseAsap(false);
    setPhotos([]);
    setEstimatedPrice(null);
    setDistance(null);
    
    toast({
      title: "Form Cleared",
      description: "All fields have been reset",
    });
  };

  return (
    <ProtectedRoute allowedRoles={["consumer"]}>
      <SEO 
        title="Book a Move - VANGO"
        description="Book your furniture and item delivery in Helsinki with VANGO"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => router.push("/consumer/dashboard")}
              className="mb-4"
            >
              ← Back to Dashboard
            </Button>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Book a Move</h1>
            <p className="text-gray-600">Tell us what you need moved and we'll find you a transporter</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Delivery Size Selection */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Delivery Size</h2>
                <span className="text-red-500">*</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDeliverySize(option.value)}
                    className={`
                      relative p-6 rounded-lg border-2 transition-all text-left
                      ${deliverySize === option.value 
                        ? `${option.selectedColor} border-current` 
                        : `${option.color} border-current ${option.hoverColor}`
                      }
                    `}
                  >
                    {/* Size Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-4xl">{option.icon}</span>
                      <div className={`
                        px-3 py-1 rounded-full font-bold text-lg
                        ${deliverySize === option.value ? "bg-white shadow-md" : "bg-white/50"}
                      `}>
                        {option.badge}
                      </div>
                    </div>

                    {/* Label */}
                    <h3 className="font-bold text-lg mb-3">{option.label}</h3>

                    {/* Examples */}
                    <ul className="space-y-1.5 text-sm">
                      {option.examples.map((example, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Selected Indicator */}
                    {deliverySize === option.value && (
                      <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* Item Description (Optional) */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Item Description</h2>
                <span className="text-gray-400 text-sm">(Optional)</span>
              </div>
              <Label htmlFor="itemDescription" className="text-sm text-gray-600 mb-2 block">
                Describe what you're moving (e.g., "2 dining chairs + small coffee table")
              </Label>
              <Input
                id="itemDescription"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g., IKEA sofa, 3-seater, light grey"
                className="w-full"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {itemDescription.length}/200 characters
              </p>
            </Card>

            {/* Addresses */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Pickup & Dropoff</h2>
                <span className="text-red-500">*</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pickup">Pickup Address</Label>
                  <Input
                    id="pickup"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="e.g., Mannerheimintie 1 or Keskusta, Helsinki"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Tip: Add "Helsinki" for best results (e.g., "Kamppi, Helsinki")
                  </p>
                </div>

                <div>
                  <Label htmlFor="dropoff">Dropoff Address</Label>
                  <Input
                    id="dropoff"
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    placeholder="e.g., Kallio, Helsinki or Esplanadi 1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Tip: Include street name or area name for accurate pricing
                  </p>
                </div>
              </div>

              {/* Distance & Price Estimate */}
              {distance !== null && estimatedPrice !== null && (
                <div className="mt-4 p-4 bg-navy-900/5 rounded-lg border border-navy-900/20">
                  <p className="text-sm text-muted-foreground">
                    💡 Tip: Select the closest match. You can add more details
                    in the notes.
                  </p>
                </div>
              )}
            </Card>

            {/* Schedule */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">When do you need this?</h2>
                <span className="text-red-500">*</span>
              </div>

              {/* ASAP Toggle */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setUseAsap(!useAsap)}
                  className={`
                    w-full p-4 rounded-lg border-2 transition-all text-left
                    ${useAsap 
                      ? "bg-orange-50 border-orange-500 ring-2 ring-orange-500" 
                      : "bg-white border-gray-300 hover:border-orange-300"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${useAsap ? "border-orange-500 bg-orange-500" : "border-gray-400"}
                      `}>
                        {useAsap && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">ASAP - As Soon As Possible</p>
                        <p className="text-sm text-gray-600">Get matched with an available driver immediately</p>
                      </div>
                    </div>
                    {useAsap && (
                      <span className="px-3 py-1 bg-orange-500 text-white text-sm font-semibold rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Date/Time Pickers (disabled if ASAP) */}
              {!useAsap && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      required={!useAsap}
                    />
                  </div>

                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      required={!useAsap}
                    />
                  </div>
                </div>
              )}

              {!useAsap && (
                <p className="text-sm text-gray-500 mt-2">
                  📅 Schedule at least 2 hours in advance
                </p>
              )}
            </Card>

            {/* Special Instructions */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Special Instructions</h2>
                <span className="text-gray-400 text-sm">(Optional)</span>
              </div>
              <Textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="E.g., Use service elevator, Call when you arrive, Fragile - handle with care"
                rows={4}
              />
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/consumer/dashboard")}
                className="flex-1"
              >
                Peruuta
              </Button>
              
              <Button
                type="submit"
                disabled={loading || !pickupAddress || !dropoffAddress || (!useAsap && (!scheduledDate || !scheduledTime))}
                className="flex-1 bg-gradient-to-r from-navy-600 to-gold-600 hover:from-navy-700 hover:to-gold-700 text-white font-semibold py-6 text-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Vahvistetaan...
                  </>
                ) : (
                  <>
                    ✓ Vahvista Tilaus
                    {estimatedPrice && ` - €${estimatedPrice.toFixed(2)}`}
                  </>
                )}
              </Button>
            </div>

            {/* Pricing info or note */}
            {!estimatedPrice && pickupAddress && dropoffAddress && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 Price will be calculated when you confirm the booking
                </p>
              </div>
            )}

            {/* Debugging info - Remove in production */}
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
              <p className="font-semibold mb-2">Debug Info (poista tuotannossa):</p>
              <p>Pickup: {pickupAddress || "tyhjä"}</p>
              <p>Dropoff: {dropoffAddress || "tyhjä"}</p>
              <p>Estimated Price: {estimatedPrice ? `€${estimatedPrice.toFixed(2)}` : "ei laskettu"}</p>
              <p>Distance: {distance ? `${distance} km` : "ei laskettu"}</p>
              <p>Button Status: {(!pickupAddress || !dropoffAddress || (!useAsap && (!scheduledDate || !scheduledTime))) ? "DISABLED" : "ENABLED"}</p>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}