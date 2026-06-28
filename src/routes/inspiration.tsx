import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Upload, Trash2, ImagePlus, Lock, Link2, ExternalLink, FolderPlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/inspiration")({
  component: () => <AppShell title="Inspiration"><InspirationPage /></AppShell>,
});

type Img = {
  id: string;
  image_url: string;
  note: string | null;
  shoot_id: string | null;
  source_type: string;
  gallery: string | null;
  signedUrl?: string;
};
type ShootOpt = { id: string; name: string };

const MAX_BYTES = 50 * 1024 * 1024;

async function resolveUrl(r: Img): Promise<void> {
  if (r.source_type === "url") { r.signedUrl = r.image_url; return; }
  try {
    const { data: s } = await supabase.storage.from("inspiration").createSignedUrl(r.image_url, 3600);
    r.signedUrl = s?.signedUrl ?? undefined;
  } catch { r.signedUrl = undefined; }
}

function InspirationPage() {
  const { user, profile } = useAuth();
  const [images, setImages] = useState<Img[] | null>(null);
  const [shoots, setShoots] = useState<ShootOpt[]>([]);
  const [galleries, setGalleries] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isPro = !!profile?.is_pro;

  // Load galleries from DB (persisted independently of images)
  const loadGalleries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("galleries")
      .select("name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setGalleries((data ?? []).map((r: any) => r.name));
  };

  const loadImages = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("inspiration_images")
      .select("id, image_url, note, shoot_id, source_type, gallery, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    let rows: Img[];
    if (error) {
      // Fallback if columns don't exist yet
      const { data: fb } = await supabase
        .from("inspiration_images")
        .select("id, image_url, note, shoot_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      rows = (fb ?? []).map((r: any) => ({ ...r, source_type: "upload", gallery: null }));
    } else {
      rows = (data ?? []).map((r: any) => ({
        ...r,
        source_type: r.source_type ?? "upload",
        gallery: r.gallery ?? null,
      }));
    }

    await Promise.all(rows.map(resolveUrl));
    setImages(rows);

    const { data: ss } = await supabase.from("shoots").select("id,name").eq("user_id", user.id);
    setShoots((ss as any) ?? []);
  };

  useEffect(() => {
    loadGalleries();
    loadImages();
  }, [user]);

  const createGallery = async (name: string) => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (galleries.includes(trimmed)) {
      toast.error("A gallery with that name already exists");
      return;
    }
    const { error } = await supabase
      .from("galleries")
      .insert({ user_id: user.id, name: trimmed });
    if (error) { toast.error("Could not create gallery: " + error.message); return; }
    setGalleries((prev) => [...prev, trimmed]);
    setGalleryFilter(trimmed);
    toast.success(`Gallery "${trimmed}" created`);
  };

  const deleteGallery = async (name: string) => {
    if (!user) return;
    if (!confirm(`Delete gallery "${name}"? Images in it won't be deleted, just unassigned.`)) return;
    // Unassign images from this gallery
    await supabase
      .from("inspiration_images")
      .update({ gallery: null } as any)
      .eq("user_id", user.id)
      .eq("gallery", name);
    // Delete gallery record
    await supabase.from("galleries").delete().eq("user_id", user.id).eq("name", name);
    setGalleries((prev) => prev.filter((g) => g !== name));
    setImages((imgs) => imgs?.map((i) => i.gallery === name ? { ...i, gallery: null } : i) ?? null);
    if (galleryFilter === name) setGalleryFilter("all");
    toast.success(`Gallery "${name}" deleted`);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > MAX_BYTES) {
      toast.error("File too large — maximum 50 MB per image.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy(true);
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("inspiration").upload(path, file);
    if (upErr) { setBusy(false); toast.error("Upload failed: " + upErr.message); return; }

    const { data: inserted, error: insErr } = await supabase
      .from("inspiration_images")
      .insert({ user_id: user.id, image_url: path, source_type: "upload" } as any)
      .select("id, image_url, note, shoot_id, source_type, gallery, created_at")
      .single();

    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (insErr) {
      toast.error("Save failed: " + insErr.message);
      await supabase.storage.from("inspiration").remove([path]);
      return;
    }

    const newImg: Img = { ...inserted as any, source_type: "upload", gallery: null };
    await resolveUrl(newImg);
    setImages((prev) => prev ? [newImg, ...prev] : [newImg]);
    toast.success("Image added");
  };

  const updateImage = async (id: string, patch: Partial<Img>) => {
    setImages((imgs) => imgs?.map((i) => i.id === id ? { ...i, ...patch } : i) ?? null);
    const { error } = await supabase.from("inspiration_images").update(patch as any).eq("id", id);
    if (error) toast.error("Could not save: " + error.message);
  };

  const removeImage = async (id: string, imagePath: string, srcType: string) => {
    if (!confirm("Delete this image?")) return;
    if (srcType !== "url") {
      await supabase.storage.from("inspiration").remove([imagePath]).catch(() => {});
    }
    await supabase.from("inspiration_images").delete().eq("id", id);
    setImages((imgs) => imgs?.filter((i) => i.id !== id) ?? null);
    toast.success("Deleted");
  };

  if (!isPro) return (
    <div className="rounded-lg border bg-card shadow-card p-10 text-center">
      <Lock className="h-10 w-10 mx-auto text-muted-foreground" />
      <h2 className="mt-4 text-xl font-semibold">Inspiration board is a Pro feature</h2>
      <p className="text-muted-foreground mt-1">Save reference images, link them to shoots and build your visual library.</p>
      <Link to="/billing" className="mt-5 inline-flex px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">Upgrade to Pro</Link>
    </div>
  );

  const filtered = images?.filter((i) => {
    const byShoot   = filter        === "all" ? true : filter        === "none" ? !i.shoot_id : i.shoot_id === filter;
    const byGallery = galleryFilter === "all" ? true : galleryFilter === "none" ? !i.gallery  : i.gallery  === galleryFilter;
    return byShoot && byGallery;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Inspiration</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={galleryFilter} onChange={(e) => setGalleryFilter(e.target.value)} className="px-3 py-2 rounded-md border bg-background text-sm">
            <option value="all">All galleries</option>
            <option value="none">Ungalleried</option>
            {galleries.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 rounded-md border bg-background text-sm">
            <option value="all">All shoots</option>
            <option value="none">Unassigned</option>
            {shoots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {galleryFilter !== "all" && galleryFilter !== "none" && (
            <button
              onClick={() => deleteGallery(galleryFilter)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 text-sm"
            >
              <X className="h-3.5 w-3.5" /> Delete gallery
            </button>
          )}
          <button onClick={() => setShowGalleryModal(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm">
            <FolderPlus className="h-4 w-4" /> New gallery
          </button>
          <button onClick={() => setShowUrlModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">
            <Link2 className="h-4 w-4" /> Add from URL
          </button>
          <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.tiff,.tif" className="hidden" onChange={onUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Uploading…" : "Upload image"}
          </button>
        </div>
      </div>

      {images === null ? (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="break-inside-avoid h-48 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card py-16 text-center">
          <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">
            {galleryFilter !== "all" && galleryFilter !== "none" ? `No images in "${galleryFilter}" yet` : "No images yet"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            {galleryFilter !== "all" && galleryFilter !== "none"
              ? "Upload images and assign them to this gallery using the dropdown on each image."
              : "Upload a file (up to 50 MB) or add from URL."}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered!.map((img) => (
            <div key={img.id} className="break-inside-avoid rounded-lg border bg-card shadow-card overflow-hidden group relative">
              {img.signedUrl ? (
                <img
                  src={img.signedUrl}
                  alt={img.note ?? ""}
                  className="w-full h-auto block"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-36 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  Image unavailable
                </div>
              )}
              <div className="p-3 space-y-2">
                <input
                  value={img.note ?? ""}
                  onChange={(e) => setImages((all) => all?.map((i) => i.id === img.id ? { ...i, note: e.target.value } : i) ?? null)}
                  onBlur={(e) => updateImage(img.id, { note: e.target.value || null })}
                  placeholder="Add a note…"
                  className="w-full text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
                />
                <div className="flex gap-2">
                  <select
                    value={img.gallery ?? ""}
                    onChange={(e) => updateImage(img.id, { gallery: e.target.value || null })}
                    className="flex-1 text-xs px-2 py-1 rounded border bg-background"
                  >
                    <option value="">No gallery</option>
                    {galleries.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select
                    value={img.shoot_id ?? ""}
                    onChange={(e) => updateImage(img.id, { shoot_id: e.target.value || null })}
                    className="flex-1 text-xs px-2 py-1 rounded border bg-background"
                  >
                    <option value="">No shoot</option>
                    {shoots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              {img.source_type === "url" && (
                <a href={img.image_url} target="_blank" rel="noreferrer" className="absolute top-2 left-2 p-1.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button onClick={() => removeImage(img.id, img.image_url, img.source_type)} className="absolute top-2 right-2 p-1.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-opacity">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showUrlModal && (
        <AddUrlModal
          galleries={galleries}
          onClose={() => setShowUrlModal(false)}
          onAdd={async (url, gallery) => {
            if (!user) return;
            const { data: inserted, error: err } = await supabase
              .from("inspiration_images")
              .insert({ user_id: user.id, image_url: url, source_type: "url", gallery: gallery || null } as any)
              .select("id, image_url, note, shoot_id, source_type, gallery, created_at")
              .single();
            if (err) { toast.error(err.message); return; }
            const newImg: Img = { ...inserted as any, source_type: "url", gallery: gallery || null, signedUrl: url };
            setImages((prev) => prev ? [newImg, ...prev] : [newImg]);
            toast.success("Image added");
            setShowUrlModal(false);
          }}
        />
      )}

      {showGalleryModal && (
        <NewGalleryModal
          onClose={() => setShowGalleryModal(false)}
          onCreate={async (name) => {
            await createGallery(name);
            setShowGalleryModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddUrlModal({ onClose, onAdd, galleries }: { onClose: () => void; onAdd: (url: string, gallery: string) => void; galleries: string[] }) {
  const [url, setUrl] = useState("");
  const [gallery, setGallery] = useState("");
  const [newGallery, setNewGallery] = useState("");

  const submit = () => {
    const t = url.trim();
    if (!t) { toast.error("Paste an image URL first"); return; }
    if (!/^https?:\/\//i.test(t)) { toast.error("URL must start with https://"); return; }
    onAdd(t, newGallery.trim() || gallery);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg border shadow-card max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Add image from URL</h3>
        <p className="text-sm text-muted-foreground mt-1">
          On Pinterest: open an image → right-click → <strong>Copy image address</strong> → paste below.
        </p>
        <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder="https://i.pinimg.com/…" className="mt-3 w-full px-3 py-2 rounded-md border bg-background text-sm" />
        <div className="mt-3">
          <label className="text-xs text-muted-foreground">Gallery (optional)</label>
          <div className="mt-1 flex gap-2">
            <select value={gallery} onChange={(e) => { setGallery(e.target.value); setNewGallery(""); }} className="flex-1 px-2 py-2 rounded-md border bg-background text-sm">
              <option value="">No gallery</option>
              {galleries.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input value={newGallery} onChange={(e) => { setNewGallery(e.target.value); setGallery(""); }} placeholder="New gallery name" className="flex-1 px-2 py-2 rounded-md border bg-background text-sm" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Cancel</button>
          <button onClick={submit} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add image</button>
        </div>
      </div>
    </div>
  );
}

function NewGalleryModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onCreate(name.trim());
    setSaving(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg border shadow-card max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">New gallery</h3>
        <p className="text-sm text-muted-foreground mt-1">Group your inspiration images into named collections.</p>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) submit(); }} placeholder="e.g. Nightclub moodboard" className="mt-3 w-full px-3 py-2 rounded-md border bg-background text-sm" />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Cancel</button>
          <button onClick={submit} disabled={!name.trim() || saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
