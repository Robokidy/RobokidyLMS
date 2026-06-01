import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { feeService } from "@/services/feeService";
import { FeeAccount } from "@/types";
import { PaymentModal } from "./PaymentModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

interface FeeTabProps {
  studentId: string;
  studentName: string;
  readOnly?: boolean;
  onRefresh?: () => void;
}

export function FeeTab({ studentId, studentName, readOnly = false, onRefresh }: FeeTabProps) {
  const { toast } = useToast();
  const { token } = useAuth();
  const [fee, setFee] = useState<FeeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  useEffect(() => {
    loadFees();
  }, [studentId, token]);

  const loadFees = async () => {
    setLoading(true);
    try {
      const data = await feeService.getStudentFees(studentId, token);
      setFee(data);
    } catch (error) {
      console.error("Failed to load fees:", error);
      toast({
        description: "Failed to load fee information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (updatedFee: FeeAccount) => {
    setFee(updatedFee);
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-slate-600">Loading fee information...</div>
      </div>
    );
  }

  if (!fee) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-slate-600">No fee account found</div>
      </div>
    );
  }

  const pendingAmount = fee.pendingAmount || feeService.calculatePending(fee.totalFees, fee.paidAmount);
  const statusColor = feeService.getStatusColor(fee.status);

  return (
    <div className="space-y-6">
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        studentId={studentId}
        studentName={studentName}
        totalFee={fee.totalFees}
        paidAmount={fee.paidAmount}
        currency={fee.feeType === "course-based" ? "INR" : "INR"}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Fee Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-slate-600 font-medium">Total Fee</div>
            <div className="text-2xl font-bold mt-2">{feeService.formatCurrency(fee.totalFees)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-slate-600 font-medium">Paid</div>
            <div className="text-2xl font-bold mt-2 text-green-600">{feeService.formatCurrency(fee.paidAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-slate-600 font-medium">Pending</div>
            <div className="text-2xl font-bold mt-2 text-orange-600">{feeService.formatCurrency(pendingAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-slate-600 font-medium">Status</div>
            <div className="mt-2">
              <Badge className={statusColor}>{fee.status.replace("-", " ")}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fee Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-slate-600">Fee Type</div>
              <div className="font-semibold mt-1 capitalize">{fee.feeType.replace("-", " ")}</div>
            </div>

            <div>
              <div className="text-sm text-slate-600">Collection %</div>
              <div className="font-semibold mt-1">
                {fee.totalFees > 0 ? ((fee.paidAmount / fee.totalFees) * 100).toFixed(1) : "0"}%
              </div>
            </div>

            {fee.dueDate && (
              <div>
                <div className="text-sm text-slate-600">Due Date</div>
                <div className="font-semibold mt-1">{format(new Date(fee.dueDate), "dd MMM yyyy")}</div>
              </div>
            )}

            {fee.lastPaymentDate && (
              <div>
                <div className="text-sm text-slate-600">Last Payment</div>
                <div className="font-semibold mt-1">{format(new Date(fee.lastPaymentDate), "dd MMM yyyy")}</div>
              </div>
            )}
          </div>

          {fee.notes && (
            <div className="p-3 bg-slate-50 rounded">
              <div className="text-sm text-slate-600">Notes</div>
              <div className="text-sm mt-1">{fee.notes}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {fee.payments && fee.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fee.payments.map((payment, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <div>
                    <div className="font-medium">{feeService.formatCurrency(payment.amount)}</div>
                    <div className="text-xs text-slate-600">
                      {format(new Date(payment.paidAt), "dd MMM yyyy")} • {payment.method}
                    </div>
                  </div>
                  <div className="text-right">
                    {payment.receiptNo && <div className="text-xs text-slate-600">Receipt: {payment.receiptNo}</div>}
                    {payment.reference && <div className="text-xs text-slate-600">Ref: {payment.reference}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!readOnly && pendingAmount > 0 && (
        <div className="flex gap-2">
          <Button onClick={() => setPaymentModalOpen(true)}>Record Payment</Button>
          <Button variant="outline" onClick={loadFees}>
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
