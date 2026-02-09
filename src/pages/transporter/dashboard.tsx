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
  XCircle
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
  const [isOnline, setIsOnline] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<Booking[]>([]);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
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
        setIsOnline(userProfile.is_online || false);

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
    setIsOnline(profile.is_online || false);

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

  const toggleOnlineStatus = async () => {
    const newStatus = !isOnline;
    const success = await profileService.updateOnlineStatus(userId, newStatus);
    
    if (success) {
      setIsOnline(newStatus);
      toast({
        title: newStatus ? "✅ You're Online" : "⏸️ You're Offline",
        description: newStatus 
          ? "You can now accept new jobs" 
          : "You won't receive new job requests",
      });
    }
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
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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

  const getItemIcon = (itemType: string) => {
    return "🛋️";
  };

  const getSizeBadge = (size: string) => {
    const colors = {
      small: "bg-blue-100 text-blue-700",
      medium: "bg-orange-100 text-orange-700",
      large: "bg-red-100 text-red-700"
    };
    return colors[size as keyof typeof colors] || colors.small;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      accepted: { label: "Accepted", color: "bg-blue-100 text-blue-700" },
      en_route_pickup: { label: "En Route to Pickup", color: "bg-purple-100 text-purple-700" },
      picked_up: { label: "Picked Up", color: "bg-indigo-100 text-indigo-700" },
      en_route_dropoff: { label: "En Route to Dropoff", color: "bg-orange-100 text-orange-700" },
      delivered: { label: "Delivered", color: "bg-green-100 text-green-700" }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, color: "bg-gray-100 text-gray-700" };
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
    <Card key={booking.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* Header: Item Type + Earnings */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getItemIcon(booking.item_type)}</span>
            <div>
              <h3 className="font-semibold capitalize">
                {booking.item_type.replace("_", " ")}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getSizeBadge(booking.item_size)}>
                  [{booking.item_size[0].toUpperCase()}] {booking.item_size}
                </Badge>
                {booking.item_photos && booking.item_photos.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <ImageIcon className="w-4 h-4" />
                    {booking.item_photos.length}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              €{booking.transporter_earnings?.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 text-sm">Special Instructions:</p>
                <p className="text-yellow-800 text-sm mt-1">{booking.special_instructions}</p>
              </div>
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Addresses */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium">Pickup</p>
              <p className="text-sm font-medium text-foreground">
                {booking.pickup_address?.replace(/, Finland$/, "") || "Address not provided"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-gold-600 dark:text-gold-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium">Dropoff</p>
              <p className="text-sm font-medium text-foreground">
                {booking.dropoff_address?.replace(/, Finland$/, "") || "Address not provided"}
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Date, Time, Distance */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date(booking.scheduled_at).toLocaleDateString("en-FI", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </div>
          <div className="flex items-center gap-1">
            <Ruler className="w-4 h-4" />
            {booking.distance_km?.toFixed(1)} km
          </div>
        </div>

        {/* Status Badge (for active/completed jobs) */}
        {booking.status !== "pending" && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div>{getStatusBadge(booking.status)}</div>
            </div>
          </>
        )}

        {/* Location Tracker (for active jobs only) */}
        {showActions && isActiveJob(booking.status) && (
          <>
            <Separator className="my-4" />
            <LocationTracker
              bookingId={booking.id}
              transporterId={userId}
              isActive={isActiveJob(booking.status)}
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
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  Accept Job - €{booking.transporter_earnings?.toFixed(2)}
                </Button>
              </div>
            );
          }

          if (nextAction) {
            return (
              <div className="mt-4">
                <Button 
                  onClick={() => handleUpdateStatus(booking.id, nextAction.status)}
                  className="w-full"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Transporter Dashboard</h1>
                <p className="text-gray-600">Welcome back, {userName}</p>
              </div>

              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="font-medium text-gray-900">{userName}</p>
                    <p className="text-sm text-gray-500">{userEmail}</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={userAvatar} alt={userName} />
                          <AvatarFallback className="bg-blue-600 text-white text-lg">
                            {getInitials(userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{userName}</p>
                          <p className="text-sm text-gray-500">{userEmail}</p>
                          <Badge className="mt-1 bg-blue-100 text-blue-700">Transporter</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <p className="text-xs font-medium text-green-900">Total Earnings</p>
                          </div>
                          <p className="text-lg font-bold text-green-700">€{totalEarnings.toFixed(2)}</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="w-4 h-4 text-blue-600" />
                            <p className="text-xs font-medium text-blue-900">Completed</p>
                          </div>
                          <p className="text-lg font-bold text-blue-700">{completedCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Online/Offline Toggle */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"}`}></div>
                          <span className="text-sm font-medium text-gray-700">
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            toggleOnlineStatus();
                            setUserMenuOpen(false);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isOnline ? "bg-green-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              isOnline ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {isOnline ? "You can accept new jobs" : "You won't receive job requests"}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          router.push("/transporter/profile");
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Available Jobs Tab */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                activeTab === "available" 
                  ? "ring-2 ring-blue-500 shadow-lg" 
                  : "hover:ring-1 hover:ring-gray-300"
              }`}
              onClick={() => setActiveTab("available")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="text-base">Available Jobs</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {availableJobs.length}
                </div>
              </CardContent>
            </Card>

            {/* Active Jobs Tab */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                activeTab === "active" 
                  ? "ring-2 ring-orange-500 shadow-lg" 
                  : "hover:ring-1 hover:ring-gray-300"
              }`}
              onClick={() => setActiveTab("active")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span className="text-base">Active Jobs</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {activeJobs.length}
                </div>
              </CardContent>
            </Card>

            {/* Completed Jobs Tab */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-lg ${
                activeTab === "completed" 
                  ? "ring-2 ring-green-500 shadow-lg" 
                  : "hover:ring-1 hover:ring-gray-300"
              }`}
              onClick={() => setActiveTab("completed")}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-base">Completed Jobs</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {completedCount}
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