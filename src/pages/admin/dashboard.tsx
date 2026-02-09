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
import { Users, Truck, Package, DollarSign, AlertCircle, Search, Filter } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type TransporterApplication = Database["public"]["Tables"]["transporter_applications"]["Row"];
type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  consumer?: Profile;
  transporter?: Profile;
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
  const [consumers, setConsumers] = useState<Profile[]>([]);
  const [transporters, setTransporters] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

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
    const { data: consumerData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "consumer")
      .order("created_at", { ascending: false });

    const { data: transporterData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "transporter")
      .order("created_at", { ascending: false });

    setConsumers(consumerData || []);
    setTransporters(transporterData || []);
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

  const filteredBookings = allBookings.filter(booking => {
    const matchesStatus = bookingFilter === "all" || booking.status === bookingFilter;
    const matchesSearch = searchTerm === "" || 
      booking.pickup_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.dropoff_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.consumer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.transporter?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
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
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">MoveHelsinki Admin</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{profile?.full_name}</span>
              <Button variant="outline" onClick={handleLogout}>Log Out</Button>
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
              <TabsTrigger value="consumers">Consumers</TabsTrigger>
              <TabsTrigger value="transporters">Transporters</TabsTrigger>
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
                          <SelectItem value="completed">Completed</SelectItem>
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
                <CardHeader>
                  <CardTitle>Consumer Accounts</CardTitle>
                  <CardDescription>Manage consumer users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consumers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              No consumers yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          consumers.map((consumer) => (
                            <TableRow key={consumer.id}>
                              <TableCell className="font-medium">{consumer.full_name || "N/A"}</TableCell>
                              <TableCell>{consumer.email}</TableCell>
                              <TableCell>{consumer.phone || "N/A"}</TableCell>
                              <TableCell>{new Date(consumer.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transporters Tab */}
            <TabsContent value="transporters">
              <Card>
                <CardHeader>
                  <CardTitle>Transporter Accounts</CardTitle>
                  <CardDescription>Manage transporter users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transporters.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              No transporters yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          transporters.map((transporter) => (
                            <TableRow key={transporter.id}>
                              <TableCell className="font-medium">{transporter.full_name || "N/A"}</TableCell>
                              <TableCell>{transporter.email}</TableCell>
                              <TableCell>{transporter.phone || "N/A"}</TableCell>
                              <TableCell>{new Date(transporter.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
}