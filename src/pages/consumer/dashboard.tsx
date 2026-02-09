import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, LogOut, Plus, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export default function ConsumerDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        
        if (profile) {
          setProfile(profile);
        }

        const { data: userBookings } = await supabase
          .from("bookings")
          .select("*")
          .eq("consumer_id", session.user.id)
          .order("created_at", { ascending: false });

        if (userBookings) setBookings(userBookings);
      }
    };
    loadData();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <ProtectedRoute allowedRoles={["consumer"]}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">MoveHelsinki</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">Welcome, {profile?.full_name}</span>
              <Button variant="outline" onClick={handleLogout}>Log Out</Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Button size="lg" onClick={() => router.push("/consumer/book")} className="w-full sm:w-auto">
              <Plus className="w-5 h-5 mr-2" />
              Book a Move
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bookings.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Pickup</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bookings.filter(b => b.status === "pending" || b.status === "accepted").length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Transit</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bookings.filter(b => b.status === "picked_up" || b.status === "en_route_dropoff").length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Moves</CardTitle>
              <CardDescription>Your current bookings and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No active bookings</p>
                  <p className="text-sm mt-2">Book your first move to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                         onClick={() => router.push(`/consumer/booking/${booking.id}`)}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold capitalize">{booking.item_type.replace("_", " ")}</div>
                          <div className="text-sm text-gray-600">Size: {booking.item_size}</div>
                        </div>
                        <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                          {booking.status.replace("_", " ")}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <div>From: {booking.pickup_address}</div>
                            <div>To: {booking.dropoff_address}</div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </span>
                        <span className="font-bold text-lg">€{Number(booking.total_price).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6">
            <Button variant="outline" onClick={() => router.push("/consumer/history")}>
              View Booking History
            </Button>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}