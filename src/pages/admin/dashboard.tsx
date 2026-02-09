import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Truck, Package, DollarSign, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    totalConsumers: 0,
    totalTransporters: 0,
    pendingApplications: 0,
    activeBookings: 0,
    totalRevenue: 0,
    todayBookings: 0
  });
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
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
        .select("*")
        .eq("status", "pending")
        .order("submitted_at", { ascending: false });

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

      setPendingApplications(applications || []);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
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
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">MoveHelsinki Admin</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{profile?.full_name}</span>
              <Button variant="outline" onClick={handleLogout}>Log Out</Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          <Tabs defaultValue="applications" className="space-y-4">
            <TabsList>
              <TabsTrigger value="applications">
                Pending Applications
                {stats.pendingApplications > 0 && (
                  <Badge variant="destructive" className="ml-2">{stats.pendingApplications}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

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
                            <Button variant="ghost" size="sm">View Documents</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookings">
              <Card>
                <CardHeader>
                  <CardTitle>All Bookings</CardTitle>
                  <CardDescription>View and manage all bookings in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Booking management coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage consumers and transporters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>User management coming soon</p>
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