import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  MapPin, 
  Calendar, 
  Truck,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Euro,
  Navigation,
  Home,
  LogOut
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
  color: string;
}> = {
  pending: { label: "Available", variant: "secondary", color: "text-orange-600" },
  accepted: { label: "Accepted", variant: "default", color: "text-blue-600" },
  en_route_pickup: { label: "En Route to Pickup", variant: "default", color: "text-blue-600" },
  picked_up: { label: "Picked Up", variant: "default", color: "text-purple-600" },
  en_route_dropoff: { label: "En Route to Dropoff", variant: "default", color: "text-purple-600" },
  delivered: { label: "Completed", variant: "outline", color: "text-green-600" },
  cancelled: { label: "Cancelled", variant: "destructive", color: "text-red-600" },
};

export default function TransporterDashboard() {
  return (
    <ProtectedRoute allowedRoles={["transporter"]}>
      <TransporterDashboardContent />
    </ProtectedRoute>
  );
}

function TransporterDashboardContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<Booking[]>([]);
  const [myJobs, setMyJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [acceptingJobId, setAcceptingJobId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    activeJobs: 0,
    completedToday: 0,
    totalEarnings: 0,
  });

  useEffect(() => {
    fetchUserData();
    fetchJobs();

    // Subscribe to realtime booking updates
    const channel = supabase
      .channel("transporter-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          console.log("Booking update:", payload);
          fetchJobs(); // Refresh jobs on any change
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
      setUserId(user.id);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch available jobs (pending status)
      const available = await bookingService.getAvailableBookings();
      setAvailableJobs(available);

      // Fetch my accepted/active jobs
      const myBookings = await bookingService.getTransporterBookings(user.id);
      setMyJobs(myBookings);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayJobs = myBookings.filter(
        (b) => new Date(b.created_at) >= today
      );

      const activeJobs = myBookings.filter(
        (b) => b.status === "accepted" || 
             b.status === "en_route_pickup" || 
             b.status === "picked_up" || 
             b.status === "en_route_dropoff"
      ).length;

      const completedToday = todayJobs.filter(
        (b) => b.status === "delivered"
      ).length;

      const todayEarnings = todayJobs
        .filter((b) => b.status === "delivered")
        .reduce((sum, b) => sum + (b.transporter_earnings || 0), 0);

      const totalEarnings = myBookings
        .filter((b) => b.status === "delivered")
        .reduce((sum, b) => sum + (b.transporter_earnings || 0), 0);

      setStats({ todayEarnings, activeJobs, completedToday, totalEarnings });
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleAcceptJob = async (bookingId: string) => {
    if (acceptingJobId) return; // Prevent double-clicks

    const confirmed = confirm("Accept this job?");
    if (!confirmed) return;

    setAcceptingJobId(bookingId);

    try {
      const success = await bookingService.acceptBooking(bookingId, userId);
      
      if (success) {
        toast({
          title: "Success!",
          description: "Job accepted successfully!",
          variant: "default",
        });
        await fetchJobs();
      } else {
        toast({
          title: "Unable to Accept Job",
          description: "This job may have been taken by another driver. Please try another job.",
          variant: "destructive",
        });
        await fetchJobs(); // Refresh to remove the taken job
      }
    } catch (error) {
      console.error("Error accepting job:", error);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAcceptingJobId(null);
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    const success = await bookingService.updateBookingStatus(bookingId, newStatus);
    if (success) {
      toast({
        title: "Status Updated",
        description: `Status updated to: ${STATUS_CONFIG[newStatus].label}`,
      });
      await fetchJobs();
    } else {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getNextStatus = (currentStatus: BookingStatus): BookingStatus | null => {
    const statusFlow: Record<BookingStatus, BookingStatus | null> = {
      pending: null,
      accepted: "en_route_pickup",
      en_route_pickup: "picked_up",
      picked_up: "en_route_dropoff",
      en_route_dropoff: "delivered",
      delivered: null,
      cancelled: null,
    };
    return statusFlow[currentStatus];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">Driver Dashboard</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{userEmail}</p>
        </div>

        {/* Online Status Toggle */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`} />
                <div>
                  <Label htmlFor="online-status" className="text-lg font-semibold">
                    {isOnline ? "You're Online" : "You're Offline"}
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isOnline ? "Ready to accept jobs" : "Turn on to receive job offers"}
                  </p>
                </div>
              </div>
              <Switch
                id="online-status"
                checked={isOnline}
                onCheckedChange={setIsOnline}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Today's Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                €{stats.todayEarnings.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.completedToday} jobs completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Active Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.activeJobs}</div>
              <p className="text-xs text-gray-500 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Available Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{availableJobs.length}</div>
              <p className="text-xs text-gray-500 mt-1">Waiting for pickup</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">€{stats.totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Jobs */}
        {isOnline && availableJobs.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Available Jobs
              </CardTitle>
              <CardDescription>Accept jobs to start earning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableJobs.map((job) => (
                  <Card key={job.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                            <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg capitalize">
                              {job.item_type?.replace(/_/g, " ")}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {job.item_size} item
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            €{job.transporter_earnings?.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">Your earnings</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Pick-up</p>
                            <p className="text-sm font-medium truncate">{job.pickup_address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Drop-off</p>
                            <p className="text-sm font-medium truncate">{job.dropoff_address}</p>
                          </div>
                        </div>
                      </div>

                      {job.special_instructions && (
                        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Special Instructions
                          </p>
                          <p className="text-sm">{job.special_instructions}</p>
                        </div>
                      )}

                      <Separator className="my-4" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {job.scheduled_at && format(new Date(job.scheduled_at), "MMM dd, HH:mm")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Navigation className="w-4 h-4" />
                            {job.distance_km?.toFixed(1)} km
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAcceptJob(job.id)}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={acceptingJobId === job.id}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {acceptingJobId === job.id ? "Accepting..." : "Accept Job"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Active Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>My Jobs</CardTitle>
            <CardDescription>Track and manage your accepted jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading jobs...</div>
            ) : myJobs.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">No active jobs</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {isOnline 
                    ? "Available jobs will appear above when customers book" 
                    : "Turn on 'Online' status to start accepting jobs"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myJobs.map((job) => {
                  const nextStatus = getNextStatus(job.status);
                  const isActive = job.status !== "delivered" && job.status !== "cancelled";

                  return (
                    <Card key={job.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg capitalize">
                                {job.item_type?.replace(/_/g, " ")}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {job.item_size} item
                              </p>
                            </div>
                          </div>
                          <Badge variant={STATUS_CONFIG[job.status]?.variant || "default"}>
                            {STATUS_CONFIG[job.status]?.label || job.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Pick-up</p>
                              <p className="text-sm font-medium truncate">{job.pickup_address}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Drop-off</p>
                              <p className="text-sm font-medium truncate">{job.dropoff_address}</p>
                            </div>
                          </div>
                        </div>

                        {job.special_instructions && (
                          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Special Instructions
                            </p>
                            <p className="text-sm">{job.special_instructions}</p>
                          </div>
                        )}

                        <Separator className="my-4" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {job.scheduled_at && format(new Date(job.scheduled_at), "MMM dd, HH:mm")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Navigation className="w-4 h-4" />
                              {job.distance_km?.toFixed(1)} km
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                €{job.transporter_earnings?.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">Your earnings</p>
                            </div>
                            {isActive && nextStatus && (
                              <Button
                                onClick={() => handleUpdateStatus(job.id, nextStatus)}
                                size="sm"
                              >
                                {nextStatus === "en_route_pickup" && "Start Trip"}
                                {nextStatus === "picked_up" && "Confirm Pickup"}
                                {nextStatus === "en_route_dropoff" && "En Route to Dropoff"}
                                {nextStatus === "delivered" && "Complete Delivery"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}