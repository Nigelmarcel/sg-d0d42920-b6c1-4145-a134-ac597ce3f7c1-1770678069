import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { bookingService } from "@/services/bookingService";
import type { Booking } from "@/services/bookingService";
import { LocationTracker } from "@/components/LocationTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Clock, 
  CheckCircle2,
  MapPin,
  Calendar,
  Ruler,
  Sofa,
  Zap,
  Wine,
  Home,
  FileText,
  Image as ImageIcon,
  Loader2
} from "lucide-react";

type BookingStatus = "pending" | "accepted" | "en_route_pickup" | "picked_up" | "en_route_dropoff" | "delivered" | "cancelled";
type TabType = "available" | "active" | "completed";

export default function TransporterDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>("available");
  const [isOnline, setIsOnline] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<Booking[]>([]);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    checkAuth();
    fetchJobs();
  }, []);

  const checkAuth = async () => {
    const session = await authService.getCurrentSession();
    if (!session) {
      router.push("/auth/login");
      return;
    }

    setUserId(session.user.id);

    const profile = await authService.getUserById(session.user.id);
    if (profile?.role !== "transporter") {
      router.push("/unauthorized");
      return;
    }

    setUserName(profile.full_name || "Driver");
    setIsOnline(profile.is_online || false);
  };

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const session = await authService.getCurrentSession();
      if (!session) return;

      // Fetch available jobs (pending status)
      const available = await bookingService.getAvailableBookings();
      setAvailableJobs(available);

      // Fetch active jobs (accepted, en_route_pickup, picked_up, en_route_dropoff)
      const active = await bookingService.getTransporterBookings(
        session.user.id,
        ["accepted", "en_route_pickup", "picked_up", "en_route_dropoff"]
      );
      setActiveJobs(active);

      // Fetch completed jobs (delivered)
      const completed = await bookingService.getTransporterBookings(
        session.user.id,
        ["delivered"]
      );
      setCompletedJobs(completed);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs. Please refresh.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnlineToggle = async (checked: boolean) => {
    try {
      const session = await authService.getCurrentSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({ is_online: checked })
        .eq("id", session.user.id);

      if (error) throw error;

      setIsOnline(checked);
      toast({
        title: checked ? "You're Online" : "You're Offline",
        description: checked 
          ? "You'll now receive job notifications" 
          : "You won't receive new job requests",
      });
    } catch (error) {
      console.error("Error updating online status:", error);
      toast({
        title: "Error",
        description: "Failed to update online status",
        variant: "destructive",
      });
    }
  };

  const handleAcceptJob = async (bookingId: string) => {
    const session = await authService.getCurrentSession();
    if (!session) return;

    const success = await bookingService.acceptBooking(bookingId, session.user.id);
    if (success) {
      toast({
        title: "Job Accepted!",
        description: "The job has been added to your active jobs.",
      });
      await fetchJobs();
      setActiveTab("active");
    } else {
      toast({
        title: "Error",
        description: "Failed to accept job. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    const success = await bookingService.updateBookingStatus(bookingId, newStatus);
    if (success) {
      if (newStatus === "delivered") {
        toast({
          title: "🎉 Delivery Complete!",
          description: "Location tracking has been stopped automatically. Great job!",
        });
      } else {
        toast({
          title: "Status Updated",
          description: `Job status changed to ${newStatus.replace(/_/g, " ")}`,
        });
      }
      await fetchJobs();
    } else {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case "small_furniture":
      case "large_furniture":
        return <Sofa className="w-5 h-5" />;
      case "appliances":
        return <Zap className="w-5 h-5" />;
      case "fragile":
        return <Wine className="w-5 h-5" />;
      case "home_move":
        return <Home className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getItemColor = (itemType: string) => {
    switch (itemType) {
      case "small_furniture":
        return "text-blue-600 bg-blue-50";
      case "large_furniture":
        return "text-purple-600 bg-purple-50";
      case "appliances":
        return "text-yellow-600 bg-yellow-50";
      case "fragile":
        return "text-red-600 bg-red-50";
      case "home_move":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getSizeBadge = (size: string) => {
    const colors = {
      small: "bg-blue-100 text-blue-700",
      medium: "bg-orange-100 text-orange-700",
      large: "bg-red-100 text-red-700",
    };
    return colors[size as keyof typeof colors] || colors.small;
  };

  const formatItemType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      accepted: { label: "Accepted", className: "bg-blue-100 text-blue-700" },
      en_route_pickup: { label: "En Route to Pickup", className: "bg-purple-100 text-purple-700" },
      picked_up: { label: "Picked Up", className: "bg-yellow-100 text-yellow-700" },
      en_route_dropoff: { label: "En Route to Dropoff", className: "bg-orange-100 text-orange-700" },
      delivered: { label: "Delivered", className: "bg-green-100 text-green-700" },
    };
    const variant = variants[status] || { label: status, className: "bg-gray-100 text-gray-700" };
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const getNextAction = (status: BookingStatus, bookingId: string) => {
    switch (status) {
      case "accepted":
        return (
          <Button 
            onClick={() => handleUpdateStatus(bookingId, "en_route_pickup")} 
            className="w-full"
          >
            Start Trip to Pickup 🚗
          </Button>
        );
      case "en_route_pickup":
        return (
          <Button 
            onClick={() => handleUpdateStatus(bookingId, "picked_up")} 
            className="w-full"
          >
            Confirm Pickup ✅
          </Button>
        );
      case "picked_up":
        return (
          <Button 
            onClick={() => handleUpdateStatus(bookingId, "en_route_dropoff")} 
            className="w-full"
          >
            Start Route to Dropoff 🚗
          </Button>
        );
      case "en_route_dropoff":
        return (
          <Button 
            onClick={() => handleUpdateStatus(bookingId, "delivered")} 
            className="w-full"
          >
            Confirm Delivery ✅
          </Button>
        );
      default:
        return null;
    }
  };

  const renderJobCard = (booking: Booking, showActions: boolean = true) => {
    const isActiveJob = booking.status !== "pending" && booking.status !== "delivered";
    const isJobActive = isActiveJob && 
      (booking.status === "en_route_pickup" || 
       booking.status === "en_route_dropoff");

    return (
      <Card key={booking.id} className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6">
          {/* Item Type & Earnings */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${getItemColor(booking.item_type)}`}>
                {getItemIcon(booking.item_type)}
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {formatItemType(booking.item_type)}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getSizeBadge(booking.item_size)}>
                    {booking.item_size.charAt(0).toUpperCase()}
                  </Badge>
                  {booking.item_photos && booking.item_photos.length > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {booking.item_photos.length} photos
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                €{booking.transporter_earnings?.toFixed(2) || "0.00"}
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {booking.special_instructions && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-900 text-sm">Special Instructions:</p>
                  <p className="text-yellow-800 text-sm mt-1">{booking.special_instructions}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            {/* Pickup Address */}
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Pickup</p>
                <p className="text-sm text-gray-600">{booking.pickup_address}</p>
              </div>
            </div>

            {/* Dropoff Address */}
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Dropoff</p>
                <p className="text-sm text-gray-600">{booking.dropoff_address}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-3 mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {booking.scheduled_at ? (
                  new Date(booking.scheduled_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                ) : (
                  "ASAP"
                )}
              </div>
              <div className="flex items-center gap-1">
                <Ruler className="w-4 h-4" />
                {booking.distance_km?.toFixed(1) || "0.0"} km
              </div>
            </div>
          </div>

          {/* Status Badge (for active/completed jobs) */}
          {booking.status !== "pending" && (
            <div className="mb-4">
              {getStatusBadge(booking.status)}
            </div>
          )}

          {/* Location Tracker (for active jobs) */}
          {isJobActive && userId && (
            <div className="mb-4">
              <LocationTracker
                bookingId={booking.id}
                isActive={isJobActive}
                transporterId={userId}
              />
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div>
              {booking.status === "pending" ? (
                <Button 
                  onClick={() => handleAcceptJob(booking.id)} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  Accept Job - €{booking.transporter_earnings?.toFixed(2) || "0.00"}
                </Button>
              ) : booking.status !== "delivered" ? (
                getNextAction(booking.status as BookingStatus, booking.id)
              ) : null}
            </div>
          )}

          {/* Delivery timestamp for completed jobs */}
          {booking.status === "delivered" && booking.updated_at && (
            <div className="text-sm text-gray-500 mt-3">
              Delivered on {new Date(booking.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Transporter Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {userName}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                {isOnline ? "Online" : "Offline"}
              </span>
              <Switch
                checked={isOnline}
                onCheckedChange={handleOnlineToggle}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Interactive Stats Cards (Tab Buttons) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Available Jobs Tab */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              activeTab === "available" 
                ? "ring-2 ring-blue-500 shadow-lg" 
                : "hover:ring-1 hover:ring-gray-300"
            }`}
            onClick={() => setActiveTab("available")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <span className="text-lg">Available Jobs</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {isLoading ? "..." : availableJobs.length}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Active Jobs Tab */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              activeTab === "active" 
                ? "ring-2 ring-orange-500 shadow-lg" 
                : "hover:ring-1 hover:ring-gray-300"
            }`}
            onClick={() => setActiveTab("active")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="text-lg">Active Jobs</span>
                </div>
                <div className="text-3xl font-bold text-orange-600">
                  {isLoading ? "..." : activeJobs.length}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Completed Jobs Tab */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              activeTab === "completed" 
                ? "ring-2 ring-green-500 shadow-lg" 
                : "hover:ring-1 hover:ring-gray-300"
            }`}
            onClick={() => setActiveTab("completed")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-lg">Completed Jobs</span>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {isLoading ? "..." : completedJobs.length}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tab Content */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Available Jobs Content */}
              {activeTab === "available" && (
                <div>
                  {availableJobs.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-semibold mb-2">No Available Jobs</h3>
                        <p className="text-gray-600">
                          {isOnline 
                            ? "Check back soon for new delivery requests" 
                            : "Turn on your online status to receive jobs"}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableJobs.map((booking) => renderJobCard(booking, true))}
                    </div>
                  )}
                </div>
              )}

              {/* Active Jobs Content */}
              {activeTab === "active" && (
                <div>
                  {activeJobs.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-semibold mb-2">No Active Jobs</h3>
                        <p className="text-gray-600">
                          Accept a job from the Available Jobs tab to get started
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeJobs.map((booking) => renderJobCard(booking, true))}
                    </div>
                  )}
                </div>
              )}

              {/* Completed Jobs Content */}
              {activeTab === "completed" && (
                <div>
                  {completedJobs.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-semibold mb-2">No Completed Jobs</h3>
                        <p className="text-gray-600">
                          Your delivery history will appear here
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {completedJobs.map((booking) => renderJobCard(booking, false))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}