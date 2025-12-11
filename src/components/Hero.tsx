import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-image.jpg";

export const Hero = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  return (
    <section className="relative flex items-center justify-center overflow-hidden px-4 sm:px-6">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/30 to-background" />
      
      {/* Hero content */}
      <div className="container relative z-10 py-6 sm:py-8 md:py-12 mx-auto">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-8 items-center">
          {/* Left content */}
          <div className="space-y-4 md:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-accent/10 border border-accent/20">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-accent" />
              <span className="text-xs sm:text-sm font-medium text-accent">Simple. Smart. Seamless.</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
              Plan Confidently,{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Host Effortlessly
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              From bridal showers to corporate retreats, SimplifiedHost empowers you to organize 
              any gathering with smart automation and collaborative planning.
            </p>
            
            <div className="flex">
              <Button 
                size="lg" 
                className="group text-base sm:text-lg px-6 py-5 sm:px-8 sm:py-6"
                onClick={() => navigate(user ? '/my-activity' : '/auth')}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Start Planning Free
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </div>
            
          </div>
          
          {/* Right image */}
          <div className="relative mt-6 lg:mt-0">
            <div className="absolute -inset-4 bg-gradient-to-r from-accent/20 to-primary/20 rounded-3xl blur-2xl opacity-50" />
            <img
              src={heroImage}
              alt="Beautiful event planning dashboard"
              className="relative rounded-2xl shadow-2xl w-full h-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
