import { useEffect, useState } from "react";
import { Play, Terminal } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import StudentLmsShell from "@/components/layout/StudentLmsShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CodeLabPage() {
  const { token } = useAuth();
  const [code, setCode] = useState("print('Hello from LearnPy')");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [hasPythonAccess, setHasPythonAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch("/student/dashboard", {}, token)
      .then((data) => setHasPythonAccess(Boolean(data?.hasPythonAccess)))
      .catch(() => setHasPythonAccess(false));
  }, [token]);

  const run = async () => {
    setRunning(true);
    try {
      const res = await apiFetch("/code/run", { method: "POST", body: JSON.stringify({ code }) }, token);
      setOutput(res.output);
    } catch (e) {
      setOutput(e instanceof Error ? e.message : "Unable to run code");
    } finally {
      setRunning(false);
    }
  };

  if (hasPythonAccess === false) {
    return (
      <StudentLmsShell title="Code Lab" subtitle="Write, run, and experiment with Python inside a clean coding workspace.">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
          Code Lab is available only for students assigned to the Python course.
        </div>
      </StudentLmsShell>
    );
  }

  if (hasPythonAccess === null) {
    return (
      <StudentLmsShell title="Code Lab" subtitle="Write, run, and experiment with Python inside a clean coding workspace.">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
          Checking Code Lab access...
        </div>
      </StudentLmsShell>
    );
  }

  return (
    <StudentLmsShell title="Code Lab" subtitle="Write, run, and experiment with Python inside a clean coding workspace.">
      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
          <CardHeader className="border-b border-slate-100 bg-slate-950 text-white dark:border-slate-800">
            <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5 text-emerald-300" /> Python Editor</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <textarea
              className="h-[520px] w-full resize-none bg-slate-950 p-6 font-mono text-sm leading-6 text-white caret-emerald-200 selection:bg-cyan-500/30 outline-none"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Execution</p>
              <h2 className="mt-1 text-2xl font-bold">Run Python Code</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Your run count is tracked automatically for progress analytics.</p>
              <Button className="mt-5 h-11 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white" onClick={run} disabled={running}>
                <Play className="mr-2 h-4 w-4" />
                {running ? "Running..." : "Run Code"}
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-white/60 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800">
              <CardTitle>Console Output</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="min-h-72 overflow-auto bg-black p-5 font-mono text-sm text-emerald-400">{output || "Output will appear here..."}</pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLmsShell>
  );
}
