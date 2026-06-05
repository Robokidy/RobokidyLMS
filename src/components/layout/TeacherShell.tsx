import { Link, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DarkModeToggle from "@/components/layout/DarkModeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getTeacherNavItems } from "@/lib/teacherNav";

function TeacherNav() {
  const location = useLocation();
  const { user } = useAuth();
  const navItems = getTeacherNavItems(user);

  return (
    <nav className="p-4 space-y-5 overflow-y-auto">
      <div>
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
        <div className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all ${
              active
                ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
        </div>
      </div>
    </nav>
  );
}

export default function TeacherShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex lg:w-72 lg:flex-col border-r bg-white/80 dark:bg-slate-950/60 backdrop-blur">
          <div className="h-20 px-6 flex items-center border-b bg-slate-950 text-white">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="RoboKidy logo" className="h-11 w-auto rounded bg-white p-1" />
              <div>
              <p className="text-xl font-bold">RoboKidy LMS</p>
              <p className="text-xs text-slate-300">Teacher operations console</p>
              </div>
            </div>
          </div>
          <TeacherNav />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="h-20 border-b bg-white/90 dark:bg-slate-950/80 backdrop-blur px-4 lg:px-8 flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <div className="h-20 px-6 flex items-center border-b bg-slate-950 text-white">
                    <img src="/logo.png" alt="RoboKidy logo" className="mr-3 h-10 w-auto rounded bg-white p-1" />
                    <p className="text-lg font-bold">RoboKidy LMS</p>
                  </div>
                  <TeacherNav />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <h1 className="truncate text-xl lg:text-2xl font-bold tracking-tight">Teacher Workspace</h1>
                <p className="truncate text-sm text-muted-foreground">Shared academic management with assigned operational data.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground md:inline">{user?.fullName || user?.username}</span>
              <DarkModeToggle />
              <Button variant="destructive" size="sm" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>
          <main className="p-4 lg:p-6"><Outlet /></main>
        </div>
      </div>
    </div>
  );
}
