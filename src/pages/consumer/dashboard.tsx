import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Package, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { bookingService } from "@/services/bookingService";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export default function ConsumerDashboard() {
  return (
    <ProtectedRoute allowedRoles={["consumer"]}>
      <ConsumerDashboardContent />
    </ProtectedRoute>
  );
}

function ConsumerDashboardContent() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        
        if (data) setProfile(data);

        const userBookings = await bookingService.getConsumerBookings(user.id);
        if (userBookings) setBookings(userBookings);
      }
      
      setIsLoading(false);
    };
    loadData();
  }, []);

  const activeBookings = bookings.filter(b => 
    ["pending", "accepted", "en_route_pickup", "en_route_dropoff"].includes(b.status)
  );
  const completedBookings = bookings.filter(b => b.status === "delivered");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      accepted: { variant: "default", label: "Accepted" },
      en_route_pickup: { variant: "default", label: "En Route to Pickup" },
      en_route_dropoff: { variant: "default", label: "En Route to Dropoff" },
      delivered: { variant: "outline", label: "Delivered" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatItemType = (type: string) => {
    return type.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {profile?.full_name || "User"}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your moves and bookings
            </p>
          </div>
          <Button
            onClick={() => router.push("/consumer/book-move")}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Book a Move
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Moves</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBookings.length}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedBookings.length}</div>
              <p className="text-xs text-muted-foreground">Successful deliveries</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Bookings */}
        {activeBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Active Bookings</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeBookings.map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {formatItemType(booking.item_type)}
                        </CardTitle>
                        <CardDescription>
                          {new Date(booking.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-1 text-blue-600 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Pick-up</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {booking.pickup_address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-1 text-green-600 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Drop-off</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {booking.dropoff_address}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-sm text-gray-600">
                        Size: <span className="font-medium capitalize">{booking.item_size}</span>
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        €{booking.total_price.toFixed(2)}
                      </span>
                    </div>
                    {booking.scheduled_at && (
                      <div className="text-sm text-gray-600">
                        Scheduled: {new Date(booking.scheduled_at).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Bookings */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Bookings</h2>
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Start by booking your first move!
                </p>
                <Button
                  onClick={() => router.push("/consumer/book-move")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Book a Move
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bookings.slice(0, 4).map((booking) => (
                <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {formatItemType(booking.item_type)}
                        </CardTitle>
                        <CardDescription>
                          {new Date(booking.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-1 text-blue-600 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Pick-up</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {booking.pickup_address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-1 text-green-600 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Drop-off</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {booking.dropoff_address}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-sm text-gray-600">
                        {booking.distance_km.toFixed(1)} km • {booking.item_size}
                      </span>
                      <span className="text-lg font-bold text-blue-600">
                        €{booking.total_price.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}