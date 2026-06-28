import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Plus, Trash2, Pencil, X, Check, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/packages")({
  head: () => ({ meta: [{ title: "Packages — Shoot Brief" }] }),
  component: () => <AppShell title="Packages"><PackagesPage /></AppShell>,
});

type Package = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  duration_hours: number | null;
  deliverables: string | null;
  is_active: boolean;
};

const BLANK: Omit<Package, "id"> = {
  name: "",
  description: "",
  price: null,
  currency: "GBP",
  duration_hours: null,
  deliverables: "",
  is_active: true,
};

const CURRENCIES = ["GBP", "USD", "EUR"];

function fmt(price: number | null, currency: string) {
  if (price === null) return "POA";
  const sym: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };
  return `${sym[currency] ?? currency}${price.toLocaleString("en-GB", { minimumFractionDigits: 0 })}`;
}

function PackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [editing, setEditing] = useState<Package | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Package, "id">>(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("packages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    setPackages((data as any) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const openCreate = () => {
    setForm(BLANK);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (pkg: Package) => {
    setForm({ ...pkg });
    setEditing(pkg);
    setCreating(false);
  };

  const closeModal = () => { setCreating(false); setEditing(null); };

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!user || !form.name.trim()) { toast.error("Package name is required"); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("packages").update({ ...form } as any).eq("id", editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      setPackages((prev) => prev?.map((p) => p.id === editing.id ? { ...editing, ...form } : p) ?? null);
      toast.success("Package updated");
    } else {
      const { data, error } = await supabase
        .from("packages")
        .insert({ ...form, user_id: user.id } as any)
        .select()
        .single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setPackages((prev) => [...(prev ?? []), data as any]);
      toast.success("Package created");
    }
    setSaving(false);
    closeModal();
  };

  const toggleActive = async (pkg: Package) => {
    await supabase.from("packages").update({ is_active: !pkg.is_active } as any).eq("id", pkg.id);
    setPackages((prev) => prev?.map((p) => p.id === pkg.id ? { ...p, is_active: !p.is_active } : p) ?? null);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    await supabase.from("packages").delete().eq("id", id);
    setPackages((prev) => prev?.filter((p) => p.id !== id) ?? null);
    toast.success("Deleted");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Packages</h1>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New package
        </button>
      </div>

      {packages === null ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card py-16 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No packages yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Create packages like "Wedding Full Day" or "Portrait Session" to attach to shoots and display on your booking page.
          </p>
          <button onClick={openCreate} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> Create your first package
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className={`rounded-lg border bg-card shadow-card p-5 flex flex-col gap-3 ${!pkg.is_active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{pkg.name}</div>
                  <div className="text-xl font-bold text-primary mt-0.5">{fmt(pkg.price, pkg.currency)}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(pkg)} className="p-1.5 rounded hover:bg-muted">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => remove(pkg.id)} className="p-1.5 rounded hover:bg-muted">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {pkg.description && <p className="text-sm text-muted-foreground">{pkg.description}</p>}

              <div className="flex flex-wrap gap-2 text-xs">
                {pkg.duration_hours && (
                  <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">⏱ {pkg.duration_hours}h</span>
                )}
                {pkg.deliverables && (
                  <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">📁 {pkg.deliverables}</span>
                )}
              </div>

              <button
                onClick={() => toggleActive(pkg)}
                className={`mt-auto text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
                  pkg.is_active
                    ? "border-primary/30 text-primary hover:bg-primary/5"
                    : "border-gray-200 text-muted-foreground hover:bg-muted"
                }`}
              >
                {pkg.is_active ? "Active" : "Inactive — click to activate"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div className="bg-card rounded-xl border shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{editing ? "Edit package" : "New package"}</h2>
              <button onClick={closeModal} className="p-1.5 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Package name *</label>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Wedding Full Day"
                  className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Description</label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What's included, style of shoot, etc."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Price</label>
                  <input
                    type="number"
                    min={0}
                    value={form.price ?? ""}
                    onChange={(e) => set("price", e.target.value ? Number(e.target.value) : null)}
                    placeholder="Leave blank for POA"
                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => set("currency", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Duration (hours)</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.duration_hours ?? ""}
                  onChange={(e) => set("duration_hours", e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Deliverables</label>
                <input
                  value={form.deliverables ?? ""}
                  onChange={(e) => set("deliverables", e.target.value)}
                  placeholder="e.g. 500 edited photos, online gallery"
                  className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-lg border bg-background hover:bg-muted text-sm font-medium">Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Save changes" : "Create package"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
