# Fee Management System - Quick Reference

## 📁 Files Created/Modified

### Backend
- ✅ `server/src/models/ClassSection.js` - Added fee fields (feeType, feeAmount, currency, feeDueDay)
- ✅ `server/src/models/FeeAccount.js` - Enhanced with virtual pendingAmount, calculateStatus method
- ✅ `server/src/routes/feeRoutes.js` - Complete fee API endpoints
- ✅ `server/src/routes/adminRoutes.js` - Class & student creation with fee account auto-generation
- ✅ `server/src/index.js` - Registered feeRoutes

### Frontend
- ✅ `src/types.ts` - Added FeeAccount, FeeStatus, FeeType, Payment types
- ✅ `src/services/feeService.ts` - Service layer for all fee operations
- ✅ `src/components/fees/PaymentModal.tsx` - Record payments UI
- ✅ `src/components/fees/FeeStructureForm.tsx` - Configure class fees
- ✅ `src/components/fees/FeeTab.tsx` - Student fee profile
- ✅ `src/components/fees/FeeDashboard.tsx` - Admin analytics
- ✅ `src/components/fees/ClassFeeView.tsx` - Class-level fee management
- ✅ `src/components/fees/index.ts` - Barrel export

### Documentation
- ✅ `FEE_MANAGEMENT_INTEGRATION.md` - Complete integration guide
- ✅ `FEE_MANAGEMENT_QUICK_REF.md` - This file

---

## 🎯 Core Features

### Fee Structure at Class Level
```
ClassSection now has:
- feeType: "monthly" | "quarterly" | "yearly" | "course-based" | "none"
- feeAmount: 1500 (INR)
- currency: "INR"
- feeDueDay: 5 (of each month/period)
```

### Automatic Fee Accounts
```
When student added to class:
1. FeeAccount auto-created
2. Fee amount inherited from class
3. Can override per student (customFeeAmount)
4. Status auto-calculated
```

### Payment Tracking
```
Each payment recorded with:
- Amount
- Payment Date
- Method (cash/check/bank-transfer/online)
- Reference/Receipt number
- Remarks
```

### Status Auto-Calculation
```
Status automatically set based on:
- paid: paidAmount == totalFees
- partially-paid: paidAmount > 0 AND paidAmount < totalFees
- pending: paidAmount == 0 AND not overdue
- overdue: dueDate passed AND pending > 0
- waived: (manual) amount forgiven
- scholarship: (manual) special rate
```

---

## 📡 API Quick Reference

```bash
# Get student fees
GET /api/fees/student/:studentId

# Get class fees with summary
GET /api/fees/class/:classId

# Record a payment
POST /api/fees/payment
{
  "studentId": "...",
  "amount": 500,
  "method": "online",
  "reference": "UPI-12345",
  "paymentDate": "2026-06-15"
}

# Update fee details
PUT /api/fees/:feeAccountId
{
  "totalFees": 2000,
  "status": "waived"
}

# Get analytics
GET /api/fees/analytics/school?schoolId=xxx

# Get class-wise report
GET /api/fees/report/class-wise
```

---

## 🎨 Component Usage Patterns

### 1. Add Fee Structure to Class Creation
```tsx
import { FeeStructureForm } from "@/components/fees";

export function CreateClassForm() {
  const [feeType, setFeeType] = useState("monthly");
  const [feeAmount, setFeeAmount] = useState(0);
  const [currency, setCurrency] = useState("INR");
  const [feeDueDay, setFeeDueDay] = useState(5);

  return (
    <form onSubmit={handleSubmit}>
      {/* Existing class fields */}
      
      <FeeStructureForm
        feeType={feeType}
        feeAmount={feeAmount}
        currency={currency}
        feeDueDay={feeDueDay}
        onFeeTypeChange={setFeeType}
        onFeeAmountChange={setFeeAmount}
        onCurrencyChange={setCurrency}
        onFeeDueDayChange={setFeeDueDay}
      />
      
      <button type="submit">Create Class</button>
    </form>
  );
}
```

### 2. Show Student Fees in Profile
```tsx
import { FeeTab } from "@/components/fees";

export function StudentProfilePage() {
  const student = useParams(); // Get student from context/params

  return (
    <Tabs>
      <TabsContent value="general">
        {/* Student info */}
      </TabsContent>
      
      <TabsContent value="fees">
        <FeeTab 
          studentId={student._id}
          studentName={student.fullName}
        />
      </TabsContent>
    </Tabs>
  );
}
```

### 3. Class-Level Fee Management
```tsx
import { ClassFeeView } from "@/components/fees";

export function ClassDetailsPage() {
  const classId = useParams().classId;

  return (
    <Tabs>
      <TabsContent value="students">
        {/* Student list */}
      </TabsContent>
      
      <TabsContent value="fees">
        <ClassFeeView 
          classId={classId}
          className="Grade 5 - A"
        />
      </TabsContent>
    </Tabs>
  );
}
```

