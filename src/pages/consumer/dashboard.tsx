import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { profileService, type Profile } from "@/services/profileService";
import { bookingService, type Booking } from "@/services/bookingService";
import { 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle,
  MapPin, 
  Calendar,
  Star,
  ChevronDown,
  User,
  Settings,
  LogOut,
  DollarSign,
  TrendingUp,
  Navigation,
  MessageSquare,
  RotateCcw,
  Plus,
  Ruler,
  Phone,
  AlertCircle,
  Loader2,
  Camera
} from "lucide-react";
import { ChatDialog } from "@/components/ChatDialog";

type StatusFilter = "all" | "pending" | "accepted" | "in_transit" | "delivered" | "cancelled";

export default function ConsumerDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // User state
  const [userId, setUserId] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Bookings state
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  // Stats state
  const [totalSpent, setTotalSpent] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Chat dialog state
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Fetch user profile
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
          router.push("/unauthorized");
          return;
        }

        if (userProfile.role !== "consumer") {
          router.push("/unauthorized");
          return;
        }

        setUserId(session.user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      }
    };

    fetchProfile();
  }, [router, toast]);

  // Fetch bookings and stats
  useEffect(() => {
    if (!profile?.id) return;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        const bookings = await bookingService.getConsumerBookings(profile.id);
        setAllBookings(bookings);
        setFilteredBookings(bookings);

        // Calculate stats
        const completed = bookings.filter(b => b.status === "delivered");
        const active = bookings.filter(b => ["accepted", "in_transit"].includes(b.status));
        const pending = bookings.filter(b => b.status === "pending");

        setCompletedCount(completed.length);
        setActiveCount(active.length);
        setPendingCount(pending.length);

        const spent = completed.reduce((sum, b) => sum + (b.total_price || 0), 0);
        setTotalSpent(spent);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        toast({
          title: "Error",
          description: "Failed to load bookings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [profile, toast]);

  // Filter bookings by status
  useEffect(() => {
    if (activeFilter === "all") {
      setFilteredBookings(allBookings);
    } else {
      setFilteredBookings(allBookings.filter(b => b.status === activeFilter));
    }
  }, [activeFilter, allBookings]);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

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

  // Helper functions
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSizeBadge = (size: string) => {
    const badges = {
      small: "bg-blue-100 text-blue-700 hover:bg-blue-100",
      medium: "bg-orange-100 text-orange-700 hover:bg-orange-100",
      large: "bg-red-100 text-red-700 hover:bg-red-100",
    };
    return badges[size as keyof typeof badges] || badges.small;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-700",
      accepted: "bg-blue-100 text-blue-700",
      in_transit: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-gray-100 text-gray-700",
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      accepted: <CheckCircle2 className="h-4 w-4" />,
      in_transit: <Navigation className="h-4 w-4" />,
      delivered: <CheckCircle2 className="h-4 w-4" />,
      cancelled: <XCircle className="h-4 w-4" />,
    };
    return icons[status as keyof typeof icons] || icons.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Waiting for Transporter",
      accepted: "Accepted",
      in_transit: "In Transit",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleCancelBooking = async (bookingId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const success = await bookingService.updateBookingStatus(bookingId, "cancelled");
      if (success) {
        toast({
          title: "🚫 Booking Cancelled",
          description: "Your booking has been cancelled",
        });
        // Refresh bookings
        const bookings = await bookingService.getConsumerBookings(userId);
        setAllBookings(bookings);
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;

    try {
      await authService.signOut();
      toast({
        title: "👋 Logged Out",
        description: "See you next time!",
      });
      router.push("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  };

  const handleOpenChat = (booking: Booking) => {
    setSelectedBooking(booking);
    setChatOpen(true);
  };

  const handleCloseChat = () => {
    setChatOpen(false);
    setSelectedBooking(null);
  };

  if (!profile) {
    return (
      <ProtectedRoute allowedRoles={["consumer"]}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["consumer"]}>
      <SEO 
        title="Consumer Dashboard - VANGO"
        description="Manage your moving bookings"
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Logo & Title */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Consumer Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {profile.full_name || "User"}</p>
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {getInitials(profile.full_name || "User")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                    <p className="text-xs text-gray-500">{profile.email}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info Section */}
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                          <AvatarFallback className="bg-blue-600 text-white text-lg">
                            {getInitials(profile.full_name || "User")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{profile.full_name}</p>
                          <p className="text-xs text-gray-500">{profile.email}</p>
                          <Badge className="mt-1 bg-blue-100 text-blue-700 hover:bg-blue-100">
                            Consumer
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-700">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-xs font-medium">Total Spent</span>
                          </div>
                          <p className="text-lg font-bold text-green-700 mt-1">
                            €{totalSpent.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-blue-700">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-xs font-medium">Completed</span>
                          </div>
                          <p className="text-lg font-bold text-blue-700 mt-1">
                            {completedCount}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          router.push("/consumer/profile");
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          toast({
                            title: "Coming Soon",
                            description: "Settings page is under development",
                          });
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                    </div>

                    <Separator />

                    {/* Logout */}
                    <div className="py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
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
          {/* Quick Action Button */}
          <div className="mb-6">
            <Button
              onClick={() => router.push("/consumer/book-move")}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-5 w-5 mr-2" />
              Book New Move
            </Button>
          </div>

          {/* Stats Cards (Interactive Tabs) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* All Bookings */}
            <Card
              onClick={() => setActiveFilter("all")}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                activeFilter === "all"
                  ? "ring-2 ring-blue-500 shadow-lg"
                  : "hover:ring-1 hover:ring-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">All Bookings</p>
                  <p className="text-2xl font-bold text-blue-600">{allBookings.length}</p>
                </div>
              </div>
            </Card>

            {/* Pending */}
            <Card
              onClick={() => setActiveFilter("pending")}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                activeFilter === "pending"
                  ? "ring-2 ring-yellow-500 shadow-lg"
                  : "hover:ring-1 hover:ring-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
              </div>
            </Card>

            {/* Active */}
            <Card
              onClick={() => setActiveFilter("accepted")}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                activeFilter === "accepted"
                  ? "ring-2 ring-purple-500 shadow-lg"
                  : "hover:ring-1 hover:ring-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Navigation className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-purple-600">{activeCount}</p>
                </div>
              </div>
            </Card>

            {/* Completed */}
            <Card
              onClick={() => setActiveFilter("delivered")}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                activeFilter === "delivered"
                  ? "ring-2 ring-green-500 shadow-lg"
                  : "hover:ring-1 hover:ring-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Current Filter Indicator */}
          {activeFilter !== "all" && (
            <div className="mb-4 flex items-center justify-between">
              <Badge variant="outline" className="text-sm">
                Showing: {getStatusLabel(activeFilter)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveFilter("all")}
                className="text-xs"
              >
                Clear Filter
              </Button>
            </div>
          )}

          {/* Bookings List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activeFilter === "all" ? "No bookings yet" : `No ${getStatusLabel(activeFilter).toLowerCase()} bookings`}
              </h3>
              <p className="text-gray-600 mb-6">
                {activeFilter === "all" 
                  ? "Book your first move to get started!"
                  : "Try selecting a different filter or booking a new move."}
              </p>
              <Button
                onClick={() => router.push("/consumer/book-move")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Book Your First Move
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left Section: Booking Details */}
                    <div className="flex-1 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Size Badge */}
                          <Badge className={getSizeBadge(booking.item_size)}>
                            [{booking.item_size.charAt(0).toUpperCase()}] {booking.item_size}
                          </Badge>
                          {/* Status Badge */}
                          <Badge className={getStatusBadge(booking.status)}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1">{getStatusLabel(booking.status)}</span>
                          </Badge>
                        </div>
                        {/* Price */}
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            €{booking.total_price?.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Item Description */}
                      {booking.item_description && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Item:</span> {booking.item_description}
                          </p>
                        </div>
                      )}

                      {/* Addresses */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Pickup</p>
                            <p className="text-sm font-medium text-gray-900">{booking.pickup_address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Dropoff</p>
                            <p className="text-sm font-medium text-gray-900">{booking.dropoff_address}</p>
                          </div>
                        </div>
                      </div>

                      {/* Schedule & Distance */}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {booking.scheduled_at 
                              ? new Date(booking.scheduled_at).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : "ASAP"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Navigation className="h-4 w-4" />
                          <span>{booking.distance_km?.toFixed(1)} km</span>
                        </div>
                      </div>

                      {/* Transporter Info (if assigned) */}
                      {booking.transporter_id && (
                        <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-600 text-white">
                              T
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Transporter Assigned</p>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              <span>4.8 rating</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Section: Actions */}
                    <div className="flex flex-col gap-2 lg:min-w-[200px]">
                      {/* Active Booking Actions */}
                      {["accepted", "in_transit"].includes(booking.status) && (
                        <>
                          <Button
                            onClick={() => router.push(`/consumer/dashboard?tracking=${booking.id}`)}
                            className="bg-blue-600 hover:bg-blue-700 w-full"
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Track Live
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setChatOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                          </Button>
                        </>
                      )}

                      {/* Pending Booking Actions */}
                      {booking.status === "pending" && (
                        <Button
                          onClick={() => handleCancelBooking(booking.id)}
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}

                      {/* Completed Booking Actions */}
                      {booking.status === "delivered" && (
                        <>
                          <Button
                            variant="outline"
                            className="w-full"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Leave Review
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push(`/consumer/book-move?rebook=${booking.id}`)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Book Again
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Dialog */}
      {selectedBooking && profile && chatOpen && (
        <ChatDialog
          isOpen={chatOpen}
          onClose={handleCloseChat}
          bookingId={selectedBooking.id}
          otherUserId={selectedBooking.transporter_id!}
          otherUserName={selectedBooking.transporter_name}
          otherUserRole="transporter"
        />
      )}
    </ProtectedRoute>
  );
}