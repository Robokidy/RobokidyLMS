import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { getStudentLandingRoute } from "@/lib/studentNav";
import { Card, CardContent } from "@/components/ui/card";

export default function StudentAutoRedirect() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    apiFetch("/student/dashboard", {}, token)
      .then((data) => {
        const destination = getStudentLandingRoute(Array.isArray(data?.allowedRoutes) ? data.allowedRoutes : []);
        navigate(destination, { replace: true });
      })
      .catch((err) => {
        setError(err?.message || "Unable to determine student landing page");
      });
  }, [navigate, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Card className="w-full max-w-lg border border-slate-200 bg-white/90 p-8 shadow-xl dark:border-slate-800 dark:bg-slate-950/80">
        <CardContent className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/20">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold">Loading your student workspace...</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Checking your assigned courses and available modules so you land on the right learning page.
          </p>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
