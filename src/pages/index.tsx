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
                  <Button variant="ghost" size="sm" className="font-medium dark:text-white dark:hover:bg-navy-800">
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
        <section className="relative min-h-[85vh] flex items-center justify-center px-4 py-12">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-900/5 via-transparent to-gold/5" />
          
          <div className="relative max-w-6xl mx-auto text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-navy-900 to-gold blur-3xl opacity-20 rounded-full" />
                
                {/* Logo container */}
                <div className="relative bg-gradient-to-br from-navy-900 to-navy-950 p-8 rounded-3xl shadow-2xl border border-gold/20">
                  <h1 className="text-6xl md:text-7xl font-bold leading-tight tracking-tight text-navy-950 dark:text-white">
                    <span className="bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent animate-shimmer">
                      VANGO
                    </span>
                    <br />
                    Smart Moving Solution
                  </h1>
                  <div className="absolute -inset-1 bg-gradient-to-r from-navy-900 via-gold to-navy-900 rounded-3xl opacity-20 dark:opacity-30 blur-sm -z-10" />
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-4">
              <p className="text-2xl md:text-3xl font-semibold text-gray-700">
                Smart Moving Solution
              </p>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Book a van in minutes. Track in real-time. Move stress-free.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                size="lg"
                onClick={() => router.push("/auth/signup")}
                className="bg-gradient-to-r from-navy-900 to-gold hover:from-navy-950 hover:to-gold/90 text-white font-semibold text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/auth/login")}
                className="border-2 border-navy-900 dark:border-gold text-navy-900 dark:text-gold hover:bg-navy-900 hover:text-white dark:hover:bg-gold dark:hover:text-navy-900 font-semibold text-lg px-8 py-6"
              >
                Sign In
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto pt-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-navy-900">2h</div>
                <div className="text-sm text-gray-600">Avg. Response</div>
              </div>
              <div className="text-center border-x border-gray-200">
                <div className="text-3xl font-bold text-navy-900">€25</div>
                <div className="text-sm text-gray-600">Starting From</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-navy-900">5★</div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gradient-to-b from-white to-blue-50">
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
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 dark:bg-gold/20 flex items-center justify-center group-hover:bg-primary/20 dark:group-hover:bg-gold/30 transition-all duration-300">
                  <Shield className="h-8 w-8 text-primary dark:text-gold" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Premium Service</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Professional transporters with verified credentials and comprehensive insurance coverage
                </p>
              </div>

              {/* Expert Team */}
              <div className="text-center group">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent/10 dark:bg-gold/20 flex items-center justify-center group-hover:bg-accent/20 dark:group-hover:bg-gold/30 transition-all duration-300">
                  <Users className="h-8 w-8 text-accent dark:text-gold" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 dark:text-white">Expert Team</h3>
                <p className="text-muted-foreground dark:text-gray-300 leading-relaxed">
                  Carefully vetted drivers with extensive experience in handling valuable items
                </p>
              </div>

              {/* Full Protection */}
              <div className="text-center group">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-secondary/10 dark:bg-gold/20 flex items-center justify-center group-hover:bg-secondary/20 dark:group-hover:bg-gold/30 transition-all duration-300">
                  <Truck className="h-8 w-8 text-secondary dark:text-gold" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 dark:text-white">Full Insurance</h3>
                <p className="text-muted-foreground dark:text-gray-300 leading-relaxed">
                  Complete protection for your belongings throughout the entire moving process
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 dark:bg-navy-900">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 dark:text-white">
                Our <span className="text-gradient-gold">Process</span>
              </h2>
              <p className="text-xl text-muted-foreground dark:text-gray-300">
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
                  <h3 className="text-2xl font-semibold mb-3 dark:text-white">Book</h3>
                  <p className="text-muted-foreground dark:text-gray-300 leading-relaxed">
                    Simple booking process in minutes. Provide pickup and delivery details with transparent pricing
                  </p>
                </div>
                {/* Connector */}
                <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary to-accent opacity-20 dark:opacity-40"></div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    2
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 dark:text-white">Track</h3>
                  <p className="text-muted-foreground dark:text-gray-300 leading-relaxed">
                    Real-time GPS tracking and direct chat with your professional transporter
                  </p>
                </div>
                {/* Connector */}
                <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-accent to-secondary opacity-20 dark:opacity-40"></div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    3
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 dark:text-white">Delivered</h3>
                  <p className="text-muted-foreground dark:text-gray-300 leading-relaxed">
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

        {/* Get Started Section */}
        <section className="py-20 bg-gradient-to-br from-navy-900 to-navy-950 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Move?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Join hundreds of Helsinki residents who trust VANGO for their moving needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => router.push("/auth/signup")}
                className="bg-gold hover:bg-gold/90 text-navy-900 font-bold text-lg px-8 py-6"
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/auth/login")}
                className="border-2 border-white text-white hover:bg-white hover:text-navy-900 font-semibold text-lg px-8 py-6"
              >
                Sign In
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-navy-900 text-white py-12">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                <span className="text-xl font-display font-bold text-primary">VANGO</span>
              </div>
              
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                © 2026 VANGO. Premium moving service in Helsinki.
              </p>
              
              <div className="flex items-center gap-6">
                <Link href="#" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white transition-colors">
                  Privacy
                </Link>
                <Link href="#" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white transition-colors">
                  Terms
                </Link>
                <Link href="#" className="text-sm text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white transition-colors">
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