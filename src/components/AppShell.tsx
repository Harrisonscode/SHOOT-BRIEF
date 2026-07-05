import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Plus, Calendar, Image as ImageIcon, CreditCard, Settings, LogOut, X, Inbox, Package, Star, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo, ApertureIcon } from "./Logo";
import { toast } from "sonner";

const PRIMARY_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/planner", label: "New", icon: Plus },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/bookings", label: "Bookings", icon: Inbox },
];

const SECONDARY_NAV = [
  { to: "/inspiration", label: "Inspiration", icon: ImageIcon },
  { to: "/packages", label: "Packages", icon: Package },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

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

  // Prevent pinch zoom via JS (belt-and-braces with viewport meta)
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    const preventGesture = (e: Event) => e.preventDefault();

    document.addEventListener("touchmove", preventZoom, { passive: false });
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });

    return () => {
      document.removeEventListener("touchmove", preventZoom);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
    };
  }, []);

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
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {ALL_NAV.map((item) => {
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
        <button onClick={handleSignOut} className="flex items-center gap-2 text-xs text-sidebar-foreground/70 hover:text-white">
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0 fixed inset-y-0 left-0">{SidebarContent}</aside>

      {/* Mobile top bar — respects Dynamic Island / notch via safe-area-inset-top */}
      <div
        className="md:hidden fixed inset-x-0 z-40 bg-background/95 backdrop-blur border-b flex items-center justify-center"
        style={{
          top: 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          height: 'calc(44px + env(safe-area-inset-top, 0px))',
        }}
      >
        <Logo iconClassName="h-5 w-5" textClassName="text-sm" />
      </div>

      {/* Mobile slide-out drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 bg-sidebar text-sidebar-foreground flex flex-col drawer-enter"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <span className="font-semibold text-white">More</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded hover:bg-white/10 text-white/70">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
              {ALL_NAV.map((item) => {
                const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                      active ? "bg-white/10 text-white font-medium" : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 p-4">
              <div className="mb-3">
                <div className="text-sm font-medium text-white truncate">{profile?.display_name ?? "Photographer"}</div>
                <div className="text-xs text-sidebar-foreground/60 truncate">{profile?.email ?? user.email}</div>
              </div>
              <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-white">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main
        className="flex-1 md:ml-60 md:pt-0 pb-20 md:pb-0"
        style={{ paddingTop: 'calc(44px + env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-6 md:py-8">{children}</div>
      </main>

      {/* Mobile bottom tab bar — sits above iPhone home indicator */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t flex items-stretch mobile-bottom-nav"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          const isNew = item.to === "/planner";
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {isNew ? (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center mb-0.5 shadow-lg">
                  <Icon className="h-4 w-4 text-primary-foreground" />
                </div>
              ) : (
                <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
              )}
              {item.label}
            </Link>
          );
        })}
        {/* More — icon only, no label to avoid home indicator overlap */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
          aria-label="More options"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
