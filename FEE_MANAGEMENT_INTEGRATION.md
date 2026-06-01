# Complete Fee Management System - Integration Guide

## Overview
This document explains how to integrate the new fee management system into your admin, teacher, and student portals.

---

## Database Models Updated

### ClassSection Model (server/src/models/ClassSection.js)
Now includes fee structure fields:
- `feeType`: "monthly" | "quarterly" | "yearly" | "course-based" | "none"
- `feeAmount`: Number (default: 0)
- `currency`: String (default: "INR")
- `feeDueDay`: Number (1-31, default: 5 - the day of month fees are due)

### FeeAccount Model (server/src/models/FeeAccount.js)
Enhanced with:
- `feeType`: Fee classification
- `lastPaymentDate`: Track most recent payment
- `updatedBy`: Admin/Teacher who last modified
- Virtual field: `pendingAmount` (calculated as totalFees - paidAmount)
- Method: `calculateStatus()` (auto-determines Paid/Partially-paid/Pending/Overdue)

### Payment Schema
Enhanced with:
- `remarks`: Additional notes about the payment
- `method`: Payment method enum (cash, check, bank-transfer, online, other)

---

## Backend API Routes

### Endpoints Created (server/src/routes/feeRoutes.js)

#### 1. Get Student Fee Account
```
GET /api/fees/student/:studentId

Response: FeeAccount with pendingAmount and status
```

#### 2. Get Class Fees with Summary
```
GET /api/fees/class/:classId

Response: {
  fees: FeeAccount[],
  summary: {
    totalStudents: number,
    totalExpected: number,
    totalCollected: number,
    totalPending: number,
    collectionPercentage: number,
    paidCount, partialCount, pendingCount, overdueCount
  }
}
```

#### 3. Record Payment
```
POST /api/fees/payment
Body: {
  studentId: string,
  amount: number,
  method?: string,
  reference?: string,
  receiptNo?: string,
  remarks?: string,
  paymentDate?: string
}

Response: Updated FeeAccount
```

#### 4. Update Fee Details
```
PUT /api/fees/:feeAccountId
Body: {
  totalFees?: number,
  dueDate?: string,
  feeType?: string,
  status?: string,
  notes?: string
}

Response: Updated FeeAccount
```

#### 5. School Fee Analytics
```
GET /api/fees/analytics/school?schoolId=xxx

Response: {
  totalExpected, totalCollected, totalPending, totalOverdue,
  collectionPercentage, statuses: { paid, partially-paid, pending, overdue, waived, scholarship }
}
```

#### 6. Class-Wise Report
```
GET /api/fees/report/class-wise

Response: Array of class statistics
```

---

## Frontend Components

### 1. FeeStructureForm Component
**Purpose**: Configure fees when creating/editing a class
**Location**: `src/components/fees/FeeStructureForm.tsx`

**Usage in Admin Class Creation**:
```tsx
import { FeeStructureForm } from "@/components/fees";

// In your class creation page:
const [feeType, setFeeType] = useState("monthly");
const [feeAmount, setFeeAmount] = useState(1500);
const [currency, setCurrency] = useState("INR");
const [feeDueDay, setFeeDueDay] = useState(5);

return (
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
);

// When saving class:
const classData = {
  name, grade, section, teacherIds,
  feeType, feeAmount, currency, feeDueDay  // Include fee fields
};
```

### 2. PaymentModal Component
**Purpose**: Record student payments with amount, method, date, reference
**Location**: `src/components/fees/PaymentModal.tsx`

**Usage in Student Profile/Admin/Teacher Pages**:
```tsx
import { PaymentModal } from "@/components/fees";

const [paymentModalOpen, setPaymentModalOpen] = useState(false);

return (
  <>
    <PaymentModal
      open={paymentModalOpen}
      onOpenChange={setPaymentModalOpen}
      studentId={student._id}
      studentName={student.fullName}
      totalFee={feeAccount.totalFees}
      paidAmount={feeAccount.paidAmount}
      currency="INR"
      onPaymentSuccess={(updatedFee) => {
        // Refresh fee data
        loadFees();
      }}
    />
    <Button onClick={() => setPaymentModalOpen(true)}>Record Payment</Button>
  </>
);
```

