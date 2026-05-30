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
    <nav className="space-y-1 p-3">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function TeacherShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r bg-white/90 dark:bg-slate-950/80 lg:block">
          <div className="border-b px-5 py-5">
            <p className="text-lg font-bold">Teacher Workspace</p>
            <p className="text-xs text-muted-foreground">School-scoped LMS tools</p>
          </div>
          <TeacherNav />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 px-4 backdrop-blur dark:bg-slate-950/70 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <div className="border-b px-5 py-5">
                    <p className="font-bold">Teacher Workspace</p>
                  </div>
                  <TeacherNav />
                </SheetContent>
              </Sheet>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold">Teacher Workspace</h1>
                <p className="truncate text-xs text-muted-foreground">Manage classes, students, attendance, and analytics.</p>
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
