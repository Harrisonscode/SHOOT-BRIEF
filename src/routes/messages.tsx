import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — Shoot Brief" }] }),
  component: () => <AppShell title="Messages"><MessagesPage /></AppShell>,
});

type ShootOpt = { id: string; name: string; client_name: string | null };
type Message = {
  id: string;
  shoot_id: string;
  sender: "photographer" | "client";
  body: string;
  created_at: string;
};

function MessagesPage() {
  const { user } = useAuth();
  const [shoots, setShoots] = useState<ShootOpt[]>([]);
  const [selectedShoot, setSelectedShoot] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load shoot list
  useEffect(() => {
    if (!user) return;
    supabase
      .from("shoots")
      .select("id, name, client_name")
      .eq("user_id", user.id)
      .order("date", { ascending: false, nullsFirst: false })
      .then(({ data }) => setShoots((data as any) ?? []));
  }, [user]);

  // Load messages for selected shoot + realtime subscription
  useEffect(() => {
    if (!selectedShoot) { setMessages([]); return; }
    setLoadingMsgs(true);
    supabase
      .from("messages")
      .select("id, shoot_id, sender, body, created_at")
      .eq("shoot_id", selectedShoot)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data as any) ?? []);
        setLoadingMsgs(false);
      });

    const channel = supabase
      .channel(`messages:${selectedShoot}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `shoot_id=eq.${selectedShoot}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedShoot]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (sender: "photographer" | "client") => {
    if (!body.trim() || !selectedShoot || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      shoot_id: selectedShoot,
      user_id: user.id,
      sender,
      body: body.trim(),
    } as any);
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody("");
  };

  const selected = shoots.find((s) => s.id === selectedShoot);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[400px]">
        {/* Shoot selector sidebar */}
        <div className="w-56 shrink-0 rounded-lg border bg-card shadow-card overflow-y-auto">
          <div className="px-3 py-2.5 border-b">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shoots</span>
          </div>
          {shoots.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No shoots yet</div>
          ) : (
            <ul className="py-1">
              {shoots.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedShoot(s.id)}
                    className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                      selectedShoot === s.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="font-medium truncate">{s.name}</div>
                    {s.client_name && (
                      <div className="text-xs text-muted-foreground truncate">{s.client_name}</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Message thread */}
        <div className="flex-1 flex flex-col rounded-lg border bg-card shadow-card overflow-hidden">
          {!selectedShoot ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageSquare className="h-10 w-10" />
              <p className="text-sm">Select a shoot to view messages</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <div>
                  <div className="font-semibold text-sm">{selected?.name}</div>
                  {selected?.client_name && (
                    <div className="text-xs text-muted-foreground">Client: {selected.client_name}</div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loadingMsgs ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "photographer" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          m.sender === "photographer"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        <div>{m.body}</div>
                        <div className={`text-[10px] mt-1 ${m.sender === "photographer" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          {m.sender === "photographer" ? "You" : selected?.client_name ?? "Client"} ·{" "}
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Compose */}
              <div className="border-t px-3 py-3">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send("photographer");
                      }
                    }}
                    placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                    rows={2}
                    className="flex-1 px-3 py-2 rounded-md border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => send("photographer")}
                      disabled={sending || !body.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> You
                    </button>
                    <button
                      onClick={() => send("client")}
                      disabled={sending || !body.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border bg-background hover:bg-muted text-xs font-medium disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Client
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Use "Client" to log messages received from your client outside the app.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
