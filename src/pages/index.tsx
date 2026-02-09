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
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  Users
} from "lucide-react";
import { authService } from "@/services/authService";
import { profileService } from "@/services/profileService";

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
      const profile = await profileService.getProfile(user.id);
      if (profile?.role === "consumer") {
        router.push("/consumer/dashboard");
      } else if (profile?.role === "transporter") {
        router.push("/transporter/dashboard");
      } else if (profile?.role === "admin") {
        router.push("/admin/dashboard");
      }
    }
  };
  
  const handleGetStarted = () => {
    router.push("/auth/signup");
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
        <section className="relative py-20 lg:py-32 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-background opacity-50"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Premium Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Premium Moving Services in Helsinki
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
                <span className="text-gradient-gold">Premium Moving</span>
                <br />
                <span className="text-foreground">Made Simple</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
                Your trusted partner for seamless, professional moving solutions. 
                Connect with verified transporters for a worry-free experience.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={handleGetStarted}
                  className="text-lg px-8 py-6 border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-300"
                >
                  Contact Expert
                  <MessageCircle className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Fully Insured</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Verified Professionals</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <span>5-Star Rated</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-card">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Why Choose <span className="text-gradient-gold">VANGO</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Experience the difference of premium moving services
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Professional Service */}
              <div className="text-center group">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Premium Service</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Professional transporters with verified credentials and comprehensive insurance coverage
                </p>
              </div>

              {/* Expert Team */}
              <div className="text-center group">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-all duration-300">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Expert Team</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Carefully vetted drivers with extensive experience in handling valuable items
                </p>
              </div>

              {/* Full Protection */}
              <div className="text-center group">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-all duration-300">
                  <Truck className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Full Insurance</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Complete protection for your belongings throughout the entire moving process
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Our <span className="text-gradient-gold">Process</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Simple, transparent, and efficient moving experience
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
              {/* Step 1 */}
              <div className="relative">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    1
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Book</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Simple booking process in minutes. Provide pickup and delivery details with transparent pricing
                  </p>
                </div>
                {/* Connector */}
                <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary to-accent opacity-20"></div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    2
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Track</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Real-time GPS tracking and direct chat with your professional transporter
                  </p>
                </div>
                {/* Connector */}
                <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-accent to-secondary opacity-20"></div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    3
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">Delivered</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Safe and secure delivery with professional handling and care
                  </p>
                </div>
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