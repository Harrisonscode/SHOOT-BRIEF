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
  const [brandColor, setBrandColor] = useState("#4f8a1f");
  const [fontFamily, setFontFamily] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [contractTemplate, setContractTemplate] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBusinessName(profile.business_name ?? "");
      setPhone(profile.phone ?? "");
      setWebsite(profile.website ?? "");
      setDarkMode(profile.dark_mode);
      setDefaultType(profile.default_shoot_type ?? "");
      if (profile.avatar_url) resolveAvatarUrl(profile.avatar_url);
      setBrandColor(profile.brand_color ?? "#4f8a1f");
      setFontFamily(profile.font_family ?? "");
      setBusinessAddress(profile.business_address ?? "");
      setBusinessCity(profile.business_city ?? "");
      setVatNumber(profile.vat_number ?? "");
      setInvoiceNotes(profile.invoice_notes ?? "");
      setContractTemplate(profile.contract_template ?? "");
      if (profile.logo_url) resolveLogo(profile.logo_url);
    }
  }, [profile]);

  const resolveAvatarUrl = async (path: string) => {
    if (path.startsWith("http")) { setAvatarUrl(path); return; }
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setAvatarUrl(data?.signedUrl ?? null);
  };

  const resolveLogo = async (path: string) => {
    if (path.startsWith("http")) { setLogoUrl(path); return; }
    const { data } = await supabase.storage.from("logos").createSignedUrl(path, 3600);
    setLogoUrl(data?.signedUrl ?? null);
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo must be under 5MB"); return; }
    setLogoUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${user.id}/logo.${ext}`;

    // Try uploading
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      toast.error("Logo upload failed: " + upErr.message);
      setLogoUploading(false);
      if (logoRef.current) logoRef.current.value = "";
      return;
    }

    // Save path to profile
    const { error: dbErr } = await (supabase.from("profiles") as any).update({ logo_url: path } as any).eq("id", user.id);
    if (dbErr) { toast.error("Failed to save logo: " + dbErr.message); }
    else { toast.success("Logo uploaded"); }

    setLogoUploading(false);
    resolveLogo(path);
    refreshProfile();
    if (logoRef.current) logoRef.current.value = "";
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
      brand_color: brandColor || null,
      font_family: fontFamily || null,
      business_address: businessAddress || null,
      business_city: businessCity || null,
      vat_number: vatNumber || null,
      invoice_notes: invoiceNotes || null,
      contract_template: contractTemplate || null,
    } as any).eq("id", user.id);
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

      {/* Branding */}
      <section className="rounded-lg border bg-card shadow-card p-5 space-y-4 relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold flex items-center gap-2">Branding {!profile?.is_pro && <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Pro</span>}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your logo, colours and business details appear on client portals, booking pages, contracts and invoices.</p>
          </div>
          {!profile?.is_pro && (
            <a href="/billing" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">Upgrade to Pro</a>
          )}
        </div>
        {!profile?.is_pro && (
          <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Upgrade to Pro to customise your branding — logo, colours, and business details shown on all client-facing pages.
          </div>
        )}
        {profile?.is_pro && (<>

        {/* Logo */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Business logo</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-14 w-auto max-w-[140px] object-contain rounded border bg-white p-1" />
            ) : (
              <div className="h-14 w-32 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">No logo</div>
            )}
            <div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
              <button onClick={() => logoRef.current?.click()} disabled={logoUploading} className="px-3 py-1.5 rounded-md border bg-background hover:bg-muted text-sm disabled:opacity-60">
                {logoUploading ? "Uploading…" : "Upload logo"}
              </button>
              <div className="text-xs text-muted-foreground mt-1">PNG or SVG recommended. Max 2MB.</div>
            </div>
          </div>
        </div>

        {/* Brand colour */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Brand colour</label>
          <div className="flex items-center gap-3">
            <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-16 rounded-md border cursor-pointer bg-background p-0.5" />
            <input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} placeholder="#4f8a1f" className="w-28 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono" />
            <div className="text-xs text-muted-foreground">Used on client portal, booking page, contracts and invoices</div>
          </div>
        </div>

        {/* Font */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Brand font</label>
          <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full sm:w-80 px-3 py-2 rounded-md border border-input bg-background text-sm">
            <option value="">Default (Inter)</option>
            <option value="'Playfair Display', Georgia, serif">Playfair Display — elegant, editorial</option>
            <option value="'Cormorant Garamond', Georgia, serif">Cormorant Garamond — luxury, fine art</option>
            <option value="'Montserrat', sans-serif">Montserrat — modern, clean</option>
            <option value="'Raleway', sans-serif">Raleway — contemporary, minimal</option>
            <option value="'Lato', sans-serif">Lato — friendly, professional</option>
            <option value="Georgia, serif">Georgia — classic, timeless</option>
            <option value="'DM Sans', sans-serif">DM Sans — geometric, sharp</option>
          </select>
          {fontFamily && (
            <div className="mt-2 text-sm text-muted-foreground" style={{ fontFamily }}>
              Preview: The quick brown fox jumps over the lazy dog
            </div>
          )}
        </div>

        {/* Business address */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Business address</label>
            <input value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="123 High Street" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">City</label>
            <input value={businessCity} onChange={(e) => setBusinessCity(e.target.value)} placeholder="London" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
          </div>
        </div>

        {/* VAT number */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">VAT number <span className="text-muted-foreground/60">(optional)</span></label>
          <input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="GB123456789" className="w-full sm:w-64 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono" />
        </div>

        {/* Default invoice notes */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Default invoice notes</label>
          <textarea value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} rows={2} placeholder="e.g. Payment due within 14 days. Bank transfer preferred." className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" />
        </div>

        {/* Default contract template */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Default contract template</label>
          <textarea value={contractTemplate} onChange={(e) => setContractTemplate(e.target.value)} rows={6} placeholder="Write your standard contract terms here. This will pre-fill whenever you create a new contract." className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono resize-y" />
        </div>

        <button onClick={saveProfile} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Save branding</button>
        </>)}
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
