import { supabase } from "@/integrations/supabase/client";

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
  requireInteraction?: boolean;
}

class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<boolean> {
    // Check if service workers and notifications are supported
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications not supported");
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered");

      // Check current permission
      const permission = await this.requestPermission();
      if (permission !== "granted") {
        return false;
      }

      // Subscribe to push notifications
      await this.subscribeToPush();
      return true;
    } catch (error) {
      console.error("Error initializing notifications:", error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      console.warn("Notifications not supported");
      return "denied";
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.error("Service worker not registered");
      return null;
    }

    try {
      // Get or create subscription
      let subscription = await this.registration.pushManager.getSubscription();

      if (!subscription) {
        // VAPID public key (you'll need to generate this)
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
        
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
        });
      }

      // Store subscription in database
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await this.saveSubscription(session.user.id, subscription);
      }

      this.subscription = subscription as unknown as PushSubscription;
      return this.subscription;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      return null;
    }
  }

  /**
   * Send push notification to a specific user via API
   */
  async sendPushNotification(userId: string, payload: NotificationPayload) {
    try {
      await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, payload }),
      });
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  /**
   * Save push subscription to database
   */
  private async saveSubscription(userId: string, subscription: PushSubscriptionJSON) {
    try {
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert({
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      console.log("Push subscription saved");
    } catch (error) {
      console.error("Error saving subscription:", error);
    }
  }

  /**
   * Send local notification (fallback for browsers)
   */
  async sendLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!("Notification" in window)) {
      console.warn("Notifications not supported");
      return;
    }

    if (Notification.permission !== "granted") {
      await this.requestPermission();
    }

    if (Notification.permission === "granted") {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || "/favicon.ico",
        badge: payload.badge || "/favicon.ico",
        tag: payload.tag,
        requireInteraction: payload.requireInteraction,
        data: payload.data,
      });
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", session.user.id);
        }
      }
      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      return false;
    }
  }

  /**
   * Helper to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Notification event handlers for different scenarios
export const notificationHandlers = {
  /**
   * New booking request (for transporter)
   */
  newBookingRequest: (bookingId: string, pickup: string, dropoff: string) => ({
    title: "🚚 New Booking Request!",
    body: `From ${pickup} to ${dropoff}`,
    icon: "/favicon.ico",
    tag: `booking-${bookingId}`,
    requireInteraction: true,
    data: {
      type: "new_booking",
      bookingId,
      url: "/transporter/dashboard",
    },
  }),

  /**
   * Booking accepted (for consumer)
   */
  bookingAccepted: (transporterName: string) => ({
    title: "✅ Booking Accepted!",
    body: `${transporterName} has accepted your booking request`,
    icon: "/favicon.ico",
    tag: "booking-accepted",
    data: {
      type: "booking_accepted",
      url: "/consumer/dashboard",
    },
  }),

  /**
   * Transporter en route to pickup (for consumer)
   */
  enRouteToPickup: (transporterName: string, eta: string) => ({
    title: "🚗 Transporter En Route!",
    body: `${transporterName} is on the way to pick up. ETA: ${eta}`,
    icon: "/favicon.ico",
    tag: "en-route-pickup",
    requireInteraction: true,
    data: {
      type: "en_route_pickup",
      url: "/consumer/dashboard",
    },
  }),

  /**
   * Item picked up (for consumer)
   */
  itemPickedUp: (transporterName: string) => ({
    title: "📦 Item Picked Up!",
    body: `${transporterName} has picked up your item and is heading to the destination`,
    icon: "/favicon.ico",
    tag: "picked-up",
    data: {
      type: "picked_up",
      url: "/consumer/dashboard",
    },
  }),

  /**
   * Transporter en route to dropoff (for consumer)
   */
  enRouteToDropoff: (transporterName: string, eta: string) => ({
    title: "🚚 On the Way to Destination!",
    body: `${transporterName} is delivering your item. ETA: ${eta}`,
    icon: "/favicon.ico",
    tag: "en-route-dropoff",
    data: {
      type: "en_route_dropoff",
      url: "/consumer/dashboard",
    },
  }),

  /**
   * Item delivered (for consumer)
   */
  itemDelivered: () => ({
    title: "🎉 Item Delivered!",
    body: "Your item has been successfully delivered. Please rate your experience!",
    icon: "/favicon.ico",
    tag: "delivered",
    requireInteraction: true,
    data: {
      type: "delivered",
      url: "/consumer/dashboard",
    },
  }),

  /**
   * New chat message (for both)
   */
  newChatMessage: (senderName: string, message: string) => ({
    title: `💬 ${senderName}`,
    body: message.length > 50 ? message.substring(0, 50) + "..." : message,
    icon: "/favicon.ico",
    tag: "chat-message",
    data: {
      type: "chat_message",
      url: "/consumer/dashboard",
    },
  }),

  /**
   * Payment successful (for consumer)
   */
  paymentSuccessful: (amount: number) => ({
    title: "💳 Payment Successful",
    body: `Your payment of €${amount.toFixed(2)} has been processed`,
    icon: "/favicon.ico",
    tag: "payment-success",
    data: {
      type: "payment_success",
      url: "/consumer/dashboard",
    },
  }),

  /**
   * Earning received (for transporter)
   */
  earningReceived: (amount: number) => ({
    title: "💰 Earning Received!",
    body: `You've earned €${amount.toFixed(2)} from a completed delivery`,
    icon: "/favicon.ico",
    tag: "earning-received",
    data: {
      type: "earning_received",
      url: "/transporter/dashboard",
    },
  }),

  /**
   * Booking cancelled (for both)
   */
  bookingCancelled: (reason: string) => ({
    title: "❌ Booking Cancelled",
    body: reason || "The booking has been cancelled",
    icon: "/favicon.ico",
    tag: "booking-cancelled",
    data: {
      type: "booking_cancelled",
      url: "/consumer/dashboard",
    },
  }),
};

export const notificationService = new NotificationService();