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
import { useToast } from "@/hooks/use-toast";

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"consumer" | "transporter" | "admin" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1); // Track signup steps for transporter
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "consumer" as "consumer" | "transporter",
    van_make: "",
    van_model: "",
    van_year: "",
    van_license_plate: "",
    van_register_number: "",
    bank_account_iban: "",
  });

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
      
      // Log signup details for debugging
      console.log("Signup attempt:", { email, role, hasData: !!data.user });

      if (signUpError) {
        console.error("Supabase signup error:", signUpError);
        throw signUpError;
      }

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
      
      // Provide more helpful error messages
      if (err instanceof Error) {
        if (err.message.includes("invalid")) {
          setError("This email address appears to be invalid. Please check and try again, or use a different email address.");
        } else if (err.message.includes("already registered")) {
          setError("This email is already registered. Please try logging in instead.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to sign up. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTransporterSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Basic account info
      if (step === 1) {
        setFormData({ ...formData, email, password });
        setStep(2);
        setLoading(false);
        return;
      }

      // Step 2: Vehicle info - Create account and application
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: "transporter",
            full_name: formData.full_name,
            phone: formData.phone,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Wait for profile creation
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create transporter application with vehicle info
        const { error: appError } = await supabase
          .from("transporter_applications")
          .insert({
            user_id: data.user.id,
            full_name: formData.full_name,
            phone: formData.phone,
            van_make: formData.van_make,
            van_model: formData.van_model,
            van_year: parseInt(formData.van_year),
            van_license_plate: formData.van_license_plate,
            van_register_number: formData.van_register_number,
            bank_account_iban: formData.bank_account_iban,
            status: "pending",
          });

        if (appError) throw appError;

        // Check if logged in or needs email confirmation
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          toast({
            title: "✅ Application Submitted",
            description: "Your transporter application is under review. You'll be notified once approved.",
          });
          router.push("/transporter/dashboard");
        } else {
          setSuccess(true);
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError(err instanceof Error ? err.message : "Failed to sign up");
      
      // Provide more helpful error messages
      if (err instanceof Error) {
        if (err.message.includes("invalid")) {
          setError("This email address appears to be invalid. Please check and try again, or use a different email address.");
        } else if (err.message.includes("already registered")) {
          setError("This email is already registered. Please try logging in instead.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to sign up. Please try again.");
      }
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
            {role === "transporter" && ` - Step ${step} of 2`}
          </CardTitle>
          <CardDescription>
            {role === "consumer" 
              ? "Create your account to get started"
              : step === 1 
                ? "Create your account"
                : "Tell us about your van"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={role === "consumer" ? handleSignUp : handleTransporterSignUp}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {role === "consumer" ? (
              // Consumer signup - simple form
              <>
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
              </>
            ) : step === 1 ? (
              // Transporter Step 1 - Account info
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+358 40 123 4567"
                  />
                </div>

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
              </>
            ) : (
              // Transporter Step 2 - Vehicle info
              <>
                <div className="space-y-2">
                  <Label htmlFor="van_make">Van Make</Label>
                  <Input
                    id="van_make"
                    required
                    value={formData.van_make}
                    onChange={(e) => setFormData({ ...formData, van_make: e.target.value })}
                    placeholder="e.g., Ford, Mercedes, Volkswagen"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="van_model">Van Model</Label>
                  <Input
                    id="van_model"
                    required
                    value={formData.van_model}
                    onChange={(e) => setFormData({ ...formData, van_model: e.target.value })}
                    placeholder="e.g., Transit, Sprinter, Transporter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="van_year">Year</Label>
                  <Input
                    id="van_year"
                    type="number"
                    required
                    value={formData.van_year}
                    onChange={(e) => setFormData({ ...formData, van_year: e.target.value })}
                    placeholder="2020"
                    min="1990"
                    max={new Date().getFullYear() + 1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="van_license_plate">License Plate</Label>
                  <Input
                    id="van_license_plate"
                    required
                    value={formData.van_license_plate}
                    onChange={(e) => setFormData({ ...formData, van_license_plate: e.target.value })}
                    placeholder="ABC-123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="van_register_number">Vehicle Registration Number</Label>
                  <Input
                    id="van_register_number"
                    required
                    value={formData.van_register_number}
                    onChange={(e) => setFormData({ ...formData, van_register_number: e.target.value })}
                    placeholder="Registration number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_account_iban">Bank Account (IBAN)</Label>
                  <Input
                    id="bank_account_iban"
                    required
                    value={formData.bank_account_iban}
                    onChange={(e) => setFormData({ ...formData, bank_account_iban: e.target.value })}
                    placeholder="FI21 1234 5600 0007 85"
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : 
               role === "consumer" ? "Create Account" :
               step === 1 ? "Next: Vehicle Info →" : "Submit Application"}
            </Button>
            {role === "transporter" && step === 2 && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={() => setStep(1)}
              >
                ← Back
              </Button>
            )}
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full"
              onClick={() => {
                setRole(null);
                setStep(1);
              }}
            >
              Back to Role Selection
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}