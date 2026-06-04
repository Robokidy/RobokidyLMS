import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, KeyRound, LockKeyhole } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { token, user, setAuth } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!password || !confirmPassword) {
      setError("Both fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify({ password, confirmPassword }) }, token);
      if (user) setAuth(token, { ...user, firstLogin: false });
      setMsg("Password changed successfully.");
      navigate(user?.role === "admin" ? "/admin" : user?.role === "cto" ? "/cto" : user?.role === "teacher" ? "/teacher" : "/student/lessons");
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-lg rounded-3xl border-blue-100/70 shadow-2xl bg-white/95 dark:bg-slate-950/85">
        <CardHeader className="space-y-4">
          <Badge className="w-fit bg-blue-100 text-blue-700 hover:bg-blue-100">Secure First Login Setup</Badge>
          <CardTitle className="text-2xl font-bold">Set Your New Password</CardTitle>
          <p className="text-sm text-muted-foreground">Step 2 of 2: Replace temporary password and continue learning.</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-3 bg-emerald-50 border-emerald-200 text-emerald-700">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Step 1 Completed
              </div>
              <p className="text-xs mt-1">Logged in with temporary password</p>
            </div>
            <div className="rounded-xl border p-3 bg-blue-50 border-blue-200 text-blue-700">
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-4 w-4" />
                Step 2 Active
              </div>
              <p className="text-xs mt-1">Create your secure personal password</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <div className="relative">
                <LockKeyhole className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-9 h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <LockKeyhole className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="pl-9 h-11 rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground">You’ll use this password for all future logins.</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {msg && <p className="text-sm text-green-600">{msg}</p>}

            <Button className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all duration-300" disabled={loading}>
              {loading ? "Updating..." : "Save & Continue to Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
