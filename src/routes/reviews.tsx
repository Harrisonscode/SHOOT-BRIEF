import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Star, Check, Trash2, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Shoot Brief" }] }),
  component: () => <AppShell title="Reviews"><ReviewsPage /></AppShell>,
});

type Review = {
  id: string;
  shoot_id: string;
  client_name: string;
  rating: number;
  body: string | null;
  approved: boolean;
  created_at: string;
  shoots?: { name: string } | null;
};

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${sz} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  );
}

function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reviews")
      .select("*, shoots(name)")
      .eq("photographer_id", user.id)
      .order("created_at", { ascending: false });
    setReviews((data as any) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const toggleApprove = async (review: Review) => {
    const next = !review.approved;
    await supabase.from("reviews").update({ approved: next } as any).eq("id", review.id);
    setReviews((prev) => prev?.map((r) => r.id === review.id ? { ...r, approved: next } : r) ?? null);
    toast.success(next ? "Review approved — now visible on your booking page" : "Review hidden");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    setReviews((prev) => prev?.filter((r) => r.id !== id) ?? null);
    toast.success("Deleted");
  };

  const filtered = reviews?.filter((r) =>
    filter === "all" ? true : filter === "approved" ? r.approved : !r.approved
  );

  const pendingCount = reviews?.filter((r) => !r.approved).length ?? 0;
  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Reviews</h1>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
              {pendingCount} to review
            </span>
          )}
        </div>
        {avgRating && (
          <div className="flex items-center gap-2">
            <Stars rating={Math.round(Number(avgRating))} size="sm" />
            <span className="font-bold text-lg">{avgRating}</span>
            <span className="text-muted-foreground text-sm">({reviews?.length} reviews)</span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {(["all", "pending", "approved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              filter === f ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f} {f === "pending" && pendingCount > 0 && `(${pendingCount})`}
          </button>
        ))}
      </div>

      {reviews === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="rounded-lg border bg-card shadow-card py-14 text-center">
          <Star className="h-10 w-10 mx-auto text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No {filter !== "all" ? filter : ""} reviews yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Reviews appear here when clients submit feedback from their client portal.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered!.map((r) => (
            <div key={r.id} className={`rounded-lg border bg-card shadow-card p-4 ${!r.approved ? "border-amber-200/60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold">{r.client_name}</span>
                    <Stars rating={r.rating} />
                    {r.shoots?.name && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{r.shoots.name}</span>
                    )}
                    {!r.approved && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pending approval</span>
                    )}
                    {r.approved && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Approved</span>
                    )}
                  </div>
                  {r.body && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{r.body}</p>}
                  <div className="text-xs text-muted-foreground mt-2">
                    {format(new Date(r.created_at), "d MMMM yyyy")}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => toggleApprove(r)}
                    title={r.approved ? "Hide from booking page" : "Approve & show on booking page"}
                    className={`p-1.5 rounded hover:bg-muted ${r.approved ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {r.approved ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => remove(r.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