### 3. FeeTab Component
**Purpose**: Display complete fee information for a student (balance, history, payment button)
**Location**: `src/components/fees/FeeTab.tsx`

**Usage in Student Profile Page**:
```tsx
import { FeeTab } from "@/components/fees";

// In your student profile/details page:
return (
  <Tabs>
    <TabsContent value="general">
      {/* Student basic info */}
    </TabsContent>
    <TabsContent value="fees">
      <FeeTab 
        studentId={student._id} 
        studentName={student.fullName}
        readOnly={userRole === "student"}  // Students can't modify
      />
    </TabsContent>
  </Tabs>
);
```

### 4. ClassFeeView Component
**Purpose**: View all student fees in a class with payment recording
**Location**: `src/components/fees/ClassFeeView.tsx`

**Usage in Class Details Page**:
```tsx
import { ClassFeeView } from "@/components/fees";

return (
  <Tabs>
    <TabsContent value="students">
      {/* Student list */}
    </TabsContent>
    <TabsContent value="fees">
      <ClassFeeView classId={classId} className={className} />
    </TabsContent>
  </Tabs>
);
```

### 5. FeeDashboard Component
**Purpose**: Admin dashboard showing fee analytics and collection data
**Location**: `src/components/fees/FeeDashboard.tsx`

**Usage in Admin Dashboard**:
```tsx
import { FeeDashboard } from "@/components/fees";

return (
  <div className="space-y-6">
    <h1>Fee Management Dashboard</h1>
    <FeeDashboard schoolId={selectedSchoolId} />
  </div>
);
```

---

## Service Layer

### FeeService
**Location**: `src/services/feeService.ts`

**Key Methods**:
```tsx
// Get student fees
await feeService.getStudentFees(studentId)

// Get class fees with summary
await feeService.getClassFees(classId)

// Record a payment
await feeService.recordPayment({
  studentId, amount, method, reference, receiptNo, remarks, paymentDate
})

// Update fee details
await feeService.updateFee(feeAccountId, { totalFees, dueDate, status })

// Get analytics
await feeService.getSchoolFeeAnalytics(schoolId)

// Helper methods
feeService.formatCurrency(amount, currency)
feeService.getStatusColor(status)
feeService.calculatePending(totalFees, paidAmount)
feeService.determineFeeStatus(totalFees, paidAmount, dueDate)
```

---

## Data Types

### TypeScript Types (src/types.ts)
```tsx
export type FeeStatus = "paid" | "partially-paid" | "pending" | "overdue" | "waived" | "scholarship"
export type FeeType = "monthly" | "quarterly" | "yearly" | "course-based" | "custom" | "none"
export type PaymentMethod = "cash" | "check" | "bank-transfer" | "online" | "other"

export type Payment = {
  _id?: string
  amount: number
  paidAt: string | Date
  method: PaymentMethod
  reference?: string
  receiptNo?: string
  remarks?: string
}

export type FeeAccount = {
  _id: string
  schoolId: string
  classSectionId?: string
  studentId: string
  feeType: FeeType
  totalFees: number
  paidAmount: number
  pendingAmount?: number
  dueDate?: string | Date
  payments: Payment[]
  status: FeeStatus
  lastPaymentDate?: string | Date
  notes?: string
}
```

---

## Integration Checklist

### Admin Portal Integration
- [ ] Update **AdminClassPage** (Class Creation):
  - Add FeeStructureForm to class creation form
  - Pass fee fields to API on save
  
- [ ] Update **AdminStudentPage** (Student Creation):
  - Show option for custom fee override
  - Auto-create FeeAccount from class fee
  
- [ ] Create **AdminFeesDashboard** page:
  - Add to sidebar menu
  - Display FeeDashboard component
  - Show fee analytics and collection stats
  
- [ ] Update **AdminClassDetailsPage**:
  - Add "Fees" tab showing ClassFeeView
  - Show fee summary and student payment status

