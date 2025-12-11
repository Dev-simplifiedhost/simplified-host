import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { User, Key, Bell, CreditCard, FileText, Shield, LogOut, Trash2, Smartphone, CheckCircle2, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { exportUserData } from "@/lib/exportUserData";
import { ProfileSettingsRow } from "@/components/profile/ProfileSettingsRow";
import { ProfileEditSheet } from "@/components/profile/ProfileEditSheet";
import { ChangePasswordSheet } from "@/components/profile/ChangePasswordSheet";
import { NotificationsSheet } from "@/components/profile/NotificationsSheet";
import { DeleteAccountSheet } from "@/components/profile/DeleteAccountSheet";
import { InstallInstructionsModal } from "@/components/install";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
}

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({
    display_name: null,
    avatar_url: null,
    phone_number: null,
  });
  
  // Sheet states
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  
  const { isInstalled, isMobile, isPWAEligible } = useInstallPrompt();
  const showInstallRow = isMobile && isPWAEligible;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    loadProfile();
  }, [user, authLoading, navigate]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, phone_number")
      .eq("id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error loading profile:", error);
      return;
    }

    if (data) {
      setProfile({
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        phone_number: data.phone_number,
      });
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    await exportUserData(user.id, user.email || "");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) throw error;

      toast.success("Account deleted successfully");
      
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  const getInitials = () => {
    if (profile.display_name) {
      return profile.display_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header - hidden on mobile */}
      <div className="hidden md:block">
        <Header />
      </div>
      
      <main className="flex-1 pb-24 md:pb-16">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-10 bg-background border-b pt-safe">
          <div className="h-14 flex items-center justify-center px-4">
            <h1 className="text-lg font-semibold">Profile</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full">
          {/* Profile Header Block */}
          <div className="bg-background py-8 flex flex-col items-center gap-3 border-b">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-4 border-primary"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-2xl font-semibold text-primary-foreground">
                  {getInitials()}
                </span>
              </div>
            )}
            <div className="text-center">
              <h2 className="text-xl font-semibold">
                {profile.display_name || "Add your name"}
              </h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Settings Sections */}
          <div className="py-4 space-y-6">
            {/* Profile Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Profile
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border divide-y divide-border">
                <ProfileSettingsRow
                  label="Profile Information"
                  subtitle="Name, phone, avatar"
                  icon={<User className="h-5 w-5" />}
                  onClick={() => setEditProfileOpen(true)}
                />
                {showInstallRow && (
                  <ProfileSettingsRow
                    label={isInstalled ? "Installed on this device" : "Add to Home Screen"}
                    subtitle={isInstalled ? "SimplifiedHost is on your home screen" : "Quick access from your device"}
                    icon={<Smartphone className="h-5 w-5" />}
                    onClick={isInstalled ? undefined : () => setInstallModalOpen(true)}
                    showChevron={!isInstalled}
                    rightElement={isInstalled ? <CheckCircle2 className="h-4 w-4 text-primary" /> : undefined}
                    className={isInstalled ? "opacity-60" : ""}
                  />
                )}
              </div>
            </div>

            {/* Account Security Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Account Security
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border">
                <ProfileSettingsRow
                  label="Change Password"
                  subtitle="Update your password"
                  icon={<Key className="h-5 w-5" />}
                  onClick={() => setChangePasswordOpen(true)}
                />
              </div>
            </div>

            {/* Payment Settings Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Payments
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border">
                <ProfileSettingsRow
                  label="Payment Settings"
                  subtitle="Payouts, default payment methods"
                  icon={<CreditCard className="h-5 w-5" />}
                  onClick={() => navigate('/payment-settings')}
                />
              </div>
            </div>

            {/* Notifications Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Notifications
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border">
                <ProfileSettingsRow
                  label="Notification Preferences"
                  subtitle="Email, SMS, push"
                  icon={<Bell className="h-5 w-5" />}
                  onClick={() => setNotificationsOpen(true)}
                />
              </div>
            </div>

            {/* Support & Legal Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Support & Legal
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border divide-y divide-border">
                <Link to="/support">
                  <ProfileSettingsRow
                    label="Support Center"
                    subtitle="FAQs and contact"
                    icon={<HelpCircle className="h-5 w-5" />}
                  />
                </Link>
                <Link to="/policies#terms">
                  <ProfileSettingsRow
                    label="Terms of Service"
                    icon={<FileText className="h-5 w-5" />}
                  />
                </Link>
                <Link to="/policies#privacy">
                  <ProfileSettingsRow
                    label="Privacy Policy"
                    icon={<Shield className="h-5 w-5" />}
                  />
                </Link>
              </div>
            </div>

            {/* Session Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Session
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border">
                <ProfileSettingsRow
                  label="Log Out"
                  icon={<LogOut className="h-5 w-5" />}
                  variant="danger"
                  showChevron={false}
                  onClick={handleSignOut}
                />
              </div>
            </div>

            {/* Danger Zone Section */}
            <div>
              <p className="text-xs font-medium text-destructive uppercase tracking-wider px-4 py-2">
                Danger Zone
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border border-destructive/20">
                <ProfileSettingsRow
                  label="Delete Account"
                  subtitle="Permanently delete your account"
                  icon={<Trash2 className="h-5 w-5" />}
                  variant="danger"
                  onClick={() => setDeleteAccountOpen(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer - hidden on mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Sheets */}
      <ProfileEditSheet
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        userId={user.id}
        userEmail={user.email || ""}
        userCreatedAt={user.created_at}
        profile={profile}
        onProfileUpdate={(updatedProfile) => setProfile(updatedProfile)}
      />

      <ChangePasswordSheet
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />

      <NotificationsSheet
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        userId={user.id}
      />

      <DeleteAccountSheet
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        userEmail={user.email || ""}
        onExportData={handleExportData}
        onDeleteAccount={handleDeleteAccount}
      />

      <InstallInstructionsModal
        open={installModalOpen}
        onOpenChange={setInstallModalOpen}
      />
    </div>
  );
};

export default Profile;
