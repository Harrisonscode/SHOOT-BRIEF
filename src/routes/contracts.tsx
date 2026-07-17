import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { FileText, Plus, Send, CheckCircle, Clock, Trash2, X, ExternalLink, Copy, CheckCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/contracts")({
  component: () => <AppShell title="Contracts"><ContractsPage /></AppShell>,
});

type Contract = {
  id: string;
  shoot_id: string;
  title: string;
  body: string;
  status: "draft" | "sent" | "signed";
  signed_at: string | null;
  signed_name: string | null;
  client_token: string;
  created_at: string;
  shoots: { name: string; client_name: string | null } | null;
};

function ContractsPage() {
  const { user, profile } = useAuth();
  const isPro = !!profile?.is_pro;

  const [contracts, setContracts] = useState<Contract[] | null>(null);
  const [shoots, setShoots] = useState<Array<{ id: string; name: string; client_name: string | null }>>([]);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [selectedShoot, setSelectedShoot] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const DEFAULT_CONTRACT = profile?.contract_template || `This photography agreement is entered into between the photographer and the client.

**Services**
The photographer agrees to provide photography services as described in the shoot brief.

**Delivery**
Edited images will be delivered within the agreed timeframe via a digital gallery link.

**Usage Rights**
The photographer retains copyright of all images. The client receives a licence for personal use. Commercial usage requires separate written agreement.

**Cancellation**
Cancellations made less than 14 days before the shoot date may result in forfeit of the deposit.

**Payment**
Full payment is due on or before the shoot date unless otherwise agreed.

By signing this contract, both parties agree to the terms above.`;

  if (profile && !isPro) {
    return (
      <div className="rounded-lg border bg-card shadow-card py-16 px-6 text-center max-w-md">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4"><Lock className="h-6 w-6 text-muted-foreground" /></div>
        <h3 className="font-semibold text-lg">Contracts is a Pro feature</h3>
        <p className="text-sm text-muted-foreground mt-2">Upgrade to Pro to create and send contracts, get digital signatures, and manage your client agreements.</p>
        <Link to="/billing" className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Upgrade to Pro →</Link>
      </div>
    );
  }

  useEffect(() => {
    if (!user) return;
    Promise.all([
      (supabase.from("contracts") as any).select("*, shoots(name, client_name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      (supabase.from("shoots") as any).select("id, name, client_name").eq("user_id", user.id).order("date", { ascending: false }),
    ]).then(([{ data: c }, { data: s }]) => {
      setContracts((c as any) ?? []);
      setShoots((s as any) ?? []);
    });
  }, [user]);

  const createContract = async () => {
    if (!user || !selectedShoot) { toast.error("Select a shoot first"); return; }
    setSaving(true);
    const { data, error } = await (supabase.from("contracts") as any).insert({
      user_id: user.id,
      shoot_id: selectedShoot,
      title: editTitle || "Photography Contract",
      body: editBody || DEFAULT_CONTRACT,
      status: "draft",
    } as any).select("*, shoots(name, client_name)").single() as any;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setContracts((prev) => [data as any, ...(prev ?? [])]);
    setShowNew(false);
    setSelected(data as any);
    setEditTitle("");
    setEditBody("");
    setSelectedShoot("");
  };

  const updateContract = async (id: string, patch: Partial<Contract>) => {
    await (supabase.from("contracts") as any).update(patch as any).eq("id", id);
    setContracts((prev) => prev?.map((c) => c.id === id ? { ...c, ...patch } : c) ?? null);
    if (selected?.id === id) setSelected((s) => s ? { ...s, ...patch } : null);
  };

  const sendContract = async (contract: Contract) => {
    await updateContract(contract.id, { status: "sent" });
    toast.success("Contract marked as sent");
  };

  const markPaid = async (contract: Contract) => {
    await updateContract(contract.id, { status: "signed" });
    toast.success("Contract marked as signed");
  };

  const deleteContract = async (id: string) => {
    if (!confirm("Delete this contract?")) return;
    await (supabase.from("contracts") as any).delete().eq("id", id);
    setContracts((prev) => prev?.filter((c) => c.id !== id) ?? null);
    if (selected?.id === id) setSelected(null);
  };

  const copySignLink = (contract: Contract) => {
    const url = `https://shootbrief.app/sign/${contract.client_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-blue-100 text-blue-700",
      signed: "bg-green-100 text-green-700",
    };
    return map[status] ?? map.draft;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Contracts</h1>
        <button onClick={() => { setShowNew(true); setEditTitle("Photography Contract"); setEditBody(DEFAULT_CONTRACT); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New contract
        </button>
      </div>

      {contracts === null ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : contracts.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card py-16 px-6 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No contracts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create a contract for a shoot, send a signing link to your client.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> New contract
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Contract list */}
          <div className="space-y-3">
            {contracts.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left rounded-lg border bg-card shadow-card p-4 hover:border-primary/30 transition-colors ${selected?.id === c.id ? "border-primary/40 ring-1 ring-primary" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.shoots?.name}{c.shoots?.client_name ? ` · ${c.shoots.client_name}` : ""}</div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge(c.status)}`}>{c.status}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{format(new Date(c.created_at), "d MMM yyyy")}</div>
              </button>
            ))}
          </div>

          {/* Contract detail */}
          {selected && (
            <div className="rounded-lg border bg-card shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{selected.title}</h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => copySignLink(selected)} className="p-1.5 rounded hover:bg-muted" title="Copy signing link">
                    {copied ? <CheckCheck className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <a href={`https://shootbrief.app/sign/${selected.client_token}`} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-muted" title="Preview">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                  <button onClick={() => deleteContract(selected.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge(selected.status)}`}>{selected.status}</span>
                {selected.signed_at && <span className="text-xs text-muted-foreground">Signed by {selected.signed_name} on {format(new Date(selected.signed_at), "d MMM yyyy")}</span>}
              </div>

              {/* Signing link */}
              {selected.status !== "draft" && (
                <div className="rounded-md bg-muted/50 border p-3 text-xs break-all">
                  <div className="text-muted-foreground mb-1 font-medium">Client signing link:</div>
                  https://shootbrief.app/sign/{selected.client_token}
                </div>
              )}

              {/* Contract body preview */}
              <div className="rounded-md border bg-background p-4 text-sm leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap text-muted-foreground font-mono text-xs">
                {selected.body}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {selected.status === "draft" && (
                  <button onClick={() => sendContract(selected)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                    <Send className="h-3.5 w-3.5" /> Send to client
                  </button>
                )}
                {selected.status === "sent" && (
                  <button onClick={() => markPaid(selected)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:opacity-90">
                    <CheckCircle className="h-3.5 w-3.5" /> Mark as signed
                  </button>
                )}
                {selected.status !== "signed" && (
                  <button onClick={() => copySignLink(selected)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm">
                    {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy signing link"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New contract modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowNew(false)}>
          <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New contract</h2>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Shoot</label>
                <select value={selectedShoot} onChange={(e) => setSelectedShoot(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
                  <option value="">Select a shoot…</option>
                  {shoots.map((s) => <option key={s.id} value={s.id}>{s.name}{s.client_name ? ` — ${s.client_name}` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Contract title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Contract text</label>
                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={14} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono resize-y" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm">Cancel</button>
              <button onClick={createContract} disabled={saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {saving ? "Creating…" : "Create contract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