### Teacher Portal Integration
- [ ] Update **TeacherClassDetailsPage**:
  - Add "Fees" tab with ClassFeeView
  - Allow recording payments for their classes
  - Show class-level fee collection stats
  
- [ ] Update **TeacherStudentPage**:
  - Show fee column in student table
  - Add payment recording button
  - Display pending amount

### Student Portal Integration
- [ ] Update **StudentProfilePage**:
  - Add "Fees" tab with FeeTab
  - Show payment history
  - Display pending balance

---

## Workflow Examples

### Scenario 1: Create a Class with Fee Structure
```
Admin creates class "Grade 5 - A":
1. Fill class details (name, grade, section, teacher)
2. In FeeStructureForm:
   - Select Fee Type: "Monthly"
   - Enter Fee Amount: 1500
   - Select Currency: INR
   - Set Fee Due Day: 5
3. Save class

Backend:
- ClassSection created with fee fields
- All students added to this class get FeeAccount with 1500 fee
```

### Scenario 2: Record a Partial Payment
```
Teacher records partial payment for student:
1. Navigate to class fees or student profile
2. Click "Record Payment"
3. PaymentModal opens showing:
   - Total Fee: ₹1500
   - Pending: ₹500
4. Enter Amount: 500
5. Select Method: "Online"
6. Enter Reference: "UPI-12345"
7. Click "Record Payment"

Backend:
- Payment added to payments array
- paidAmount updated to new total
- status auto-calculated: "Partially Paid"
- lastPaymentDate updated
- FeeAccount saved and returned
```

### Scenario 3: View Fee Analytics
```
Admin views Fee Dashboard:
1. Navigate to "Fees" section in sidebar
2. FeeDashboard displays:
   - Total Expected: ₹250,000
   - Collected: ₹180,000
   - Pending: ₹70,000
   - Collection Rate: 72%
3. Status breakdown shows:
   - 50 students: Paid
   - 20 students: Partially Paid
   - 15 students: Pending
   - 5 students: Overdue
4. Overdue warning shows students past due date
```

---

## Status Calculation Logic

Status is automatically calculated based on:

```
if (pendingAmount <= 0) → "paid"
if (paidAmount > 0 AND pendingAmount > 0) → "partially-paid"
if (dueDate passed AND pendingAmount > 0) → "overdue"
else → "pending"

Special statuses (manual):
"waived" - Amount forgiven
"scholarship" - Special rate applied
```

---

## Security & Permissions

### Fee API Access Control
- **GET fees**: Admin, Teacher (their classes), Student (own fees)
- **POST payment**: Admin, Teacher (their classes) only
- **PUT fees**: Admin only
- **Analytics**: Admin only

### Fee Visibility
- Students see only their own fees
- Teachers see only fees for their assigned classes
- Admins see all fees in their school(s)

---

## Next Steps for Full Implementation

1. **Add Fee Columns to Student Tables**
   - Add columns: Fee Amount, Paid, Balance, Status, Last Payment
   - Update AdminStudentsPage and TeacherStudentsPage

2. **Create Fee Filters**
   - Filter students by fee status (Paid, Pending, Overdue, etc.)
   - Add to student list views

3. **Create Fee Reports & Exports**
   - Generate PDF/Excel reports of fee collections
   - Class-wise, grade-wise, teacher-wise reports
   - Monthly collection trends

4. **Enhanced Fee Features**
   - Bulk payment recording
   - Automated payment reminders
   - Fee schedule management (different fees for different terms)
   - Scholarship management
   - Fee concession requests

5. **Parent Portal**
   - Show fees and payment history
   - Allow parent fee viewing (read-only)

---

## Testing Checklist

- [ ] Create class with fee structure
- [ ] Verify student auto gets FeeAccount
- [ ] Record payment and verify status changes
- [ ] Check analytics dashboard updates
- [ ] Verify fee visibility in all portals
- [ ] Test custom fee override
- [ ] Test overdue detection
- [ ] Test payment history display
- [ ] Test class-wise fee view with filters
- [ ] Test API permissions (non-admin can't update fees)
