import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, BookMarked, BookOpen, Building2, CalendarDays, ClipboardList, CreditCard, LayoutDashboard, Library, Menu, School, Settings, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import DarkModeToggle from "@/components/layout/DarkModeToggle";

const navItems = [
  { label: "CEO Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Schools", href: "/admin/schools", icon: Building2 },
  { label: "Teachers", href: "/admin/teachers", icon: ShieldCheck },
  { label: "Classes", href: "/admin/classes", icon: School },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Tracks", href: "/admin/courses", icon: Library },
  { label: "Fees", href: "/admin/fees", icon: CreditCard },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarDays },
  { label: "Materials", href: "/admin/materials", icon: BookMarked },
  { label: "Curriculum", href: "/admin/content", icon: BookOpen },
  { label: "Assessment Center", href: "/admin/assessments", icon: ClipboardList },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "System", href: "/admin/settings", icon: Settings }
];

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col border-r bg-white/80 dark:bg-slate-950/60 backdrop-blur">
      <div className="h-20 px-6 flex items-center border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div>
          <p className="text-xl font-bold">CEO Console</p>
          <p className="text-xs text-blue-100">Multi-school LMS control center</p>
        </div>
      </div>
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.href;
          const key = `${item.label}-${item.href}`;
          return (
            <Link
              key={key}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all border ${
                active
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300"
                  : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default function AdminShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-20 border-b bg-white/70 dark:bg-slate-950/50 backdrop-blur px-4 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <div className="h-20 px-6 flex items-center border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <p className="text-lg font-bold">CEO Console</p>
                  </div>
                  <nav className="p-4 space-y-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={`${item.label}-${item.href}`} to={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden md:block text-sm text-muted-foreground">{user?.username}</span>
              <DarkModeToggle />
              <Button variant="destructive" onClick={logout}>Logout</Button>
            </div>
          </header>

          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
