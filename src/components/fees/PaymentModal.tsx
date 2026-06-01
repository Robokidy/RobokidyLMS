import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { feeService } from "@/services/feeService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  totalFee: number;
  paidAmount: number;
  currency?: string;
  onPaymentSuccess?: (updatedFee: any) => void;
}

export function PaymentModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  totalFee,
  paidAmount,
  currency = "INR",
  onPaymentSuccess,
}: PaymentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  const pendingAmount = totalFee - paidAmount;

  const { token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({ description: "Please enter a valid payment amount", variant: "destructive" });
      return;
    }

    if (parseFloat(amount) > pendingAmount) {
      toast({
        description: `Payment amount cannot exceed pending amount (₹${pendingAmount})`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await feeService.recordPayment({
        studentId,
        amount: parseFloat(amount),
        method,
        reference,
        remarks,
        paymentDate,
      }, token);

      toast({ description: "Payment recorded successfully" });
      onPaymentSuccess?.(result);
      onOpenChange(false);

      // Reset form
      setAmount("");
      setMethod("cash");
      setReference("");
      setRemarks("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      toast({
        description: error instanceof Error ? error.message : "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const maxAmount = pendingAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg text-sm">
            <div>
              <div className="text-slate-600">Student</div>
              <div className="font-semibold">{studentName}</div>
            </div>
            <div>
              <div className="text-slate-600">Total Fee</div>
              <div className="font-semibold">{feeService.formatCurrency(totalFee, currency)}</div>
            </div>
            <div>
              <div className="text-slate-600">Paid</div>
              <div className="font-semibold">{feeService.formatCurrency(paidAmount, currency)}</div>
            </div>
            <div>
              <div className="text-slate-600">Pending</div>
              <div className="font-semibold text-red-600">{feeService.formatCurrency(pendingAmount, currency)}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max: ₹${maxAmount}`}
                className="mt-1"
              />
              <div className="text-xs text-slate-500 mt-1">Maximum: {feeService.formatCurrency(maxAmount, currency)}</div>
            </div>

            <div>
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="method">Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Receipt/Check number"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional notes"
                className="mt-1 resize-none"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !amount || parseFloat(amount) <= 0}>
                {loading ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
