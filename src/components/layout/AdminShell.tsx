import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Award, BarChart3, Bell, BookMarked, BookOpen, BookText, BriefcaseBusiness, Building2, CalendarDays, ClipboardList, CreditCard, FileQuestion, FileSpreadsheet, LayoutDashboard, Menu, School, Settings, ShieldCheck, Target, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import DarkModeToggle from "@/components/layout/DarkModeToggle";

function navForRole(role?: string) {
  if (role === "cmo") {
    return [
      { label: "Marketing", items: [{ label: "CMO Dashboard", href: "/cmo", icon: LayoutDashboard }, { label: "Lead Management", href: "/cmo/leads", icon: Target }, { label: "Reports", href: "/cmo/reports", icon: FileSpreadsheet }] },
      { label: "Pipeline", items: [{ label: "Schools Pipeline", href: "/cmo/schools", icon: Building2 }, { label: "Tuition Centres", href: "/cmo/tuition-centres", icon: BriefcaseBusiness }, { label: "Follow-Ups", href: "/cmo/follow-ups", icon: CalendarDays }] }
    ];
  }
  const base = role === "cto" ? "/cto" : "/admin";
  return [
    { label: "Executive", items: [{ label: role === "cto" ? "CTO Dashboard" : "CEO Dashboard", href: base, icon: LayoutDashboard }] },
    {
      label: "Organization",
      items: [
        { label: "Schools", href: `${base}/schools`, icon: Building2 },
        { label: "Teachers", href: `${base}/teachers`, icon: ShieldCheck },
        { label: "Students", href: `${base}/students`, icon: Users },
        { label: "Classes", href: `${base}/classes`, icon: School }
      ]
    },
    {
      label: "Learning",
      items: [
        { label: "Curriculum", href: `${base}/curriculum`, icon: BookOpen },
        { label: "Lessons", href: `${base}/content`, icon: BookText },
        { label: "Materials", href: `${base}/materials`, icon: BookMarked },
        { label: "Quiz Center", href: `${base}/quizzes`, icon: FileQuestion },
        { label: "Assessment Center", href: `${base}/assessments`, icon: ClipboardList },
        { label: "Certificates", href: `${base}/certificates`, icon: Award }
      ]
    },
    {
      label: "Operations",
      items: [
        { label: "Attendance", href: `${base}/attendance`, icon: CalendarDays },
        ...(role === "admin" ? [{ label: "Fees", href: `${base}/fees`, icon: CreditCard }] : [])
      ]
    },
    { label: "Communication", items: [{ label: "Notifications", href: `${base}/notifications`, icon: Bell }] },
    { label: "Growth", items: [{ label: "Marketing CRM", href: `${base}/marketing`, icon: Target }] },
    { label: "Reports", items: [{ label: "School Reports", href: `${base}/reports`, icon: FileSpreadsheet }, { label: "Analytics", href: `${base}/analytics`, icon: BarChart3 }] },
    { label: "Settings", items: [{ label: "System", href: `${base}/settings`, icon: Settings }] }
  ];
}

function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const sections = navForRole(user?.role);

  return (
    <aside className="hidden lg:flex lg:w-[220px] lg:flex-col bg-[#0f1117] text-white">
      <div className="h-20 px-5 flex items-center border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="RoboKidy logo" className="h-9 w-9 rounded-lg bg-white p-1 object-contain" />
          <div className="min-w-0">
          <p className="truncate text-sm font-bold">RoboKidy LMS</p>
          <p className="text-[11px] text-white/40">Business console</p>
          </div>
        </div>
      </div>
      <nav className="p-3 space-y-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-white/30">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    to={item.href}
                    className={`flex items-center gap-3 rounded-lg border-l-[3px] px-2.5 py-2 text-[13px] transition-all ${
                      active
                        ? "border-[#1a56db] bg-[#1a56db]/20 text-white"
                        : "border-transparent text-white/60 hover:bg-white/[0.06] hover:text-white"
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
  const mobileSections = navForRole(user?.role);

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#0f1117]">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-20 border-b border-black/[0.08] bg-white/90 backdrop-blur px-4 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
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
                  <nav className="p-4 space-y-4">
                    {mobileSections.map((section) => (
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
                <h1 className="text-2xl font-extrabold tracking-[-0.5px]">{title}</h1>
                <p className="text-sm text-[#6b7280]">{subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden md:block text-sm text-[#6b7280]">{user?.username}</span>
              <DarkModeToggle />
              <Button className="rounded-full bg-[#dc2626] px-4 text-white hover:bg-red-700" onClick={logout}>Logout</Button>
            </div>
          </header>

          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
