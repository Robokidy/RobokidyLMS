import React, { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for catching and displaying React errors
 * Prevents white screen of death
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error Boundary caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.retry);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="max-w-md w-full mx-4 p-8 rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-950">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-center mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <Button onClick={this.retry} className="w-full" size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Loading State Skeleton Component
 */
export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded-full dark:bg-slate-800 w-3/4 animate-pulse" />
            <div className="h-3 bg-slate-100 rounded-full dark:bg-slate-900 w-full animate-pulse" />
            <div className="h-3 bg-slate-100 rounded-full dark:bg-slate-900 w-5/6 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty State Component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon?: React.ComponentType<any>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {Icon && (
        <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
          <Icon className="h-8 w-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">{description}</p>
      {action}
    </div>
  );
}

/**
 * API Error Handler Hook
 */
export function useApiError() {
  const [error, setError] = React.useState<string | null>(null);

  const handleError = (err: any) => {
    const message = err?.message || err?.response?.data?.message || "An error occurred";
    setError(message);
    console.error("API Error:", message);
  };

  const clearError = () => setError(null);

  return { error, handleError, clearError };
}
