import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Receipt, Plus, Send, CheckCircle, Trash2, X, Copy, CheckCheck, Lock, CreditCard, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { format } from "date-fns";
import { useServerFn } from "@tanstack/react-start";
import { createInvoicePaymentLink } from "@/lib/stripe.functions";

export const Route = createFileRoute("/invoices")({
  component: () => <AppShell title="Invoices"><InvoicesPage /></AppShell>,
});

type LineItem = { description: string; quantity: number; unit_price: number; total: number };

type Invoice = {
  id: string;
  shoot_id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "overdue";
  issue_date: string;
  due_date: string | null;
  line_items: LineItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  notes: string | null;
  client_token: string;
  paid_at: string | null;
  payment_link_enabled: boolean;
  created_at: string;
  shoots: { name: string; client_name: string | null; client_email: string | null } | null;
};

const CUR_SYM: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };
const fmt = (amount: number, currency = "GBP") => `${CUR_SYM[currency] ?? currency}${Number(amount).toFixed(2)}`;

function InvoicesPage() {
  const { user, profile } = useAuth();
  const isPro = !!profile?.is_pro;
  const isStudio = !!profile?.is_studio;
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
  const makePaymentLink = useServerFn(createInvoicePaymentLink);

  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [shoots, setShoots] = useState<Array<{ id: string; name: string; client_name: string | null; client_email: string | null }>>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  // New invoice form state
  const [newShoot, setNewShoot] = useState("");
  const [newItems, setNewItems] = useState<LineItem[]>([{ description: "Photography services", quantity: 1, unit_price: 0, total: 0 }]);
  const [newTaxRate, setNewTaxRate] = useState(0);
  const [newDueDate, setNewDueDate] = useState("");
  const [newNotes, setNewNotes] = useState(profile?.invoice_notes ?? "");
  const [newCurrency, setNewCurrency] = useState("GBP");

  if (profile && !isPro) {
    return (
      <div className="rounded-lg border bg-card shadow-card py-16 px-6 text-center max-w-md">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4"><Lock className="h-6 w-6 text-muted-foreground" /></div>
        <h3 className="font-semibold text-lg">Invoices is a Pro feature</h3>
        <p className="text-sm text-muted-foreground mt-2">Upgrade to Pro to create invoices, track payments, and send professional invoice links to your clients.</p>
        <Link to="/billing" className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Upgrade to Pro →</Link>
      </div>
    );
  }

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("invoices").select("*, shoots(name, client_name, client_email)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("shoots").select("id, name, client_name, client_email").eq("user_id", user.id).order("date", { ascending: false }),
    ]).then(([{ data: inv }, { data: s }]) => {
      setInvoices((inv as any) ?? []);
      setShoots((s as any) ?? []);
    });
  }, [user]);

  const nextInvoiceNumber = () => {
    const nums = (invoices ?? []).map((i) => parseInt(i.invoice_number.replace(/\D/g, ""), 10)).filter(Boolean);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `INV-${String(next).padStart(3, "0")}`;
  };

  const recalc = (items: LineItem[], taxRate: number) => {
    const sub = items.reduce((s, i) => s + i.total, 0);
    const tax = (sub * taxRate) / 100;
    return { subtotal: sub, tax_amount: tax, total: sub + tax };
  };

  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    const updated = newItems.map((item, i) => {
      if (i !== idx) return item;
      const next = { ...item, [field]: typeof value === "string" ? value : Number(value) };
      next.total = next.quantity * next.unit_price;
      return next;
    });
    setNewItems(updated);
  };

  const createInvoice = async () => {
    if (!user || !newShoot) { toast.error("Select a shoot first"); return; }
    setSaving(true);
    const { subtotal, tax_amount, total } = recalc(newItems, newTaxRate);
    const invNumber = nextInvoiceNumber();
    const { data, error } = await supabase.from("invoices").insert({
      user_id: user.id,
      shoot_id: newShoot,
      invoice_number: invNumber,
      status: "draft",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: newDueDate || null,
      line_items: newItems,
      subtotal,
      tax_rate: newTaxRate,
      tax_amount,
      total,
      currency: newCurrency,
      notes: newNotes || null,
    } as any).select("*, shoots(name, client_name, client_email)").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setInvoices((prev) => [data as any, ...(prev ?? [])]);
    setSelected(data as any);
    setShowNew(false);
    // Reset form
    setNewShoot(""); setNewItems([{ description: "Photography services", quantity: 1, unit_price: 0, total: 0 }]); setNewTaxRate(0); setNewDueDate(""); setNewNotes("");
  };

  const updateStatus = async (id: string, status: Invoice["status"]) => {
    const patch: any = { status };
    if (status === "paid") patch.paid_at = new Date().toISOString();
    await supabase.from("invoices").update(patch).eq("id", id);
    setInvoices((prev) => prev?.map((inv) => inv.id === id ? { ...inv, ...patch } : inv) ?? null);
    if (selected?.id === id) setSelected((s) => s ? { ...s, ...patch } : null);
    toast.success(status === "paid" ? "Invoice marked as paid" : "Invoice sent");
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    await supabase.from("invoices").delete().eq("id", id);
    setInvoices((prev) => prev?.filter((inv) => inv.id !== id) ?? null);
    if (selected?.id === id) setSelected(null);
  };

  const createPaymentLink = async (invoice: Invoice) => {
    if (!isStudio) { toast.error("Payment links are a Studio feature"); return; }
    setCreatingPaymentLink(true);
    try {
      const { url } = await makePaymentLink({
        data: {
          invoice_id: invoice.id,
          amount: invoice.total,
          currency: invoice.currency,
          description: `${invoice.invoice_number} — ${invoice.shoots?.name ?? "Photography services"}`,
        }
      });
      // Update local state
      setInvoices((prev) => prev?.map((inv) => inv.id === invoice.id ? { ...inv, payment_link_enabled: true } : inv) ?? null);
      setSelected((s) => s?.id === invoice.id ? { ...s, payment_link_enabled: true } : s);
      toast.success("Payment link created — clients can now pay online");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create payment link");
    } finally {
      setCreatingPaymentLink(false);
    }
  };

  const copyViewLink = (invoice: Invoice) => {
    navigator.clipboard.writeText(`https://shootbrief.app/invoice/${invoice.client_token}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statusBadge = (status: string) => ({
    draft: "bg-muted text-muted-foreground",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  }[status] ?? "bg-muted text-muted-foreground");

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New invoice
        </button>
      </div>

      {invoices === null ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card py-16 px-6 text-center">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No invoices yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create an invoice for a shoot, add your line items and send it to your client.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus className="h-4 w-4" /> New invoice
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Invoice list */}
          <div className="space-y-3">
            {invoices.map((inv) => (
              <button key={inv.id} onClick={() => setSelected(inv)} className={`w-full text-left rounded-lg border bg-card shadow-card p-4 hover:border-primary/30 transition-colors ${selected?.id === inv.id ? "border-primary/40 ring-1 ring-primary" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{inv.invoice_number}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{inv.shoots?.name}{inv.shoots?.client_name ? ` · ${inv.shoots.client_name}` : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm">{fmt(inv.total, inv.currency)}</div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge(inv.status)}`}>{inv.status}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{format(new Date(inv.issue_date), "d MMM yyyy")}{inv.due_date ? ` · Due ${format(new Date(inv.due_date), "d MMM")}` : ""}</div>
              </button>
            ))}
          </div>

          {/* Invoice detail */}
          {selected && (
            <div className="rounded-lg border bg-card shadow-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{selected.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">{selected.shoots?.name}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => copyViewLink(selected)} className="p-1.5 rounded hover:bg-muted" title="Copy client link">
                    {copied ? <CheckCheck className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => deleteInvoice(selected.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge(selected.status)}`}>{selected.status}</span>
                <span className="text-xs text-muted-foreground">Issued {format(new Date(selected.issue_date), "d MMM yyyy")}</span>
                {selected.due_date && <span className="text-xs text-muted-foreground">Due {format(new Date(selected.due_date), "d MMM yyyy")}</span>}
              </div>

              {/* Line items */}
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Price</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.line_items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{fmt(item.unit_price, selected.currency)}</td>
                        <td className="px-3 py-2 text-right font-medium">{fmt(item.total, selected.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/30">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right text-muted-foreground">Subtotal</td>
                      <td className="px-3 py-2 text-right">{fmt(selected.subtotal, selected.currency)}</td>
                    </tr>
                    {selected.tax_rate > 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-muted-foreground">Tax ({selected.tax_rate}%)</td>
                        <td className="px-3 py-2 text-right">{fmt(selected.tax_amount, selected.currency)}</td>
                      </tr>
                    )}
                    <tr className="font-semibold">
                      <td colSpan={3} className="px-3 py-2 text-right">Total</td>
                      <td className="px-3 py-2 text-right">{fmt(selected.total, selected.currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {selected.notes && (
                <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted/40">{selected.notes}</div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                {selected.status === "draft" && (
                  <button onClick={() => updateStatus(selected.id, "sent")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                    <Send className="h-3.5 w-3.5" /> Send to client
                  </button>
                )}
                {(selected.status === "sent" || selected.status === "overdue") && (
                  <button onClick={() => updateStatus(selected.id, "paid")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:opacity-90">
                    <CheckCircle className="h-3.5 w-3.5" /> Mark as paid
                  </button>
                )}
                <button onClick={() => copyViewLink(selected)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background hover:bg-muted text-sm">
                  {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy client link"}
                </button>
                {!selected.payment_link_enabled && selected.status !== "paid" && isStudio && (
                  <button onClick={() => createPaymentLink(selected)} disabled={creatingPaymentLink} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm disabled:opacity-60">
                    {creatingPaymentLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                    Enable online payment
                  </button>
                )}
                {selected.payment_link_enabled && selected.status !== "paid" && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-purple-50 text-purple-700 text-sm border border-purple-200">
                    <CreditCard className="h-3.5 w-3.5" /> Payment link active
                  </div>
                )}
                {!isStudio && selected.status !== "paid" && (
                  <Link to="/billing" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-muted text-muted-foreground text-sm hover:bg-muted/80">
                    <CreditCard className="h-3.5 w-3.5" /> Enable online payment (Studio)
                  </Link>
                )}
              </div>

              {selected.paid_at && (
                <div className="text-xs text-green-600 font-medium">Paid on {format(new Date(selected.paid_at), "d MMM yyyy")}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New invoice modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowNew(false)}>
          <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New invoice</h2>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Shoot</label>
                  <select value={newShoot} onChange={(e) => {
                    setNewShoot(e.target.value);
                    const s = shoots.find((s) => s.id === e.target.value);
                    if (s && newItems[0]?.description === "Photography services") {
                      setNewItems([{ description: `Photography — ${s.name}`, quantity: 1, unit_price: 0, total: 0 }]);
                    }
                  }} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
                    <option value="">Select a shoot…</option>
                    {shoots.map((s) => <option key={s.id} value={s.id}>{s.name}{s.client_name ? ` — ${s.client_name}` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Currency</label>
                  <select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
                    <option value="GBP">GBP (£)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-2">Line items</label>
                <div className="space-y-2">
                  {newItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Description" className="col-span-5 px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
                      <input value={item.quantity || ""} onChange={(e) => updateItem(idx, "quantity", e.target.value)} type="number" min={1} placeholder="Qty" className="col-span-2 px-2 py-1.5 rounded-md border border-input bg-background text-sm text-center" />
                      <input value={item.unit_price || ""} onChange={(e) => updateItem(idx, "unit_price", e.target.value)} type="number" min={0} step={0.01} placeholder="Price" className="col-span-3 px-2 py-1.5 rounded-md border border-input bg-background text-sm" />
                      <div className="col-span-2 text-right text-sm font-medium">{fmt(item.total, newCurrency)}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setNewItems([...newItems, { description: "", quantity: 1, unit_price: 0, total: 0 }])} className="mt-2 text-xs text-primary hover:underline">+ Add line item</button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Tax rate (%)</label>
                  <input value={newTaxRate} onChange={(e) => setNewTaxRate(Number(e.target.value))} type="number" min={0} max={100} step={0.1} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Due date</label>
                  <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
                </div>
              </div>

              {/* Totals preview */}
              {(() => { const { subtotal, tax_amount, total } = recalc(newItems, newTaxRate); return (
                <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                  <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmt(subtotal, newCurrency)}</span></div>
                  {newTaxRate > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({newTaxRate}%)</span><span>{fmt(tax_amount, newCurrency)}</span></div>}
                  <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>{fmt(total, newCurrency)}</span></div>
                </div>
              ); })()}

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Notes (shown on invoice)</label>
                <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} placeholder="e.g. Payment due within 14 days. Bank transfer details: …" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm">Cancel</button>
              <button onClick={createInvoice} disabled={saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {saving ? "Creating…" : "Create invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
