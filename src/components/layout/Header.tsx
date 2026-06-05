import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import DarkModeToggle from "./DarkModeToggle";
import { getStudentNavItems, studentDefaultModules } from "@/lib/studentNav";

export default function Header({ title }: { title: string }) {
  const { user, token, logout } = useAuth();
  const [enabledModules, setEnabledModules] = useState<string[]>(studentDefaultModules);

  useEffect(() => {
    if (user?.role !== "student" || !token) {
      setEnabledModules(studentDefaultModules);
      return;
    }

    apiFetch("/student/dashboard", {}, token)
      .then((data) => {
        setEnabledModules(Array.isArray(data?.enabledModules) && data.enabledModules.length ? data.enabledModules : studentDefaultModules);
      })
      .catch(() => setEnabledModules(studentDefaultModules));
  }, [user?.role, token]);

  return <div className="p-4 border-b space-y-2"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><img src="/logo.png" alt="RoboKidy logo" className="h-11 w-auto rounded bg-white p-1 shadow-sm" /><div><h1 className="text-xl font-bold">{title}</h1><p className="text-sm text-muted-foreground">Signed in as {user?.username}</p></div></div><div className="flex gap-2"><DarkModeToggle /><Button variant="destructive" onClick={logout}>Logout</Button></div></div><div className="flex flex-wrap gap-4 text-sm">{user?.role === "student" ? getStudentNavItems(enabledModules).map((item) => <Link key={item.href} to={item.href} className="underline">{item.label}</Link>) : <><Link to="/admin" className="underline">Dashboard</Link><Link to="/admin/students" className="underline">Students</Link><Link to="/admin/materials" className="underline">Materials</Link><Link to="/admin/content" className="underline">Content</Link><Link to="/admin/analytics" className="underline">Analytics</Link></>}</div></div>;
}
