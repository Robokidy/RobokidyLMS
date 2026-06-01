import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { feeService } from "@/services/feeService";
import { FeeAccount } from "@/types";
import { PaymentModal } from "./PaymentModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";
import { Search } from "lucide-react";

interface ClassFeeViewProps {
  classId: string;
  className: string;
}

export function ClassFeeView({ classId, className }: ClassFeeViewProps) {
  const { toast } = useToast();
  const [fees, setFees] = useState<FeeAccount[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentFee, setSelectedStudentFee] = useState<FeeAccount | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  useEffect(() => {
    loadClassFees();
  }, [classId]);

  const { token } = useAuth();

  const loadClassFees = async () => {
    setLoading(true);
    try {
      const data = await feeService.getClassFees(classId, token);
      setFees(data.fees);
      setSummary(data.summary);
    } catch (error) {
      console.error("Failed to load class fees:", error);
      toast({
        description: "Failed to load class fee information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClick = (fee: FeeAccount) => {
    setSelectedStudentFee(fee);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (updatedFee: FeeAccount) => {
    setFees((prev) =>
      prev.map((f) => (f._id === updatedFee._id ? updatedFee : f))
    );
    loadClassFees();
  };

  const filteredFees = fees.filter((fee) => {
    const studentName = fee.studentId && typeof fee.studentId === "object" ? fee.studentId.fullName : "";
    return (
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fee.studentId && typeof fee.studentId === "object" && fee.studentId.rollNumber?.includes(searchTerm))
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-slate-600">Loading class fee data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedStudentFee && (
        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          studentId={
            selectedStudentFee.studentId && typeof selectedStudentFee.studentId === "object"
              ? selectedStudentFee.studentId._id
              : selectedStudentFee.studentId
          }
          studentName={
            selectedStudentFee.studentId && typeof selectedStudentFee.studentId === "object"
              ? selectedStudentFee.studentId.fullName
              : "Student"
          }
          totalFee={selectedStudentFee.totalFees}
          paidAmount={selectedStudentFee.paidAmount}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Class Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-600">Class Fee Structure</div>
              <div className="text-lg font-bold mt-2">
                {summary.feeStructure ? `${feeService.formatCurrency(summary.feeStructure.feeAmount, summary.feeStructure.currency)} ${String(summary.feeStructure.feeType || "").replace("-", " ")}` : className}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-600">Total Students</div>
              <div className="text-2xl font-bold mt-2">{summary.totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-600">Expected</div>
              <div className="text-2xl font-bold mt-2">{feeService.formatCurrency(summary.totalExpected)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-600">Collected</div>
              <div className="text-2xl font-bold mt-2 text-green-600">{feeService.formatCurrency(summary.totalCollected)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-600">Pending</div>
              <div className="text-2xl font-bold mt-2 text-orange-600">{feeService.formatCurrency(summary.totalPending)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-slate-600">Collection %</div>
              <div className="text-2xl font-bold mt-2 text-blue-600">{summary.collectionPercentage}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fee List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Student Fee Status</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFees.length === 0 ? (
            <div className="text-center py-6 text-slate-600">
              {searchTerm ? "No students found matching your search" : "No students in this class"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Student Name</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Total Fee</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Paid</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Balance</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Last Payment</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map((fee) => {
                    const student = fee.studentId && typeof fee.studentId === "object" ? fee.studentId : null;
                    const pendingAmount = fee.totalFees - fee.paidAmount;
                    const statusColor = feeService.getStatusColor(fee.status);

                    return (
                      <tr key={fee._id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-semibold">{student?.fullName || "Unknown"}</div>
                            {student?.rollNumber && (
                              <div className="text-xs text-slate-600">{student.rollNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {feeService.formatCurrency(fee.totalFees)}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600 font-semibold">
                          {feeService.formatCurrency(fee.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right text-orange-600 font-semibold">
                          {feeService.formatCurrency(pendingAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={statusColor}>
                            {fee.status.replace("-", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {fee.lastPaymentDate
                            ? format(new Date(fee.lastPaymentDate), "dd MMM yyyy")
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {pendingAmount > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePaymentClick(fee)}
                            >
                              Pay
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
