import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FeeStructureFormProps {
  feeType: string;
  feeAmount: number;
  currency: string;
  feeDueDay: number;
  onFeeTypeChange: (value: string) => void;
  onFeeAmountChange: (value: number) => void;
  onCurrencyChange: (value: string) => void;
  onFeeDueDayChange: (value: number) => void;
}

export function FeeStructureForm({
  feeType,
  feeAmount,
  currency,
  feeDueDay,
  onFeeTypeChange,
  onFeeAmountChange,
  onCurrencyChange,
  onFeeDueDayChange,
}: FeeStructureFormProps) {
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
      <div className="font-semibold text-lg">Fee Structure</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="feeType">Fee Type</Label>
          <Select value={feeType} onValueChange={onFeeTypeChange}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
              <SelectItem value="course-based">Course Based</SelectItem>
              <SelectItem value="none">No Fee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="feeAmount">Fee Amount</Label>
          <Input
            id="feeAmount"
            type="number"
            step="0.01"
            min="0"
            value={feeAmount}
            onChange={(e) => onFeeAmountChange(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={onCurrencyChange}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR (₹)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="feeDueDay">Fee Due Day of Month</Label>
          <Input
            id="feeDueDay"
            type="number"
            min="1"
            max="31"
            value={feeDueDay}
            onChange={(e) => onFeeDueDayChange(parseInt(e.target.value) || 1)}
            placeholder="5"
            className="mt-1"
          />
          <div className="text-xs text-slate-500 mt-1">Day of month when fees are due</div>
        </div>
      </div>

      {feeType !== "none" && feeAmount > 0 && (
        <div className="p-3 bg-white rounded border border-slate-200">
          <div className="text-sm text-slate-600">Class Fee Information</div>
          <div className="text-lg font-semibold mt-1">
            {currency === "INR" ? "₹" : currency}{feeAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {feeType} • Due on {feeDueDay}
            {feeDueDay === 1 ? "st" : feeDueDay === 2 ? "nd" : feeDueDay === 3 ? "rd" : "th"} of each period
          </div>
          <div className="text-xs text-slate-600 mt-2">
            This fee will be automatically assigned to all students in this class. Students can have custom fee overrides if needed.
          </div>
        </div>
      )}
    </div>
  );
}
