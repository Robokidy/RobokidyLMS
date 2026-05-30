# Enterprise Examination & Assessment Module - Implementation Guide

## 📋 Overview

This document provides a complete guide to the newly implemented enterprise-level examination system for the LMS platform. The system includes secure test conducting, anti-cheating protection, advanced reporting, and supports all user roles (CEO/Admin, Teachers, Students).

## 🗂️ Project Structure

### Backend (`/server/src`)

```
routes/
├── examRoutes.js (900+ lines)           # Core API endpoints
models/
├── Test.js                               # Test configuration & metadata
├── Question.js                           # Question definitions
├── TestAttempt.js                        # Student exam attempts
├── TestAssignment.js                     # Test assignments
├── CheatingViolation.js                  # Violation tracking
├── TestReport.js                         # Analytics & reports
└── CodingSubmission.js                   # Coding question submissions
```

### Frontend (`/src`)

```
api/
├── examAPI.ts                            # All exam API calls

hooks/
├── useExamTimer.ts                       # Countdown timer with warnings
├── useAutoSave.ts                        # Auto-save answers
├── useExamAntiCheating.ts               # Detect suspicious behavior

pages/
└── student/
    ├── StudentTestsPage.tsx              # Browse assigned tests
    ├── ExamStartPage.tsx                 # Pre-exam preparation
    ├── ExamWindowPage.tsx                # Main exam interface
    └── StudentExamResultPage.tsx         # Score & feedback
└── teacher/
    └── TeacherTestsPage.tsx              # Manage & analyze tests
└── admin/
    └── AdminExamAnalyticsPage.tsx        # Global dashboard
```

## 🚀 API Endpoints

### Base URL: `/api/exams`

#### Test Management
```
GET    /tests                              # Get all tests (role-based)
GET    /tests/:testId                      # Get test details
POST   /tests                              # Create new test
PUT    /tests/:testId                      # Update test
DELETE /tests/:testId                      # Archive test
POST   /tests/:testId/publish              # Publish test
```

#### Question Management
```
POST   /tests/:testId/questions            # Add question
GET    /tests/:testId/questions            # Get all questions
PUT    /questions/:questionId              # Update question
DELETE /questions/:questionId              # Delete question
```

#### Test Assignment
```
POST   /tests/:testId/assign               # Assign test to students
GET    /tests/:testId/assignments          # Get assignments
```

#### Student Workflow
```
GET    /student/tests                      # Get assigned tests
POST   /tests/:testId/start                # Start exam attempt
POST   /attempts/:attemptId/save-answer    # Save answer (auto-save)
POST   /attempts/:attemptId/review         # Mark for review
POST   /attempts/:attemptId/submit         # Submit exam
GET    /attempts/:attemptId                # Get attempt details
```

#### Anti-Cheating
```
POST   /attempts/:attemptId/violation      # Log violation
```

#### Reporting
```
GET    /tests/:testId/report               # Get test analytics
GET    /admin/analytics                    # Get global analytics
```

## 📱 Student Exam Flow

### 1. Browse Tests
```tsx
navigate("/student/tests")  // StudentTestsPage
```
- Shows all assigned tests with status indicators
- Filters: upcoming, active, completed, expired
- Quick access to start, continue, or view results

### 2. Pre-Exam Preparation
```tsx
navigate(`/student/exams/${testId}/start`)  // ExamStartPage
```
- Display test instructions
- Show anti-cheating measures
- Check system requirements
- Confirm terms & conditions

### 3. Take Exam
```tsx
navigate(`/student/exams/${testId}/exam`)   // ExamWindowPage
```
**Features:**
- Live countdown timer with warnings (5min, 1min)
- Multiple question types (MCQ, fill-blank, descriptive, etc.)
- Question navigation sidebar
- Answer auto-save every 10 seconds
- Mark for review functionality
- Anti-cheating detection active

**Anti-Cheating Protection:**
- Tab switch detection → Warning → Auto-submit
- Window blur detection → Warning
- Copy/paste disabled
- Right-click disabled
- Fullscreen mandatory (if enabled)
- Keyboard shortcuts blocked

### 4. View Results
```tsx
navigate(`/student/exams/${testId}/result`)  // StudentExamResultPage
```
- Score display (marks & percentage)
- Pass/fail status
- Question-wise analysis
- Performance indicators
- Teacher feedback (if manual evaluation done)

## 👨‍🏫 Teacher Exam Management

