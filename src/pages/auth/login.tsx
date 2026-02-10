import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { profileService } from "@/services/profileService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      // Log diagnostic information
      console.log("🔐 Login attempt starting...");
      console.log("📍 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log("🔑 Anon Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      
      // Test basic Supabase connectivity first
      console.log("🧪 Testing Supabase connectivity...");
      const { data: testData, error: testError } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);
      
      if (testError) {
        console.error("❌ Supabase connectivity test failed:", testError);
        setError("Cannot connect to database. Please check your internet connection and try again.");
        return;
      }
      
      console.log("✅ Supabase connectivity test passed");

      // Add retry logic for network issues
      let authData;
      let authError;
      let retries = 3;
      let lastError;

      while (retries > 0) {
        try {
          console.log(`🔄 Auth attempt ${4 - retries}/3`);
          
          const result = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          
          authData = result.data;
          authError = result.error;
          
          if (!authError) {
            console.log("✅ Auth successful");
            break;
          }
          
          lastError = authError;
          console.warn(`⚠️ Auth attempt ${4 - retries} failed:`, authError.message);
          
          // Don't retry on credential errors
          if (authError.message.includes("Invalid login credentials") || 
              authError.message.includes("Email not confirmed")) {
            break;
          }
          
          retries--;
          if (retries > 0) {
            console.log(`⏳ Waiting 1 second before retry...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          lastError = err as Error;
          console.error(`❌ Network error on attempt ${4 - retries}:`, err);
          retries--;
          
          if (retries > 0) {
            console.log(`⏳ Waiting 1 second before retry...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (authError || !authData?.user) {
        console.error("❌ Final auth error:", authError || lastError);
        
        if (authError?.message.includes("Email not confirmed")) {
          setError("Please confirm your email address before logging in. Check your inbox for the confirmation link.");
        } else if (authError?.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else {
          const errorMessage = authError?.message || (lastError as Error)?.message || "Unknown error";
          setError(`Login failed: ${errorMessage}. This might be a network or configuration issue. Please try again or contact support.`);
        }
        return;
      }

      if (authData?.user) {
        console.log("✅ User authenticated:", authData.user.id);
        
        // Wait a moment for database operations to complete
        await new Promise(resolve => setTimeout(resolve, 300));

        // Fetch user profile to get role
        console.log("📋 Fetching user profile...");
        const profile = await profileService.getProfile(authData.user.id);

        if (!profile) {
          console.error("❌ Profile not found for user:", authData.user.id);
          setError("Profile not found. Please try signing up again or contact support.");
          await supabase.auth.signOut();
          return;
        }

        console.log("✅ Profile found. Role:", profile.role);

        // Redirect based on role
        switch (profile.role) {
          case "consumer":
            router.push("/consumer/dashboard");
            break;
          case "transporter":
            router.push("/transporter/dashboard");
            break;
          case "admin":
            router.push("/admin/dashboard");
            break;
          default:
            router.push("/");
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("💥 Unexpected error during login:", error);
      
      if (error.message.includes("Failed to fetch") || error.message.includes("Network")) {
        setError("Network error. Please check your internet connection. If the issue persists, try: 1) Clearing browser cache, 2) Disabling VPN/ad blockers, 3) Using a different browser.");
      } else {
        setError(`An unexpected error occurred: ${error.message}. Please try again or contact support.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back to VANGO</CardTitle>
          <CardDescription>
            Log in to your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log In"}
            </Button>
            <p className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="text-blue-600 hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}