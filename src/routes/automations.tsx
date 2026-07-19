import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Zap, Plus, Trash2, X, Lock, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/automations")({
  component: () => <AppShell title="Automations"><AutomationsPage /></AppShell>,
});

type AutomationRule = {
  id: string;
  name: string;
  trigger_type: string;
  trigger_days: number;
  action_type: string;
  email_subject: string;
  email_body: string;
  is_active: boolean;
  created_at: string;
};

const TRIGGER_LABELS: Record<string, string> = {
  before_shoot: "Before shoot date",
  after_shoot: "After shoot date",
  delivery_complete: "When editing hits 100%",
  invoice_sent: "When invoice is sent",
};

const TEMPLATES = [
  {
    name: "Shoot day reminder",
    trigger_type: "before_shoot",
    trigger_days: 1,
    email_subject: "Your shoot is tomorrow — a few things to know",
    email_body: `Hi {{client_name}},

Just a quick reminder that your shoot is tomorrow! Here are a few things to help it go smoothly:

📍 Location: {{shoot_location}}
🕐 Time: {{shoot_time}}

Your client portal has all the details: {{portal_link}}

Looking forward to seeing you!

{{photographer_name}}`,
  },
  {
    name: "Editing in progress",
    trigger_type: "after_shoot",
    trigger_days: 1,
    email_subject: "Your photos are being edited ✨",
    email_body: `Hi {{client_name}},

Thank you so much for yesterday — it was a great shoot!

I've started editing your photos. You can track my progress in real time on your client portal:
{{portal_link}}

I'll be in touch as soon as your gallery is ready.

{{photographer_name}}`,
  },
  {
    name: "Gallery ready",
    trigger_type: "delivery_complete",
    trigger_days: 0,
    email_subject: "Your photos are ready! 🎉",
    email_body: `Hi {{client_name}},

Great news — your photos are ready!

You can view and download them from your client portal:
{{portal_link}}

If you have any questions or would like any adjustments, just reply to this email.

I'd really appreciate a review if you're happy with them — you can leave one on your portal.

{{photographer_name}}`,
  },
  {
    name: "Review request",
    trigger_type: "delivery_complete",
    trigger_days: 3,
    email_subject: "How were your photos?",
    email_body: `Hi {{client_name}},

I hope you're loving your photos! I just wanted to follow up and ask if you'd be willing to leave a quick review.

It takes less than a minute and really helps other clients find me:
{{portal_link}}

Thank you so much for choosing me as your photographer.

{{photographer_name}}`,
  },
];

