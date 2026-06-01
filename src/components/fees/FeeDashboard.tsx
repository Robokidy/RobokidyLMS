import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { feeService } from "@/services/feeService";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, DollarSign, TrendingUp } from "lucide-react";

interface FeeAnalytics {
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionPercentage: number;
  statuses: Record<string, number>;
}

interface FeeDashboardProps {
  schoolId?: string;
}

export function FeeDashboard({ schoolId }: FeeDashboardProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<FeeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [schoolId, token]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const analytics = await feeService.getSchoolFeeAnalytics(schoolId, token);
      setData(analytics);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast({
        description: "Failed to load fee analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-slate-600">Loading fee analytics...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-slate-600">No fee data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feeService.formatCurrency(data.totalExpected)}</div>
            <p className="text-xs text-slate-600 mt-1">Total fees across all classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{feeService.formatCurrency(data.totalCollected)}</div>
            <p className="text-xs text-slate-600 mt-1">Actual amount received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Collection</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{feeService.formatCurrency(data.totalPending)}</div>
            <p className="text-xs text-slate-600 mt-1">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.collectionPercentage}%</div>
            <p className="text-xs text-slate-600 mt-1">Of expected amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fee Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{data.statuses.paid || 0}</div>
              <div className="text-xs text-green-700 mt-1">Paid</div>
            </div>

            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{data.statuses["partially-paid"] || 0}</div>
              <div className="text-xs text-blue-700 mt-1">Partial</div>
            </div>

            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{data.statuses.pending || 0}</div>
              <div className="text-xs text-yellow-700 mt-1">Pending</div>
            </div>

            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{data.statuses.overdue || 0}</div>
              <div className="text-xs text-red-700 mt-1">Overdue</div>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{data.statuses.waived || 0}</div>
              <div className="text-xs text-purple-700 mt-1">Waived</div>
            </div>

            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{data.statuses.scholarship || 0}</div>
              <div className="text-xs text-indigo-700 mt-1">Scholarship</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue Warning */}
      {data.totalOverdue > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg text-red-700">⚠️ Overdue Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{feeService.formatCurrency(data.totalOverdue)}</div>
            <p className="text-sm text-red-700 mt-1">
              {data.statuses.overdue || 0} student(s) have fees past due date. Follow up action may be required.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
