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
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.log("No session found, redirecting to login");
          router.push(redirectTo);
          return;
        }

        // Wait a moment for database operations to complete
        await new Promise(resolve => setTimeout(resolve, 300));

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching profile:", error);
          router.push(redirectTo);
          return;
        }

        if (!profile) {
          console.log("Profile not found, redirecting to login");
          router.push(redirectTo);
          return;
        }

        console.log("User role:", profile.role, "Allowed roles:", allowedRoles);

        if (allowedRoles && !allowedRoles.includes(profile.role)) {
          console.log("User not authorized for this page");
          router.push("/unauthorized");
          return;
        }

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}