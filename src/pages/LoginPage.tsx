import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Lock, Rocket, Sparkles, User } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      setAuth(data.token, data.user);
      if (data.user.firstLogin) return navigate("/change-password");
      if (data.user.role === "admin") return navigate("/admin");
      if (data.user.role === "teacher") return navigate("/teacher");
      navigate("/student");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">
        <section className="hidden lg:flex flex-col justify-between p-12 animate-in fade-in duration-700">
          <div>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 mb-6">Python Learning Hub</Badge>
            <h1 className="text-5xl font-extrabold leading-tight text-slate-900 dark:text-slate-100">
              Start Your Python Journey
              <span className="ml-2">🚀</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Learn. Practice. Grow. Your learning progress is waiting for you.
            </p>
          </div>

          <div className="rounded-3xl border border-blue-200/70 bg-white/70 dark:bg-slate-900/60 p-8 shadow-xl backdrop-blur">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-2xl bg-blue-50 p-4 text-center border border-blue-100">
                <BookOpen className="h-5 w-5 mx-auto text-blue-600" />
                <p className="mt-2 text-xs font-medium text-blue-700">Lessons</p>
              </div>
              <div className="rounded-2xl bg-indigo-50 p-4 text-center border border-indigo-100">
                <Rocket className="h-5 w-5 mx-auto text-indigo-600" />
                <p className="mt-2 text-xs font-medium text-indigo-700">Quizzes</p>
              </div>
              <div className="rounded-2xl bg-cyan-50 p-4 text-center border border-cyan-100">
                <Sparkles className="h-5 w-5 mx-auto text-cyan-600" />
                <p className="mt-2 text-xs font-medium text-cyan-700">Code Lab</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 italic">
              “Small steps every day lead to big coding skills.”
            </p>
          </div>
        </section>

        <section className="grid place-items-center p-4 sm:p-8 animate-in fade-in duration-700">
          <Card className="w-full max-w-md rounded-3xl border-blue-100/70 shadow-2xl bg-white/90 dark:bg-slate-950/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
              <p className="text-sm text-muted-foreground">Login & Continue Learning</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9 h-11 rounded-xl transition-all focus-visible:ring-blue-500"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Your learning progress is waiting!</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      className="pl-9 h-11 rounded-xl transition-all focus-visible:ring-blue-500"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <Button className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all duration-300">
                  Login & Continue Learning
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
