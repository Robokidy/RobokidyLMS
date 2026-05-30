import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type Role = "admin" | "teacher" | "student" | "parent";

export default function ProtectedRoute({ children, role }: { children: JSX.Element; role?: Role | Role[] }) {
  const { token, user } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
  }
  return children;
}