function AutomationsPage() {
  const { user, profile } = useAuth();
  const isStudio = !!profile?.is_studio;
  const [rules, setRules] = useState<AutomationRule[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTrigger, setFormTrigger] = useState("before_shoot");
  const [formDays, setFormDays] = useState(1);
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");

  useEffect(() => {
    if (!user || !isStudio) return;
    (supabase.from("automation_rules") as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => setRules(data ?? []));
  }, [user, isStudio]);

  if (!isStudio) {
    return (
      <div className="rounded-lg border bg-card shadow-card py-16 px-6 text-center max-w-md">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">Automations is a Studio feature</h3>
        <p className="text-sm text-muted-foreground mt-2 mb-5">
          Upgrade to Studio to automatically send emails to clients before shoots, after delivery, and more. Never forget a follow-up again.
        </p>
        <Link to="/billing" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          Upgrade to Studio →
        </Link>
      </div>
    );
  }

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setFormName(template.name);
    setFormTrigger(template.trigger_type);
    setFormDays(template.trigger_days);
    setFormSubject(template.email_subject);
    setFormBody(template.email_body);
    setShowNew(true);
  };

  const saveRule = async () => {
    if (!user || !formName || !formSubject || !formBody) {
      toast.error("Fill in all fields");
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase.from("automation_rules") as any)
      .insert({
        user_id: user.id,
        name: formName,
        trigger_type: formTrigger,
        trigger_days: formDays,
        action_type: "send_email",
        email_subject: formSubject,
        email_body: formBody,
        is_active: true,
      } as any)
      .select()
      .single() as any;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setRules((prev) => [...(prev ?? []), data]);
    setShowNew(false);
    setFormName(""); setFormSubject(""); setFormBody("");
    toast.success("Automation created");
  };

  const toggleActive = async (rule: AutomationRule) => {
    await (supabase.from("automation_rules") as any)
      .update({ is_active: !rule.is_active } as any)
      .eq("id", rule.id);
    setRules((prev) => prev?.map((r) => r.id === rule.id ? { ...r, is_active: !r.is_active } : r) ?? null);
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this automation?")) return;
    await (supabase.from("automation_rules") as any).delete().eq("id", id);
    setRules((prev) => prev?.filter((r) => r.id !== id) ?? null);
  };

  const triggerLabel = (rule: AutomationRule) => {
    const base = TRIGGER_LABELS[rule.trigger_type] ?? rule.trigger_type;
    if (rule.trigger_type === "before_shoot") return `${rule.trigger_days} day${rule.trigger_days !== 1 ? "s" : ""} before shoot`;
    if (rule.trigger_type === "after_shoot") return `${rule.trigger_days} day${rule.trigger_days !== 1 ? "s" : ""} after shoot`;
    if (rule.trigger_type === "delivery_complete" && rule.trigger_days > 0) return `${rule.trigger_days} day${rule.trigger_days !== 1 ? "s" : ""} after delivery complete`;
    return base;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">Emails sent automatically to clients based on shoot events.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New automation
        </button>
      </div>

      {/* Templates */}
      {(!rules || rules.length === 0) && !showNew && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Start from a template</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <button key={t.name} onClick={() => applyTemplate(t)} className="text-left rounded-lg border bg-card shadow-card p-4 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{t.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">{triggerLabel(t as any)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Variable reference */}
      <div className="mb-6 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
        <div className="font-semibold mb-1 text-foreground">Available variables in email body:</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {["{{client_name}}", "{{shoot_location}}", "{{shoot_time}}", "{{shoot_date}}", "{{portal_link}}", "{{photographer_name}}"].map((v) => (
            <code key={v} className="bg-background px-1.5 py-0.5 rounded font-mono">{v}</code>
          ))}
        </div>
      </div>

      {/* Rules list */}
      {rules === null ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : rules.length === 0 && !showNew ? (
        <div className="rounded-lg border bg-card shadow-card py-12 text-center">
          <Zap className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No automations yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Start from a template above or create your own.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={`rounded-lg border bg-card shadow-card p-4 flex items-start gap-3 ${!rule.is_active ? "opacity-60" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-sm">{rule.name}</span>
                  {!rule.is_active && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Paused</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{triggerLabel(rule)} → sends "{rule.email_subject}"</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleActive(rule)} className="p-1.5 rounded hover:bg-muted" title={rule.is_active ? "Pause" : "Activate"}>
                  {rule.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                </button>
                <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New automation modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-4 bg-black/50 overflow-y-auto" onClick={() => setShowNew(false)}>
          <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">New automation</h2>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Name</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Shoot day reminder" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Trigger</label>
                  <select value={formTrigger} onChange={(e) => setFormTrigger(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm">
                    <option value="before_shoot">Before shoot date</option>
                    <option value="after_shoot">After shoot date</option>
                    <option value="delivery_complete">When delivery hits 100%</option>
                    <option value="invoice_sent">When invoice is sent</option>
                  </select>
                </div>
                {(formTrigger === "before_shoot" || formTrigger === "after_shoot" || formTrigger === "delivery_complete") && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      {formTrigger === "delivery_complete" ? "Days after delivery" : formTrigger === "before_shoot" ? "Days before" : "Days after"}
                    </label>
                    <input type="number" min={0} max={30} value={formDays} onChange={(e) => setFormDays(Number(e.target.value))} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email subject</label>
                <input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="e.g. Your shoot is tomorrow!" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email body</label>
                <textarea value={formBody} onChange={(e) => setFormBody(e.target.value)} rows={10} placeholder="Write your email here. Use {{client_name}}, {{portal_link}} etc." className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono resize-y" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm">Cancel</button>
              <button onClick={saveRule} disabled={saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {saving ? "Saving…" : "Save automation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
