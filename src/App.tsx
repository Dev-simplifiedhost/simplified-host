import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { RecaptchaProvider } from "@/contexts/RecaptchaProvider";
import { NetworkStatusProvider } from "@/components/NetworkStatusProvider";
import { BottomTabBar } from "@/components/BottomTabBar";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";
import { SmartInstallBanner } from "@/components/install";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Event from "./pages/Event";
import MyActivity from "./pages/MyActivity";
import MyEvents from "./pages/MyEvents";
import Notifications from "./pages/Notifications";
import FindMyActivity from "./pages/FindMyActivity";
import FindMyEvent from "./pages/FindMyEvent";
import Join from "./pages/Join";
import Support from "./pages/Support";
import Profile from "./pages/Profile";
import PaymentSettings from "./pages/PaymentSettings";
import Policies from "./pages/Policies";
import Install from "./pages/Install";
import Offline from "./pages/Offline";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import SharedPlan from "./pages/SharedPlan";
import AcceptInvite from "./pages/AcceptInvite";
import HowItWorks from "./pages/HowItWorks";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RecaptchaProvider>
          <NetworkStatusProvider>
            <Toaster />
            <Sonner />
            <PWAUpdatePrompt />
            <SmartInstallBanner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/home" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/my-activity" element={<MyActivity />} />
                <Route path="/my-events" element={<MyEvents />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/my-activity/search" element={<FindMyActivity />} />
                <Route path="/find-my-event" element={<FindMyEvent />} />
                <Route path="/join" element={<Join />} />
                <Route path="/support" element={<Support />} />
                <Route path="/feedback" element={<Support />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/payment-settings" element={<PaymentSettings />} />
                <Route path="/event/:code" element={<Event />} />
                <Route path="/policies" element={<Policies />} />
                <Route path="/install" element={<Install />} />
                <Route path="/offline" element={<Offline />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
                <Route path="/payment/cancel" element={<PaymentCancel />} />
                <Route path="/plan/:shareToken" element={<SharedPlan />} />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomTabBar />
            </BrowserRouter>
          </NetworkStatusProvider>
        </RecaptchaProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;