import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = "/auth/login" 
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          router.push(redirectTo);
          return;
        }

        if (!session) {
          console.log("No session found, redirecting to login");
          router.push(redirectTo);
          return;
        }

        console.log("Session found for user:", session.user.email);

        // Try multiple times to get the profile (with increasing delays)
        let profile = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!profile && attempts < maxAttempts) {
          attempts++;
          const delay = attempts * 200; // 200ms, 400ms, 600ms, 800ms, 1000ms
          
          if (attempts > 1) {
            console.log(`Attempt ${attempts}: Waiting ${delay}ms before fetching profile...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const { data, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .maybeSingle();

          if (error) {
            console.error(`Attempt ${attempts}: Error fetching profile:`, error);
            continue;
          }

          if (data) {
            profile = data;
            console.log(`Attempt ${attempts}: Profile found with role:`, data.role);
            break;
          }

          console.log(`Attempt ${attempts}: No profile found yet`);
        }

        if (!profile) {
          console.error("Profile not found after", maxAttempts, "attempts");
          alert("Profile not found. Please contact support.");
          await supabase.auth.signOut();
          router.push(redirectTo);
          return;
        }

        console.log("User role:", profile.role);
        console.log("Allowed roles:", allowedRoles);

        // If no role restriction, allow access
        if (!allowedRoles || allowedRoles.length === 0) {
          console.log("No role restrictions, allowing access");
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // Check if user's role is in allowed roles
        if (!allowedRoles.includes(profile.role)) {
          console.log("User not authorized for this page. User role:", profile.role, "Allowed:", allowedRoles);
          router.push("/unauthorized");
          return;
        }

        console.log("User authorized!");
        setIsAuthorized(true);
        setIsLoading(false);
      } catch (err) {
        console.error("Auth check error:", err);
        router.push(redirectTo);
      }
    };

    checkAuth();
  }, [router, allowedRoles, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}