import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Package, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock,
  Eye,
  CheckCircle,
  X,
  Search,
  MapPin,
  User,
  FileText,
  Truck,
  Shield,
  CheckCircle2,
  Download,
  Trash2,
  LogOut,
  AlertCircle,
  Activity,
  UserPlus,
  CreditCard,
  UserCheck,
  Filter,
  Ban
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { formatDistanceToNow } from "date-fns";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type TransporterApplication = Database["public"]["Tables"]["transporter_applications"]["Row"] & {
  address_country?: string | null;
  social_security_number?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_postal_code?: string | null;
  driver_license_number?: string | null;
  driver_license_expiry?: string | null;
  driver_license_validated?: boolean | null;
  driver_license_url?: string | null;
  vehicle_registration_url?: string | null;
  insurance_company?: string | null;
  insurance_policy_number?: string | null;
  insurance_expiry?: string | null;
  insurance_validated?: boolean | null;
  insurance_url?: string | null;
  background_check_status?: string | null;
  background_check_date?: string | null;
  documents_verified_date?: string | null;
  compliance_status?: string | null;
  admin_notes?: string | null;
  bank_account_iban?: string | null;
  van_make?: string | null;
  van_model?: string | null;
  van_year?: number | null;
  van_license_plate?: string | null;
  van_register_number?: string | null;
};
type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  consumer?: { id: string; full_name: string | null; email: string | null } | null;
  transporter?: { id: string; full_name: string | null; email: string | null } | null;
};

type UserWithStats = Profile & {
  total_bookings?: number;
  total_earnings?: number;
  average_rating?: number;
  phone_number?: string;
  is_online?: boolean;
  status?: "online" | "busy" | "offline";
  current_job?: {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    status: string;
  } | null;
};

