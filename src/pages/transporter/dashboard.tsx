import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LocationTracker } from "@/components/LocationTracker";
import { authService } from "@/services/authService";
import { profileService, type Profile } from "@/services/profileService";
import { bookingService, type Booking } from "@/services/bookingService";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Calendar,
  Ruler,
  Image as ImageIcon,
  AlertCircle,
  User,
  Settings,
  LogOut,
  ChevronDown,
  TrendingUp,
  Award,
  DollarSign,
  Phone,
  Navigation,
  Star,
  MessageSquare,
  Camera,
  Loader2,
  XCircle,
  Truck,
  Euro,
  X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ChatDialog } from "@/components/ChatDialog";

type TabType = "available" | "active" | "completed";
type BookingStatus = "pending" | "accepted" | "en_route_pickup" | "picked_up" | "en_route_dropoff" | "delivered" | "cancelled";

export default function TransporterDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>("available");
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("");
  const [availableJobs, setAvailableJobs] = useState<Booking[]>([]);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const stats = {
    available: availableJobs.length,
    active: activeJobs.length,
    completed: completedJobs.length,
    totalEarnings
  };
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const session = await authService.getSession();
        if (!session) {
          router.push("/auth/login");
          return;
        }

        const userProfile = await profileService.getProfile(session.user.id);
        
        if (!userProfile) {
          return (
            <ProtectedRoute allowedRoles={["transporter"]}>
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              </div>
            </ProtectedRoute>
          );
        }

        if (userProfile.role !== "transporter") {
          router.push("/unauthorized");
          return;
        }

        setUserId(session.user.id);
        setUserName(userProfile.full_name || "Driver");
        setUserEmail(session.user.email || "");
        setUserAvatar(userProfile.avatar_url || "");

        await fetchJobs(session.user.id);
        await fetchStats(session.user.id);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    // Close menu on outside click
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    // Close menu on Escape key
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [userMenuOpen]);

  const checkAuth = async () => {
    const session = await authService.getCurrentSession();
    
    if (!session) {
      router.push("/auth/login");
      return;
    }

    const profile = await profileService.getProfile(session.user.id);
    
    if (!profile) {
      return (
        <ProtectedRoute allowedRoles={["transporter"]}>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        </ProtectedRoute>
      );
    }

    if (profile.role !== "transporter") {
      router.push("/unauthorized");
      return;
    }

    setUserId(session.user.id);
    setUserName(profile.full_name || "Driver");
    setUserEmail(session.user.email || "");
    setUserAvatar(profile.avatar_url || "");

    await fetchJobs(session.user.id);
    await fetchStats(session.user.id);
  };

  const fetchJobs = async (transporterId?: string) => {
    const id = transporterId || userId;
    if (!id) return;

    setLoading(true);

    const [available, active, completed] = await Promise.all([
      bookingService.getAvailableBookings(),
      bookingService.getTransporterBookings(id, ["accepted", "en_route_pickup", "picked_up", "en_route_dropoff"]),
      bookingService.getTransporterBookings(id, ["delivered"])
    ]);

    setAvailableJobs(available);
    setActiveJobs(active);
    setCompletedJobs(completed.slice(0, 20)); // Show last 20 completed
    setLoading(false);
  };

  const fetchStats = async (transporterId: string) => {
    const allCompleted = await bookingService.getTransporterBookings(transporterId, ["delivered"]);
    
    const earnings = allCompleted.reduce((sum, job) => {
      return sum + (job.transporter_earnings || 0);
    }, 0);

    setTotalEarnings(earnings);
    setCompletedCount(allCompleted.length);
  };

  const handleAcceptJob = async (bookingId: string) => {
    const success = await bookingService.acceptBooking(bookingId, userId);
    
    if (success) {
      toast({
        title: "✅ Job Accepted!",
        description: "Start your trip when ready",
      });
      
      await fetchJobs();
      setActiveTab("active");
    }
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    const success = await bookingService.updateBookingStatus(bookingId, newStatus);
    
    if (success) {
      if (newStatus === "delivered") {
        toast({
          title: "🎉 Delivery Complete!",
          description: "Location tracking has been stopped automatically. Great job!",
        });
        await fetchJobs();
        await fetchStats(userId);
        setActiveTab("completed");
      } else {
        await fetchJobs();
      }
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    toast({
      title: "👋 Logged Out",
      description: "See you next time!",
    });
    router.push("/auth/login");
  };

  const handleOpenChat = (booking: Booking) => {
    setSelectedBooking(booking);
    setChatOpen(true);
  };

  const handleCloseChat = () => {
    setChatOpen(false);
    setSelectedBooking(null);
  };

  // Check if profile is loaded
  if (!userId || !userName) {
    return (
      <ProtectedRoute allowedRoles={["transporter"]}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900 mx-auto"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const getNextAction = (booking: Booking) => {
    switch (booking.status) {
      case "accepted":
        return { label: "Start Trip to Pickup", status: "en_route_pickup" as BookingStatus };
      case "en_route_pickup":
        return { label: "Confirm Pickup", status: "picked_up" as BookingStatus };
      case "picked_up":
        return { label: "Start Route to Dropoff", status: "en_route_dropoff" as BookingStatus };
      case "en_route_dropoff":
        return { label: "Confirm Delivery", status: "delivered" as BookingStatus };
      default:
        return null;
    }
  };

  const getSizeBadge = (size: string) => {
    const badges = {
      small: "bg-navy-900/10 text-navy-900",
      medium: "bg-gold-500/10 text-gold-600",
      large: "bg-copper-500/10 text-copper-600",
    };
    return badges[size as keyof typeof badges] || badges.small;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { label: "Available", color: "bg-gold-500/10 text-gold-700" },
      accepted: { label: "Accepted", color: "bg-navy-900/10 text-navy-900" },
      pickup_en_route: {
        label: "En Route",
        color: "bg-navy-900/10 text-navy-900",
      },
    };
    
    const statusInfo = badges[status as keyof typeof badges] || { label: status, color: "bg-gray-100 text-gray-700" };
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isActiveJob = (status: string) => {
    return ["en_route_pickup", "en_route_dropoff"].includes(status);
  };

  const renderJobCard = (booking: Booking, showActions = false) => (
    <Card key={booking.id} className="hover:shadow-lg transition-all duration-200 border-slate-200">
      <CardContent className="p-6">
        {/* Header: Item Type + Earnings */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-navy" />
            </div>
            <div>
              <h3 className="font-semibold capitalize text-lg text-slate-900">
                {(booking.item_type || "item").replace("_", " ")}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getSizeBadge(booking.item_size || "small")}>
                  [{(booking.item_size || "small")[0].toUpperCase()}] {booking.item_size || "small"}
                </Badge>
                {booking.item_photos && Array.isArray(booking.item_photos) && booking.item_photos.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <ImageIcon className="w-4 h-4" />
                    {booking.item_photos.length}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gold">
              €{(booking.transporter_earnings || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 text-sm">Special Instructions:</p>
                <p className="text-amber-800 text-sm mt-1">{booking.special_instructions}</p>
              </div>
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Addresses */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Pickup</p>
              <p className="text-sm font-medium text-slate-900">
                {booking.pickup_address?.replace(/, Finland$/, "") || "Address not provided"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gold-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Dropoff</p>
              <p className="text-sm font-medium text-slate-900">
                {booking.dropoff_address?.replace(/, Finland$/, "") || "Address not provided"}
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Date, Time, Distance */}
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString("en-FI", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            }) : "Not scheduled"}
          </div>
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            {booking.distance_km ? booking.distance_km.toFixed(1) : "0.0"} km
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            booking.status === "pending" || booking.status === "accepted"
              ? "bg-accent/10 text-accent border border-accent/20" 
              : ["picked_up", "en_route_pickup", "en_route_dropoff"].includes(booking.status)
              ? "bg-primary/20 text-primary border border-primary/30"
              : booking.status === "delivered"
              ? "bg-secondary/10 text-secondary border border-secondary/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}>
            {(booking.status === "pending" || booking.status === "accepted") && <Clock className="h-3 w-3 mr-1" />}
            {["picked_up", "en_route_pickup", "en_route_dropoff"].includes(booking.status) && <Truck className="h-3 w-3 mr-1" />}
            {booking.status === "delivered" && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {booking.status === "cancelled" && <X className="h-3 w-3 mr-1" />}
            {booking.status.replace("_", " ").toUpperCase()}
          </span>
        </div>

        {/* Location Tracker (for active jobs only) */}
        {showActions && isActiveJob(booking.status || "") && (
          <>
            <Separator className="my-4" />
            <LocationTracker
              bookingId={booking.id}
              transporterId={userId}
              isActive={isActiveJob(booking.status || "")}
            />
          </>
        )}

        {/* Actions */}
        {showActions && (() => {
          const nextAction = getNextAction(booking);
          
          if (booking.status === "pending") {
            return (
              <div className="mt-4">
                <Button 
                  onClick={() => handleAcceptJob(booking.id)}
                  className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-premium hover:shadow-elevated transition-all"
                  size="lg"
                >
                  Accept Job - €{(booking.transporter_earnings || 0).toFixed(2)}
                </Button>
              </div>
            );
          }

          if (nextAction) {
            return (
              <div className="mt-4">
                <Button 
                  onClick={() => handleUpdateStatus(booking.id, nextAction.status)}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-premium hover:shadow-elevated transition-all"
                  size="lg"
                >
                  {nextAction.label}
                </Button>
              </div>
            );
          }

          return null;
        })()}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["transporter"]}>
      <SEO 
        title="Transporter Dashboard - VANGO"
        description="Find and manage moving jobs"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Transporter Dashboard</h1>
                <p className="text-muted-foreground">Welcome back, {userName}</p>
              </div>

              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="font-medium text-foreground">{userName}</p>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-card rounded-lg shadow-elevated border border-border py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={userAvatar} alt={userName} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {getInitials(userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{userName}</p>
                          <p className="text-sm text-muted-foreground">{userEmail}</p>
                          <Badge className="mt-1 bg-primary/10 text-primary">Transporter</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="px-4 py-3 border-b border-border">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gold/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-gold" />
                            <p className="text-xs font-medium text-gold">Total Earnings</p>
                          </div>
                          <p className="text-lg font-bold text-gold">€{totalEarnings.toFixed(2)}</p>
                        </div>
                        <div className="bg-navy/10 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="w-4 h-4 text-navy" />
                            <p className="text-xs font-medium text-navy">Completed</p>
                          </div>
                          <p className="text-lg font-bold text-navy">{completedCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          router.push("/transporter/profile");
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          toast({
                            title: "Coming Soon",
                            description: "Settings page is under development",
                          });
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>

                      <Separator className="my-1" />

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Interactive Stats Cards (Tab Navigation) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Available Jobs Card */}
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                activeTab === "available" 
                  ? "ring-2 ring-primary shadow-lg" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => setActiveTab("available")}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Available</p>
                    <p className="text-3xl font-bold text-foreground">{stats.available}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Jobs Card */}
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                activeTab === "active" 
                  ? "ring-2 ring-accent shadow-lg" 
                  : "hover:border-accent/50"
              }`}
              onClick={() => setActiveTab("active")}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Active</p>
                    <p className="text-3xl font-bold text-foreground">{stats.active}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-accent" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completed Jobs Card */}
            <Card 
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                activeTab === "completed" 
                  ? "ring-2 ring-secondary shadow-lg" 
                  : "hover:border-secondary/50"
              }`}
              onClick={() => setActiveTab("completed")}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Completed</p>
                    <p className="text-3xl font-bold text-foreground">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Earnings Card */}
            <Card className="cursor-default">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Earnings</p>
                    <p className="text-3xl font-bold text-foreground">€{stats.totalEarnings.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Euro className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Available Jobs */}
            {activeTab === "available" && (
              <>
                {availableJobs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-medium">No available jobs</p>
                      <p className="text-gray-500 text-sm mt-2">New jobs will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {availableJobs.map(job => renderJobCard(job, true))}
                  </div>
                )}
              </>
            )}

            {/* Active Jobs */}
            {activeTab === "active" && (
              <>
                {activeJobs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-medium">No active jobs</p>
                      <p className="text-gray-500 text-sm mt-2">Accept a job to get started</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeJobs.map(job => renderJobCard(job, true))}
                  </div>
                )}
              </>
            )}

            {/* Completed Jobs */}
            {activeTab === "completed" && (
              <>
                {completedJobs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg font-medium">No completed jobs yet</p>
                      <p className="text-gray-500 text-sm mt-2">Your delivery history will appear here</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {completedJobs.map(job => renderJobCard(job, false))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chat Dialog */}
      {selectedBooking && (
        <ChatDialog
          isOpen={chatOpen}
          onClose={handleCloseChat}
          bookingId={selectedBooking.id}
          otherUserId={selectedBooking.consumer_id!}
          otherUserName={selectedBooking.consumer_name || "Consumer"}
          otherUserRole="consumer"
          otherUserAvatar={undefined}
        />
      )}
    </ProtectedRoute>
  );
}