import { apiFetch } from "@/api/client";
import { FeeAccount, Payment } from "@/types";

export interface CreatePaymentRequest {
  studentId: string;
  amount: number;
  method?: string;
  reference?: string;
  receiptNo?: string;
  remarks?: string;
  paymentDate?: string;
}

export interface UpdateFeeRequest {
  totalFees?: number;
  dueDate?: string;
  feeType?: string;
  status?: string;
  notes?: string;
}

export const feeService = {
  /**
   * Get fee account for a student
   */
  async getStudentFees(studentId: string, token?: string): Promise<FeeAccount> {
    return apiFetch(`/fees/student/${studentId}`, {}, token);
  },

  /**
   * Get all fees for a class
   */
  async getClassFees(classId: string, token?: string): Promise<{
    fees: FeeAccount[];
    summary: {
      totalStudents: number;
      totalExpected: number;
      totalCollected: number;
      totalPending: number;
      paidCount: number;
      partialCount: number;
      pendingCount: number;
      overdueCount: number;
      collectionPercentage: number;
    };
  }> {
    return apiFetch(`/fees/class/${classId}`, {}, token);
  },

  /**
   * Record a payment
   */
  async recordPayment(data: CreatePaymentRequest, token?: string): Promise<FeeAccount> {
    const res = await apiFetch("/fees/payment", {
      method: "POST",
      body: data,
    }, token);
    return res.feeAccount || res;
  },

  /**
   * Update fee details
   */
  async updateFee(feeAccountId: string, data: UpdateFeeRequest, token?: string): Promise<FeeAccount> {
    const res = await apiFetch(`/fees/${feeAccountId}`, {
      method: "PUT",
      body: data,
    }, token);
    return res.feeAccount || res;
  },

  /**
   * Get fee analytics for admin dashboard
   */
  async getSchoolFeeAnalytics(schoolId?: string, token?: string): Promise<{
    totalExpected: number;
    totalCollected: number;
    totalPending: number;
    totalOverdue: number;
    collectionPercentage: number;
    statuses: Record<string, number>;
  }> {
    const url = new URL("/fees/analytics/school", window.location.origin);
    if (schoolId) url.searchParams.append("schoolId", schoolId);
    return apiFetch(url.pathname + url.search, {}, token);
  },

  /**
   * Get class-wise collection report
   */
  async getClassWiseReport(token?: string): Promise<
    Array<{
      className: string;
      school: string;
      totalStudents: number;
      feesConfigured: number;
      totalExpected: number;
      totalCollected: number;
      totalPending: number;
      collectionPercentage: number;
    }>
  > {
    return apiFetch("/fees/report/class-wise", {}, token);
  },

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency = "INR"): string {
    const symbols: Record<string, string> = {
      INR: "Rs.",
      USD: "$",
      EUR: "EUR",
      GBP: "GBP",
    };
    const symbol = symbols[currency] || currency;
    return `${symbol} ${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  },

  /**
   * Get status badge color
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      "partially-paid": "bg-blue-100 text-blue-800",
      pending: "bg-yellow-100 text-yellow-800",
      overdue: "bg-red-100 text-red-800",
      waived: "bg-purple-100 text-purple-800",
      scholarship: "bg-indigo-100 text-indigo-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  },

  /**
   * Calculate pending amount
   */
  calculatePending(totalFees: number, paidAmount: number): number {
    return Math.max(0, totalFees - paidAmount);
  },

  /**
   * Determine fee status based on amounts
   */
  determineFeeStatus(totalFees: number, paidAmount: number, dueDate?: Date): string {
    const pending = totalFees - paidAmount;
    if (pending <= 0) return "paid";
    if (paidAmount > 0) return "partially-paid";
    if (dueDate && new Date() > new Date(dueDate)) return "overdue";
    return "pending";
  },
};
