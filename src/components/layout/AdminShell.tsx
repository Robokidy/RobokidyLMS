import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Bell, BookMarked, BookOpen, BookText, Building2, CalendarDays, ClipboardList, CreditCard, LayoutDashboard, Menu, School, Settings, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import DarkModeToggle from "@/components/layout/DarkModeToggle";

const navSections = [
  { label: "Executive", items: [{ label: "CEO Dashboard", href: "/admin", icon: LayoutDashboard }] },
  {
    label: "Organization",
    items: [
      { label: "Schools", href: "/admin/schools", icon: Building2 },
      { label: "Teachers", href: "/admin/teachers", icon: ShieldCheck },
      { label: "Students", href: "/admin/students", icon: Users },
      { label: "Classes", href: "/admin/classes", icon: School }
    ]
  },
  {
    label: "Learning",
    items: [
      { label: "Curriculum", href: "/admin/curriculum", icon: BookOpen },
      { label: "Lessons", href: "/admin/content", icon: BookText },
      { label: "Materials", href: "/admin/materials", icon: BookMarked },
      { label: "Assessments", href: "/admin/assessments", icon: ClipboardList }
    ]
  },
  {
    label: "Operations",
    items: [
      { label: "Attendance", href: "/admin/attendance", icon: CalendarDays },
      { label: "Fees", href: "/admin/fees", icon: CreditCard }
    ]
  },
  { label: "Communication", items: [{ label: "Notifications", href: "/admin/notifications", icon: Bell }] },
  { label: "Reports", items: [{ label: "Analytics", href: "/admin/analytics", icon: BarChart3 }] },
  { label: "Settings", items: [{ label: "System", href: "/admin/settings", icon: Settings }] }
];

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col border-r bg-white/80 dark:bg-slate-950/60 backdrop-blur">
      <div className="h-20 px-6 flex items-center border-b bg-slate-950 text-white">
        <div>
          <p className="text-xl font-bold">Robokidy LMS</p>
          <p className="text-xs text-slate-300">Business operations console</p>
        </div>
      </div>
      <nav className="p-4 space-y-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={`${item.label}-${item.href}`}
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
        ))}
      </nav>
    </aside>
  );
}

export default function AdminShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-20 border-b bg-white/90 dark:bg-slate-950/80 backdrop-blur px-4 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <div className="h-20 px-6 flex items-center border-b bg-slate-950 text-white">
                    <p className="text-lg font-bold">Robokidy LMS</p>
                  </div>
                  <nav className="p-4 space-y-4">
                    {navSections.map((section) => (
                      <div key={section.label}>
                        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{section.label}</p>
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link key={`${item.label}-${item.href}`} to={item.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-900">
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ))}
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

          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