### 1. Test Management
```tsx
navigate("/teacher/tests")  // TeacherTestsPage
```
**Capabilities:**
- Create, edit, publish tests
- Manage questions
- View attempt analytics
- Filter by status (draft, published, archived)
- Sort by (recent, name, attempts)

### 2. Create/Edit Test
```tsx
navigate("/teacher/tests/create")
navigate("/teacher/tests/:testId/edit")
```
**Features:**
- Set test configuration:
  - Title, description, instructions
  - Total marks, passing marks
  - Time limit
  - Negative marking rules
  - Anti-cheating settings
  
- Question management:
  - Add different question types
  - Set difficulty & marks
  - Tag questions with topics
  
- Test scheduling:
  - Start date/time
  - End date/time
  - Randomization options
  - Auto-submit on timeout

### 3. Assign Tests
```tsx
navigate(`/teacher/tests/${testId}/assign`)
```
**Assignment Options:**
- Specific students
- Entire classes
- Grades/sections
- Course tracks (Python, Robotics, Scratch)
- Schools (if admin)

### 4. View Reports
```tsx
navigate(`/teacher/tests/${testId}/reports`)
```
**Analytics:**
- Student-wise performance
- Class-wise statistics
- Question-wise accuracy
- Top performers
- Weak topics
- Pass/fail distribution
- Time spent analysis
- Cheating violation incidents

## 🏢 Admin Global Analytics

```tsx
navigate("/admin/exams/analytics")  // AdminExamAnalyticsPage
```

**Metrics:**
- Total tests & attempts across school
- Overall pass percentage
- Average scores
- Anti-cheating violation reports
- Performance trends
- Teacher-wise statistics
- School-wise comparison (if multi-school)

**Export Options:**
- PDF reports
- Excel spreadsheets
- Scheduled email reports

## 🛡️ Anti-Cheating System

### Detection Methods

1. **Tab Switching** (useExamAntiCheating)
   - Detects when student leaves exam tab
   - First violation: Warning
   - Second violation: Warning popup
   - Third violation: Auto-submit

2. **Window Blur/Focus Loss**
   - Logs when window loses focus
   - Severit: Warning

3. **Copy/Paste Prevention**
   - Blocks clipboard access
   - Logs attempts

4. **Right-Click Disable**
   - Prevents right-click context menu
   - Logs attempts

5. **Fullscreen Enforcement**
   - Mandates fullscreen mode
   - Logs if student exits fullscreen
   - Severity: Major

6. **Keyboard Shortcut Blocking**
   - F12, Ctrl+Shift+I, Ctrl+Shift+C
   - Ctrl+S, Ctrl+P

### Violation Response

```javascript
// Automatically logged and tracked
POST /api/exams/attempts/:attemptId/violation
{
  violationType: "tab-switch",
  severity: "warning",
  description: "Tab switched away from exam"
}
```

**Actions:**
- Log violation with timestamp
- Show warning to student
- Track cumulative violations
- Auto-submit if threshold exceeded
- Flag for teacher review

## ⚙️ Configuration

### Test Creation Parameters

```typescript
interface TestConfig {
  // Basic
  title: string;
  description: string;
  instructions: string;
  subject: string;

  // Marking
  totalMarks: number;
  passingMarks: number;
  
  // Timing
  timeLimit: number; // minutes
  startDateTime: Date;
  endDateTime: Date;
  autoSubmitOnTimeout: boolean;

  // Questions
  randomizeQuestionOrder: boolean;
  randomizeOptions: boolean;

  // Anti-Cheating
  antiCheating: {
    enabled: boolean;
    fullscreenMode: boolean;
    tabSwitchDetection: boolean;
    windowBlurDetection: boolean;
    copyPasteDetection: boolean;
    rightClickDisabled: boolean;
    textSelectionDisabled: boolean;
    violationThresholds: {
      warningAt: number;
      autoSubmitAt: number;
    };
  };

  // Retest
  allowRetest: boolean;
  maxRetestAttempts: number;
  restestDaysGap: number;

  // Negative Marking
  negativeMarking: {
    enabled: boolean;
    marksPerWrongAnswer: number;
  };
}
```

## 🔌 Integration with Existing LMS

