import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, MapPin, Calendar as CalendarIcon, Package, FileText, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { bookingService, calculatePrice, type BookingFormData } from "@/services/bookingService";

const ITEM_TYPES = [
  { value: "small_furniture", label: "Small Furniture" },
  { value: "large_furniture", label: "Large Furniture" },
  { value: "appliances", label: "Appliances" },
  { value: "fragile", label: "Fragile Items" },
  { value: "home_move", label: "Full Home Move" },
];

const ITEM_SIZES = [
  { value: "small", label: "Small (fits in car trunk)", price: "1x" },
  { value: "medium", label: "Medium (sofa, washing machine)", price: "1.5x" },
  { value: "large", label: "Large (fridge, wardrobe)", price: "2x" },
];

export default function BookMove() {
  return (
    <ProtectedRoute allowedRoles={["consumer"]}>
      <BookMoveContent />
    </ProtectedRoute>
  );
}

function BookMoveContent() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date>();
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    pickupAddress: "",
    pickupLat: 60.1699, // Default Helsinki coordinates
    pickupLng: 24.9384,
    dropoffAddress: "",
    dropoffLat: 60.1699,
    dropoffLng: 24.9384,
    itemType: "",
    itemSize: "",
    itemDescription: "",
    scheduledFor: "",
    notes: "",
  });

  // Calculate price when addresses and item size change
  useEffect(() => {
    if (
      formData.pickupAddress &&
      formData.dropoffAddress &&
      formData.itemSize
    ) {
      const price = calculatePrice(
        formData.pickupLat,
        formData.pickupLng,
        formData.dropoffLat,
        formData.dropoffLng,
        formData.itemSize
      );
      setEstimatedPrice(price);
    }
  }, [
    formData.pickupLat,
    formData.pickupLng,
    formData.dropoffLat,
    formData.dropoffLng,
    formData.itemSize,
  ]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      handleInputChange("scheduledFor", selectedDate.toISOString());
    }
  };

  const canProceedToStep2 = () => {
    return formData.pickupAddress && formData.dropoffAddress;
  };

  const canProceedToStep3 = () => {
    return formData.itemType && formData.itemSize;
  };

  const canSubmit = () => {
    return formData.scheduledFor && canProceedToStep3();
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setIsSubmitting(true);
    try {
      const booking = await bookingService.createBooking(formData as BookingFormData);
      
      if (booking) {
        // Success! Redirect to dashboard
        router.push("/consumer/dashboard?booking=created");
      } else {
        alert("Failed to create booking. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/consumer/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold mb-2">Book a Move</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Fill in the details and we'll find you a transporter
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold",
                    step >= stepNum
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700"
                  )}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={cn(
                      "w-16 h-1 mx-2",
                      step > stepNum ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-8 mt-2">
            <span className={cn("text-sm", step >= 1 ? "font-semibold" : "text-gray-500")}>
              Addresses
            </span>
            <span className={cn("text-sm", step >= 2 ? "font-semibold" : "text-gray-500")}>
              Item Details
            </span>
            <span className={cn("text-sm", step >= 3 ? "font-semibold" : "text-gray-500")}>
              Schedule
            </span>
          </div>
        </div>

        {/* Step 1: Addresses */}
        {step === 1 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Pick-up and Drop-off Locations
              </CardTitle>
              <CardDescription>Enter the addresses for your move</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pickupAddress">Pick-up Address</Label>
                <Input
                  id="pickupAddress"
                  placeholder="e.g., Mannerheimintie 1, Helsinki"
                  value={formData.pickupAddress}
                  onChange={(e) => handleInputChange("pickupAddress", e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Tip: Include apartment number if applicable
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoffAddress">Drop-off Address</Label>
                <Input
                  id="dropoffAddress"
                  placeholder="e.g., Esplanadi 10, Helsinki"
                  value={formData.dropoffAddress}
                  onChange={(e) => handleInputChange("dropoffAddress", e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2()}
                >
                  Next: Item Details
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Item Details */}
        {step === 2 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Item Details
              </CardTitle>
              <CardDescription>Tell us what you're moving</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="itemType">Item Type</Label>
                <Select
                  value={formData.itemType}
                  onValueChange={(value) => handleInputChange("itemType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemSize">Item Size</Label>
                <Select
                  value={formData.itemSize}
                  onValueChange={(value) => handleInputChange("itemSize", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item size" />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        <div className="flex items-center justify-between w-full">
                          <span>{size.label}</span>
                          <span className="ml-4 text-sm text-gray-500">{size.price}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Size affects the final price
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemDescription">Item Description (Optional)</Label>
                <Textarea
                  id="itemDescription"
                  placeholder="e.g., IKEA sofa, beige color, 2-seater"
                  value={formData.itemDescription}
                  onChange={(e) => handleInputChange("itemDescription", e.target.value)}
                  rows={3}
                />
              </div>

              {estimatedPrice && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Estimated Price
                  </p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    €{estimatedPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Final price may vary based on actual distance
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedToStep3()}
                >
                  Next: Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Schedule Your Move
              </CardTitle>
              <CardDescription>Choose when you'd like your items moved</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Date & Time</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={handleDateSelect}
                      disabled={(date) =>
                        date < new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g., Please call when arriving, parking available"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  rows={3}
                />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Booking Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Pick-up:</span>
                    <span className="font-medium">{formData.pickupAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Drop-off:</span>
                    <span className="font-medium">{formData.dropoffAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Item:</span>
                    <span className="font-medium">
                      {ITEM_TYPES.find((t) => t.value === formData.itemType)?.label} ({ITEM_SIZES.find((s) => s.value === formData.itemSize)?.label})
                    </span>
                  </div>
                  {date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Scheduled:</span>
                      <span className="font-medium">{format(date, "PPP")}</span>
                    </div>
                  )}
                  {estimatedPrice && (
                    <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="font-semibold">Estimated Price:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        €{estimatedPrice.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit() || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    "Creating Booking..."
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}