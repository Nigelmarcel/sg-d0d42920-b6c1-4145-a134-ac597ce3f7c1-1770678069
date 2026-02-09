import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Package, TrendingUp, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type TransporterAvailability = Database["public"]["Tables"]["transporter_availability"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];

export default function TransporterDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase.
        from("profiles").
        select("*").
        eq("id", session.user.id).
        maybeSingle();

        if (profile) {
          setProfile(profile);
        }

        const { data: availability } = await supabase.
        from("transporter_availability").
        select("is_online").
        eq("transporter_id", session.user.id).
        maybeSingle();

        if (availability) {
          setIsOnline(availability.is_online);
        }

        const { data: jobs } = await supabase.
        from("bookings").
        select("*").
        eq("status", "pending").
        order("created_at", { ascending: false });

        if (jobs) setAvailableJobs(jobs);

        const { data: active } = await supabase.
        from("bookings").
        select("*").
        eq("transporter_id", session.user.id).
        in("status", ["accepted", "en_route_pickup", "picked_up", "en_route_dropoff"]).
        order("created_at", { ascending: false });

        if (active) setActiveJobs(active);

        // Calculate today's earnings
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: completedJobs } = await supabase.
        from("bookings").
        select("total_price").
        eq("transporter_id", session.user.id).
        eq("status", "delivered").
        gte("created_at", today.toISOString());

        if (completedJobs) {
          // Assuming transporter gets 80% of total price for MVP logic
          const earnings = completedJobs.reduce((sum, job) => sum + Number(job.total_price) * 0.8, 0);
          setTodayEarnings(earnings);
        }
      }
    };
    loadData();
  }, []);

  const toggleOnlineStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const newStatus = !isOnline;

    const { data: existing } = await supabase.
    from("transporter_availability").
    select("id").
    eq("transporter_id", session.user.id).
    maybeSingle();

    if (existing) {
      await supabase.
      from("transporter_availability").
      update({ is_online: newStatus, updated_at: new Date().toISOString() }).
      eq("transporter_id", session.user.id);
    } else {
      await supabase.
      from("transporter_availability").
      insert({
        transporter_id: session.user.id,
        is_online: newStatus
      });
    }

    setIsOnline(newStatus);
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <ProtectedRoute allowedRoles={["transporter"]}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900" style={{ color: "#525252" }}>VANGO Driver</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {isOnline ? "Online" : "Offline"}
                </span>
                <Switch checked={isOnline} onCheckedChange={toggleOnlineStatus} />
              </div>
              <span className="text-gray-600">{profile?.full_name}</span>
              <Button variant="outline" onClick={handleLogout}>Log Out</Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{todayEarnings.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeJobs.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Jobs</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{availableJobs.length}</div>
              </CardContent>
            </Card>
          </div>

          {activeJobs.length > 0 &&
          <Card className="mb-6">
              <CardHeader>
                <CardTitle>Active Deliveries</CardTitle>
                <CardDescription>Jobs currently in progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeJobs.map((job) =>
                <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/transporter/job/${job.id}`)}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold capitalize">{job.item_type.replace("_", " ")}</div>
                          <div className="text-sm text-gray-600">Size: {job.item_size}</div>
                        </div>
                        <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 capitalize">
                          {job.status.replace("_", " ")}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <div>From: {job.pickup_address}</div>
                            <div>To: {job.dropoff_address}</div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-sm text-gray-500">{job.distance_km} km</span>
                        <span className="font-bold text-lg text-green-600">€{Number(job.transporter_earnings).toFixed(2)}</span>
                      </div>
                    </div>
                )}
                </div>
              </CardContent>
            </Card>
          }

          <Card>
            <CardHeader>
              <CardTitle>Available Jobs</CardTitle>
              <CardDescription>Accept jobs to start earning</CardDescription>
            </CardHeader>
            <CardContent>
              {!isOnline ?
              <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>You are currently offline</p>
                  <p className="text-sm mt-2">Go online to see available jobs</p>
                </div> :
              availableJobs.length === 0 ?
              <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No jobs available right now</p>
                  <p className="text-sm mt-2">Check back soon!</p>
                </div> :

              <div className="space-y-4">
                  {availableJobs.map((job) =>
                <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/transporter/job/${job.id}`)}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold capitalize">{job.item_type.replace("_", " ")}</div>
                          <div className="text-sm text-gray-600">Size: {job.item_size}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-green-600">€{Number(job.transporter_earnings).toFixed(2)}</div>
                          <div className="text-sm text-gray-500">{job.distance_km} km</div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <div>From: {job.pickup_address}</div>
                            <div>To: {job.dropoff_address}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                )}
                </div>
              }
            </CardContent>
          </Card>

          <div className="mt-6">
            <Button variant="outline" onClick={() => router.push("/transporter/earnings")}>
              View Earnings History
            </Button>
          </div>
        </main>
      </div>
    </ProtectedRoute>);

}