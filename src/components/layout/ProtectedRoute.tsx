import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type Role = "admin" | "cto" | "teacher" | "student" | "parent";

export default function ProtectedRoute({ children, role }: { children: JSX.Element; role?: Role | Role[] }) {
  const { token, user } = useAuth();
  const location = useLocation();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.firstLogin && location.pathname !== "/change-password") return <Navigate to="/change-password" replace />;
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
}
