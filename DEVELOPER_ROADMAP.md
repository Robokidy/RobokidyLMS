# Exam Module - Developer Roadmap 🗺️

## Next Phase Implementation Guide

This document provides step-by-step instructions for completing the remaining 30% of the exam module implementation.

---

## 📅 Phase 3: Teacher Advanced Pages (1-2 weeks)

### Task 1: TeacherTestCreatePage.tsx

**Location**: `/src/pages/teacher/TeacherTestCreatePage.tsx`  
**Estimated Lines**: 500-600  
**Estimated Time**: 3-4 days

#### Features to Implement

```typescript
interface TestCreatorState {
  // Form Step 1: Basic Config
  title: string;
  description: string;
  instructions: string;
  subject: string;
  totalMarks: number;
  passingMarks: number;
  timeLimit: number;
  
  // Form Step 2: Anti-Cheating
  antiCheatingEnabled: boolean;
  fullscreenMode: boolean;
  tabSwitchDetection: boolean;
  // ... other settings
  
  // Form Step 3: Questions
  questions: Question[];
  
  // Form Step 4: Scheduling
  startDateTime: Date;
  endDateTime: Date;
}
```

#### Step-by-Step Implementation

1. **Create Base Component Structure**
   ```tsx
   export const TeacherTestCreatePage: React.FC = () => {
     const [formStep, setFormStep] = useState(1);
     const [testData, setTestData] = useState<TestCreatorState>({...});
     
     return (
       <div className="min-h-screen bg-gray-50 p-6">
         <div className="max-w-4xl mx-auto">
           {/* Multi-step form */}
           {formStep === 1 && <BasicConfigForm {...} />}
           {formStep === 2 && <AntiCheatingForm {...} />}
           {formStep === 3 && <QuestionBuilder {...} />}
           {formStep === 4 && <SchedulingForm {...} />}
         </div>
       </div>
     );
   };
   ```

2. **Step 1: Basic Configuration**
   - Text inputs for title, description, instructions
   - Select dropdown for subject (Mathematics, Science, Python, etc.)
   - Number inputs for marks and time limit
   - Passing marks threshold
   - Next button to proceed

3. **Step 2: Anti-Cheating Settings**
   - Toggle switches for each protection:
     - Fullscreen mode (mandatory)
     - Tab switch detection
     - Window blur detection
     - Copy/paste prevention
     - Right-click disable
   - Violation threshold selector
   - Next button to proceed

4. **Step 3: Question Builder** (Most Complex)
   ```tsx
   const QuestionBuilder = ({ questions, setQuestions }) => {
     return (
       <div className="space-y-4">
         {questions.map((q, i) => (
           <QuestionCard 
             key={i}
             question={q}
             onEdit={(updated) => updateQuestion(i, updated)}
             onDelete={() => deleteQuestion(i)}
           />
         ))}
         <AddQuestionButton 
           onAdd={(question) => addQuestion(question)}
           questionTypes={[
             'MCQ',
             'True/False',
             'Fill Blank',
             'Descriptive',
             'Coding',
             'Image-based',
             'Match Following',
             'Multi-select'
           ]}
         />
       </div>
     );
   };
   ```

5. **Question Type Components**
   - **MCQQuestionForm**: Text input + 4 option inputs + correct answer selection
   - **TrueFalseForm**: Radio buttons for True/False + correct answer
   - **FillBlankForm**: Passage with blanks + answers with variations
   - **DescriptiveForm**: Question text + expected answer template
   - **CodingForm**: Code template + test cases + language select
   - **ImageBasedForm**: Image upload + hotspot marking
   - **MatchFollowingForm**: Left/right pair inputs
   - **MultiSelectForm**: MCQ with multiple correct answers

6. **Step 4: Scheduling**
   - Date/time pickers for start and end
   - Preview of assignment preview
   - Retake settings (if allowed)
   - Negative marking configuration
   - Save as draft button
   - Publish button

7. **Integration with API**
   ```tsx
   const handlePublish = async () => {
     try {
       // Create test first
       const testRes = await examAPI.createTest(testData, token);
       const testId = testRes._id;
       
       // Then create questions
       for (const question of testData.questions) {
         await examAPI.addQuestion(testId, question, token);
       }
       
       // Publish test
       await examAPI.publishTest(testId, token);
       
       navigate("/teacher/tests");
     } catch (error) {
       showError(error.message);
     }
   };
   ```

#### File Template
```typescript
// /src/pages/teacher/TeacherTestCreatePage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { examAPI } from "@/api/examAPI";
import { useAuth } from "@/context/AuthContext";

export const TeacherTestCreatePage: React.FC = () => {
  // Implementation here
  return <div>Test Creator</div>;
};
```

