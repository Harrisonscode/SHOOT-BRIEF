import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Upload, Trash2, Lock, Link2, ExternalLink,
  FolderPlus, Loader2, X, ArrowLeft, Images, Pencil
} from "lucide-react";
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

type Gallery = {
  name: string;
  coverUrl?: string;
  count: number;
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
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [shoots, setShoots] = useState<ShootOpt[]>([]);
  const [activeGallery, setActiveGallery] = useState<string | null>(null); // null = home view
  const [busy, setBusy] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [renamingGallery, setRenamingGallery] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isPro = !!profile?.is_pro;

  const loadImages = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("inspiration_images")
      .select("id, image_url, note, shoot_id, source_type, gallery, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    let rows: Img[];
    if (error) {
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

  const loadGalleries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("galleries")
      .select("name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setGalleries((data ?? []).map((r: any) => ({ name: r.name, count: 0 })));
  };

  useEffect(() => {
    loadGalleries();
    loadImages();
  }, [user]);

  // Enrich galleries with cover image + count once images load
  useEffect(() => {
    if (!images) return;
    setGalleries((prev) => prev.map((g) => {
      const imgs = images.filter((i) => i.gallery === g.name);
      const cover = imgs.find((i) => i.signedUrl)?.signedUrl;
      return { ...g, count: imgs.length, coverUrl: cover };
    }));
  }, [images]);

  const createGallery = async (name: string) => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (galleries.some((g) => g.name === trimmed)) {
      toast.error("A gallery with that name already exists");
      return;
    }
    const { error } = await supabase.from("galleries").insert({ user_id: user.id, name: trimmed });
    if (error) { toast.error(error.message); return; }
    setGalleries((prev) => [...prev, { name: trimmed, count: 0 }]);
    setActiveGallery(trimmed);
    toast.success(`Gallery "${trimmed}" created`);
  };

  const renameGallery = async (oldName: string, newName: string) => {
    if (!user || !newName.trim() || newName === oldName) { setRenamingGallery(null); return; }
    const trimmed = newName.trim();
    // Update gallery record
    await supabase.from("galleries").update({ name: trimmed } as any).eq("user_id", user.id).eq("name", oldName);
    // Update all images in this gallery
    await supabase.from("inspiration_images").update({ gallery: trimmed } as any).eq("user_id", user.id).eq("gallery", oldName);
    setGalleries((prev) => prev.map((g) => g.name === oldName ? { ...g, name: trimmed } : g));
    setImages((prev) => prev?.map((i) => i.gallery === oldName ? { ...i, gallery: trimmed } : i) ?? null);
    if (activeGallery === oldName) setActiveGallery(trimmed);
    setRenamingGallery(null);
    toast.success("Gallery renamed");
  };

  const deleteGallery = async (name: string) => {
    if (!user || !confirm(`Delete gallery "${name}"? Images will be kept but unassigned.`)) return;
    await supabase.from("inspiration_images").update({ gallery: null } as any).eq("user_id", user.id).eq("gallery", name);
    await supabase.from("galleries").delete().eq("user_id", user.id).eq("name", name);
    setGalleries((prev) => prev.filter((g) => g.name !== name));
    setImages((prev) => prev?.map((i) => i.gallery === name ? { ...i, gallery: null } : i) ?? null);
    setActiveGallery(null);
    toast.success("Gallery deleted");
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > MAX_BYTES) { toast.error("File too large — maximum 50 MB"); if (fileRef.current) fileRef.current.value = ""; return; }
    setBusy(true);
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("inspiration").upload(path, file);
    if (upErr) { setBusy(false); toast.error("Upload failed: " + upErr.message); return; }
    const { data: inserted, error: insErr } = await supabase
      .from("inspiration_images")
      .insert({ user_id: user.id, image_url: path, source_type: "upload", gallery: activeGallery } as any)
      .select("id, image_url, note, shoot_id, source_type, gallery, created_at")
      .single();
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (insErr) { toast.error("Save failed: " + insErr.message); await supabase.storage.from("inspiration").remove([path]); return; }
    const newImg: Img = { ...inserted as any, source_type: "upload", gallery: activeGallery };
    await resolveUrl(newImg);
    setImages((prev) => prev ? [newImg, ...prev] : [newImg]);
    if (activeGallery) {
      setGalleries((prev) => prev.map((g) => g.name === activeGallery
        ? { ...g, count: g.count + 1, coverUrl: g.coverUrl ?? newImg.signedUrl }
        : g
      ));
    }
    toast.success("Image added");
  };

  const updateImage = async (id: string, patch: Partial<Img>) => {
    setImages((imgs) => imgs?.map((i) => i.id === id ? { ...i, ...patch } : i) ?? null);
    const { error } = await supabase.from("inspiration_images").update(patch as any).eq("id", id);
    if (error) toast.error("Could not save: " + error.message);
    // Refresh gallery counts/covers
    if (patch.gallery !== undefined) {
      setGalleries((prev) => prev.map((g) => {
        const imgs = (images ?? []).map((i) => i.id === id ? { ...i, ...patch } : i);
        const gImgs = imgs.filter((i) => i.gallery === g.name);
        return { ...g, count: gImgs.length, coverUrl: gImgs.find((i) => i.signedUrl)?.signedUrl };
      }));
    }
  };

  const removeImage = async (id: string, imagePath: string, srcType: string) => {
    if (!confirm("Delete this image?")) return;
    if (srcType !== "url") await supabase.storage.from("inspiration").remove([imagePath]).catch(() => {});
    await supabase.from("inspiration_images").delete().eq("id", id);
    setImages((imgs) => imgs?.filter((i) => i.id !== id) ?? null);
    if (activeGallery) {
      setGalleries((prev) => prev.map((g) => g.name === activeGallery ? { ...g, count: Math.max(0, g.count - 1) } : g));
    }
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

  const galleryImages = images?.filter((i) =>
    activeGallery ? i.gallery === activeGallery : i.gallery === null
  ) ?? [];

  const ungroupedCount = images?.filter((i) => i.gallery === null).length ?? 0;

  // ─── Gallery detail view ────────────────────────────────────────────────────
  if (activeGallery !== null) {
    const gallery = galleries.find((g) => g.name === activeGallery);
    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button onClick={() => setActiveGallery(null)} className="p-1.5 rounded-md hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {renamingGallery === activeGallery ? (
            <input
              autoFocus
              defaultValue={activeGallery}
              onBlur={(e) => renameGallery(activeGallery, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") renameGallery(activeGallery, (e.target as HTMLInputElement).value); if (e.key === "Escape") setRenamingGallery(null); }}
              className="text-2xl font-bold bg-transparent border-b-2 border-primary focus:outline-none"
            />
          ) : (
            <h1 className="text-2xl font-bold">{activeGallery}</h1>
          )}
          <button onClick={() => setRenamingGallery(activeGallery)} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
            <Pencil className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">{galleryImages.length} image{galleryImages.length !== 1 ? "s" : ""}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setShowUrlModal(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm">
              <Link2 className="h-4 w-4" /> Add URL
            </button>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.tiff,.tif" className="hidden" onChange={onUpload} />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? "Uploading…" : "Upload"}
            </button>
            <button onClick={() => deleteGallery(activeGallery)} className="p-2 rounded-md border hover:bg-destructive/10 text-destructive border-destructive/30">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {galleryImages.length === 0 ? (
          <div className="rounded-lg border bg-card shadow-card py-16 text-center">
            <Images className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No images yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Upload images or add from URL to fill this gallery.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {galleryImages.map((img) => (
              <ImageCard
                key={img.id}
                img={img}
                shoots={shoots}
                galleries={galleries.map((g) => g.name)}
                onUpdate={updateImage}
                onRemove={removeImage}
              />
            ))}
          </div>
        )}

        {showUrlModal && (
          <AddUrlModal
            galleries={galleries.map((g) => g.name)}
            defaultGallery={activeGallery}
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
      </div>
    );
  }

  // ─── Gallery home view ───────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Inspiration</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGalleryModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <FolderPlus className="h-4 w-4" /> New gallery
          </button>
        </div>
      </div>

      {images === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Gallery cards */}
          {galleries.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Galleries</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {galleries.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => setActiveGallery(g.name)}
                    className="group text-left rounded-xl border bg-card shadow-card overflow-hidden hover:ring-2 ring-primary/30 transition-all"
                  >
                    {/* Cover image */}
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {g.coverUrl ? (
                        <img
                          src={g.coverUrl}
                          alt={g.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Images className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      {/* Count badge */}
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium">
                        {g.count} image{g.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="font-semibold text-sm">{g.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Ungrouped images */}
          {ungroupedCount > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ungrouped images ({ungroupedCount})</h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowUrlModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background hover:bg-muted text-xs">
                    <Link2 className="h-3.5 w-3.5" /> Add URL
                  </button>
                  <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.tiff,.tif" className="hidden" onChange={onUpload} />
                  <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background hover:bg-muted text-xs disabled:opacity-60">
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                  </button>
                </div>
              </div>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                {images.filter((i) => !i.gallery).map((img) => (
                  <ImageCard
                    key={img.id}
                    img={img}
                    shoots={shoots}
                    galleries={galleries.map((g) => g.name)}
                    onUpdate={updateImage}
                    onRemove={removeImage}
                  />
                ))}
              </div>
            </>
          )}

          {galleries.length === 0 && ungroupedCount === 0 && (
            <div className="rounded-lg border bg-card shadow-card py-16 text-center">
              <Images className="h-10 w-10 mx-auto text-muted-foreground" />
              <h3 className="mt-3 font-semibold">No inspiration yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Create a gallery to organise your reference images, or upload images directly.
              </p>
              <div className="mt-4 flex gap-3 justify-center">
                <button onClick={() => setShowGalleryModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                  <FolderPlus className="h-4 w-4" /> New gallery
                </button>
                <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.tiff,.tif" className="hidden" onChange={onUpload} />
                <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm">
                  <Upload className="h-4 w-4" /> Upload image
                </button>
              </div>
            </div>
          )}

          {/* Upload to ungrouped if galleries exist but no ungrouped yet */}
          {galleries.length > 0 && ungroupedCount === 0 && (
            <div className="mt-4 flex gap-2">
              <input ref={fileRef} type="file" accept="image/*,.heic,.heif,.tiff,.tif" className="hidden" onChange={onUpload} />
              <button onClick={() => fileRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload image (ungrouped)
              </button>
              <button onClick={() => setShowUrlModal(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm">
                <Link2 className="h-4 w-4" /> Add from URL
              </button>
            </div>
          )}
        </>
      )}

      {showGalleryModal && (
        <NewGalleryModal
          onClose={() => setShowGalleryModal(false)}
          onCreate={async (name) => { await createGallery(name); setShowGalleryModal(false); }}
        />
      )}

      {showUrlModal && (
        <AddUrlModal
          galleries={galleries.map((g) => g.name)}
          defaultGallery={null}
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
    </div>
  );
}

// ─── Image card ───────────────────────────────────────────────────────────────
function ImageCard({ img, shoots, galleries, onUpdate, onRemove }: {
  img: Img;
  shoots: ShootOpt[];
  galleries: string[];
  onUpdate: (id: string, patch: Partial<Img>) => void;
  onRemove: (id: string, path: string, srcType: string) => void;
}) {
  return (
    <div className="break-inside-avoid rounded-lg border bg-card shadow-card overflow-hidden group relative">
      {img.signedUrl ? (
        <img src={img.signedUrl} alt={img.note ?? ""} className="w-full h-auto block" loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      ) : (
        <div className="w-full h-36 bg-muted flex items-center justify-center text-xs text-muted-foreground">Image unavailable</div>
      )}
      <div className="p-3 space-y-2">
        <input
          value={img.note ?? ""}
          onChange={(e) => onUpdate(img.id, { note: e.target.value || null })}
          placeholder="Add a note…"
          className="w-full text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/60"
        />
        <div className="flex gap-2">
          <select value={img.gallery ?? ""} onChange={(e) => onUpdate(img.id, { gallery: e.target.value || null })} className="flex-1 text-xs px-2 py-1 rounded border bg-background">
            <option value="">No gallery</option>
            {galleries.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={img.shoot_id ?? ""} onChange={(e) => onUpdate(img.id, { shoot_id: e.target.value || null })} className="flex-1 text-xs px-2 py-1 rounded border bg-background">
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
      <button onClick={() => onRemove(img.id, img.image_url, img.source_type)} className="absolute top-2 right-2 p-1.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-opacity">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function NewGalleryModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => { if (!name.trim()) return; setSaving(true); await onCreate(name.trim()); setSaving(false); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg border shadow-card max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">New gallery</h3>
        <p className="text-sm text-muted-foreground mt-1">Give your gallery a name to get started.</p>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) submit(); }} placeholder="e.g. Wedding moodboard" className="mt-3 w-full px-3 py-2 rounded-md border bg-background text-sm" />
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

function AddUrlModal({ onClose, onAdd, galleries, defaultGallery }: {
  onClose: () => void;
  onAdd: (url: string, gallery: string) => void;
  galleries: string[];
  defaultGallery: string | null;
}) {
  const [url, setUrl] = useState("");
  const [gallery, setGallery] = useState(defaultGallery ?? "");
  const submit = () => {
    const t = url.trim();
    if (!t) { toast.error("Paste an image URL first"); return; }
    if (!/^https?:\/\//i.test(t)) { toast.error("URL must start with https://"); return; }
    onAdd(t, gallery);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-lg border shadow-card max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Add image from URL</h3>
        <p className="text-sm text-muted-foreground mt-1">On Pinterest: open an image → right-click → <strong>Copy image address</strong>.</p>
        <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder="https://i.pinimg.com/…" className="mt-3 w-full px-3 py-2 rounded-md border bg-background text-sm" />
        {galleries.length > 0 && (
          <div className="mt-3">
            <label className="text-xs text-muted-foreground">Gallery (optional)</label>
            <select value={gallery} onChange={(e) => setGallery(e.target.value)} className="mt-1 w-full px-2 py-2 rounded-md border bg-background text-sm">
              <option value="">No gallery</option>
              {galleries.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Cancel</button>
          <button onClick={submit} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Add image</button>
        </div>
      </div>
    </div>
  );
}
