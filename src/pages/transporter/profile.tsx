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
import { User, Mail, Phone, Calendar, Package, DollarSign, Star, MapPin, Clock, ArrowRight, TrendingUp, Truck, CreditCard, Save, ArrowLeft, Home, LogOut, Download, FileText, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { updateProfile } from "@/services/profileService";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Application = Database["public"]["Tables"]["transporter_applications"]["Row"];
// Define the exact shape returned by the join query
type BookingWithConsumer = Database["public"]["Tables"]["bookings"]["Row"] & {
  consumer: { id: string; full_name: string | null; email: string | null } | null;
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

export default function TransporterProfile() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [savedBookings, setSavedBookings] = useState<BookingWithConsumer[]>([]);

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
      if (profileData) {
        setProfile(profileData);
        setIsOnline(profileData.is_online || false);
      }
      setFormData({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
      });

      // Load application details
      const { data: appData, error: appError } = await supabase
        .from("transporter_applications")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

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
        .reduce((sum, b) => sum + ((b.total_price || 0) * 0.8), 0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      await updateProfile(session.user.id, {
        full_name: formData.full_name || null,
        phone: formData.phone || null,
      });

      // Update local profile state
      if (profile) {
        setProfile({ ...profile, full_name: formData.full_name, phone: formData.phone });
      }

      toast({
        title: "✅ Profile Updated",
        description: "Your profile has been successfully updated",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleOnlineToggle = async (checked: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to change your status",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsOnline(checked);
      
      await updateProfile(session.user.id, {
        is_online: checked,
      });

      toast({
        title: checked ? "🟢 You're Online" : "⚫ You're Offline",
        description: checked 
          ? "You will now receive booking requests" 
          : "You won't receive new booking requests",
      });
    } catch (error) {
      console.error("Error updating online status:", error);
      setIsOnline(!checked); // Revert on error
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveBooking = async (bookingId: string, status: string) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to update a booking",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "✅ Booking Updated",
        description: `Booking ${bookingId} status updated to ${status}`,
      });
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast({
        title: "Error",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to delete a booking",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;

      toast({
        title: "✅ Booking Deleted",
        description: `Booking ${bookingId} has been deleted`,
      });
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast({
        title: "Error",
        description: "Failed to delete booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Download driving journal as CSV
  const downloadCSV = () => {
    const completedBookings = bookings.filter(b => b.status === "delivered");
    
    if (completedBookings.length === 0) {
      toast({
        title: "No Data",
        description: "No completed trips to export",
        variant: "destructive",
      });
      return;
    }

    // CSV Headers
    const headers = [
      "Date",
      "Trip ID",
      "Start Time",
      "End Time",
      "Duration (min)",
      "Start Address",
      "End Address",
      "Distance (km)",
      "Customer Name",
      "Item Type",
      "Item Size",
      "Earnings (€)",
    ];

    // CSV Rows
    const rows = completedBookings.map(booking => {
      const startTime = new Date(booking.created_at);
      const endTime = booking.completed_at ? new Date(booking.completed_at) : startTime;
      const duration = differenceInMinutes(endTime, startTime);
      
      return [
        format(startTime, "yyyy-MM-dd"),
        booking.id.slice(0, 8),
        format(startTime, "HH:mm"),
        format(endTime, "HH:mm"),
        duration.toString(),
        `"${booking.pickup_address}"`,
        `"${booking.dropoff_address}"`,
        (booking.distance_km || 0).toFixed(1),
        `"${booking.consumer?.full_name || "N/A"}"`,
        booking.item_type || "N/A",
        booking.item_size || "N/A",
        ((booking.total_price || 0) * 0.8).toFixed(2),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `driving-journal-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Downloaded",
      description: "Driving journal exported as CSV",
    });
  };

  // Calculate journal statistics
  const calculateJournalStats = () => {
    const completedBookings = bookings.filter(b => b.status === "delivered");
    
    const totalDistance = completedBookings.reduce((sum, b) => sum + (b.distance_km || 0), 0);
    const totalDuration = completedBookings.reduce((sum, b) => {
      if (!b.completed_at) return sum;
      const start = new Date(b.created_at);
      const end = new Date(b.completed_at);
      return sum + differenceInMinutes(end, start);
    }, 0);

    return {
      totalTrips: completedBookings.length,
      totalDistance: totalDistance.toFixed(1),
      totalDuration: Math.round(totalDuration),
      averageDistance: completedBookings.length > 0 ? (totalDistance / completedBookings.length).toFixed(1) : "0",
    };
  };

  const journalStats = calculateJournalStats();

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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/transporter/dashboard")}
                className="hover:bg-navy-100 dark:hover:bg-navy-800"
                title="Home"
              >
                <Home className="h-5 w-5 text-navy-600 dark:text-navy-400" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-navy-900">Profile Settings</h1>
                <p className="text-gray-600 mt-2">Manage your personal information and vehicle details</p>
              </div>
            </div>
            <Badge variant={application?.status === "approved" ? "default" : "secondary"}>
              {application?.status === "approved" ? "✓ Verified Transporter" : "Pending Verification"}
            </Badge>
          </div>

          {/* Online/Offline Status Toggle */}
          <Card className="mb-6 border-2 border-navy-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {isOnline ? (
                      <>
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        You're Online
                      </>
                    ) : (
                      <>
                        <span className="flex h-3 w-3 relative">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                        </span>
                        You're Offline
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {isOnline 
                      ? "You will receive booking requests from customers" 
                      : "You won't receive new booking requests"}
                  </CardDescription>
                </div>
                <Switch
                  checked={isOnline}
                  onCheckedChange={handleOnlineToggle}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </CardHeader>
          </Card>

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
              <TabsTrigger value="history">Driving Journal</TabsTrigger>
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

            {/* Driving Journal Tab */}
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Driving Journal (Ajokirja)
                      </CardTitle>
                      <CardDescription>Complete trip records for official reporting</CardDescription>
                    </div>
                    <Button
                      onClick={downloadCSV}
                      variant="outline"
                      className="gap-2"
                      disabled={bookings.filter(b => b.status === "delivered").length === 0}
                    >
                      <Download className="h-4 w-4" />
                      Download CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {bookings.filter(b => b.status === "delivered").length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No completed trips yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => router.push("/transporter/dashboard")}
                      >
                        View Available Jobs
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Journal Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Trips</p>
                          <p className="text-2xl font-bold">{journalStats.totalTrips}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Distance</p>
                          <p className="text-2xl font-bold">{journalStats.totalDistance} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Duration</p>
                          <p className="text-2xl font-bold">{Math.floor(journalStats.totalDuration / 60)}h {journalStats.totalDuration % 60}m</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Distance</p>
                          <p className="text-2xl font-bold">{journalStats.averageDistance} km</p>
                        </div>
                      </div>

                      {/* Trip Records */}
                      <div className="space-y-4">
                        {bookings
                          .filter(b => b.status === "delivered")
                          .map((booking) => {
                            const startTime = new Date(booking.created_at);
                            const endTime = booking.completed_at ? new Date(booking.completed_at) : startTime;
                            const duration = differenceInMinutes(endTime, startTime);
                            const earnings = ((booking.total_price || 0) * 0.8).toFixed(2);

                            return (
                              <div
                                key={booking.id}
                                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                              >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <CalendarDays className="h-4 w-4 text-primary" />
                                      <span className="font-semibold">
                                        {format(startTime, "EEEE, MMMM dd, yyyy")}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Trip ID: {booking.id.slice(0, 8)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-green-600">€{earnings}</p>
                                    <p className="text-xs text-muted-foreground">Earnings</p>
                                  </div>
                                </div>

                                <Separator className="my-3" />

                                {/* Trip Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Time & Duration */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-blue-500" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Start Time</p>
                                        <p className="font-medium">{format(startTime, "HH:mm")}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-purple-500" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">End Time</p>
                                        <p className="font-medium">{format(endTime, "HH:mm")}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <TrendingUp className="h-4 w-4 text-orange-500" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Duration</p>
                                        <p className="font-medium">{Math.floor(duration / 60)}h {duration % 60}m</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Locations */}
                                  <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-green-500 mt-1" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Start Point</p>
                                        <p className="font-medium text-sm">{booking.pickup_address}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-red-500 mt-1" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">End Point</p>
                                        <p className="font-medium text-sm">{booking.dropoff_address}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <Separator className="my-3" />

                                {/* Additional Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Distance</p>
                                    <p className="font-semibold">{(booking.distance_km || 0).toFixed(1)} km</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Customer</p>
                                    <p className="font-semibold">{booking.consumer?.full_name || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Item Type</p>
                                    <p className="font-semibold">{booking.item_type || "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Item Size</p>
                                    <p className="font-semibold">{booking.item_size || "N/A"}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </>
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