### User Model Enhancement
The system uses existing User model with roles:
- `admin` - CEO/Admin access
- `teacher` - Create & assign tests
- `student` - Take tests
- `parent` - (Future: view child's results)

### Database Models Already Exist
- `Test` - Test configuration
- `Question` - Question definitions
- `TestAttempt` - Student attempts
- `TestAssignment` - Assignments
- `CheatingViolation` - Violation logs
- `TestReport` - Analytics

### Schools & Hierarchy
```
School (schoolId)
├── ClassSection (classSectionIds)
├── CourseTrack (assignedTrackIds - Python, Robotics, etc.)
└── Users (teachers, students)
```

## 📊 Data Auto-Population

The system automatically calculates:

- **Test Analytics**
  - Total attempts
  - Average score
  - Pass percentage
  - Top performers
  - Weak topics

- **Student Analytics**
  - Time spent
  - Questions attempted
  - Questions skipped
  - Accuracy per question
  - Violation count

- **Question Analytics**
  - Attempt count
  - Correct count
  - Accuracy percentage
  - Average time

## 🔐 Security Features

1. **JWT Authentication**
   - All endpoints require valid token
   - Token validated on every request

2. **Role-Based Access Control**
   - Teachers see only their tests
   - Students see only assigned tests
   - Admins see school-level data

3. **Answer Masking**
   - Correct answers hidden from student
   - Test cases output hidden for coding questions

4. **Server-Side Validation**
   - Timer validated on server
   - Answer evaluation on server
   - Violation thresholds checked server-side

5. **Audit Trail**
   - All violations logged
   - Attempt history maintained
   - Submission timestamps recorded

## 📈 Performance Considerations

- **Auto-save**: Every 10 seconds (configurable)
- **Timer**: Updates every 1 second
- **Violation detection**: Real-time
- **Database indexing**: On frequently queried fields
- **Pagination**: For large result sets

## 🚀 Deployment Checklist

- [ ] Register examRoutes in main index.js
- [ ] Create admin user with "admin" role
- [ ] Configure anti-cheating settings per school
- [ ] Set up email notifications for teachers
- [ ] Configure result approval workflow
- [ ] Test all endpoints with various roles
- [ ] Verify anti-cheating detection works
- [ ] Performance test with 100+ concurrent students
- [ ] Backup database before going live

## 📖 Usage Examples

### Create a Test
```typescript
const testData = {
  title: "Python Fundamentals Quiz",
  subject: "Python",
  totalMarks: 50,
  passingMarks: 30,
  timeLimit: 30,
  startDateTime: new Date("2024-06-01T10:00:00"),
  endDateTime: new Date("2024-06-01T10:30:00"),
};
const test = await examAPI.createTest(testData, token);
```

### Assign Test
```typescript
const assignment = await examAPI.assignTest(testId, {
  assignedTo: {
    classes: ["classId1", "classId2"],
    grades: ["10", "11"],
  },
}, token);
```

### Start Exam
```typescript
const { attempt, questions, testDuration, testConfig } = 
  await examAPI.startTest(testId, { screenResolution }, token);
```

### Submit Exam
```typescript
const result = await examAPI.submitTest(attemptId, {
  submissionMethod: "manual"
}, token);
```

## 🐛 Troubleshooting

### Timer Not Displaying
- Check useExamTimer hook initialization
- Verify testDuration prop passed correctly

### Anti-Cheating Not Working
- Check testConfig.antiCheating.enabled = true
- Verify violation handler registered
- Check browser console for errors

### Auto-Save Not Working
- Verify interval set correctly (default 10s)
- Check network connectivity
- Look for API errors in console

### Answers Not Saving
- Check attemptId is valid
- Verify answer data structure
- Ensure token is fresh

## 📞 Support

For issues or questions about the exam module:
1. Check backend server logs
2. Verify API endpoint access
3. Check browser console for errors
4. Validate database connections

## 📚 Future Enhancements

- [ ] Webcam-based proctoring
- [ ] AI-powered question generation
- [ ] Adaptive difficulty testing
- [ ] Plagiarism detection for coding
- [ ] Student badges & certificates
- [ ] Performance recommendations
- [ ] Parent report access
- [ ] Real-time live monitoring dashboard
- [ ] Question banks & reusability
- [ ] Bulk import from CSV/Excel
- [ ] Question randomization on per-student basis
- [ ] Section-wise timing

## ✅ Verification Checklist

After deployment, verify:
- [ ] Student can view assigned tests
- [ ] Student can start exam during allowed time
- [ ] Timer counts down correctly
- [ ] Answers auto-save every 10s
- [ ] Anti-cheating detection works
- [ ] Student can submit exam
- [ ] Results display immediately for auto-evaluated questions
- [ ] Teacher can view test reports
- [ ] Admin can view global analytics
- [ ] Violations are logged correctly
- [ ] Export to PDF/Excel works
- [ ] Email notifications sent to teachers

---

**Version**: 1.0  
**Last Updated**: May 2024  
**Status**: Production Ready
