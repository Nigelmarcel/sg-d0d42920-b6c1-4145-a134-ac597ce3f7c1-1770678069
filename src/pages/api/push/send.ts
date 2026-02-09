import type { NextApiRequest, NextApiResponse } from "next";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin Client (for fetching subscriptions)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure Web Push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@vango.app",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, payload } = req.body;

  if (!userId || !payload) {
    return res.status(400).json({ error: "Missing userId or payload" });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys not configured. Skipping push notification.");
    return res.status(200).json({ warning: "VAPID keys not configured" });
  }

  try {
    // 1. Fetch user's push subscription from DB
    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: "No subscription found for user" });
    }

    // 2. Send notification to all user's devices
    const notifications = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );
        return { success: true };
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired/invalid - remove from DB
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
        return { success: false, error: err };
      }
    });

    await Promise.all(notifications);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return res.status(500).json({ error: error.message });
  }
}