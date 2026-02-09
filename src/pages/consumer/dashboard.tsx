import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  MapPin, 
  Calendar, 
  Clock, 
  Plus, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Truck,
  AlertCircle,
  Home
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { bookingService } from "@/services/bookingService";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingStatus = Database["public"]["Enums"]["booking_status"];

const STATUS_CONFIG: Record<BookingStatus, { 
  label: string; 
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  accepted: { label: "Accepted", variant: "default", icon: CheckCircle },
  en_route_pickup: { label: "Driver En Route to Pickup", variant: "default", icon: Truck },
  picked_up: { label: "Picked Up", variant: "default", icon: Package },
  en_route_dropoff: { label: "En Route to Dropoff", variant: "default", icon: Truck },
  delivered: { label: "Delivered", variant: "outline", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

export default function ConsumerDashboard() {
  return (
    <ProtectedRoute allowedRoles={["consumer"]}>
      <ConsumerDashboardContent />
    </ProtectedRoute>
  );
}

function ConsumerDashboardContent() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    fetchUserData();
    fetchBookings();

    // Subscribe to realtime booking updates
    const channel = supabase
      .channel("consumer-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          console.log("Booking update:", payload);
          fetchBookings(); // Refresh bookings on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || "");
    }
  };

  const fetchBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userBookings = await bookingService.getConsumerBookings(user.id);
      setBookings(userBookings);

      // Calculate stats
      const total = userBookings.length;
      const pending = userBookings.filter((b) => b.status === "pending").length;
      const completed = userBookings.filter((b) => b.status === "delivered").length;
      const totalSpent = userBookings
        .filter((b) => b.status === "delivered")
        .reduce((sum, b) => sum + (b.total_price || 0), 0);

      setStats({ total, pending, completed, totalSpent });
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const confirmed = confirm("Are you sure you want to cancel this booking?");
    if (!confirmed) return;

    const success = await bookingService.cancelBooking(bookingId);
    if (success) {
      alert("Booking cancelled successfully");
      fetchBookings();
    } else {
      alert("Failed to cancel booking. Please try again.");
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    const Icon = STATUS_CONFIG[status]?.icon || AlertCircle;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">Welcome back!</h1>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{userEmail}</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Button
            onClick={() => router.push("/consumer/book-move")}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Book a New Move
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">€{stats.totalSpent.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Bookings</CardTitle>
            <CardDescription>
              Track all your past and upcoming moves
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading bookings...</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Book your first move to get started!
                </p>
                <Button onClick={() => router.push("/consumer/book-move")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Book a Move
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg capitalize">
                              {booking.item_type?.replace(/_/g, " ")}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {booking.item_size && (
                                <span className="capitalize">{booking.item_size} item</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={STATUS_CONFIG[booking.status]?.variant || "default"}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1">
                              {STATUS_CONFIG[booking.status]?.label || booking.status}
                            </span>
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pick-up</p>
                            <p className="text-sm font-medium truncate">{booking.pickup_address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Drop-off</p>
                            <p className="text-sm font-medium truncate">{booking.dropoff_address}</p>
                          </div>
                        </div>
                      </div>

                      {booking.special_instructions && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Special Instructions</p>
                          <p className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            {booking.special_instructions}
                          </p>
                        </div>
                      )}

                      <Separator className="my-4" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {booking.scheduled_at && format(new Date(booking.scheduled_at), "MMM dd, yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {booking.distance_km?.toFixed(1)} km
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              €{booking.total_price?.toFixed(2)}
                            </p>
                          </div>
                          {booking.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelBooking(booking.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}