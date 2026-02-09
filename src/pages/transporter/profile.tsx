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
import { User, Mail, Phone, Calendar, Package, DollarSign, Star, MapPin, Clock, ArrowRight, TrendingUp, Truck, CreditCard, Save, ArrowLeft, Home, LogOut } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Application = Database["public"]["Tables"]["transporter_applications"]["Row"];
// Define the exact shape returned by the join query
type BookingWithConsumer = Database["public"]["Tables"]["bookings"]["Row"] & {
  consumer: { id: string; full_name: string | null; email: string | null } | null;
};

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  accepted: { label: "Accepted", color: "bg-blue-500", icon: Package },
  en_route_pickup: { label: "En Route to Pickup", color: "bg-indigo-500", icon: ArrowRight },
  picked_up: { label: "Picked Up", color: "bg-purple-500", icon: Package },
  en_route_dropoff: { label: "En Route to Dropoff", color: "bg-cyan-500", icon: ArrowRight },
  delivered: { label: "Delivered", color: "bg-green-500", icon: Package },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: Clock },
};

export default function TransporterProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [bookings, setBookings] = useState<BookingWithConsumer[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    averageRating: 0,
    cancelledJobs: 0,
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

      // Load application details
      const { data: appData } = await supabase
        .from("transporter_applications")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      setApplication(appData);

      // Load bookings with consumer details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          consumer:consumer_id(id, full_name, email)
        `)
        .eq("transporter_id", session.user.id)
        .order("created_at", { ascending: false });

      if (bookingsError) throw bookingsError;
      
      // Cast the result to our defined type
      const typedBookings = (bookingsData as unknown) as BookingWithConsumer[];
      setBookings(typedBookings || []);

      // Calculate stats
      const totalEarnings = (typedBookings || [])
        .filter(b => b.status === "delivered")
        .reduce((sum, b) => sum + ((b.total_price || 0) * 0.8), 0); // 80% to transporter

      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());
      const monthlyEarnings = (typedBookings || [])
        .filter(b => {
          const bookingDate = new Date(b.created_at);
          return b.status === "delivered" && bookingDate >= monthStart && bookingDate <= monthEnd;
        })
        .reduce((sum, b) => sum + ((b.total_price || 0) * 0.8), 0);

      const completedCount = (typedBookings || []).filter(b => b.status === "delivered").length;
      const cancelledCount = (typedBookings || []).filter(b => b.status === "cancelled").length;

      setStats({
        totalJobs: typedBookings?.length || 0,
        completedJobs: completedCount,
        totalEarnings,
        monthlyEarnings,
        averageRating: 4.8, // Placeholder - will be calculated from reviews
        cancelledJobs: cancelledCount,
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

  const getInitials = (name: string | null) => {
    if (!name) return "T";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <ProtectedRoute allowedRoles={["transporter"]}>
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
    <ProtectedRoute allowedRoles={["transporter"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="outline" 
              onClick={() => router.push("/transporter/dashboard")}
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{stats.totalJobs}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-3xl font-bold">{stats.completedJobs}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  <span className="text-3xl font-bold">€{stats.totalEarnings.toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-purple-500" />
                  <span className="text-3xl font-bold">€{stats.monthlyEarnings.toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-current" />
                  <span className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</span>
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
                  <span className="text-3xl font-bold">{stats.cancelledJobs}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="vehicle">Vehicle Info</TabsTrigger>
              <TabsTrigger value="history">Job History</TabsTrigger>
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

            {/* Vehicle Tab */}
            <TabsContent value="vehicle">
              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Information</CardTitle>
                  <CardDescription>Your registered vehicle details</CardDescription>
                </CardHeader>
                <CardContent>
                  {application ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Van Make & Model</Label>
                          <div className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" />
                            <p className="font-medium">{application.van_make} {application.van_model}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Year</Label>
                          <p className="font-medium">{application.van_year}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground">License Plate</Label>
                          <p className="font-medium">{application.van_license_plate}</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Bank Account (IBAN)</Label>
                          <p className="font-medium">{application.bank_account_iban}</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Application Status</Label>
                        <Badge className={application.status === "approved" ? "bg-green-500" : "bg-yellow-500"}>
                          {application.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No vehicle information found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Job History</CardTitle>
                  <CardDescription>View all your completed and ongoing jobs</CardDescription>
                </CardHeader>
                <CardContent>
                  {bookings.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No jobs yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => router.push("/transporter/dashboard")}
                      >
                        View Available Jobs
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((booking) => {
                        const StatusIcon = STATUS_CONFIG[booking.status as keyof typeof STATUS_CONFIG]?.icon || Clock;
                        const earnings = ((booking.total_price || 0) * 0.8).toFixed(2);
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
                                  Job ID: {booking.id.slice(0, 8)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">€{earnings}</p>
                                <p className="text-xs text-muted-foreground">Your Earnings (80%)</p>
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
                                  <p className="text-xs text-muted-foreground mt-1">Distance: {booking.distance_km?.toFixed(1)} km</p>
                                </div>
                                {booking.consumer && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Customer</p>
                                    <p className="font-medium">{booking.consumer.full_name || "Unknown"}</p>
                                  </div>
                                )}
                              </div>
                            </div>
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