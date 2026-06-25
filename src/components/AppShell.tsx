import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Plus, Calendar, Image as ImageIcon, CreditCard, Settings, LogOut, Menu, X, Inbox } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo, ApertureIcon } from "./Logo";
import { toast } from "sonner";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "New Shoot", icon: Plus },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/inspiration", label: "Inspiration", icon: ImageIcon },
  { to: "/bookings", label: "Bookings", icon: Inbox },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!loading && !user) {
      const redirect = pathname && pathname !== "/" ? pathname : undefined;
      navigate({ to: "/login", search: { tab: "signin", ...(redirect ? { redirect } : {}) } as any, replace: true });
    }
  }, [loading, user, navigate, pathname]);

  useEffect(() => {
    if (title) document.title = `${title} — Shoot Brief`;
  }, [title]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="text-primary"><ApertureIcon className="h-6 w-6" color="oklch(0.65 0.18 130)" /></span>
        <span className="font-semibold tracking-tight">Shoot Brief</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors border-l-2 ${
                active
                  ? "border-primary bg-[color:var(--sidebar-active)] text-white"
                  : "border-transparent text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-2">
          <div className="text-sm font-medium text-white truncate">{profile?.display_name ?? "Photographer"}</div>
          <div className="text-xs text-sidebar-foreground/60 truncate">{profile?.email ?? user.email}</div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs text-sidebar-foreground/70 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:block w-60 shrink-0 fixed inset-y-0 left-0">{SidebarContent}</aside>

      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between bg-background border-b px-3 py-2">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md hover:bg-muted" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Logo iconClassName="h-5 w-5" textClassName="text-sm" />
        <div className="w-9" />
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            {SidebarContent}
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 text-white/70 p-1.5" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 md:ml-60 pt-14 md:pt-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-8">{children}</div>
      </main>
    </div>
  );
}
