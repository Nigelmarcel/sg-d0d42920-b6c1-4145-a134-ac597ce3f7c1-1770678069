import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { User, Mail, Phone, Calendar, Package, CreditCard, Star, MapPin, Clock, ArrowRight, TrendingUp, Save, ArrowLeft, Home, LogOut, TruckIcon, Download, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { bookingService } from "@/services/bookingService";
import { useToast } from "@/hooks/use-toast";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
// Define the exact shape returned by the join query
type BookingWithTransporter = Database["public"]["Tables"]["bookings"]["Row"] & {
  transporter: { id: string; full_name: string | null; email: string | null } | null;
};

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  accepted: { label: "Accepted", color: "bg-navy-900 text-white", icon: Package },
  en_route_pickup: { label: "En Route to Pickup", color: "bg-navy-900/80 text-white", icon: ArrowRight },
  picked_up: { label: "Picked Up", color: "bg-purple-500", icon: Package },
  en_route_dropoff: { label: "En Route to Dropoff", color: "bg-cyan-500", icon: ArrowRight },
  delivered: { label: "Delivered", color: "bg-green-500", icon: Package },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: Clock },
};

export default function ConsumerProfile() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<BookingWithTransporter[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalSpent: 0,
    completedBookings: 0,
    cancelledBookings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
      });

      // Load bookings with transporter details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          transporter:transporter_id(id, full_name, email)
        `)
        .eq("consumer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;
      
      // Cast the result to our defined type
      const typedBookings = (bookingsData as unknown) as BookingWithTransporter[];
      setBookings(typedBookings || []);

      // Calculate stats
      const totalSpent = (typedBookings || [])
        .filter(b => b.status === "delivered")
        .reduce((sum, b) => sum + (b.total_price || 0), 0);
      
      const completedCount = (typedBookings || []).filter(b => b.status === "delivered").length;
      const cancelledCount = (typedBookings || []).filter(b => b.status === "cancelled").length;

      setStats({
        totalBookings: typedBookings?.length || 0,
        totalSpent,
        completedBookings: completedCount,
        cancelledBookings: cancelledCount,
      });

    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq("id", session.user.id);

      if (error) throw error;
      await loadProfileData();
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSaveBookingDetails = (booking: BookingWithTransporter) => {
    // Create booking receipt/details text
    const bookingDetails = `
VANGO - Booking Receipt
${"=".repeat(50)}

Booking ID: ${booking.id}
Date: ${new Date(booking.created_at).toLocaleDateString()}
Status: ${STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG]?.label.toUpperCase() || booking.status.toUpperCase()}

${"=".repeat(50)}
PICKUP DETAILS
${"=".repeat(50)}
Address: ${booking.pickup_address}
${booking.scheduled_at ? `Scheduled: ${new Date(booking.scheduled_at).toLocaleString()}` : ""}

${"=".repeat(50)}
DROPOFF DETAILS
${"=".repeat(50)}
Address: ${booking.dropoff_address}

${"=".repeat(50)}
ITEM DETAILS
${"=".repeat(50)}
Type: ${booking.item_type || "N/A"}
Size: ${booking.item_size?.toUpperCase() || "N/A"}
${booking.special_instructions ? `Special Instructions: ${booking.special_instructions}` : ""}

${"=".repeat(50)}
PRICING BREAKDOWN
${"=".repeat(50)}
Distance: ${booking.distance_km?.toFixed(2) || "N/A"} km
Base Price: €${booking.base_price?.toFixed(2) || "0.00"}
Distance Fee: €${booking.distance_price?.toFixed(2) || "0.00"}
Extras: €${booking.extras_price?.toFixed(2) || "0.00"}
${"─".repeat(50)}
Total: €${booking.total_price?.toFixed(2) || "0.00"}

${booking.transporter?.full_name ? `Transporter: ${booking.transporter.full_name}` : ""}
${booking.completed_at ? `Completed: ${new Date(booking.completed_at).toLocaleString()}` : ""}
${booking.cancelled_at ? `Cancelled: ${new Date(booking.cancelled_at).toLocaleString()}` : ""}

${"=".repeat(50)}
Thank you for using VANGO!
Questions? Contact us at support@vango.fi
${"=".repeat(50)}
    `.trim();

    // Create blob and download
    const blob = new Blob([bookingDetails], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VANGO-Booking-${booking.id.slice(0, 8)}-${new Date(booking.created_at).toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "💾 Booking Saved",
      description: "Booking details downloaded successfully",
    });
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this booking? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const success = await bookingService.deleteBooking(bookingId);
      
      if (success) {
        toast({
          title: "🗑️ Booking Deleted",
          description: "The booking has been permanently removed",
        });

        // Reload profile data to refresh bookings list and stats
        await loadProfileData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["consumer"]}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["consumer"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="outline" 
              onClick={() => router.push("/consumer/dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{stats.totalBookings}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  <span className="text-3xl font-bold">€{stats.totalSpent.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <span className="text-3xl font-bold">{stats.completedBookings}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-500" />
                  <span className="text-3xl font-bold">{stats.cancelledBookings}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="profile">Profile Information</TabsTrigger>
              <TabsTrigger value="history">Booking History</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your profile details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <div className="flex gap-2">
                      <User className="h-5 w-5 text-muted-foreground mt-2" />
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground mt-2" />
                      <Input
                        id="email"
                        value={profile?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <Phone className="h-5 w-5 text-muted-foreground mt-2" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+358 40 123 4567"
                      />
                    </div>
                  </div>

                  <Separator />

                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="w-full"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Booking History</CardTitle>
                  <CardDescription>View all your past and current bookings</CardDescription>
                </CardHeader>
                <CardContent>
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No bookings yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => router.push("/consumer/book-move")}
                      >
                        Create Your First Booking
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => {
                        const StatusIcon = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG]?.icon || Clock;
                        return (
                          <div
                            key={booking.id}
                            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG]?.color}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG]?.label}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(booking.created_at), "MMM dd, yyyy 'at' HH:mm")}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Booking ID: {booking.id.slice(0, 8)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold">€{booking.total_price?.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">Total Price</p>
                              </div>
                            </div>

                            <Separator className="my-3" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-green-500 mt-1" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pickup</p>
                                    <p className="font-medium">{booking.pickup_address}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-red-500 mt-1" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Dropoff</p>
                                    <p className="font-medium">{booking.dropoff_address}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-muted-foreground">Item Details</p>
                                  <p className="font-medium">{booking.item_type} - {booking.item_size}</p>
                                </div>
                                {booking.transporter && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Transporter</p>
                                    <p className="font-medium">{booking.transporter.full_name || "Unknown"}</p>
                                  </div>
                                )}
                                {booking.special_instructions && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Special Instructions</p>
                                    <p className="text-sm">{booking.special_instructions}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons for Completed/Cancelled Bookings */}
                            {(booking.status === "delivered" || booking.status === "cancelled") && (
                              <>
                                <Separator className="my-3" />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleSaveBookingDetails(booking)}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-blue-600 hover:bg-blue-50 border-blue-200"
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Save Details
                                  </Button>
                                  <Button
                                    onClick={() => handleDeleteBooking(booking.id)}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}