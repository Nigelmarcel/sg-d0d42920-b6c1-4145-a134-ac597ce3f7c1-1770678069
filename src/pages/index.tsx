import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Truck, 
  Shield, 
  Clock, 
  MapPin, 
  Star,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { authService } from "@/services/authService";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      const profile = await authService.getProfile(user.id);
      if (profile?.role === "consumer") {
        router.push("/consumer/dashboard");
      } else if (profile?.role === "transporter") {
        router.push("/transporter/dashboard");
      } else if (profile?.role === "admin") {
        router.push("/admin/dashboard");
      }
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <SEO 
        title="VANGO - Premium Moving & Delivery Service in Helsinki"
        description="Professional furniture moving and delivery service connecting Helsinki residents with verified transporters. Quick, reliable, and secure."
      />
      
      <div className="min-h-screen bg-gradient-subtle">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <Package className="h-7 w-7 text-primary" />
                <span className="text-2xl font-display font-bold text-primary">VANGO</span>
              </div>
              
              <div className="flex items-center gap-3">
                <ThemeSwitch />
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="font-medium">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm" className="font-medium shadow-premium">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-premium opacity-5"></div>
          
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
                <Star className="h-4 w-4 text-accent fill-accent" />
                <span className="text-sm font-medium text-accent">Trusted by 5,000+ Helsinki Residents</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight">
                Premium Moving<br />
                <span className="text-primary">Made Simple</span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Connect with verified professional transporters in Helsinki. From furniture to appliances, 
                experience seamless, secure, and swift delivery service.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link href="/auth/signup">
                  <Button size="lg" className="text-lg px-8 py-6 shadow-elevated group">
                    Book a Move
                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/auth/signup?role=transporter">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-6 shadow-soft">
                    Become a Transporter
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-card">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-display font-bold mb-4">Why Choose VANGO</h2>
              <p className="text-lg text-muted-foreground">Professional service, exclusive experience</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="group p-8 rounded-xl border bg-background hover:shadow-premium transition-all duration-300">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">Verified Transporters</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Every transporter is thoroughly vetted with verified licenses, insurance, and professional experience.
                </p>
              </div>
              
              <div className="group p-8 rounded-xl border bg-background hover:shadow-premium transition-all duration-300">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">Real-Time Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Track your delivery in real-time with live GPS updates and direct communication with your transporter.
                </p>
              </div>
              
              <div className="group p-8 rounded-xl border bg-background hover:shadow-premium transition-all duration-300">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MapPin className="h-6 w-6 text-success" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">Helsinki Coverage</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Complete coverage across Helsinki metropolitan area with flexible pickup and delivery scheduling.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-display font-bold mb-4">Simple Process</h2>
              <p className="text-lg text-muted-foreground">Your move, simplified in three steps</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="inline-flex h-16 w-16 rounded-full bg-primary text-primary-foreground items-center justify-center text-2xl font-bold shadow-elevated">
                  1
                </div>
                <h3 className="text-xl font-display font-semibold">Book Your Move</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Enter pickup and delivery locations, describe your items, and get instant price estimates.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="inline-flex h-16 w-16 rounded-full bg-accent text-accent-foreground items-center justify-center text-2xl font-bold shadow-elevated">
                  2
                </div>
                <h3 className="text-xl font-display font-semibold">Match with Transporter</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get matched with verified transporters. Chat directly and track in real-time.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="inline-flex h-16 w-16 rounded-full bg-success text-success-foreground items-center justify-center text-2xl font-bold shadow-elevated">
                  3
                </div>
                <h3 className="text-xl font-display font-semibold">Delivered Safely</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Receive your items safely. Pay securely and rate your experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-premium text-primary-foreground">
          <div className="container mx-auto max-w-4xl text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-display font-bold">
              Ready to Experience Premium Moving?
            </h2>
            <p className="text-xl opacity-90 leading-relaxed">
              Join thousands of satisfied customers in Helsinki who trust VANGO for their moving needs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6 shadow-elevated">
                  Start Moving Today
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t bg-card">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                <span className="text-xl font-display font-bold text-primary">VANGO</span>
              </div>
              
              <p className="text-sm text-muted-foreground">
                © 2026 VANGO. Premium moving service in Helsinki.
              </p>
              
              <div className="flex items-center gap-6">
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy
                </Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}