### 4. Admin Fee Dashboard
```tsx
import { FeeDashboard } from "@/components/fees";

export function FeeMgmtPage() {
  const auth = useAuth();

  return (
    <div>
      <h1>Fee Management</h1>
      <FeeDashboard schoolId={auth.user.schoolId} />
    </div>
  );
}
```

---

## 🔧 Service Layer Helpers

```tsx
import { feeService } from "@/services/feeService";

// Format amounts with currency
feeService.formatCurrency(1500, "INR")  // "₹1,500"
feeService.formatCurrency(1500, "USD")  // "$1,500"

// Get status badge styling
const badgeClass = feeService.getStatusColor("overdue")
// Returns: "bg-red-100 text-red-800"

// Calculate pending amount
const pending = feeService.calculatePending(1500, 1000)  // 500

// Determine status
const status = feeService.determineFeeStatus(1500, 500)  // "partially-paid"
```

---

## 📊 Fee Dashboard Metrics

The FeeDashboard automatically displays:

```
Cards:
- Expected Revenue: Total fees across all students
- Total Collected: Amount received
- Pending Collection: Still owed
- Collection Rate: Percentage collected

Status Breakdown:
- Paid: Count of students with paid status
- Partially Paid: Partial payments made
- Pending: No payments yet
- Overdue: Past due date
- Waived: Amount forgiven
- Scholarship: Special rates

Alert:
- Overdue total amount & count
```

---

## 🔐 Security Features

- ✅ Role-based access control (admin/teacher/student)
- ✅ Students can only view their own fees
- ✅ Teachers can only see their class fees
- ✅ Admins see all fees in school
- ✅ Only admin can modify fee structure
- ✅ Only admin/teacher can record payments
- ✅ Activity logging on all fee updates

---

## 🧪 Testing Scenarios

### Scenario 1: Monthly Fees
1. Create class with feeType="monthly", feeAmount=1500, feeDueDay=5
2. Add student to class
3. Verify FeeAccount created with 1500 fee
4. Record payment of 500
5. Verify status changes to "partially-paid"
6. Record payment of 1000
7. Verify status changes to "paid"

### Scenario 2: Overdue Detection
1. Create class with dueDate=5 days ago
2. Student with 0 payments
3. Verify status="overdue" in analytics

### Scenario 3: Class-Wise Report
1. Create multiple classes with different fees
2. Add students, record various payments
3. View ClassFeeView
4. Verify summary calculations match payments

### Scenario 4: Custom Fee Override
1. Create student with customFeeAmount (different from class fee)
2. Verify FeeAccount uses custom amount
3. Record payments and verify calculations

---

## 📈 Next Implementation Steps

1. **Add Fee Columns to Student Tables**
   ```tsx
   // Add to student list component
   <th>Fee Amount</th>
   <th>Paid</th>
   <th>Balance</th>
   <th>Status</th>
   <th>Last Payment</th>
   ```

2. **Add Fee Filters**
   ```tsx
   // Filter students by fee status
   const filters = [
     { label: "Paid", value: "paid" },
     { label: "Partially Paid", value: "partially-paid" },
     { label: "Pending", value: "pending" },
     { label: "Overdue", value: "overdue" }
   ];
   ```

3. **Create Reports**
   ```tsx
   import { feeService } from "@/services/feeService";
   const report = await feeService.getClassWiseReport();
   // Export to PDF/Excel
   ```

4. **Bulk Payment Recording**
   ```tsx
   // Allow recording multiple payments at once
   // Useful for batch processing bank deposits
   ```

---

## 🐛 Debugging Tips

### Check Fee Account Status
```tsx
const fee = await feeService.getStudentFees(studentId);
console.log(fee.status);  // Should match calculation
console.log(fee.pendingAmount);  // totalFees - paidAmount
```

### Verify Auto-Calculation
```tsx
// Status should auto-calculate when payment recorded
const status = feeService.determineFeeStatus(totalFees, paidAmount, dueDate);
```

### Test Analytics
```tsx
const analytics = await feeService.getSchoolFeeAnalytics();
// totalExpected should equal sum of all totalFees
// totalCollected should equal sum of all paidAmount
// collectionPercentage should be (totalCollected/totalExpected) * 100
```

---

## 📝 Database Indexes

Fee routes use these indexes for performance:
```javascript
feeAccountSchema.index({ schoolId: 1, studentId: 1 }, { unique: true });
feeAccountSchema.index({ schoolId: 1, classSectionId: 1, status: 1, dueDate: 1 });
feeAccountSchema.index({ studentId: 1, status: 1 });
feeAccountSchema.index({ dueDate: 1, status: 1 });
```

---

## 🚀 Performance Optimization

- FeeAccount queries use indexes for schoolId, classSectionId, status, dueDate
- Virtual fields (pendingAmount) calculated on retrieval
- Status calculated in-memory before response
- Lean queries used for read-heavy operations
- Pagination recommended for large fee lists

---

## 📞 Support

For implementation help:
1. Check `FEE_MANAGEMENT_INTEGRATION.md` for detailed integration
2. Review component prop types in `src/types.ts`
3. Test API endpoints with fee routes
4. Use feeService helpers for calculations
5. Review console logs in browser DevTools