type ActivityLog = {
  id: string;
  type: "user_signup" | "booking_created" | "booking_completed" | "payment_received" | "application_submitted";
  user_type: "consumer" | "transporter" | "admin";
  user_name: string;
  description: string;
  timestamp: string;
  amount?: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({
    totalConsumers: 0,
    totalTransporters: 0,
    pendingApplications: 0,
    activeBookings: 0,
    totalRevenue: 0,
    todayBookings: 0,
    activeConsumers: 0,
    activeTransporters: 0,
    avgBookingValue: 0,
    completionRate: 0
  });
  const [pendingApplications, setPendingApplications] = useState<TransporterApplication[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [consumers, setConsumers] = useState<UserWithStats[]>([]);
  const [transporters, setTransporters] = useState<UserWithStats[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [consumerSearchTerm, setConsumerSearchTerm] = useState("");
  const [transporterSearchTerm, setTransporterSearchTerm] = useState("");
  
  // Transporter Jobs State
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [transporterJobs, setTransporterJobs] = useState<Booking[]>([]);
  const [transporterJobsOpen, setTransporterJobsOpen] = useState(false);
  const [selectedUserApplication, setSelectedUserApplication] = useState<TransporterApplication | null>(null);

  // Consumer Bookings State
  const [selectedConsumerId, setSelectedConsumerId] = useState<string | null>(null);
  const [consumerBookings, setConsumerBookings] = useState<Booking[]>([]);
  const [consumerBookingsOpen, setConsumerBookingsOpen] = useState(false);

  // Delete Job State
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Subscribe to real-time updates
    const bookingsSubscription = supabase
      .channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        loadBookingsData();
        loadActivityData();
      })
      .subscribe();

    const applicationsSubscription = supabase
      .channel("admin-applications")
      .on("postgres_changes", { event: "*", schema: "public", table: "transporter_applications" }, () => {
        loadApplicationsData();
        loadActivityData();
      })
      .subscribe();

    const profilesSubscription = supabase
      .channel("admin-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadUsersData();
        loadActivityData();
      })
      .subscribe();

    return () => {
      bookingsSubscription.unsubscribe();
      applicationsSubscription.unsubscribe();
      profilesSubscription.unsubscribe();
    };
  }, []);

  async function loadDashboardData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!profileData) return;
      setProfile(profileData);

      await Promise.all([
        loadStatsData(),
        loadApplicationsData(),
        loadBookingsData(),
        loadUsersData(),
        loadActivityData()
      ]);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadStatsData() {
    const { data: consumers } = await supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "consumer");

    const { data: transporters } = await supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "transporter");

    const { data: applications } = await supabase
      .from("transporter_applications")
      .select("id", { count: "exact" })
      .eq("status", "pending");

    const { data: activeBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact" })
      .in("status", ["pending", "accepted", "en_route_pickup", "picked_up", "en_route_dropoff"]);

    const { data: allBookingsData } = await supabase
      .from("bookings")
      .select("total_price, status");

    const totalRevenue = allBookingsData?.reduce((sum, booking) => sum + Number(booking.total_price), 0) || 0;
    const completedBookings = allBookingsData?.filter(b => b.status === "delivered").length || 0;
    const totalBookings = allBookingsData?.length || 0;
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact" })
      .gte("created_at", today.toISOString());

    // Active users (users with bookings in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activeConsumerBookings } = await supabase
      .from("bookings")
      .select("consumer_id")
      .gte("created_at", thirtyDaysAgo.toISOString());

    const { data: activeTransporterBookings } = await supabase
      .from("bookings")
      .select("transporter_id")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .not("transporter_id", "is", null);

    const activeConsumers = new Set(activeConsumerBookings?.map(b => b.consumer_id)).size;
    const activeTransporters = new Set(activeTransporterBookings?.map(b => b.transporter_id)).size;

    setStats({
      totalConsumers: consumers?.length || 0,
      totalTransporters: transporters?.length || 0,
      pendingApplications: applications?.length || 0,
      activeBookings: activeBookings?.length || 0,
      totalRevenue,
      todayBookings: todayBookings?.length || 0,
      activeConsumers,
      activeTransporters,
      avgBookingValue,
      completionRate
    });
  }

  async function loadApplicationsData() {
    const { data } = await supabase
      .from("transporter_applications")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: false });

    setPendingApplications(data || []);
  }

  async function loadBookingsData() {
    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        consumer:profiles!bookings_consumer_id_fkey(id, full_name, email),
        transporter:profiles!bookings_transporter_id_fkey(id, full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    setAllBookings(data || []);
  }

  async function loadUsersData() {
    // Load consumers with stats
    const { data: consumerData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "consumer")
      .order("created_at", { ascending: false });

    if (consumerData) {
      const consumersWithStats = await Promise.all(
        consumerData.map(async (consumer) => {
          const { data: bookings } = await supabase
            .from("bookings")
            .select("id, total_price")
            .eq("consumer_id", consumer.id);

          return {
            ...consumer,
            total_bookings: bookings?.length || 0,
            total_earnings: 0,
            average_rating: 0,
            status: "offline", // Default for consumers
            current_job: null
          } as UserWithStats;
        })
      );
      setConsumers(consumersWithStats);
    }

    // Load transporters with stats
    const { data: transporterData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "transporter")
      .order("created_at", { ascending: false });

    if (transporterData) {
      // Transform data
      const transportersWithStats = await Promise.all(
        transporterData.map(async (user: any) => {
          // Get stats
          const { count: totalBookings } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("transporter_id", user.id)
            .eq("status", "delivered");

          // Calculate earnings (75% of total price)
          const { data: bookings } = await supabase
            .from("bookings")
            .select("total_price")
            .eq("transporter_id", user.id)
            .eq("status", "delivered");

          const totalEarnings = (bookings || []).reduce(
            (sum, booking) => sum + (Number(booking.total_price) || 0) * 0.75, 
            0
          );

          // Determine status and current job
          let status: "online" | "busy" | "offline" = user.is_online ? "online" : "offline";
          let currentJob = null;

          // Check for active job
          const { data: activeJob } = await supabase
            .from("bookings")
            .select("id, pickup_address, dropoff_address, status")
            .eq("transporter_id", user.id)
            .in("status", ["accepted", "en_route_pickup", "picked_up", "en_route_dropoff"])
            .maybeSingle();

          if (activeJob) {
            status = "busy";
            currentJob = activeJob;
          }

          return {
            ...user,
            phone_number: user.phone_number, // Ensure this is mapped if it exists on profile
            total_bookings: totalBookings,
            total_earnings: totalEarnings,
            average_rating: 0, // Removed from UI but kept in type for compatibility if needed
            status,
            current_job: currentJob
          };
        })
      );
      setTransporters(transportersWithStats);
    }
  }

  async function loadActivityData() {
    const activities: ActivityLog[] = [];

    // Recent signups
    const { data: recentUsers } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    recentUsers?.forEach(user => {
      activities.push({
        id: `signup-${user.id}`,
        type: "user_signup",
        user_type: user.role as "consumer" | "transporter" | "admin",
        user_name: user.full_name || user.email || "Unknown",
        description: `New ${user.role} signed up`,
        timestamp: user.created_at
      });
    });

    // Recent bookings
    const { data: recentBookings } = await supabase
      .from("bookings")
      .select(`
        *,
        consumer:profiles!bookings_consumer_id_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    recentBookings?.forEach(booking => {
      activities.push({
        id: `booking-${booking.id}`,
        type: "booking_created",
        user_type: "consumer",
        user_name: booking.consumer?.full_name || booking.consumer?.email || "Unknown",
        description: `Created booking from ${booking.pickup_address.split(",")[0]} to ${booking.dropoff_address.split(",")[0]}`,
        timestamp: booking.created_at,
        amount: Number(booking.total_price)
      });

      if (booking.status === "delivered") {
        activities.push({
          id: `completed-${booking.id}`,
          type: "booking_completed",
          user_type: "transporter",
          user_name: "Transporter",
          description: `Completed delivery`,
          timestamp: booking.updated_at,
          amount: Number(booking.total_price) * 0.8
        });
      }
    });

    // Recent applications
    const { data: recentApps } = await supabase
      .from("transporter_applications")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(5);

    recentApps?.forEach(app => {
      activities.push({
        id: `app-${app.id}`,
        type: "application_submitted",
        user_type: "transporter",
        user_name: "Applicant",
        description: `Submitted transporter application`,
        timestamp: app.submitted_at
      });
    });

    // Sort by timestamp and take top 20
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivity(activities.slice(0, 20));
  }

  async function loadTransporterJobs(transporterId: string) {
    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        consumer:profiles!bookings_consumer_id_fkey(id, full_name, email)
      `)
      .eq("transporter_id", transporterId)
      .eq("status", "delivered")
      .order("updated_at", { ascending: false });

    setTransporterJobs(data || []);
    setSelectedTransporterId(transporterId);
    setTransporterJobsOpen(true);
  }

  async function loadConsumerBookings(consumerId: string) {
    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        transporter:profiles!bookings_transporter_id_fkey(id, full_name, email)
      `)
      .eq("consumer_id", consumerId)
      .order("created_at", { ascending: false });

    setConsumerBookings(data || []);
    setSelectedConsumerId(consumerId);
    setConsumerBookingsOpen(true);
  }

  function saveJobToFile(job: Booking) {
    const jobData = {
      id: job.id,
      completed_date: new Date(job.updated_at).toISOString(),
      consumer: {
        name: job.consumer?.full_name || "N/A",
        email: job.consumer?.email || "N/A"
      },
      pickup_address: job.pickup_address || "N/A",
      dropoff_address: job.dropoff_address || "N/A",
      item_type: job.item_type || "N/A",
      item_size: job.item_size || "N/A",
      special_instructions: job.special_instructions || "None",
      total_price: Number(job.total_price),
      transporter_earnings: Number(job.total_price) * 0.8
    };

    const blob = new Blob([JSON.stringify(jobData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-${job.id.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteJob(jobId: string) {
    setDeleteJobId(jobId);
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteJob() {
    if (!deleteJobId) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", deleteJobId);

      if (error) throw error;

      // Refresh data based on context
      if (selectedTransporterId && transporterJobsOpen) {
        await loadTransporterJobs(selectedTransporterId);
      }
      if (selectedConsumerId && consumerBookingsOpen) {
        await loadConsumerBookings(selectedConsumerId);
      }
      
      await loadDashboardData();
      
      setDeleteConfirmOpen(false);
      setDeleteJobId(null);
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Failed to delete job. Please try again.");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  async function approveApplication(applicationId: string) {
    try {
      const application = pendingApplications.find(app => app.id === applicationId);
      if (!application) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from("transporter_applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id
        })
        .eq("id", applicationId);

      await supabase
        .from("profiles")
        .update({ role: "transporter" })
        .eq("id", application.user_id);

      loadDashboardData();
    } catch (error) {
      console.error("Error approving application:", error);
    }
  }

  async function rejectApplication(applicationId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from("transporter_applications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id
        })
        .eq("id", applicationId);

      loadDashboardData();
    } catch (error) {
      console.error("Error rejecting application:", error);
    }
  }

  async function suspendUser(userId: string) {
    try {
      await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userId);

      alert("User suspended (feature in development - requires Edge Function)");
      loadUsersData();
    } catch (error) {
      console.error("Error suspending user:", error);
    }
  }

  async function activateUser(userId: string) {
    try {
      await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", userId);

      alert("User activated");
      loadUsersData();
    } catch (error) {
      console.error("Error activating user:", error);
    }
  }

  async function viewUserDetails(user: UserWithStats) {
    setSelectedUser(user);
    if (user.role === "transporter") {
      const { data } = await supabase
        .from("transporter_applications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setSelectedUserApplication(data);
    } else {
      setSelectedUserApplication(null);
    }
    setUserDetailsOpen(true);
  }

  function exportUsers(type: "consumers" | "transporters") {
    const data = type === "consumers" ? consumers : transporters;
    const csv = [
      ["Name", "Email", "Phone", "Joined", "Total Bookings", "Earnings"].join(","),
      ...data.map(u => [
        u.full_name || "",
        u.email || "",
        u.phone_number || "",
        new Date(u.created_at).toLocaleDateString(),
        u.total_bookings || 0,
        (u.total_earnings || 0).toFixed(2)
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const filteredBookings = allBookings.filter(booking => {
    const matchesStatus = bookingFilter === "all" || booking.status === bookingFilter;
    const matchesSearch = searchTerm === "" || 
      booking.pickup_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.dropoff_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.consumer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.transporter?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const filteredConsumers = consumers.filter(consumer =>
    consumerSearchTerm === "" ||
    consumer.full_name?.toLowerCase().includes(consumerSearchTerm.toLowerCase()) ||
    consumer.email?.toLowerCase().includes(consumerSearchTerm.toLowerCase())
  );

  const filteredTransporters = transporters.filter(transporter =>
    transporterSearchTerm === "" ||
    transporter.full_name?.toLowerCase().includes(transporterSearchTerm.toLowerCase()) ||
    transporter.email?.toLowerCase().includes(transporterSearchTerm.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "delivered": return "default";
      case "cancelled": return "destructive";
      case "pending": return "secondary";
      default: return "outline";
    }
  };

  const getActivityIcon = (type: ActivityLog["type"]) => {
    switch (type) {
      case "user_signup": return UserPlus;
      case "booking_created": return Package;
      case "booking_completed": return CheckCircle;
      case "payment_received": return CreditCard;
      case "application_submitted": return UserCheck;
      default: return Activity;
    }
  };

  const getActivityColor = (type: ActivityLog["type"]) => {
    switch (type) {
      case "user_signup": return "text-blue-600";
      case "booking_created": return "text-purple-600";
      case "booking_completed": return "text-green-600";
      case "payment_received": return "text-yellow-600";
      case "application_submitted": return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage VANGO platform</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Consumers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalConsumers}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+{stats.activeConsumers}</span> active (30d)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transporters</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransporters}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+{stats.activeTransporters}</span> active (30d)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingApplications}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeBookings}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-blue-600">+{stats.todayBookings}</span> today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{stats.avgBookingValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Per booking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Successful deliveries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Activity</CardTitle>
                <Activity className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayBookings}</div>
                <p className="text-xs text-muted-foreground">New bookings</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="activity" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="activity">Feed</TabsTrigger>
              <TabsTrigger value="roster">Roster</TabsTrigger>
              <TabsTrigger value="transporters">Transporters ({stats.totalTransporters})</TabsTrigger>
              <TabsTrigger value="consumers">Consumers ({stats.totalConsumers})</TabsTrigger>
              <TabsTrigger value="applications">Applications ({stats.pendingApplications})</TabsTrigger>
            </TabsList>

            {/* Activity Feed Tab */}
            <TabsContent value="activity">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Activity Timeline */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Real-time platform activity feed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {recentActivity.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p>No recent activity</p>
                        </div>
                      ) : (
                        recentActivity.map((activity) => {
                          const Icon = getActivityIcon(activity.type);
                          const colorClass = getActivityColor(activity.type);
                          
                          return (
                            <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                              <div className={`p-2 rounded-full bg-gray-100 ${colorClass}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-medium text-sm">{activity.user_name}</div>
                                    <div className="text-sm text-gray-600">{activity.description}</div>
                                    {activity.amount && (
                                      <div className="text-sm font-semibold text-green-600 mt-1">
                                        €{activity.amount.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {activity.user_type}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Consumer Activity Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Consumer Activity</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <UserPlus className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium text-sm">New Signups</p>
                            <p className="text-xs text-gray-600">This month</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          {consumers.filter(c => {
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            return new Date(c.created_at) > thirtyDaysAgo;
                          }).length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="font-medium text-sm">Active Users</p>
                            <p className="text-xs text-gray-600">Made bookings</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-purple-600">
                          {stats.activeConsumers}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-sm">Avg Bookings</p>
                            <p className="text-xs text-gray-600">Per active user</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-green-600">
                          {stats.activeConsumers > 0 
                            ? (consumers.reduce((sum, c) => sum + (c.total_bookings || 0), 0) / stats.activeConsumers).toFixed(1)
                            : "0.0"
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transporter Activity Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Transporter Activity</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-orange-600" />
                          <div>
                            <p className="font-medium text-sm">New Transporters</p>
                            <p className="text-xs text-gray-600">This month</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-orange-600">
                          {transporters.filter(t => {
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                            return new Date(t.created_at) > thirtyDaysAgo;
                          }).length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-sm">Active Drivers</p>
                            <p className="text-xs text-gray-600">Completed jobs</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-green-600">
                          {stats.activeTransporters}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-yellow-600" />
                          <div>
                            <p className="font-medium text-sm">Avg Earnings</p>
                            <p className="text-xs text-gray-600">Per active driver</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-yellow-600">
                          €{stats.activeTransporters > 0
                            ? (transporters.reduce((sum, t) => sum + (t.total_earnings || 0), 0) / stats.activeTransporters).toFixed(0)
                            : "0"
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Applications Tab */}
            <TabsContent value="applications">
              <Card>
                <CardHeader>
                  <CardTitle>Transporter Applications</CardTitle>
                  <CardDescription>Review and approve new transporter applications</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingApplications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No pending applications</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingApplications.map((app) => (
                        <div key={app.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="font-semibold">Application #{app.id.slice(0, 8)}</div>
                              <div className="text-sm text-gray-600">
                                Submitted: {new Date(app.submitted_at).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge>Pending</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-gray-600">Van:</span> {app.van_make} {app.van_model} ({app.van_year})
                            </div>
                            <div>
                              <span className="text-gray-600">License Plate:</span> {app.van_license_plate}
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-600">IBAN:</span> {app.bank_account_iban}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => approveApplication(app.id)} size="sm">
                              Approve
                            </Button>
                            <Button onClick={() => rejectApplication(app.id)} variant="outline" size="sm">
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bookings Tab */}
            <TabsContent value="bookings">
              <Card>
                <CardHeader>
                  <CardTitle>All Bookings</CardTitle>
                  <CardDescription>View and manage all bookings in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by address or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select value={bookingFilter} onValueChange={setBookingFilter}>
                        <SelectTrigger className="w-48">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="en_route_pickup">En Route (Pickup)</SelectItem>
                          <SelectItem value="picked_up">Picked Up</SelectItem>
                          <SelectItem value="en_route_dropoff">En Route (Dropoff)</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bookings Table */}
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Consumer</TableHead>
                            <TableHead>Transporter</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBookings.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                No bookings found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredBookings.map((booking) => (
                              <TableRow key={booking.id}>
                                <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}</TableCell>
                                <TableCell className="text-sm">
                                  {new Date(booking.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {booking.consumer?.full_name || "N/A"}
                                  <div className="text-xs text-gray-500">{booking.consumer?.email}</div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {booking.transporter?.full_name || "Unassigned"}
                                  {booking.transporter?.email && (
                                    <div className="text-xs text-gray-500">{booking.transporter.email}</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm max-w-xs">
                                  <div className="truncate">{booking.pickup_address}</div>
                                  <div className="text-xs text-gray-500 truncate">→ {booking.dropoff_address}</div>
                                </TableCell>
                                <TableCell className="font-semibold">€{Number(booking.total_price).toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant={getStatusBadgeVariant(booking.status)}>
                                    {booking.status.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Consumers Tab */}
            <TabsContent value="consumers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Consumer Accounts</CardTitle>
                    <CardDescription>Manage consumer users and view their activity</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportUsers("consumers")}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search consumers by name or email..."
                        value={consumerSearchTerm}
                        onChange={(e) => setConsumerSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Consumers Table */}
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Bookings</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredConsumers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                No consumers found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredConsumers.map((consumer) => (
                              <TableRow key={consumer.id}>
                                <TableCell className="font-medium">{consumer.full_name || "N/A"}</TableCell>
                                <TableCell>{consumer.email}</TableCell>
                                <TableCell>{consumer.phone_number || "N/A"}</TableCell>
                                <TableCell>{new Date(consumer.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-blue-100"
                                    onClick={() => loadConsumerBookings(consumer.id)}
                                  >
                                    {consumer.total_bookings || 0}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => viewUserDetails(consumer)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => suspendUser(consumer.id)}>
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transporters Tab */}
            <TabsContent value="transporters">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Transporter Accounts</CardTitle>
                    <CardDescription>Manage transporter users and view their performance</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => exportUsers("transporters")}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search transporters by name or email..."
                        value={transporterSearchTerm}
                        onChange={(e) => setTransporterSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Transporters Table */}
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Completed Jobs</TableHead>
                            <TableHead>Total Earnings</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTransporters.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                No transporters found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredTransporters.map((transporter) => (
                              <TableRow key={transporter.id}>
                                <TableCell className="font-medium">{transporter.full_name || "N/A"}</TableCell>
                                <TableCell>{transporter.email}</TableCell>
                                <TableCell>{transporter.phone_number || "N/A"}</TableCell>
                                <TableCell>{new Date(transporter.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="secondary" 
                                    className="cursor-pointer hover:bg-blue-100"
                                    onClick={() => loadTransporterJobs(transporter.id)}
                                  >
                                    {transporter.total_bookings || 0}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold">
                                  €{(transporter.total_earnings || 0).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => viewUserDetails(transporter)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => suspendUser(transporter.id)}>
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Roster Tab */}
            <TabsContent value="roster">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Transporter Roster</CardTitle>
                  <CardDescription>Live view of all transporters with their current status and jobs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Transporters Table */}
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transporter</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Current Job</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transporters.map((transporter) => (
                            <TableRow key={transporter.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{transporter.full_name || "N/A"}</div>
                                  <div className="text-xs text-gray-500">{transporter.email}</div>
                                  <div className="text-xs text-gray-500">{transporter.phone_number || "No phone"}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    transporter.status === "busy" ? "destructive" : 
                                    transporter.status === "online" ? "default" : "secondary"
                                  }
                                  className={
                                    transporter.status === "online" ? "bg-green-500 hover:bg-green-600" : ""
                                  }
                                >
                                  {transporter.status === "busy" ? "Busy (On Job)" : 
                                   transporter.status === "online" ? "Online (Available)" : "Offline"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {/* Placeholder for real location tracking */}
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <MapPin className="h-3 w-3" />
                                    <span>Unknown</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {transporter.current_job ? (
                                  <div className="space-y-1">
                                    <div className="font-medium flex items-center gap-1">
                                      <Package className="h-3 w-3" />
                                      Job #{transporter.current_job.id.slice(0, 8)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      From: {transporter.current_job.pickup_address.split(",")[0]}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      To: {transporter.current_job.dropoff_address.split(",")[0]}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] h-5">
                                      {transporter.current_job.status.replace(/_/g, " ")}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">No active job</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => viewUserDetails(transporter)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* END OF TABS */}
          </Tabs>

          {/* User Details Dialog */}
          <Dialog open={!!selectedUser} onOpenChange={() => {
            setSelectedUser(null);
            setSelectedUserApplication(null);
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {selectedUser && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                          {selectedUser.full_name || "Unnamed User"}
                        </DialogTitle>
                      </DialogHeader>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={selectedUser.role === "transporter" ? "default" : "secondary"}>
                        {selectedUser.role}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setUserDetailsOpen(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4" />
                      Personal Information
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{selectedUser.full_name || ""}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedUser.email || ""}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedUser.phone || ""}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Role</p>
                        <Badge variant="outline">{selectedUser.role}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Member Since</p>
                        <p className="font-medium">
                          {new Date(selectedUser.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={selectedUser.status === "online" ? "default" : "secondary"}>
                          {selectedUser.status === "online" ? "Online" : "Offline"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Address</h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Street Address</label>
                        <p className="font-medium">{selectedUserApplication?.address_street || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground">Postal Code</label>
                          <p className="font-medium">{selectedUserApplication?.address_postal_code || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">City</label>
                          <p className="font-medium">{selectedUserApplication?.address_city || "N/A"}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Country</label>
                        <p className="font-medium">{selectedUserApplication?.address_country || "Finland"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Driver's License Information */}
                  {selectedUser.role === "transporter" && selectedUserApplication && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Driver&apos;s License Information</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground">License Number</label>
                          <p className="font-medium">{selectedUserApplication.driver_license_number || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Expiry Date</label>
                          <p className="font-medium">
                            {selectedUserApplication.driver_license_expiry
                              ? new Date(selectedUserApplication.driver_license_expiry).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Validation Status</label>
                          <div>
                            <Badge variant={selectedUserApplication.driver_license_validated ? "default" : "destructive"}>
                              {selectedUserApplication.driver_license_validated ? "✓ Validated" : "✗ Not Validated"}
                            </Badge>
                          </div>
                        </div>
                        {selectedUserApplication.driver_license_url && (
                          <div>
                            <label className="text-xs text-muted-foreground">License Document</label>
                            <a
                              href={selectedUserApplication.driver_license_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              View Document →
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vehicle Information */}
                  {selectedUser.role === "transporter" && selectedUserApplication && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Truck className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Vehicle Information</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground">Vehicle Make</label>
                          <p className="font-medium">{selectedUserApplication.van_make || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Vehicle Model</label>
                          <p className="font-medium">{selectedUserApplication.van_model || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Manufacture Year</label>
                          <p className="font-medium">{selectedUserApplication.van_year || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">License Plate</label>
                          <p className="font-medium">{selectedUserApplication.van_license_plate || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Register Number</p>
                          <p className="font-medium">{selectedUserApplication.van_register_number || "Not provided"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Registration Document</p>
                          {selectedUserApplication.vehicle_registration_url && (
                            <a
                              href={selectedUserApplication.vehicle_registration_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              View Registration Document →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insurance Information */}
                  {selectedUser.role === "transporter" && selectedUserApplication && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Insurance Information</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground">Insurance Company</label>
                          <p className="font-medium">{selectedUserApplication.insurance_company || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Policy Number</label>
                          <p className="font-medium">{selectedUserApplication.insurance_policy_number || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Expiry Date</label>
                          <p className="font-medium">
                            {selectedUserApplication.insurance_expiry
                              ? new Date(selectedUserApplication.insurance_expiry).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Validation Status</label>
                          <div>
                            <Badge variant={selectedUserApplication.insurance_validated ? "default" : "destructive"}>
                              {selectedUserApplication.insurance_validated ? "✓ Validated" : "✗ Not Validated"}
                            </Badge>
                          </div>
                        </div>
                        {selectedUserApplication.insurance_url && (
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground">Insurance Certificate</label>
                            <a
                              href={selectedUserApplication.insurance_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              View Insurance Certificate →
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Compliance & Verification */}
                  {selectedUser.role === "transporter" && selectedUserApplication && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Compliance & Verification</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-muted-foreground">Application Status</label>
                          <div>
                            <Badge
                              variant={
                                selectedUserApplication.status === "approved"
                                  ? "default"
                                  : selectedUserApplication.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {selectedUserApplication.status}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Compliance Status</label>
                          <div>
                            <Badge
                              variant={
                                selectedUserApplication.compliance_status === "compliant"
                                  ? "default"
                                  : selectedUserApplication.compliance_status === "non-compliant"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {selectedUserApplication.compliance_status || "pending"}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Background Check Status</label>
                          <p className="font-medium">{selectedUserApplication.background_check_status || "N/A"}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Background Check Date</label>
                          <p className="font-medium">
                            {selectedUserApplication.background_check_date
                              ? new Date(selectedUserApplication.background_check_date).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Documents Verified Date</label>
                          <p className="font-medium">
                            {selectedUserApplication.documents_verified_date
                              ? new Date(selectedUserApplication.documents_verified_date).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Bank Account (IBAN)</label>
                          <p className="font-medium">{selectedUserApplication.bank_account_iban || "N/A"}</p>
                        </div>
                        {selectedUserApplication.admin_notes && (
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground">Admin Notes</label>
                            <p className="font-medium text-sm bg-muted p-3 rounded">
                              {selectedUserApplication.admin_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Statistics */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Statistics</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground">Total Bookings</label>
                        <p className="text-2xl font-bold">{selectedUser.total_bookings || 0}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Total Earnings</label>
                        <p className="text-2xl font-bold text-green-600">
                          €{(selectedUser.total_earnings || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>⚠️ Delete Completed Job?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this completed job?
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Job ID:</span>
                  <code className="bg-muted px-2 py-1 rounded text-sm">
                    {deleteJobId?.slice(0, 8)}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone and will permanently remove the job from the database.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteJob}
                >
                  Delete Job
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Transporter Jobs Dialog */}
          <Dialog open={transporterJobsOpen} onOpenChange={setTransporterJobsOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Completed Jobs</DialogTitle>
                <DialogDescription>
                  Detailed list of all completed deliveries
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {transporterJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No completed jobs found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transporterJobs.map((job) => (
                      <Card key={job.id}>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-500">Job ID</label>
                              <p className="font-mono text-sm">{job.id.slice(0, 8)}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Date</label>
                              <p className="text-sm">{new Date(job.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Status</label>
                              <div className="text-sm mt-1">
                                <Badge variant={getStatusBadgeVariant(job.status)}>
                                  {job.status}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Consumer</label>
                              <p className="text-sm">{job.consumer?.full_name || "N/A"}</p>
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                Pickup Location
                              </label>
                              <p className="text-sm">{job.pickup_address || "N/A"}</p>
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                Dropoff Location
                              </label>
                              <p className="text-sm">{job.dropoff_address || "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Item Type</label>
                              <p className="text-sm capitalize">{job.item_type ? job.item_type.replace(/_/g, " ") : "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Item Size</label>
                              <p className="text-sm capitalize">{job.item_size || "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Total Price</label>
                              <p className="text-lg font-bold text-green-600">€{Number(job.total_price).toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {/* Save and Delete Buttons */}
                          <div className="border-t pt-4 mt-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => saveJobToFile(job)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Save Job
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteJob(job.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Consumer Bookings Dialog */}
          <Dialog open={consumerBookingsOpen} onOpenChange={setConsumerBookingsOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Consumer Bookings</DialogTitle>
                <DialogDescription>
                  Detailed list of all bookings for this consumer
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {consumerBookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No bookings found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {consumerBookings.map((job) => (
                      <Card key={job.id}>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-500">Job ID</label>
                              <p className="font-mono text-sm">{job.id.slice(0, 8)}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Date</label>
                              <p className="text-sm">{new Date(job.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Status</label>
                              <div className="text-sm mt-1">
                                <Badge variant={getStatusBadgeVariant(job.status)}>
                                  {job.status}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Transporter</label>
                              <p className="text-sm">{job.transporter?.full_name || "Unassigned"}</p>
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                Pickup Location
                              </label>
                              <p className="text-sm">{job.pickup_address || "N/A"}</p>
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                Dropoff Location
                              </label>
                              <p className="text-sm">{job.dropoff_address || "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Item Type</label>
                              <p className="text-sm capitalize">{job.item_type ? job.item_type.replace(/_/g, " ") : "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Item Size</label>
                              <p className="text-sm capitalize">{job.item_size || "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500">Total Price</label>
                              <p className="text-lg font-bold text-green-600">€{Number(job.total_price).toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {/* Save and Delete Buttons */}
                          <div className="border-t pt-4 mt-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => saveJobToFile(job)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Save Job
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteJob(job.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </ProtectedRoute>
  );
}