---

### Task 2: TeacherTestAssignPage.tsx

**Location**: `/src/pages/teacher/TeacherTestAssignPage.tsx`  
**Estimated Lines**: 400-500  
**Estimated Time**: 2-3 days

#### Features

1. **Assignment Form**
   - Test selection (dropdown of user's tests)
   - Multi-level selection:
     - [ ] Schools (if admin)
     - [ ] Classes (checkboxes with "Select All")
     - [ ] Grades (if applicable)
     - [ ] Sections (checkboxes)
     - [ ] Individual Students (searchable list)
     - [ ] Course Tracks (Python, Robotics, Scratch)

2. **Preview**
   - Show count of affected students
   - Show class/section breakdown
   - Show affected student names

3. **Scheduling**
   - Start date/time picker
   - End date/time picker
   - Auto-publish date

4. **Batch Operations**
   - "Select All" checkbox for each level
   - "Deselect All" option

#### Implementation
```typescript
export const TeacherTestAssignPage: React.FC = () => {
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  const handleAssign = async () => {
    const assignment = {
      assignedTo: {
        students: selectedStudents,
        classes: selectedClasses,
      },
      startDateTime: startDate,
      endDateTime: endDate,
    };
    
    await examAPI.assignTest(testId, assignment, token);
  };
  
  return (
    <div className="space-y-6">
      {/* Form controls */}
    </div>
  );
};
```

---

### Task 3: TeacherReportsDashboard.tsx

**Location**: `/src/pages/teacher/TeacherReportsDashboard.tsx`  
**Estimated Lines**: 600-700  
**Estimated Time**: 3-4 days

#### Features

1. **Student-Wise Analytics Table**
   ```
   | Name | Email | Marks | % | Status | Time | Violations |
   |------|-------|-------|---|--------|------|-----------|
   | ... | ... | ... | ... | PASS | ... | 0 |
   ```

2. **Class-Wise Statistics**
   - Average score by class
   - Pass rate by class
   - Comparison charts

3. **Question-Wise Analysis**
   - Accuracy heatmap
   - Most difficult questions
   - Highest accuracy questions

4. **Export Options**
   - PDF report with charts
   - Excel spreadsheet
   - Email to students/admin

#### Implementation
```typescript
export const TeacherReportsDashboard: React.FC = () => {
  const [reportData, setReportData] = useState(null);
  const [view, setView] = useState<'students' | 'questions' | 'classes'>('students');
  
  useEffect(() => {
    const data = await examAPI.getTestReport(testId, token);
    setReportData(data);
  }, [testId]);
  
  return (
    <Tabs value={view} onValueChange={setView}>
      <TabsContent value="students">
        <StudentTable data={reportData?.students} />
      </TabsContent>
      <TabsContent value="questions">
        <QuestionHeatmap data={reportData?.questions} />
      </TabsContent>
    </Tabs>
  );
};
```

---

## 📅 Phase 4: Admin Advanced Pages (1-2 weeks)

### Task 4: AdminStudentRankings.tsx

**Location**: `/src/pages/admin/AdminStudentRankings.tsx`  
**Estimated Lines**: 400-500  
**Estimated Time**: 2-3 days

#### Features

1. **Leaderboard Display**
   - Rank | Student Name | School | Avg Score | Tests Taken

2. **Filters**
   - School selector
   - Subject selector
   - Time period (last week, month, semester)

3. **Sorting**
   - By average score
   - By tests taken
   - By recent performance

#### Implementation
```typescript
export const AdminStudentRankings: React.FC = () => {
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [filters, setFilters] = useState({
    school: 'all',
    subject: 'all',
    period: 'all'
  });
  
  useEffect(() => {
    // Fetch and sort rankings
  }, [filters]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Rankings</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Leaderboard table */}
      </CardContent>
    </Card>
  );
};
```

---

### Task 5: AdminCheatingReports.tsx

**Location**: `/src/pages/admin/AdminCheatingReports.tsx`  
**Estimated Lines**: 400-500  
**Estimated Time**: 2-3 days

#### Features

1. **Violation Incidents List**
   - Student name, test name, violation type, severity, timestamp
   - Sortable/filterable table

2. **Student Violation History**
   - Graph of violations over time
   - Violation breakdown by type

3. **Teacher Alerts**
   - Notification list for teachers about student violations
   - Mark as reviewed

#### Implementation
```typescript
export const AdminCheatingReports: React.FC = () => {
  const [violations, setViolations] = useState([]);
  
  const getViolationSeverity = (type: string) => {
    const severities = {
      'tab-switch': 'Warning',
      'fullscreen-exit': 'Major',
      'copy-paste': 'Warning',
    };
    return severities[type] || 'Warning';
  };
  
  return (
    <div>
      {/* Violations table with severity colors */}
    </div>
  );
};
```

---

### Task 6: AdminSchoolAnalytics.tsx

**Location**: `/src/pages/admin/AdminSchoolAnalytics.tsx`  
**Estimated Lines**: 400-500  
**Estimated Time**: 2-3 days

#### Features

1. **School Comparison**
   - School name, avg score, pass rate, total exams
   - Comparison charts

2. **Subject Performance**
   - By subject, which school performs best
   - Trends over time

3. **Teacher Performance**
   - Teacher rankings by student performance

---

## 🔧 Phase 5: Advanced Features (2-3 weeks)

### Task 7: Question Bank System

**Files to Create**:
- `/src/pages/teacher/QuestionBankPage.tsx`
- `/src/components/QuestionBankSearch.tsx`
- Backend API: `/api/exams/question-bank/*`

**Features**:
- Save questions to reusable bank
- Search by topic/difficulty
- Filter by question type
- Bulk add to test

---

### Task 8: CSV Import Feature

**Files to Create**:
- `/src/pages/teacher/ImportQuestionsPage.tsx`
- `/src/utils/csvParser.ts`
- Backend API for bulk import

**Features**:
- CSV template download
- File upload validation
- Preview before import
- Error reporting

---

### Task 9: Coding Sandbox Integration

**Files to Integrate**:
- Connect to existing `/server/src/utils/codeRunner.js`
- Create `/src/components/CodeEditor.tsx`
- Real-time code execution feedback

**Features**:
- Syntax highlighting (Monaco Editor)
- Test case execution
- Output comparison
- Memory limit enforcement

---

## 📋 Implementation Order

### Week 1
1. ✅ Backend APIs (DONE)
2. ✅ Student Interface (DONE)
3. **TeacherTestCreatePage** ← START HERE
4. **TeacherTestAssignPage**

### Week 2
5. **TeacherReportsDashboard**
6. **AdminStudentRankings**
7. **AdminCheatingReports**

### Week 3
8. **AdminSchoolAnalytics**
9. Test all endpoints
10. Performance testing

### Week 4+
11. Question Bank
12. CSV Import
13. Coding Sandbox
14. Advanced features

---

## 🚀 Quick Start Template

Here's a template for starting a new component:

```typescript
/**
 * [Component Name] - [Description]
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { examAPI } from "@/api/examAPI";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const YourComponentName: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // const result = await examAPI.method(params, token);
      // setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Component Title</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Component content */}
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## 🧪 Testing Checklist

For each new component:
- [ ] Component renders without errors
- [ ] API calls work correctly
- [ ] Error states display properly
- [ ] Loading states work
- [ ] Authentication required
- [ ] Role-based access verified
- [ ] Responsive design tested
- [ ] Accessibility checked

---

## 📚 Resources for Development

- **UI Components**: shadcn/ui (Card, Button, Input, etc.)
- **Forms**: React Hook Form or plain useState
- **Charts**: Recharts or Chart.js
- **Icons**: Lucide React
- **Export**: jsPDF, XLSX libraries

---

## 💡 Best Practices

1. **Always use TypeScript** for type safety
2. **Extract components** into separate files
3. **Use custom hooks** for logic reuse
4. **Handle errors gracefully** with user feedback
5. **Test with different roles** (student, teacher, admin)
6. **Verify API responses** match expectations
7. **Add loading states** for better UX
8. **Mobile responsive** for all pages

---

## 🤝 Code Review Checklist

Before submitting PR:
- [ ] Code follows existing patterns
- [ ] Types are properly defined
- [ ] Error handling is comprehensive
- [ ] Tests are included (if applicable)
- [ ] Documentation is updated
- [ ] No console errors/warnings
- [ ] Performance optimized
- [ ] Accessibility checked

---

## 📞 Getting Help

- Check `/EXAM_MODULE_GUIDE.md` for architecture details
- Review existing components for patterns
- Look at `examAPI.ts` for available API methods
- Test endpoints with Postman before implementing UI

---

## ✅ Sign-Off

**Ready to begin Phase 3 tasks**: YES ✅  
**Estimated Total Time**: 4-6 weeks  
**Team Capacity**: 2-3 developers  

---

**Last Updated**: May 2024  
**Version**: 1.0  
**Status**: Ready for Next Phase
