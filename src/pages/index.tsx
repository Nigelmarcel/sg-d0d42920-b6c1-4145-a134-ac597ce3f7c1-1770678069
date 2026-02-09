import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck, MapPin, Shield, Clock, Star, CheckCircle, ArrowRight, CreditCard, MessageSquare, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"] | null;

export default function Home() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.
        from("profiles").
        select("role").
        eq("id", session.user.id).
        maybeSingle();
        if (data) setUserRole(data.role);
      }
    };
    checkUser();
  }, []);

  if (userRole) {
    // Redirect to appropriate dashboard
    switch (userRole) {
      case "consumer":
        router.push("/consumer/dashboard");
        break;
      case "transporter":
        router.push("/transporter/dashboard");
        break;
      case "admin":
        router.push("/admin/dashboard");
        break;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <Truck className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold">VANGO</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">Cargo transport on demand in Helsinki made simple. Connect with verified transporters for your furniture, appliances, and home moves.


          </p>
          
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <MapPin className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Real-Time Tracking</CardTitle>
              <CardDescription>
                Track your transporter in real-time on the map. Know exactly when they'll arrive.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CreditCard className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Secure Payments</CardTitle>
              <CardDescription>
                Pay safely through the app with credit cards or MobilePay. No cash needed.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-primary mb-2" />
              <CardTitle>In-App Chat</CardTitle>
              <CardDescription>
                Communicate directly with your transporter. Coordinate details easily.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* User Types */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Package className="h-10 w-10 text-primary mb-3" />
              <CardTitle>For Consumers</CardTitle>
              <CardDescription className="mb-4">
                Need something moved? Book a transporter in minutes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Instant booking</li>
                <li>• Transparent pricing</li>
                <li>• Verified transporters</li>
                <li>• Real-time tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Truck className="h-10 w-10 text-primary mb-3" />
              <CardTitle>For Transporters</CardTitle>
              <CardDescription className="mb-4">
                Have a van? Earn money on your schedule.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Flexible hours</li>
                <li>• Weekly payouts</li>
                <li>• Route optimization</li>
                <li>• Insurance coverage</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-3" />
              <CardTitle>Admin Control</CardTitle>
              <CardDescription className="mb-4">
                Manage the platform with powerful admin tools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• User verification</li>
                <li>• Booking oversight</li>
                <li>• Analytics dashboard</li>
                <li>• Dispute resolution</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16 p-8 bg-primary/5 rounded-lg border">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join hundreds of people in Helsinki using MoveIt for their moving needs. 
            Whether you need something moved or want to earn as a transporter.
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="gap-2">
              Create Your Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              <span className="font-semibold">VANGO Finland</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2026 MoveIt Helsinki. Built with Softgen.
            </div>
            <div className="flex gap-4 text-sm">
              <Link href="#" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>);

}