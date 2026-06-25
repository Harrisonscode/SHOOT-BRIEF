import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { SHOOT_TYPES } from "@/lib/shoot";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: () => <AppShell title="Settings"><SettingsPage /></AppShell>,
});

function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const avatarRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [defaultType, setDefaultType] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBusinessName(profile.business_name ?? "");
      setPhone(profile.phone ?? "");
      setWebsite(profile.website ?? "");
      setDarkMode(profile.dark_mode);
      setDefaultType(profile.default_shoot_type ?? "");
      if (profile.avatar_url) resolveAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  const resolveAvatarUrl = async (path: string) => {
    if (path.startsWith("http")) { setAvatarUrl(path); return; }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setAvatarUrl(data?.signedUrl ?? null);
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    // Remove old avatar if exists
    if (profile?.avatar_url && !profile.avatar_url.startsWith("http")) {
      await supabase.storage.from("avatars").remove([profile.avatar_url]);
    }
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setAvatarUploading(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
    setAvatarUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Profile photo updated");
    await resolveAvatarUrl(path);
    refreshProfile();
    if (avatarRef.current) avatarRef.current.value = "";
  };

  const saveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      business_name: businessName || null,
      phone: phone || null,
      website: website || null,
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    refreshProfile();
  };

  const togglePref = async (k: "dark_mode" | "default_shoot_type", v: any) => {
    if (!user) return;
    await supabase.from("profiles").update({ [k]: v } as any).eq("id", user.id);
    refreshProfile();
  };

  const resetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + "/login" });
    if (error) toast.error(error.message); else toast.success("Password reset email sent");
  };

  const deleteAccount = async () => {
    if (confirmText !== "DELETE" || !user) return;
    await supabase.from("profiles").delete().eq("id", user.id);
    await signOut();
    toast.success("Account deleted");
    navigate({ to: "/" });
  };

  if (!profile) return <div className="h-40 bg-muted animate-pulse rounded-lg" />;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile photo */}
      <section className="rounded-lg border bg-card shadow-card p-5 space-y-4">
        <h2 className="font-semibold">Profile photo</h2>
        <p className="text-sm text-muted-foreground">Your photo appears on exported client PDFs and your profile.</p>
        <div className="flex items-center gap-5">
          <div
            className="relative h-20 w-20 rounded-full border-2 border-dashed border-muted-foreground/30 bg-muted flex items-center justify-center overflow-hidden cursor-pointer group hover:border-primary transition-colors"
            onClick={() => avatarRef.current?.click()}
          >
            {avatarUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : avatarUrl ? (
              <>
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </>
            ) : (
              <Camera className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
          <div>
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={avatarUploading}
              className="px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium disabled:opacity-60"
            >
              {avatarUploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
            </button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP. Max 5MB.</p>
          </div>
          <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAvatar} />
        </div>
      </section>

      {/* Account & business info */}
      <section className="rounded-lg border bg-card shadow-card p-5 space-y-4">
        <h2 className="font-semibold">Account & business info</h2>
        <p className="text-xs text-muted-foreground">This information is used on exported client briefs.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Your name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border bg-background text-sm" placeholder="Harrison Smith" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Business / studio name</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border bg-background text-sm" placeholder="Smith Photography" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Phone number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border bg-background text-sm" placeholder="+44 7700 000000" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Website</label>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-md border bg-background text-sm" placeholder="www.yoursite.com" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <input value={profile.email ?? ""} readOnly className="mt-1 w-full px-3 py-2 rounded-md border bg-muted text-sm text-muted-foreground" />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={saveProfile} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Save profile</button>
          <button onClick={resetPassword} className="px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Change password</button>
        </div>
      </section>

      {/* Preferences */}
      <section className="rounded-lg border bg-card shadow-card p-5 space-y-4">
        <h2 className="font-semibold">Preferences</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Dark mode</div>
            <div className="text-xs text-muted-foreground">Switch the whole app to a dark theme.</div>
          </div>
          <button
            role="switch"
            aria-checked={darkMode}
            onClick={() => { const v = !darkMode; setDarkMode(v); togglePref("dark_mode", v); }}
            className={`relative h-6 w-11 rounded-full transition-colors ${darkMode ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${darkMode ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Default shoot type</label>
          <select value={defaultType} onChange={(e) => { setDefaultType(e.target.value); togglePref("default_shoot_type", e.target.value || null); }} className="mt-1 w-full px-3 py-2 rounded-md border bg-background text-sm">
            <option value="">None</option>
            {SHOOT_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-lg border-2 border-destructive/40 bg-card shadow-card p-5">
        <h2 className="font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground mt-1">Permanently delete your account and all your shoots.</p>
        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} className="mt-4 px-4 py-2 rounded-md border border-destructive text-destructive text-sm font-medium hover:bg-destructive hover:text-destructive-foreground">Delete account</button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm">Type <strong>DELETE</strong> to confirm.</p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full px-3 py-2 rounded-md border bg-background text-sm" />
            <div className="flex gap-2">
              <button onClick={deleteAccount} disabled={confirmText !== "DELETE"} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50">Delete forever</button>
              <button onClick={() => { setShowDelete(false); setConfirmText(""); }} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
