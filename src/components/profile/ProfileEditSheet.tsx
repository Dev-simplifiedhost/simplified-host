import { useState, useEffect } from "react";
import { ArrowLeft, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PhoneInputWithCountry } from "@/components/ui/phone-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfileEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  userCreatedAt: string;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    phone_number: string | null;
  };
  onProfileUpdate: (profile: {
    display_name: string | null;
    avatar_url: string | null;
    phone_number: string | null;
  }) => void;
}

export function ProfileEditSheet({
  open,
  onOpenChange,
  userId,
  userEmail,
  userCreatedAt,
  profile,
  onProfileUpdate,
}: ProfileEditSheetProps) {
  const isMobile = useIsMobile();
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplayName(profile.display_name || "");
      setPhoneNumber(profile.phone_number || "");
      setAvatarUrl(profile.avatar_url);
    }
  }, [open, profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${Math.random()}.${fileExt}`;

    setUploading(true);

    if (avatarUrl) {
      const oldPath = avatarUrl.split("/").pop();
      if (oldPath) {
        await supabase.storage.from("avatars").remove([`${userId}/${oldPath}`]);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload avatar");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", userId);

    if (updateError) {
      toast.error("Failed to update avatar");
    } else {
      setAvatarUrl(urlData.publicUrl);
      toast.success("Avatar updated!");
    }

    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        phone_number: phoneNumber || null,
      })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      onProfileUpdate({
        display_name: displayName || null,
        avatar_url: avatarUrl,
        phone_number: phoneNumber || null,
      });
      toast.success("Profile updated!");
      onOpenChange(false);
    }
    setSaving(false);
  };

  const getInitials = () => {
    if (displayName) {
      return displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (userEmail) {
      return userEmail[0].toUpperCase();
    }
    return "U";
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-background pt-safe">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold flex-1">Edit Profile</h2>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-primary"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center border-4 border-primary">
                <span className="text-2xl font-semibold text-primary-foreground">
                  {getInitials()}
                </span>
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary/90 transition-colors"
            >
              <Upload className="h-4 w-4" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="hidden"
            />
          </div>
          {uploading && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInputWithCountry
              value={phoneNumber}
              onChange={(value) => setPhoneNumber(value || "")}
              placeholder="Your phone number (optional)"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={userEmail}
              disabled
              className="h-12 bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label>Member Since</Label>
            <Input
              value={new Date(userCreatedAt).toLocaleDateString()}
              disabled
              className="h-12 bg-muted"
            />
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="shrink-0 border-t bg-background px-4 py-4 pb-safe">
        <Button onClick={handleSave} disabled={saving} className="w-full h-12">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[100dvh] p-0">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0">
        {content}
      </DialogContent>
    </Dialog>
  );
}
