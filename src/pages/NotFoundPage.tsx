import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-md w-full mx-4 p-8 rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-950">
            <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">Page Not Found</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/login">
          <Button className="w-full">Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}
