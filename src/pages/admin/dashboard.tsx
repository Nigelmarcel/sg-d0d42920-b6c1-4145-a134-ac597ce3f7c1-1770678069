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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Truck, Package, DollarSign, AlertCircle, Search, Filter, Eye, Ban, CheckCircle, Mail, Download, Home } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type TransporterApplication = Database["public"]["Tables"]["transporter_applications"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  consumer?: { id: string; full_name: string | null; email: string | null } | null;
  transporter?: { id: string; full_name: string | null; email: string | null } | null;
};

type UserWithStats = Profile & {
  total_bookings?: number;
  total_earnings?: number;
  average_rating?: number;
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
    todayBookings: 0
  });
  const [pendingApplications, setPendingApplications] = useState<TransporterApplication[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [consumers, setConsumers] = useState<UserWithStats[]>([]);
  const [transporters, setTransporters] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [consumerSearchTerm, setConsumerSearchTerm] = useState("");
  const [transporterSearchTerm, setTransporterSearchTerm] = useState("");

  useEffect(() => {
    loadDashboardData();
    
    // Subscribe to real-time updates
    const bookingsSubscription = supabase
      .channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        loadBookingsData();
      })
      .subscribe();

    const applicationsSubscription = supabase
      .channel("admin-applications")
      .on("postgres_changes", { event: "*", schema: "public", table: "transporter_applications" }, () => {
        loadApplicationsData();
      })
      .subscribe();

    return () => {
      bookingsSubscription.unsubscribe();
      applicationsSubscription.unsubscribe();
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
        loadUsersData()
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

    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "succeeded");

    const totalRevenue = payments?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayBookings } = await supabase
      .from("bookings")
      .select("id", { count: "exact" })
      .gte("created_at", today.toISOString());

    setStats({
      totalConsumers: consumers?.length || 0,
      totalTransporters: transporters?.length || 0,
      pendingApplications: applications?.length || 0,
      activeBookings: activeBookings?.length || 0,
      totalRevenue,
      todayBookings: todayBookings?.length || 0
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
            average_rating: 0
          };
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
      const transportersWithStats = await Promise.all(
        transporterData.map(async (transporter) => {
          const { data: bookings } = await supabase
            .from("bookings")
            .select("id, total_price")
            .eq("transporter_id", transporter.id)
            .eq("status", "delivered");

          const totalEarnings = bookings?.reduce((sum, b) => sum + Number(b.total_price) * 0.8, 0) || 0;

          return {
            ...transporter,
            total_bookings: bookings?.length || 0,
            total_earnings: totalEarnings,
            average_rating: 0
          };
        })
      );
      setTransporters(transportersWithStats);
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
      // In a real app, you would call a Supabase Edge Function to suspend the auth user
      // For now, we'll just update the profile metadata
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

  function viewUserDetails(user: UserWithStats) {
    setSelectedUser(user);
    setUserDetailsOpen(true);
  }

  function exportUsers(type: "consumers" | "transporters") {
    const data = type === "consumers" ? consumers : transporters;
    const csv = [
      ["Name", "Email", "Phone", "Joined", "Total Bookings", "Earnings"].join(","),
      ...data.map(u => [
        u.full_name || "",
        u.email || "",
        u.phone || "",
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
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => router.push("/")}>
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                <Button variant="outline" onClick={handleLogout}>Log Out</Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Consumers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalConsumers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transporters</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransporters}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendingApplications}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeBookings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayBookings}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="applications" className="space-y-4">
            <TabsList>
              <TabsTrigger value="applications">
                Applications
                {stats.pendingApplications > 0 && (
                  <Badge variant="destructive" className="ml-2">{stats.pendingApplications}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="consumers">Consumers ({stats.totalConsumers})</TabsTrigger>
              <TabsTrigger value="transporters">Transporters ({stats.totalTransporters})</TabsTrigger>
            </TabsList>

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
                                <TableCell>{consumer.phone || "N/A"}</TableCell>
                                <TableCell>{new Date(consumer.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{consumer.total_bookings || 0}</Badge>
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
                                <TableCell>{transporter.phone || "N/A"}</TableCell>
                                <TableCell>{new Date(transporter.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{transporter.total_bookings || 0}</Badge>
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
          </Tabs>

          {/* User Details Modal */}
          <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
                <DialogDescription>
                  Detailed information for {selectedUser?.full_name || "user"}
                </DialogDescription>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="mt-1">{selectedUser.full_name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="mt-1">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="mt-1">{selectedUser.phone || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Role</label>
                      <p className="mt-1">
                        <Badge>{selectedUser.role}</Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Joined</label>
                      <p className="mt-1">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <p className="mt-1">{new Date(selectedUser.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Activity Statistics</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Total Bookings</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{selectedUser.total_bookings || 0}</div>
                        </CardContent>
                      </Card>
                      {selectedUser.role === "transporter" && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Earnings</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">€{(selectedUser.total_earnings || 0).toFixed(2)}</div>
                          </CardContent>
                        </Card>
                      )}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Average Rating</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{selectedUser.average_rating || "N/A"}</div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="border-t pt-4 flex gap-2">
                    <Button variant="outline" onClick={() => activateUser(selectedUser.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate
                    </Button>
                    <Button variant="outline" onClick={() => suspendUser(selectedUser.id)}>
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend
                    </Button>
                    <Button variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  );
}