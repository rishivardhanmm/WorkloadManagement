"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { YearProvider, useYearId } from "@/components/providers/YearProvider";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  BookOpen,
  History,
  BarChart3,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  BookOpenCheck,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useYears } from "@/hooks/useYears";

const adminNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/academics", label: "Academics", icon: Users },
  { href: "/modules", label: "Modules", icon: BookOpenCheck },
  { href: "/years", label: "Years", icon: Calendar },
  { href: "/allocations", label: "Allocations", icon: ClipboardList },
];

const academicNav = [
  { href: "/my-workload", label: "My Workload", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
  { href: "/group-summary", label: "Group Summary", icon: BarChart3 },
  { href: "/change-password", label: "Change Password", icon: BookOpenCheck },
];

const adminRoutes = ["/dashboard", "/academics", "/modules", "/years", "/allocations"];
const academicRoutes = ["/my-workload", "/history", "/group-summary"];

function matchesProtectedRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement | null>(null);

  const { years } = useYears();
  const { yearId, setYearId } = useYearId();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  const nav = user.role === "ADMIN" ? adminNav : academicNav;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href={user.role === "ADMIN" ? "/dashboard" : "/my-workload"} className="text-lg font-semibold">
              W Workload
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              {nav.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user.role === "ADMIN" && (
              <div className="hidden items-center gap-2 md:flex">
                <label className="text-sm text-muted-foreground">Year:</label>
                {years.length > 0 ? (
                  <select
                    value={yearId ?? ""}
                    onChange={(e) =>
                      setYearId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All years</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.label} {y.is_locked ? "(Locked)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-muted-foreground">Loading...</span>
                )}
              </div>
            )}

            {user.role === "ACADEMIC" && (
              <div className="hidden items-center gap-2 md:flex">
                <label className="text-sm text-muted-foreground">Year:</label>
                {years.length > 0 ? (
                  <select
                    value={yearId ?? ""}
                    onChange={(e) =>
                      setYearId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-muted-foreground">Loading...</span>
                )}
              </div>
            )}

            <Button variant="outline" size="icon" onClick={toggle}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <div className="relative" ref={userRef}>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setUserOpen((o) => !o)}
              >
                <span>{user.username}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {userOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border bg-popover p-3 shadow-lg">
                  <div className="mb-3">
                    <p className="font-medium">{user.username}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>

                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => {
                      logout();
                      setUserOpen(false);
                      router.push("/");
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { years, currentYearId, setCurrentYearId } = useYears();
  const [isAuthorisedRoute, setIsAuthorisedRoute] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setIsAuthorisedRoute(false);
      router.replace("/");
      return;
    }
    if (user.must_verify_email) {
    setIsAuthorisedRoute(false);
    router.replace("/verify-email");
    return;
    }
    

    const isAdminPage = matchesProtectedRoute(pathname, adminRoutes);
    const isAcademicPage = matchesProtectedRoute(pathname, academicRoutes);

    if (user.role === "ADMIN" && isAcademicPage) {
      setIsAuthorisedRoute(false);
      router.replace("/dashboard");
      return;
    }

    if (user.role === "ACADEMIC" && isAdminPage) {
      setIsAuthorisedRoute(false);
      router.replace("/my-workload");
      return;
    }

    setIsAuthorisedRoute(true);
  }, [loading, user, pathname, router]);

  if (loading || !user || !isAuthorisedRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <YearProvider yearId={currentYearId} setYearId={setCurrentYearId}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </YearProvider>
  );
}