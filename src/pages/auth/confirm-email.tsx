import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ConfirmEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Check if we have a token in the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");

        if (!accessToken || type !== "signup") {
          setStatus("error");
          setMessage("Invalid confirmation link. Please try signing up again.");
          return;
        }

        // The session is automatically set by Supabase when the user clicks the confirmation link
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          setStatus("error");
          setMessage("Failed to confirm email. Please try again or contact support.");
          return;
        }

        setStatus("success");
        setMessage("Email confirmed successfully! Redirecting to your dashboard...");

        // Redirect to appropriate dashboard based on role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        setTimeout(() => {
          if (profile?.role === "consumer") {
            router.push("/consumer/dashboard");
          } else if (profile?.role === "transporter") {
            router.push("/transporter/dashboard");
          } else if (profile?.role === "admin") {
            router.push("/admin/dashboard");
          } else {
            router.push("/");
          }
        }, 2000);

      } catch (err) {
        console.error("Email confirmation error:", err);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    handleEmailConfirmation();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle>Email Confirmation</CardTitle>
          <CardDescription>
            {status === "loading" && "Confirming your email address..."}
            {status === "success" && "Your email has been confirmed!"}
            {status === "error" && "Confirmation failed"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              <p className="text-gray-600">Please wait...</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-16 h-16 text-green-600" />
              <Alert className="border-green-600 bg-green-50">
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-red-600" />
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <div className="flex gap-2 w-full">
                <Link href="/auth/signup" className="flex-1">
                  <Button variant="outline" className="w-full">Sign Up Again</Button>
                </Link>
                <Link href="/auth/login" className="flex-1">
                  <Button className="w-full">Go to Login</Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}