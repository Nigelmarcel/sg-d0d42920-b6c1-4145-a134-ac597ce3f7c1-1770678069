import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, User, Mail } from "lucide-react";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"consumer" | "transporter" | "admin" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError("Please select a role first");
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Wait a moment for the profile to be created by the trigger
        await new Promise(resolve => setTimeout(resolve, 500));

        // Try to get a session to check if we're logged in
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          // User is logged in - redirect to dashboard
          const dashboardRoute = role === "consumer" ? "/consumer/dashboard" 
            : role === "transporter" ? "/transporter/dashboard"
            : "/admin/dashboard";
          
          router.push(dashboardRoute);
        } else {
          // No session - email confirmation required
          setSuccess(true);
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  // Show email confirmation message
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Mail className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent a confirmation link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Please click the confirmation link in your email to activate your account.
                The link will expire in 24 hours.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-gray-600 space-y-2">
              <p>Didn&apos;t receive the email?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your spam/junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Wait a few minutes and check again</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setSuccess(false);
                setRole(null);
                setEmail("");
                setPassword("");
              }}
            >
              Try Different Email
            </Button>
            <Link href="/auth/login" className="w-full">
              <Button variant="ghost" className="w-full">
                Already confirmed? Log in
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show role selection if no role selected
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to VANGO</h1>
            <p className="text-gray-600">Choose how you want to get started</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
              onClick={() => setRole("consumer")}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle>I Need Moving Help</CardTitle>
                <CardDescription>
                  Book a van to move your furniture, appliances, or belongings around Helsinki
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ Instant booking</li>
                  <li>✓ Real-time tracking</li>
                  <li>✓ Secure payments</li>
                  <li>✓ Rated transporters</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg">Sign Up as Consumer</Button>
              </CardFooter>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-500"
              onClick={() => setRole("transporter")}
            >
              <CardHeader className="text-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 w-16 h-16 bg-navy-900/10 rounded-full flex items-center justify-center">
                    <Truck className="w-8 h-8 text-navy-900" />
                  </div>
                </div>
                <CardTitle>I Have a Van</CardTitle>
                <CardDescription>
                  Earn money by helping people move items around Helsinki with your van
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ Flexible schedule</li>
                  <li>✓ Weekly payouts</li>
                  <li>✓ Be your own boss</li>
                  <li>✓ Verified customers</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" size="lg">Sign Up as Transporter</Button>
              </CardFooter>
            </Card>
          </div>

          <p className="text-center mt-6 text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Show signup form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>
            {role === "consumer" ? "Consumer" : "Transporter"} Sign Up
          </CardTitle>
          <CardDescription>
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignUp}>
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
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full"
              onClick={() => setRole(null)}
            >
              Back to Role Selection
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}