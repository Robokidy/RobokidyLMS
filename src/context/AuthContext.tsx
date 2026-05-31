import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/api/client";

type UserRole = "admin" | "teacher" | "student" | "parent";

type User = {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  role: UserRole;
  schoolId?: string;
  classSectionIds?: string[];
  permissions?: string[];
  grade?: string;
  firstLogin: boolean;
} | null;

type AuthState = {
  token: string;
  user: User;
  setAuth: (token: string, user: NonNullable<User>) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState<User>(JSON.parse(localStorage.getItem("user") || "null"));

  const clearAuth = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  useEffect(() => {
    if (!token) return;

    apiFetch("/auth/me", {}, token)
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      })
      .catch(clearAuth);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const timeoutMs = 30 * 60 * 1000;
    let timer = window.setTimeout(clearAuth, timeoutMs);

    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(clearAuth, timeoutMs);
    };

    window.addEventListener("mousemove", refresh);
    window.addEventListener("keydown", refresh);
    window.addEventListener("click", refresh);
    window.addEventListener("touchstart", refresh);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", refresh);
      window.removeEventListener("keydown", refresh);
      window.removeEventListener("click", refresh);
      window.removeEventListener("touchstart", refresh);
    };
  }, [token]);

  const value = useMemo(() => ({
    token,
    user,
    setAuth: (nextToken: string, nextUser: NonNullable<User>) => {
      setToken(nextToken);
      setUser(nextUser);
      localStorage.setItem("token", nextToken);
      localStorage.setItem("user", JSON.stringify(nextUser));
    },
    logout: () => {
      apiFetch("/auth/logout", { method: "POST" }, token).catch(() => undefined);
      clearAuth();
    }
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used in AuthProvider");
  return ctx;
}
