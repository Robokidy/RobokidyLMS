import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Play, ChevronRight, Book, Code, Trophy, CheckCircle, Terminal, Moon, Sun, Sparkles, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/api/client";
import { useTheme } from "next-themes";
import { rankLadder } from "@/data/stemEcosystem";

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  codeExample: string;
  practicePrograms: Array<{
    title: string;
    description: string;
    starterCode: string;
    solution: string;
  }>;
  quiz: Array<{
    question: string;
    options: string[];
    correct: number;
  }>;
}

const Index = () => {
  const { token, user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [selectedLesson, setSelectedLesson] = useState<string>('programming-importance');
  const [code, setCode] = useState('# Welcome to Python Learning!\nprint("Hello, World!")');
  const [practiceCode, setPracticeCode] = useState('# Practice Python here!\nprint("Let\'s start coding!")');
  const [output, setOutput] = useState('');
  const [practiceOutput, setPracticeOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{[key: string]: number}>({});
  const [quizResults, setQuizResults] = useState<{[key: string]: boolean}>({});
  const [studentDashboard, setStudentDashboard] = useState<{ totalLessons: number; completedLessons: number; quizAttempts: number; codeRunCount: number } | null>(null);
  const [pendingTopics, setPendingTopics] = useState(0);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressDetail, setProgressDetail] = useState<any>(null);
  const [dbLessonsList, setDbLessonsList] = useState<Array<{ _id: string; title: string }>>([]);
  const [backendQuizQuestions, setBackendQuizQuestions] = useState<Array<{ question: string; options: string[]; correct: number }>>([]);

  useEffect(() => {
    const loadStudentSummary = async () => {
      try {
        const [dashboard, progress, dbLessons] = await Promise.all([
          apiFetch("/student/dashboard", {}, token),
          apiFetch("/student/progress", {}, token),
          apiFetch("/student/lessons", {}, token)
        ]);
        setStudentDashboard(dashboard);
        setProgressDetail(progress);
        setDbLessonsList(dbLessons || []);
        const attemptedTopicCount = (progress?.quizAttempts || []).length;
        const topicsTotal = (dbLessons || []).length;
        setPendingTopics(Math.max(0, topicsTotal - attemptedTopicCount));
      } catch {
        setStudentDashboard(null);
      }
    };
    if (token) loadStudentSummary();
  }, [token]);

  const topicRows = dbLessonsList.map((lesson) => {
    const completed = (progressDetail?.completedLessons || []).some((id: string) => String(id) === String(lesson._id));
    const quiz = (progressDetail?.quizAttempts || []).find((q: any) => String(q.lessonId) === String(lesson._id));
    return {
      title: lesson.title,
      completed,
      attempts: quiz?.attempts || 0,
      bestScore: quiz?.bestScore ?? null,
      lastScore: quiz?.lastAttemptScore ?? null
    };
  });

  const lessons: Lesson[] = [
    {
      id: 'programming-importance',
      title: 'Why Programming is Important',
      description: 'Understanding the importance of programming in today\'s world',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Why Programming is Important</h3>
          <p class="text-gray-700 mb-6">Programming has become one of the most valuable skills in the 21st century. Here's why:</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">1. Digital Transformation</h4>
          <p class="text-gray-700 mb-4">Every industry is becoming digital. From healthcare to finance, entertainment to education - software drives innovation.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">2. Problem-Solving Skills</h4>
          <p class="text-gray-700 mb-4">Programming teaches you to break down complex problems into smaller, manageable parts. This logical thinking applies to all areas of life.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">3. Career Opportunities</h4>
          <p class="text-gray-700 mb-2">Software development offers:</p>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li>High salary potential</li>
            <li>Job security and demand</li>
            <li>Remote work opportunities</li>
            <li>Creative expression</li>
            <li>Continuous learning</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">4. Automation and Efficiency</h4>
          <p class="text-gray-700 mb-4">Programming allows you to automate repetitive tasks, saving time and reducing errors.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">5. Understanding Technology</h4>
          <p class="text-gray-700">As technology shapes our world, understanding how it works gives you an advantage in any field.</p>
        </div>
      `,
      codeExample: `# Example: Simple automation script
import datetime

def daily_reminder():
    now = datetime.datetime.now()
    print(f"Good morning! Today is {now.strftime('%A, %B %d, %Y')}")
    print("Don't forget to:")
    print("- Review your goals")
    print("- Practice coding")
    print("- Stay hydrated")

daily_reminder()`,
      practicePrograms: [
        {
          title: "Personal Goal Tracker",
          description: "Create a simple program that tracks your daily programming goals",
          starterCode: `# Create a goal tracker
goals = ["Learn Python basics", "Build a project", "Practice daily"]

# Your code here - print each goal with a number`,
          solution: `goals = ["Learn Python basics", "Build a project", "Practice daily"]

print("My Programming Goals:")
for i, goal in enumerate(goals, 1):
    print(f"{i}. {goal}")

# Bonus: Add completion status
completed = [True, False, True]
print("\\nProgress:")
for i, (goal, done) in enumerate(zip(goals, completed), 1):
    status = "✓" if done else "○"
    print(f"{status} {i}. {goal}")`
        }
      ],
      quiz: [
        {
          question: "Which of the following is NOT a benefit of learning programming?",
          options: [
            "High salary potential",
            "Improved problem-solving skills", 
            "Guaranteed job for life",
            "Automation capabilities"
          ],
          correct: 2
        },
        {
          question: "Programming helps develop which key skill?",
          options: [
            "Memorization",
            "Logical thinking",
            "Physical strength",
            "Artistic ability"
          ],
          correct: 1
        }
      ]
    },
    {
      id: 'python-history',
      title: 'Python History',
      description: 'Learn about Python\'s origins and evolution',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Python History</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Origins (1989-1991)</h4>
          <p class="text-gray-700 mb-4">Python was created by <strong>Guido van Rossum</strong> in the Netherlands during Christmas holidays of 1989. He named it after the British comedy series "Monty Python's Flying Circus".</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Key Milestones</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>1991:</strong> Python 0.9.0 released with classes, inheritance, exception handling</li>
            <li><strong>1994:</strong> Python 1.0 released with functional programming tools</li>
            <li><strong>2000:</strong> Python 2.0 introduced list comprehensions and garbage collection</li>
            <li><strong>2008:</strong> Python 3.0 released (not backward compatible)</li>
            <li><strong>2020:</strong> Python 2 officially retired</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Python Philosophy - The Zen of Python</h4>
          <p class="text-gray-700 mb-2">Python follows these principles:</p>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li>Beautiful is better than ugly</li>
            <li>Explicit is better than implicit</li>
            <li>Simple is better than complex</li>
            <li>Readability counts</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Why Python Became Popular</h4>
          <ul class="list-disc pl-6 text-gray-700">
            <li>Easy to learn and read</li>
            <li>Versatile (web, AI, automation, etc.)</li>
            <li>Strong community support</li>
            <li>Extensive libraries</li>
          </ul>
        </div>
      `,
      codeExample: `# See Python's philosophy
import this

# Check Python version
import sys
print(f"Python version: {sys.version}")

# Fun fact: Python's name origin
print("Python is named after 'Monty Python's Flying Circus'")
print("Not the snake! 🐍")`,
      practicePrograms: [
        {
          title: "Python Timeline",
          description: "Create a timeline of Python versions",
          starterCode: `# Python version timeline
versions = {
    "Python 1.0": 1994,
    "Python 2.0": 2000,
    "Python 3.0": 2008
}

# Your code here - display the timeline`,
          solution: `versions = {
    "Python 1.0": 1994,
    "Python 2.0": 2000,
    "Python 3.0": 2008,
    "Python 3.9": 2020,
    "Python 3.11": 2022
}

print("Python Version Timeline:")
print("-" * 25)
for version, year in sorted(versions.items(), key=lambda x: x[1]):
    print(f"{year}: {version}")

# Calculate years since first version
current_year = 2024
first_year = min(versions.values())
print(f"\\nPython has been around for {current_year - first_year} years!")`
        }
      ],
      quiz: [
        {
          question: "Who created Python?",
          options: [
            "Linus Torvalds",
            "Guido van Rossum",
            "James Gosling",
            "Dennis Ritchie"
          ],
          correct: 1
        },
        {
          question: "Python is named after:",
          options: [
            "The snake",
            "A programming concept",
            "Monty Python's Flying Circus",
            "Pythagoras"
          ],
          correct: 2
        }
      ]
    },
    {
      id: 'python-advantages',
      title: 'Advantages of Python',
      description: 'Discover why Python is so popular among developers',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Advantages of Python</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">1. Easy to Learn and Use</h4>
          <p class="text-gray-700 mb-4">Python's syntax is similar to English, making it beginner-friendly.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">2. Interpreted Language</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li>No compilation step needed</li>
            <li>Interactive development</li>
            <li>Faster development cycle</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">3. Cross-Platform</h4>
          <p class="text-gray-700 mb-4">Python runs on Windows, macOS, Linux, and more without modification.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">4. Extensive Libraries</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>NumPy:</strong> Numerical computing</li>
            <li><strong>Pandas:</strong> Data analysis</li>
            <li><strong>Django/Flask:</strong> Web development</li>
            <li><strong>TensorFlow:</strong> Machine learning</li>
            <li><strong>Requests:</strong> HTTP requests</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">5. Multiple Programming Paradigms</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li>Object-Oriented Programming (OOP)</li>
            <li>Procedural Programming</li>
            <li>Functional Programming</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">6. Large Community</h4>
          <ul class="list-disc pl-6 text-gray-700">
            <li>Active support forums</li>
            <li>Extensive documentation</li>
            <li>Open source packages</li>
          </ul>
        </div>
      `,
      codeExample: `# Demonstration of Python's simplicity
import math

# Simple and readable code
def calculate_circle_area(radius):
    """Calculate the area of a circle."""
    return math.pi * radius ** 2

# List comprehension - powerful and concise
squares = [x**2 for x in range(1, 6)]
print(f"Squares: {squares}")

# Easy string formatting
name = "Python"
year = 1991
print(f"{name} was created in {year}")

print("Python's simplicity in action! 🐍")`,
      practicePrograms: [
        {
          title: "Language Comparison",
          description: "Compare Python syntax with other languages",
          starterCode: `# Show Python's simplicity
languages = ["Python", "Java", "C++"]

# Your code here - demonstrate why Python is easier`,
          solution: `# Python's advantages demonstration
languages = {
    "Python": {
        "hello_world": 'print("Hello, World!")',
        "variables": "name = 'Python'",
        "lines_of_code": 1
    },
    "Java": {
        "hello_world": 'System.out.println("Hello, World!");',
        "variables": "String name = 'Java';",
        "lines_of_code": 5
    },
    "C++": {
        "hello_world": 'std::cout << "Hello, World!";',
        "variables": "std::string name = 'C++';",
        "lines_of_code": 4
    }
}

print("Language Comparison:")
print("-" * 40)
for lang, details in languages.items():
    print(f"{lang}:")
    print(f"  Hello World: {details['hello_world']}")
    print(f"  Typical LOC: {details['lines_of_code']}")
    print()

print("Python wins for simplicity! 🏆")`
        }
      ],
      quiz: [
        {
          question: "Which is NOT an advantage of Python?",
          options: [
            "Easy to learn",
            "Cross-platform",
            "Fastest execution speed",
            "Large community"
          ],
          correct: 2
        },
        {
          question: "Python supports which programming paradigms?",
          options: [
            "Only Object-Oriented",
            "Only Procedural",
            "Only Functional",
            "All of the above"
          ],
          correct: 3
        }
      ]
    },
    {
      id: 'variables-data-types',
      title: 'Variables & Data Types',
      description: 'Learn about Python variables and basic data types',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Variables & Data Types</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">What are Variables?</h4>
          <p class="text-gray-700 mb-4">Variables are containers that store data values. In Python, you don't need to declare the type explicitly.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Python's Basic Data Types</h4>
          
          <h5 class="text-lg font-medium text-gray-800 mb-2">1. Strings (str)</h5>
          <p class="text-gray-700 mb-2">Text data enclosed in quotes</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>name = "Python"<br/>message = 'Hello World'</code>
          </div>
          
          <h5 class="text-lg font-medium text-gray-800 mb-2">2. Integers (int)</h5>
          <p class="text-gray-700 mb-2">Whole numbers without decimal points</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>age = 25<br/>year = 2024</code>
          </div>
          
          <h5 class="text-lg font-medium text-gray-800 mb-2">3. Floats (float)</h5>
          <p class="text-gray-700 mb-2">Numbers with decimal points</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>price = 19.99<br/>pi = 3.14159</code>
          </div>
          
          <h5 class="text-lg font-medium text-gray-800 mb-2">4. Booleans (bool)</h5>
          <p class="text-gray-700 mb-2">True or False values</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>is_student = True<br/>is_working = False</code>
          </div>
        </div>
      `,
      codeExample: `# Variable Declaration and Data Types
print("=== Python Variables & Data Types ===")

# Strings
name = "Alice"
occupation = 'Software Developer'

print(f"Name: {name}")
print(f"Occupation: {occupation}")

# Integers
age = 28
experience_years = 5

print(f"Age: {age}")
print(f"Experience: {experience_years} years")

# Floats
salary = 75000.50
rating = 4.8

print(f"Salary: ${'${salary}'}")
print(f"Rating: {rating}/5.0")

# Booleans
is_employed = True
is_student = False

print(f"Employed: {is_employed}")
print(f"Student: {is_student}")

# Type checking
print(f"Type of name: {type(name)}")
print(f"Type of age: {type(age)}")
print(f"Type of salary: {type(salary)}")`,
      practicePrograms: [
        {
          title: "Personal Information System",
          description: "Create a program that stores and displays personal information using different data types",
          starterCode: `# Personal Information System
# Store information about yourself using appropriate data types

# Your information here
first_name = ""
last_name = ""
age = 0
height = 0.0  # in meters
is_student = False

# Display the information
print("Personal Information:")
# Your code here`,
          solution: `# Personal Information System
first_name = "John"
last_name = "Doe"
age = 25
height = 1.75  # in meters
weight = 70.5  # in kg
is_student = True
gpa = 3.8

print("=== Personal Information System ===")
print(f"Name: {first_name} {last_name}")
print(f"Age: {age} years old")
print(f"Height: {height} meters")
print(f"Weight: {weight} kg")
print(f"Student Status: {'Yes' if is_student else 'No'}")
if is_student:
    print(f"GPA: {gpa}")

print("\\n=== Data Type Information ===")
variables = {
    'first_name': first_name,
    'age': age,
    'height': height,
    'is_student': is_student,
    'gpa': gpa
}

for var_name, var_value in variables.items():
    print(f"{var_name}: {var_value} ({type(var_value).__name__})")

# BMI Calculator (bonus)
bmi = weight / (height ** 2)
print(f"\\nBMI: {bmi:.2f}")
category = 'Underweight' if bmi < 18.5 else 'Normal' if bmi < 25 else 'Overweight' if bmi < 30 else 'Obese'
print(f"BMI Category: {category}")`
        }
      ],
      quiz: [
        {
          question: "Which of the following is NOT a valid Python variable name?",
          options: [
            "user_name",
            "2nd_variable",
            "_private",
            "myVariable"
          ],
          correct: 1
        },
        {
          question: "What will be the result of: int('3.14')?",
          options: [
            "3.14",
            "3",
            "Error",
            "314"
          ],
          correct: 2
        }
      ]
    },
    {
      id: 'operators',
      title: 'Operators in Python',
      description: 'Master Python operators for calculations and comparisons',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Operators in Python</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">1. Arithmetic Operators</h4>
          <div class="overflow-x-auto mb-4">
            <table class="min-w-full border border-gray-300">
              <thead class="bg-gray-100">
                <tr>
                  <th class="border border-gray-300 px-4 py-2">Operator</th>
                  <th class="border border-gray-300 px-4 py-2">Description</th>
                  <th class="border border-gray-300 px-4 py-2">Example</th>
                </tr>
              </thead>
              <tbody>
                <tr><td class="border border-gray-300 px-4 py-2">+</td><td class="border border-gray-300 px-4 py-2">Addition</td><td class="border border-gray-300 px-4 py-2">5 + 3 = 8</td></tr>
                <tr><td class="border border-gray-300 px-4 py-2">-</td><td class="border border-gray-300 px-4 py-2">Subtraction</td><td class="border border-gray-300 px-4 py-2">5 - 3 = 2</td></tr>
                <tr><td class="border border-gray-300 px-4 py-2">*</td><td class="border border-gray-300 px-4 py-2">Multiplication</td><td class="border border-gray-300 px-4 py-2">5 * 3 = 15</td></tr>
                <tr><td class="border border-gray-300 px-4 py-2">/</td><td class="border border-gray-300 px-4 py-2">Division</td><td class="border border-gray-300 px-4 py-2">5 / 3 = 1.67</td></tr>
                <tr><td class="border border-gray-300 px-4 py-2">**</td><td class="border border-gray-300 px-4 py-2">Exponentiation</td><td class="border border-gray-300 px-4 py-2">5 ** 3 = 125</td></tr>
              </tbody>
            </table>
          </div>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">2. Comparison Operators</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>==</strong> Equal to</li>
            <li><strong>!=</strong> Not equal to</li>
            <li><strong>&gt;</strong> Greater than</li>
            <li><strong>&lt;</strong> Less than</li>
            <li><strong>&gt;=</strong> Greater than or equal</li>
            <li><strong>&lt;=</strong> Less than or equal</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">3. Logical Operators</h4>
          <ul class="list-disc pl-6 text-gray-700">
            <li><strong>and</strong> Both conditions true</li>
            <li><strong>or</strong> At least one true</li>
            <li><strong>not</strong> Opposite of condition</li>
          </ul>
        </div>
      `,
      codeExample: `# Python Operators Demonstration
print("=== Python Operators Demo ===")

# Arithmetic Operators
a, b = 10, 3
print(f"a = {a}, b = {b}")
print(f"a + b = {a + b}")      # Addition
print(f"a - b = {a - b}")      # Subtraction
print(f"a * b = {a * b}")      # Multiplication
print(f"a / b = {a / b:.2f}")  # Division
print(f"a ** b = {a ** b}")    # Exponentiation

# Comparison Operators
x, y = 15, 20
print(f"x = {x}, y = {y}")
print(f"x == y: {x == y}")
print(f"x != y: {x != y}")
print(f"x > y: {x > y}")
print(f"x < y: {x < y}")

# Logical Operators
p, q = True, False
print(f"p = {p}, q = {q}")
print(f"p and q: {p and q}")
print(f"p or q: {p or q}")
print(f"not p: {not p}")`,
      practicePrograms: [
        {
          title: "Simple Calculator",
          description: "Build a calculator using different operators",
          starterCode: `# Simple Calculator
num1 = 10
num2 = 5

# Perform all arithmetic operations
# Your code here

print("Results:")
# Display results here`,
          solution: `# Simple Calculator
print("=== Simple Calculator ===")

num1 = 10
num2 = 5

print(f"Numbers: {num1} and {num2}")
print("=" * 30)

# Arithmetic operations
print("Arithmetic Operations:")
print(f"{num1} + {num2} = {num1 + num2}")
print(f"{num1} - {num2} = {num1 - num2}")
print(f"{num1} * {num2} = {num1 * num2}")
print(f"{num1} / {num2} = {num1 / num2}")
print(f"{num1} ** {num2} = {num1 ** num2}")

# Comparison operations
print("\\nComparison Operations:")
print(f"{num1} == {num2}: {num1 == num2}")
print(f"{num1} != {num2}: {num1 != num2}")
print(f"{num1} > {num2}: {num1 > num2}")
print(f"{num1} < {num2}: {num1 < num2}")

# Additional insights
print("\\nAdditional Information:")
print(f"Sum is positive: {(num1 + num2) > 0}")
print(f"Both numbers are positive: {num1 > 0 and num2 > 0}")`
        }
      ],
      quiz: [
        {
          question: "What is the result of 17 // 5 in Python?",
          options: [
            "3.4",
            "3",
            "4", 
            "2"
          ],
          correct: 1
        },
        {
          question: "Which operator has the highest precedence?",
          options: [
            "+",
            "*",
            "**",
            "=="
          ],
          correct: 2
        }
      ]
    },
    {
      id: 'input-output',
      title: 'Input and Output',
      description: 'Learn how to get input from users and display output',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Input and Output in Python</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Output with print()</h4>
          <p class="text-gray-700 mb-4">The print() function displays output to the console.</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>print("Hello, World!")<br/>print("Value:", 42)</code>
          </div>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Input with input()</h4>
          <p class="text-gray-700 mb-4">The input() function gets text from the user.</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>name = input("Enter your name: ")<br/>age = int(input("Enter your age: "))</code>
          </div>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">String Formatting</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>f-strings:</strong> f"Hello, {name}!"</li>
            <li><strong>.format():</strong> "Hello, {}!".format(name)</li>
            <li><strong>% formatting:</strong> "Hello, %s!" % name</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Type Conversion</h4>
          <ul class="list-disc pl-6 text-gray-700">
            <li><strong>int():</strong> Convert to integer</li>
            <li><strong>float():</strong> Convert to decimal</li>
            <li><strong>str():</strong> Convert to string</li>
          </ul>
        </div>
      `,
      codeExample: `# Input and Output Examples
print("=== Input and Output Demo ===")

# Basic output
print("Welcome to Python!")
print("Learning is fun!")

# Getting user input
name = input("What's your name? ")
print(f"Nice to meet you, {name}!")

# Numeric input
age_str = input("How old are you? ")
age = int(age_str)  # Convert string to integer
print(f"You are {age} years old")

# Multiple inputs
print("Enter two numbers:")
num1 = float(input("First number: "))
num2 = float(input("Second number: "))

# Calculations and formatted output
result = num1 + num2
print(f"{num1} + {num2} = {result}")
print(f"Average: {result/2:.2f}")

# Different formatting methods
print("Name: %s, Age: %d" % (name, age))
print("Name: {}, Age: {}".format(name, age))
print(f"Name: {name}, Age: {age}")`,
      practicePrograms: [
        {
          title: "Personal Information Collector",
          description: "Create a program that collects and displays user information",
          starterCode: `# Personal Information Collector
print("=== Personal Information Form ===")

# Get user information
# Your code here - ask for name, age, city, hobby

# Display the information in a nice format
# Your code here`,
          solution: `# Personal Information Collector
print("=== Personal Information Form ===")

# Get user information
name = input("Enter your full name: ")
age = int(input("Enter your age: "))
city = input("Enter your city: ")
hobby = input("Enter your favorite hobby: ")
is_student = input("Are you a student? (yes/no): ").lower() == 'yes'

print("\\n" + "="*40)
print("PERSONAL INFORMATION SUMMARY")
print("="*40)

print(f"Name: {name}")
print(f"Age: {age} years old")
print(f"City: {city}")
print(f"Hobby: {hobby}")
print(f"Student: {'Yes' if is_student else 'No'}")

# Additional calculations
birth_year = 2024 - age
print(f"Birth Year: {birth_year}")

if age >= 18:
    print("Status: Adult")
else:
    print("Status: Minor")
    
print("\\nThank you for sharing your information!")`
        }
      ],
      quiz: [
        {
          question: "What does the input() function always return?",
          options: [
            "Integer",
            "Float",
            "String",
            "Boolean"
          ],
          correct: 2
        },
        {
          question: "Which is the most modern way to format strings in Python?",
          options: [
            "% formatting",
            ".format() method",
            "f-strings",
            "+ concatenation"
          ],
          correct: 2
        }
      ]
    },
    {
      id: 'conditional-statements',
      title: 'Conditional Statements',
      description: 'Learn to make decisions in your code with if, elif, and else',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Conditional Statements</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">The if Statement</h4>
          <p class="text-gray-700 mb-4">Execute code only when a condition is true.</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>if age >= 18:<br/>&nbsp;&nbsp;&nbsp;&nbsp;print("You can vote!")</code>
          </div>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">if-else Statement</h4>
          <p class="text-gray-700 mb-4">Execute different code based on a condition.</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>if score >= 60:<br/>&nbsp;&nbsp;&nbsp;&nbsp;print("Pass")<br/>else:<br/>&nbsp;&nbsp;&nbsp;&nbsp;print("Fail")</code>
          </div>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">if-elif-else Statement</h4>
          <p class="text-gray-700 mb-4">Check multiple conditions in sequence.</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>if score >= 90:<br/>&nbsp;&nbsp;&nbsp;&nbsp;grade = "A"<br/>elif score >= 80:<br/>&nbsp;&nbsp;&nbsp;&nbsp;grade = "B"<br/>elif score >= 70:<br/>&nbsp;&nbsp;&nbsp;&nbsp;grade = "C"<br/>else:<br/>&nbsp;&nbsp;&nbsp;&nbsp;grade = "F"</code>
          </div>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Nested Conditions</h4>
          <p class="text-gray-700 mb-4">You can put if statements inside other if statements.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Logical Operators</h4>
          <ul class="list-disc pl-6 text-gray-700">
            <li><strong>and:</strong> Both conditions must be true</li>
            <li><strong>or:</strong> At least one condition must be true</li>
            <li><strong>not:</strong> Reverses the boolean value</li>
          </ul>
        </div>
      `,
      codeExample: `# Conditional Statements Examples
print("=== Conditional Statements Demo ===")

# Simple if statement
age = 20
if age >= 18:
    print("You are an adult")

# if-else statement
temperature = 25
if temperature > 30:
    print("It's hot today!")
else:
    print("It's not too hot")

# if-elif-else statement
score = 85
if score >= 90:
    grade = "A"
    print("Excellent!")
elif score >= 80:
    grade = "B"
    print("Good job!")
elif score >= 70:
    grade = "C"
    print("Not bad")
elif score >= 60:
    grade = "D"
    print("You passed")
else:
    grade = "F"
    print("You need to study more")

print(f"Your grade is: {grade}")

# Logical operators
username = "admin"
password = "12345"

if username == "admin" and password == "12345":
    print("Login successful!")
else:
    print("Invalid credentials")

# Nested conditions
weather = "sunny"
temperature = 25

if weather == "sunny":
    if temperature > 20:
        print("Perfect day for a picnic!")
    else:
        print("Sunny but cold")
else:
    print("Maybe stay indoors")`,
      practicePrograms: [
        {
          title: "Grade Calculator",
          description: "Create a program that calculates letter grades based on numeric scores",
          starterCode: `# Grade Calculator
print("=== Grade Calculator ===")

# Get student score
score = float(input("Enter your score (0-100): "))

# Calculate grade based on score
# Your code here - use if-elif-else statements

# Display result
# Your code here`,
          solution: `# Grade Calculator
print("=== Grade Calculator ===")

# Get student score
score = float(input("Enter your score (0-100): "))

# Validate input
if score < 0 or score > 100:
    print("Invalid score! Please enter a score between 0 and 100.")
else:
    # Calculate grade based on score
    if score >= 97:
        grade = "A+"
        message = "Outstanding!"
    elif score >= 93:
        grade = "A"
        message = "Excellent!"
    elif score >= 90:
        grade = "A-"
        message = "Great job!"
    elif score >= 87:
        grade = "B+"
        message = "Good work!"
    elif score >= 83:
        grade = "B"
        message = "Well done!"
    elif score >= 80:
        grade = "B-"
        message = "Good!"
    elif score >= 77:
        grade = "C+"
        message = "Satisfactory"
    elif score >= 73:
        grade = "C"
        message = "Average"
    elif score >= 70:
        grade = "C-"
        message = "Below average"
    elif score >= 60:
        grade = "D"
        message = "You passed, but consider studying more"
    else:
        grade = "F"
        message = "You failed. Please retake the exam."
    
    # Display result
    print(f"\\nScore: {score}%")
    print(f"Grade: {grade}")
    print(f"Comment: {message}")
    
    # Additional feedback
    if score >= 90:
        print("You're on the Dean's List!")
    elif score >= 80:
        print("Keep up the good work!")
    elif score < 60:
        print("Consider getting help from a tutor.")`
        }
      ],
      quiz: [
        {
          question: "What happens if multiple elif conditions are true?",
          options: [
            "All true conditions execute",
            "Only the first true condition executes",
            "Only the last true condition executes",
            "Python throws an error"
          ],
          correct: 1
        },
        {
          question: "Which logical operator returns True if at least one condition is true?",
          options: [
            "and",
            "or",
            "not",
            "if"
          ],
          correct: 1
        }
      ]
    },
    {
      id: 'variable-scope',
      title: 'Variable Scope',
      description: 'Understand local, global, and nonlocal scope in Python',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Variable Scope in Python</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">What is Scope?</h4>
          <p class="text-gray-700 mb-4">Scope determines where variables can be accessed in your code. Python follows the LEGB rule:</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">LEGB Rule</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>L</strong>ocal - Inside a function</li>
            <li><strong>E</strong>nclosing - In any outer function</li>
            <li><strong>G</strong>lobal - At the module level</li>
            <li><strong>B</strong>uilt-in - In the built-in namespace</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Local Scope</h4>
          <p class="text-gray-700 mb-4">Variables defined inside a function are local to that function.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Global Scope</h4>
          <p class="text-gray-700 mb-4">Variables defined at the module level are global.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Global Keyword</h4>
          <p class="text-gray-700 mb-4">Use the <code>global</code> keyword to modify a global variable inside a function.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Nonlocal Keyword</h4>
          <p class="text-gray-700">Use <code>nonlocal</code> to modify variables in the enclosing scope.</p>
        </div>
      `,
      codeExample: `# Variable Scope Examples
print("=== Variable Scope Demo ===")

# Global variable
global_var = "I'm global"

def outer_function():
    # Enclosing scope variable
    enclosing_var = "I'm in enclosing scope"
    
    def inner_function():
        # Local variable
        local_var = "I'm local"
        print(f"Local: {local_var}")
        print(f"Enclosing: {enclosing_var}")
        print(f"Global: {global_var}")
    
    inner_function()

outer_function()

# Global keyword example
counter = 0  # Global variable

def increment():
    global counter
    counter += 1
    print(f"Counter: {counter}")

increment()
increment()

# Nonlocal keyword example
def outer():
    x = 10
    
    def inner():
        nonlocal x
        x += 5
        print(f"Inner x: {x}")
    
    inner()
    print(f"Outer x: {x}")

outer()`,
      practicePrograms: [
        {
          title: "Scope Explorer",
          description: "Create a program that demonstrates different variable scopes",
          starterCode: `# Scope Explorer
name = "Global Alice"

def greet():
    # Create a local variable
    # Modify the global variable
    # Your code here
    pass

def nested_example():
    # Create nested functions showing enclosing scope
    # Your code here
    pass

# Test your functions`,
          solution: `# Scope Explorer
name = "Global Alice"
count = 0

def greet():
    name = "Local Bob"  # Local variable
    print(f"Local name: {name}")
    
    global count
    count += 1
    print(f"Global count: {count}")

def nested_example():
    message = "Outer message"
    
    def inner():
        nonlocal message
        message = "Modified by inner"
        print(f"Inner: {message}")
    
    def another_inner():
        local_msg = "Local to another_inner"
        print(f"Another inner: {local_msg}")
        print(f"Accessing enclosing: {message}")
    
    print(f"Before inner: {message}")
    inner()
    print(f"After inner: {message}")
    another_inner()

print("=== Testing Scope ===")
print(f"Global name: {name}")
greet()
print(f"Global name after greet: {name}")

print("\\n=== Nested Function Example ===")
nested_example()

print(f"\\nFinal global count: {count}")`
        }
      ],
      quiz: [
        {
          question: "Which keyword is used to modify a global variable inside a function?",
          options: [
            "local",
            "global",
            "nonlocal",
            "scope"
          ],
          correct: 1
        },
        {
          question: "What does the LEGB rule stand for?",
          options: [
            "Local, Enclosing, Global, Built-in",
            "Local, External, Global, Basic",
            "Limited, Enclosing, General, Built-in",
            "Local, Enclosing, General, Basic"
          ],
          correct: 0
        }
      ]
    },
    {
      id: 'type-casting-checking',
      title: 'Type Casting & Checking',
      description: 'Learn to convert between data types and check variable types',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Type Casting & Checking</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Type Casting (Type Conversion)</h4>
          <p class="text-gray-700 mb-4">Converting one data type to another.</p>
          
          <h5 class="text-lg font-medium text-gray-800 mb-2">Common Type Conversions</h5>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>int():</strong> Convert to integer</li>
            <li><strong>float():</strong> Convert to floating point</li>
            <li><strong>str():</strong> Convert to string</li>
            <li><strong>bool():</strong> Convert to boolean</li>
            <li><strong>list():</strong> Convert to list</li>
            <li><strong>tuple():</strong> Convert to tuple</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Type Checking</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>type():</strong> Returns the exact type</li>
            <li><strong>isinstance():</strong> Checks if object is instance of type</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Implicit vs Explicit Conversion</h4>
          <p class="text-gray-700 mb-2"><strong>Implicit:</strong> Python automatically converts</p>
          <p class="text-gray-700"><strong>Explicit:</strong> Programmer manually converts</p>
        </div>
      `,
      codeExample: `# Type Casting & Checking Examples
print("=== Type Casting & Checking ===")

# String to number conversion
str_num = "123"
int_num = int(str_num)
float_num = float(str_num)

print(f"String: {str_num} (type: {type(str_num).__name__})")
print(f"Integer: {int_num} (type: {type(int_num).__name__})")
print(f"Float: {float_num} (type: {type(float_num).__name__})")

# Number to string
age = 25
age_str = str(age)
print(f"Age as string: '{age_str}' (type: {type(age_str).__name__})")

# Boolean conversion
print(f"bool(1): {bool(1)}")
print(f"bool(0): {bool(0)}")
print(f"bool(''): {bool('')}")
print(f"bool('hello'): {bool('hello')}")

# List and tuple conversion
text = "hello"
text_list = list(text)
text_tuple = tuple(text)

print(f"String to list: {text_list}")
print(f"String to tuple: {text_tuple}")

# Type checking
data = [1, 2, 3]
print(f"Type of data: {type(data)}")
print(f"Is data a list? {isinstance(data, list)}")
print(f"Is data a tuple? {isinstance(data, tuple)}")

# Safe conversion with error handling
def safe_convert(value, target_type):
    try:
        return target_type(value)
    except ValueError:
        return f"Cannot convert '{value}' to {target_type.__name__}"

print(f"Safe convert '123' to int: {safe_convert('123', int)}")
print(f"Safe convert 'abc' to int: {safe_convert('abc', int)}")`,
      practicePrograms: [
        {
          title: "Data Type Converter",
          description: "Build a program that converts between different data types safely",
          starterCode: `# Data Type Converter
def convert_and_display(value, target_types):
    """Convert a value to different types and display results"""
    # Your code here
    pass

# Test with different values
test_values = ["123", "45.67", "True", "hello", ""]
target_types = [int, float, bool, str, list]

# Convert each value to each type
# Your code here`,
          solution: `# Data Type Converter
def convert_and_display(value, target_types):
    """Convert a value to different types and display results"""
    print(f"\\nOriginal value: '{value}' (type: {type(value).__name__})")
    print("-" * 50)
    
    for target_type in target_types:
        try:
            converted = target_type(value)
            print(f"→ {target_type.__name__}(): {converted} (type: {type(converted).__name__})")
        except (ValueError, TypeError) as e:
            print(f"→ {target_type.__name__}(): ERROR - {str(e)}")

def type_analyzer(values):
    """Analyze and categorize different types"""
    type_counts = {}
    
    for value in values:
        type_name = type(value).__name__
        type_counts[type_name] = type_counts.get(type_name, 0) + 1
    
    print("\\n=== Type Analysis ===")
    for type_name, count in type_counts.items():
        print(f"{type_name}: {count} items")

# Test with different values
test_values = ["123", "45.67", "True", "hello", ""]
target_types = [int, float, bool, str, list]

print("=== Data Type Converter ===")
for value in test_values:
    convert_and_display(value, target_types)

# Mixed data types
mixed_data = [42, 3.14, "hello", True, [1, 2, 3], None]
type_analyzer(mixed_data)

# Demonstrate isinstance vs type
print("\\n=== isinstance vs type ===")
number = 42
print(f"type(42) == int: {type(number) == int}")
print(f"isinstance(42, int): {isinstance(number, int)}")
print(f"isinstance(True, int): {isinstance(True, int)}")  # True is subclass of int`
        }
      ],
      quiz: [
        {
          question: "What will int('3.14') return?",
          options: [
            "3.14",
            "3",
            "Error",
            "4"
          ],
          correct: 2
        },
        {
          question: "Which function checks if an object is an instance of a specific type?",
          options: [
            "type()",
            "isinstance()",
            "convert()",
            "check_type()"
          ],
          correct: 1
        }
      ]
    },
    {
      id: 'python-comments',
      title: 'Python Comments',
      description: 'Learn to write effective comments and documentation',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Python Comments</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Types of Comments</h4>
          
          <h5 class="text-lg font-medium text-gray-800 mb-2">1. Single-line Comments</h5>
          <p class="text-gray-700 mb-2">Use the # symbol for single-line comments</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code># This is a single-line comment</code>
          </div>
          
          <h5 class="text-lg font-medium text-gray-800 mb-2">2. Multi-line Comments</h5>
          <p class="text-gray-700 mb-2">Use triple quotes for multi-line comments</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>"""<br/>This is a<br/>multi-line comment<br/>"""</code>
          </div>
          
          <h5 class="text-lg font-medium text-gray-800 mb-2">3. Docstrings</h5>
          <p class="text-gray-700 mb-4">Special comments that document functions, classes, and modules</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Best Practices</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li>Write clear, concise comments</li>
            <li>Explain WHY, not WHAT</li>
            <li>Update comments when code changes</li>
            <li>Use docstrings for functions and classes</li>
            <li>Avoid obvious comments</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Inline Comments</h4>
          <p class="text-gray-700">Comments on the same line as code, use sparingly.</p>
        </div>
      `,
      codeExample: `# Python Comments Examples
print("=== Python Comments Demo ===")

# Single-line comment explaining the purpose
name = "Alice"  # Inline comment (use sparingly)

"""
Multi-line comment explaining
a complex algorithm or process.
This can span multiple lines.
"""

def calculate_area(radius):
    """
    Calculate the area of a circle.
    
    Args:
        radius (float): The radius of the circle
        
    Returns:
        float: The area of the circle
        
    Example:
        >>> calculate_area(5)
        78.53981633974483
    """
    import math
    return math.pi * radius ** 2

# Good comment: Explains WHY we're doing this
# We multiply by 2 because the discount applies twice for premium users
discount = base_price * 0.1 * 2

# Bad comment: Explains WHAT (obvious from code)
# x = x + 1  # Increment x by 1

# TODO: Implement error handling for negative radius
# FIXME: This function doesn't handle edge cases
# NOTE: Consider using a more efficient algorithm

def complex_function():
    """
    This function demonstrates various comment types.
    
    It's important to document complex logic so other
    developers (including future you) can understand it.
    """
    # Step 1: Initialize variables
    data = []
    
    # Step 2: Process data (explained because it's not obvious)
    for i in range(10):
        # Skip even numbers for business logic reasons
        if i % 2 == 0:
            continue
        data.append(i * 2)
    
    return data

result = complex_function()
print(f"Result: {result}")

# Accessing docstring
print(f"Function documentation: {calculate_area.__doc__}")`,
      practicePrograms: [
        {
          title: "Code Documentation",
          description: "Practice writing good comments and docstrings",
          starterCode: `# Code Documentation Practice
# Add appropriate comments and docstrings to this code

def process_grades(grades):
    total = 0
    count = 0
    for grade in grades:
        if grade >= 0:
            total += grade
            count += 1
    if count > 0:
        average = total / count
        if average >= 90:
            return "A"
        elif average >= 80:
            return "B"
        elif average >= 70:
            return "C"
        elif average >= 60:
            return "D"
        else:
            return "F"
    return "No valid grades"

grades_list = [85, 92, 78, 96, -1, 88]
result = process_grades(grades_list)
print(result)`,
          solution: `# Code Documentation Practice
"""
Grade Processing Module

This module contains functions for processing student grades
and calculating letter grades based on average scores.
"""

def process_grades(grades):
    """
    Calculate the average grade and return corresponding letter grade.
    
    This function processes a list of numerical grades, calculates
    the average of valid grades (>= 0), and returns the corresponding
    letter grade based on standard grading scale.
    
    Args:
        grades (list): List of numerical grades (int or float)
        
    Returns:
        str: Letter grade (A, B, C, D, F) or error message
        
    Example:
        >>> process_grades([85, 92, 78, 96])
        'A'
        
    Note:
        Negative grades are ignored as they're considered invalid.
    """
    # Initialize counters for valid grades
    total = 0
    count = 0
    
    # Process each grade in the list
    for grade in grades:
        # Only include non-negative grades (business rule)
        if grade >= 0:
            total += grade
            count += 1
    
    # Calculate average if we have valid grades
    if count > 0:
        average = total / count
        
        # Determine letter grade based on standard scale
        if average >= 90:
            return "A"    # Excellent: 90-100
        elif average >= 80:
            return "B"    # Good: 80-89
        elif average >= 70:
            return "C"    # Satisfactory: 70-79
        elif average >= 60:
            return "D"    # Below Average: 60-69
        else:
            return "F"    # Failing: Below 60
    
    # No valid grades found
    return "No valid grades"

# Test data with mixed valid and invalid grades
grades_list = [85, 92, 78, 96, -1, 88]  # -1 will be ignored

# Calculate and display the result
result = process_grades(grades_list)
print(f"Letter grade: {result}")

# TODO: Add support for weighted grades
# FIXME: Consider handling None values in grades list
# NOTE: Current scale is based on standard US grading system`
        }
      ],
      quiz: [
        {
          question: "What symbol is used for single-line comments in Python?",
          options: [
            "//",
            "#",
            "/*",
            "--"
          ],
          correct: 1
        },
        {
          question: "What is the purpose of docstrings?",
          options: [
            "To comment out code",
            "To document functions and classes",
            "To create multi-line comments",
            "To debug code"
          ],
          correct: 1
        }
      ]
    },
    {
      id: 'strings-deep-dive',
      title: 'Strings in Python',
      description: 'Master string manipulation, formatting, and methods',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Strings in Python</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">String Creation</h4>
          <p class="text-gray-700 mb-4">Strings can be created with single, double, or triple quotes.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">String Methods</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>upper(), lower():</strong> Change case</li>
            <li><strong>strip():</strong> Remove whitespace</li>
            <li><strong>split(), join():</strong> Split and join strings</li>
            <li><strong>replace():</strong> Replace substrings</li>
            <li><strong>find(), index():</strong> Find substrings</li>
            <li><strong>startswith(), endswith():</strong> Check prefixes/suffixes</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">String Formatting</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>f-strings:</strong> f"Hello {name}"</li>
            <li><strong>.format():</strong> "Hello {}".format(name)</li>
            <li><strong>% formatting:</strong> "Hello %s" % name</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">String Slicing</h4>
          <p class="text-gray-700 mb-4">Access parts of strings using [start:end:step] notation.</p>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Escape Characters</h4>
          <p class="text-gray-700">Special characters like \\n (newline), \\t (tab), \\\\ (backslash).</p>
        </div>
      `,
      codeExample: `# Strings in Python - Comprehensive Demo
print("=== Strings in Python ===")

# String creation
single_quote = 'Hello World'
double_quote = "Hello World"
triple_quote = """This is a 
multi-line string"""

print(f"Single quotes: {single_quote}")
print(f"Triple quotes: {repr(triple_quote)}")

# String methods
text = "  Python Programming  "
print(f"Original: '{text}'")
print(f"Upper: {text.upper()}")
print(f"Lower: {text.lower()}")
print(f"Stripped: '{text.strip()}'")
print(f"Title case: {text.strip().title()}")

# String splitting and joining
sentence = "Python is awesome and powerful"
words = sentence.split()
print(f"Words: {words}")
joined = "-".join(words)
print(f"Joined: {joined}")

# String replacement
original = "I love Java programming"
replaced = original.replace("Java", "Python")
print(f"Replaced: {replaced}")

# String searching
text = "Python Programming"
print(f"Find 'gram': {text.find('gram')}")
print(f"Starts with 'Py': {text.startswith('Py')}")
print(f"Ends with 'ing': {text.endswith('ing')}")

# String formatting
name = "Alice"
age = 25
score = 95.67

# f-strings (recommended)
print(f"Name: {name}, Age: {age}, Score: {score:.1f}")

# .format() method
print("Name: {}, Age: {}, Score: {:.2f}".format(name, age, score))

# String slicing
text = "Python"
print(f"First 3 chars: {text[:3]}")
print(f"Last 3 chars: {text[-3:]}")
print(f"Every 2nd char: {text[::2]}")
print(f"Reversed: {text[::-1]}")

# Escape characters
escaped = "Line 1\\nLine 2\\tTabbed"
print(f"With escapes: {escaped}")
print("Raw string:", repr("C:\\\\Users\\\\name"))`,
      practicePrograms: [
        {
          title: "Text Processor",
          description: "Build a comprehensive text processing tool",
          starterCode: `# Text Processor
def analyze_text(text):
    """Analyze and process text in various ways"""
    # Your code here - implement text analysis
    pass

def format_name(first, last):
    """Format names properly"""
    # Your code here
    pass

def extract_email_domain(email):
    """Extract domain from email address"""
    # Your code here
    pass

# Test your functions
sample_text = "  hello WORLD! this is PYTHON programming  "
test_email = "user@example.com"

# Add your test calls here`,
          solution: `# Text Processor
def analyze_text(text):
    """Analyze and process text in various ways"""
    if not text:
        return "Empty text provided"
    
    # Clean the text
    cleaned = text.strip()
    
    # Basic statistics
    char_count = len(cleaned)
    word_count = len(cleaned.split())
    sentence_count = cleaned.count('.') + cleaned.count('!') + cleaned.count('?')
    
    # Character analysis
    uppercase_count = sum(1 for c in cleaned if c.isupper())
    lowercase_count = sum(1 for c in cleaned if c.islower())
    digit_count = sum(1 for c in cleaned if c.isdigit())
    
    return {
        'original': text,
        'cleaned': cleaned,
        'character_count': char_count,
        'word_count': word_count,
        'sentence_count': sentence_count,
        'uppercase_letters': uppercase_count,
        'lowercase_letters': lowercase_count,
        'digits': digit_count,
        'title_case': cleaned.title(),
        'word_list': cleaned.split()
    }

def format_name(first, last):
    """Format names properly"""
    if not first or not last:
        return "Invalid name provided"
    
    # Clean and format names
    first_clean = first.strip().title()
    last_clean = last.strip().title()
    
    return {
        'full_name': f"{first_clean} {last_clean}",
        'last_first': f"{last_clean}, {first_clean}",
        'initials': f"{first_clean[0]}.{last_clean[0]}.",
        'username': f"{first_clean.lower()}.{last_clean.lower()}"
    }

def extract_email_domain(email):
    """Extract domain from email address"""
    if '@' not in email:
        return "Invalid email format"
    
    parts = email.split('@')
    if len(parts) != 2:
        return "Invalid email format"
    
    username, domain = parts
    domain_parts = domain.split('.')
    
    return {
        'email': email,
        'username': username,
        'domain': domain,
        'domain_name': domain_parts[0] if domain_parts else '',
        'tld': domain_parts[-1] if len(domain_parts) > 1 else '',
        'is_valid': len(domain_parts) >= 2 and all(part for part in domain_parts)
    }

def password_strength(password):
    """Check password strength"""
    score = 0
    feedback = []
    
    if len(password) >= 8:
        score += 1
    else:
        feedback.append("Add more characters (minimum 8)")
    
    if any(c.isupper() for c in password):
        score += 1
    else:
        feedback.append("Add uppercase letters")
    
    if any(c.islower() for c in password):
        score += 1
    else:
        feedback.append("Add lowercase letters")
    
    if any(c.isdigit() for c in password):
        score += 1
    else:
        feedback.append("Add numbers")
    
    special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    if any(c in special_chars for c in password):
        score += 1
    else:
        feedback.append("Add special characters")
    
    strength_levels = {0: "Very Weak", 1: "Weak", 2: "Fair", 3: "Good", 4: "Strong", 5: "Very Strong"}
    
    return {
        'password': password,
        'score': score,
        'strength': strength_levels[score],
        'feedback': feedback
    }

# Test the functions
print("=== Text Processor Demo ===")

# Test text analysis
sample_text = "  hello WORLD! this is PYTHON programming. Amazing! 123  "
analysis = analyze_text(sample_text)
print("\\nText Analysis:")
for key, value in analysis.items():
    print(f"{key}: {value}")

# Test name formatting
name_result = format_name("john", "doe")
print("\\nName Formatting:")
for key, value in name_result.items():
    print(f"{key}: {value}")

# Test email processing
test_email = "user@example.com"
email_result = extract_email_domain(test_email)
print("\\nEmail Analysis:")
for key, value in email_result.items():
    print(f"{key}: {value}")

# Test password strength
test_password = "MyStr0ng!Pass"
password_result = password_strength(test_password)
print("\\nPassword Strength:")
for key, value in password_result.items():
    print(f"{key}: {value}")`
        }
      ],
      quiz: [
        {
          question: "Which method removes whitespace from both ends of a string?",
          options: [
            "remove()",
            "strip()",
            "trim()",
            "clean()"
          ],
          correct: 1
        },
        {
          question: "What does 'Python'[::-1] return?",
          options: [
            "Python",
            "nohtyP",
            "Pytho",
            "Error"
          ],
          correct: 1
        }
      ]
    },
    {
      id: 'loops-deep-dive',
      title: 'Loops in Python',
      description: 'Master for loops, while loops, and loop control statements',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Loops in Python</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">For Loops</h4>
          <p class="text-gray-700 mb-4">Iterate over sequences (lists, strings, ranges).</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>for item in sequence:<br/>&nbsp;&nbsp;&nbsp;&nbsp;# code here</code>
          </div>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">While Loops</h4>
          <p class="text-gray-700 mb-4">Repeat while a condition is true.</p>
          <div class="bg-gray-100 p-3 rounded mb-4">
            <code>while condition:<br/>&nbsp;&nbsp;&nbsp;&nbsp;# code here</code>
          </div>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Loop Control Statements</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>break:</strong> Exit the loop completely</li>
            <li><strong>continue:</strong> Skip to next iteration</li>
            <li><strong>pass:</strong> Do nothing (placeholder)</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Range Function</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>range(n):</strong> 0 to n-1</li>
            <li><strong>range(start, stop):</strong> start to stop-1</li>
            <li><strong>range(start, stop, step):</strong> with step size</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Enumerate and Zip</h4>
          <ul class="list-disc pl-6 text-gray-700">
            <li><strong>enumerate():</strong> Get index and value</li>
            <li><strong>zip():</strong> Combine multiple iterables</li>
          </ul>
        </div>
      `,
      codeExample: `# Loops in Python - Comprehensive Demo
print("=== Loops in Python ===")

# Basic for loop
print("\\n1. Basic For Loop:")
fruits = ["apple", "banana", "orange"]
for fruit in fruits:
    print(f"I like {fruit}")

# For loop with range
print("\\n2. For Loop with Range:")
for i in range(5):
    print(f"Number: {i}")

# For loop with custom range
print("\\n3. Custom Range:")
for i in range(2, 10, 2):  # start=2, stop=10, step=2
    print(f"Even number: {i}")

# While loop
print("\\n4. While Loop:")
count = 0
while count < 3:
    print(f"Count: {count}")
    count += 1

# Loop with break
print("\\n5. Loop with Break:")
for i in range(10):
    if i == 5:
        break
    print(f"Before break: {i}")

# Loop with continue
print("\\n6. Loop with Continue:")
for i in range(5):
    if i == 2:
        continue
    print(f"Not skipped: {i}")

# Enumerate (get index and value)
print("\\n7. Enumerate:")
names = ["Alice", "Bob", "Charlie"]
for index, name in enumerate(names):
    print(f"{index}: {name}")

# Zip (combine multiple lists)
print("\\n8. Zip:")
names = ["Alice", "Bob", "Charlie"]
ages = [25, 30, 35]
cities = ["New York", "London", "Tokyo"]

for name, age, city in zip(names, ages, cities):
    print(f"{name} is {age} years old and lives in {city}")

# Nested loops
print("\\n9. Nested Loops:")
for i in range(3):
    for j in range(3):
        print(f"({i}, {j})", end=" ")
    print()  # New line after inner loop

# List comprehension (alternative to loops)
print("\\n10. List Comprehension:")
squares = [x**2 for x in range(5)]
print(f"Squares: {squares}")

# Loop with else clause
print("\\n11. Loop with Else:")
for i in range(3):
    print(f"Loop iteration: {i}")
else:
    print("Loop completed normally")`,
      practicePrograms: [
        {
          title: "Pattern Generator",
          description: "Create various patterns using loops",
          starterCode: `# Pattern Generator
def print_triangle(height):
    """Print a triangle pattern"""
    # Your code here
    pass

def print_multiplication_table(number):
    """Print multiplication table"""
    # Your code here
    pass

def find_prime_numbers(limit):
    """Find all prime numbers up to limit"""
    # Your code here
    pass

# Test your functions
print_triangle(5)
print_multiplication_table(7)
primes = find_prime_numbers(20)
print(f"Primes up to 20: {primes}")`,
          solution: `# Pattern Generator
def print_triangle(height):
    """Print a triangle pattern"""
    print(f"\\nTriangle Pattern (height {height}):")
    
    # Right-aligned triangle
    for i in range(1, height + 1):
        spaces = ' ' * (height - i)
        stars = '*' * i
        print(f"{spaces}{stars}")
    
    print("\\nFull Triangle:")
    # Full triangle
    for i in range(1, height + 1):
        spaces = ' ' * (height - i)
        stars = '*' * (2 * i - 1)
        print(f"{spaces}{stars}")

def print_multiplication_table(number):
    """Print multiplication table"""
    print(f"\\nMultiplication Table for {number}:")
    print("-" * 20)
    
    for i in range(1, 11):
        result = number * i
        print(f"{number} × {i:2d} = {result:2d}")

def find_prime_numbers(limit):
    """Find all prime numbers up to limit using Sieve of Eratosthenes"""
    if limit < 2:
        return []
    
    # Initialize boolean array
    is_prime = [True] * (limit + 1)
    is_prime[0] = is_prime[1] = False
    
    # Sieve algorithm
    for i in range(2, int(limit**0.5) + 1):
        if is_prime[i]:
            # Mark multiples as not prime
            for j in range(i*i, limit + 1, i):
                is_prime[j] = False
    
    # Collect prime numbers
    primes = []
    for i in range(2, limit + 1):
        if is_prime[i]:
            primes.append(i)
    
    return primes

def fibonacci_sequence(n):
    """Generate first n Fibonacci numbers"""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    fib = [0, 1]
    for i in range(2, n):
        next_fib = fib[i-1] + fib[i-2]
        fib.append(next_fib)
    
    return fib

def number_guessing_game():
    """Simple number guessing game"""
    import random
    
    number = random.randint(1, 100)
    attempts = 0
    max_attempts = 7
    
    print("\\n=== Number Guessing Game ===")
    print(f"Guess a number between 1 and 100. You have {max_attempts} attempts.")
    
    while attempts < max_attempts:
        try:
            guess = int(input(f"Attempt {attempts + 1}: Enter your guess: "))
            attempts += 1
            
            if guess == number:
                print(f"Congratulations! You guessed it in {attempts} attempts!")
                break
            elif guess < number:
                print("Too low!")
            else:
                print("Too high!")
            
            if attempts == max_attempts:
                print(f"Game over! The number was {number}")
                
        except ValueError:
            print("Please enter a valid number!")

# Test the functions
print("=== Pattern Generator Demo ===")

print_triangle(5)
print_multiplication_table(7)

primes = find_prime_numbers(20)
print(f"\\nPrime numbers up to 20: {primes}")

fib = fibonacci_sequence(10)
print(f"First 10 Fibonacci numbers: {fib}")

# Demonstrate various loop patterns
print("\\n=== Loop Patterns ===")

# Diamond pattern
def print_diamond(size):
    print(f"\\nDiamond Pattern (size {size}):")
    # Upper half
    for i in range(size):
        spaces = ' ' * (size - i - 1)
        stars = '*' * (2 * i + 1)
        print(f"{spaces}{stars}")
    
    # Lower half
    for i in range(size - 2, -1, -1):
        spaces = ' ' * (size - i - 1)
        stars = '*' * (2 * i + 1)
        print(f"{spaces}{stars}")

print_diamond(4)

# Number pattern
print("\\nNumber Pattern:")
for i in range(1, 6):
    for j in range(1, i + 1):
        print(j, end=" ")
    print()

# Uncomment to play the guessing game
# number_guessing_game()`
        }
      ],
      quiz: [
        {
          question: "What does the 'break' statement do in a loop?",
          options: [
            "Skips the current iteration",
            "Exits the loop completely",
            "Pauses the loop",
            "Restarts the loop"
          ],
          correct: 1
        },
        {
          question: "What will range(2, 8, 2) produce?",
          options: [
            "[2, 4, 6, 8]",
            "[2, 4, 6]",
            "[2, 3, 4, 5, 6, 7]",
            "[2, 8, 2]"
          ],
          correct: 1
        }
      ]
    },
    {
      id: 'functions-deep-dive',
      title: 'Functions Deep Dive',
      description: 'Master function parameters, return values, and advanced concepts',
      content: `
        <div class="prose prose-lg max-w-none">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">Functions Deep Dive</h3>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Function Parameters</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li><strong>Positional arguments:</strong> Order matters</li>
            <li><strong>Keyword arguments:</strong> Named parameters</li>
            <li><strong>Default parameters:</strong> Optional with default values</li>
            <li><strong>*args:</strong> Variable positional arguments</li>
            <li><strong>**kwargs:</strong> Variable keyword arguments</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Return Values</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li>Functions can return single or multiple values</li>
            <li>Use tuple unpacking for multiple returns</li>
            <li>Functions without return statement return None</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Function Scope</h4>
          <ul class="list-disc pl-6 text-gray-700 mb-4">
            <li>Local variables inside functions</li>
            <li>Global variables accessible but not modifiable</li>
            <li>Use global keyword to modify global variables</li>
          </ul>
          
          <h4 class="text-xl font-semibold text-gray-800 mb-3">Advanced Concepts</h4>
          <ul class="list-disc pl-6 text-gray-700">
            <li>Lambda functions (anonymous functions)</li>
            <li>Nested functions</li>
            <li>Function decorators</li>
            <li>Generator functions</li>
          </ul>
        </div>
      `,
      codeExample: `# Functions Deep Dive
print("=== Functions Deep Dive ===")

# Basic function with parameters and return
def greet(name, greeting="Hello"):
    """Function with default parameter"""
    return f"{greeting}, {name}!"

print(greet("Alice"))
print(greet("Bob", "Hi"))

# Function with multiple return values
def get_name_parts(full_name):
    """Return multiple values as tuple"""
    parts = full_name.split()
    if len(parts) >= 2:
        return parts[0], parts[-1]
    return parts[0], ""

first, last = get_name_parts("John Doe")
print(f"First: {first}, Last: {last}")

# Function with *args and **kwargs
def flexible_function(*args, **kwargs):
    """Function accepting variable arguments"""
    print(f"Positional args: {args}")
    print(f"Keyword args: {kwargs}")
    
    total = sum(args)
    return total

result = flexible_function(1, 2, 3, name="Alice", age=25)
print(f"Sum of args: {result}")

# Lambda function
square = lambda x: x ** 2
numbers = [1, 2, 3, 4, 5]
squared = list(map(square, numbers))
print(f"Squared numbers: {squared}")

# Nested function
def outer_function(x):
    """Function containing another function"""
    def inner_function(y):
        return x + y
    return inner_function

add_five = outer_function(5)
print(f"5 + 3 = {add_five(3)}")

# Function with type hints
def calculate_bmi(weight: float, height: float) -> float:
    """Calculate BMI with type hints"""
    return weight / (height ** 2)

bmi = calculate_bmi(70.0, 1.75)
print(f"BMI: {bmi:.2f}")

# Generator function
def countdown(n):
    """Generator function using yield"""
    while n > 0:
        yield n
        n -= 1

print("Countdown:")
for num in countdown(5):
    print(num)

# Decorator example
def timing_decorator(func):
    """Simple decorator to time function execution"""
    def wrapper(*args, **kwargs):
        import time
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper

@timing_decorator
def slow_function():
    """Function with decorator"""
    import time
    time.sleep(0.1)
    return "Done!"

result = slow_function()
print(f"Result: {result}")`,
      practicePrograms: [
        {
          title: "Calculator Functions",
          description: "Build a comprehensive calculator using various function concepts",
          starterCode: `# Calculator Functions
def basic_calculator(operation, *numbers):
    """Perform basic operations on multiple numbers"""
    # Your code here
    pass

def advanced_calculator(**operations):
    """Perform multiple operations using keyword arguments"""
    # Your code here
    pass

def create_operation(operation):
    """Return a function that performs the specified operation"""
    # Your code here - use nested functions
    pass

# Test your functions
result1 = basic_calculator('add', 1, 2, 3, 4, 5)
print(f"Sum: {result1}")

result2 = advanced_calculator(add=[1, 2, 3], multiply=[2, 3, 4])
print(f"Advanced: {result2}")`,
          solution: `# Calculator Functions
def basic_calculator(operation, *numbers):
    """Perform basic operations on multiple numbers"""
    if not numbers:
        return "No numbers provided"
    
    if operation == 'add':
        return sum(numbers)
    elif operation == 'multiply':
        result = 1
        for num in numbers:
            result *= num
        return result
    elif operation == 'subtract':
        result = numbers[0]
        for num in numbers[1:]:
            result -= num
        return result
    elif operation == 'divide':
        result = numbers[0]
        for num in numbers[1:]:
            if num == 0:
                return "Error: Division by zero"
            result /= num
        return result
    elif operation == 'average':
        return sum(numbers) / len(numbers)
    elif operation == 'max':
        return max(numbers)
    elif operation == 'min':
        return min(numbers)
    else:
        return f"Unknown operation: {operation}"

def advanced_calculator(**operations):
    """Perform multiple operations using keyword arguments"""
    results = {}
    
    for operation, numbers in operations.items():
        if isinstance(numbers, (list, tuple)):
            results[operation] = basic_calculator(operation, *numbers)
        else:
            results[operation] = f"Invalid input for {operation}"
    
    return results

def create_operation(operation):
    """Return a function that performs the specified operation"""
    def operation_function(*args):
        return basic_calculator(operation, *args)
    
    operation_function.__name__ = f"{operation}_operation"
    operation_function.__doc__ = f"Perform {operation} operation on given numbers"
    
    return operation_function

def function_factory(operations_list):
    """Create multiple operation functions"""
    functions = {}
    for op in operations_list:
        functions[f"{op}_func"] = create_operation(op)
    return functions

def curry_function(func):
    """Demonstrate currying with functions"""
    def curried(*args, **kwargs):
        if len(args) + len(kwargs) >= func.__code__.co_argcount:
            return func(*args, **kwargs)
        else:
            def partial_func(*more_args, **more_kwargs):
                return curried(*(args + more_args), **{**kwargs, **more_kwargs})
            return partial_func
    return curried

@curry_function
def power_function(base, exponent):
    """Calculate base raised to exponent"""
    return base ** exponent

def memoize(func):
    """Decorator to cache function results"""
    cache = {}
    
    def wrapper(*args):
        if args in cache:
            print(f"Cache hit for {args}")
            return cache[args]
        
        result = func(*args)
        cache[args] = result
        print(f"Computed {args} = {result}")
        return result
    
    return wrapper

@memoize
def fibonacci(n):
    """Calculate fibonacci number with memoization"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def validate_input(input_type):
    """Decorator to validate function inputs"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Validate all args are of specified type
            for arg in args:
                if not isinstance(arg, input_type):
                    return f"Error: Expected {input_type.__name__}, got {type(arg).__name__}"
            return func(*args, **kwargs)
        return wrapper
    return decorator

@validate_input(int)
def integer_calculator(operation, *numbers):
    """Calculator that only accepts integers"""
    return basic_calculator(operation, *numbers)

# Comprehensive testing
print("=== Calculator Functions Demo ===")

# Test basic calculator
print("\\n1. Basic Calculator:")
print(f"Add: {basic_calculator('add', 1, 2, 3, 4, 5)}")
print(f"Multiply: {basic_calculator('multiply', 2, 3, 4)}")
print(f"Average: {basic_calculator('average', 10, 20, 30)}")

# Test advanced calculator
print("\\n2. Advanced Calculator:")
results = advanced_calculator(
    add=[1, 2, 3, 4],
    multiply=[2, 3],
    average=[10, 20, 30, 40],
    max=[5, 10, 3, 8]
)
for operation, result in results.items():
    print(f"{operation}: {result}")

# Test function factory
print("\\n3. Function Factory:")
ops = ['add', 'multiply', 'average']
calc_functions = function_factory(ops)

add_func = calc_functions['add_func']
multiply_func = calc_functions['multiply_func']

print(f"Add function: {add_func(1, 2, 3)}")
print(f"Multiply function: {multiply_func(2, 3, 4)}")

# Test currying
print("\\n4. Currying Example:")
square = power_function(base=2)  # Partially applied
print(f"2^3 = {square(exponent=3)}")
print(f"2^4 = {square(exponent=4)}")

# Test memoization
print("\\n5. Memoization Example:")
print(f"Fibonacci(10) = {fibonacci(10)}")
print(f"Fibonacci(10) again = {fibonacci(10)}")  # Should use cache

# Lambda functions with calculator
print("\\n7. Lambda Functions:")
operations = {
    'square': lambda x: x ** 2,
    'cube': lambda x: x ** 3,
    'double': lambda x: x * 2,
    'half': lambda x: x / 2
}

number = 8
for name, func in operations.items():
    print(f"{name}({number}) = {func(number)}")`
        }
      ],
      quiz: [
        {
          question: "What does *args allow in a function?",
          options: [
            "Named arguments only",
            "Variable number of positional arguments",
            "Variable number of keyword arguments",
            "Default parameters"
          ],
          correct: 1
        },
        {
          question: "What is returned by a function without a return statement?",
          options: [
            "0",
            "Empty string",
            "None",
            "Error"
          ],
          correct: 2
        }
      ]
    }
  ];

  const lessonIdByLocalId = useMemo(() => {
    const map: Record<string, string> = {};
    lessons.forEach((lesson, index) => {
      if (dbLessonsList[index]?._id) {
        map[lesson.id] = dbLessonsList[index]._id;
      }
    });
    return map;
  }, [dbLessonsList]);

  const runCode = async () => {
    setIsLoading(true);
    setOutput('');

    try {
      const res = await apiFetch("/code/run", { method: "POST", body: JSON.stringify({ code }) }, token);
      setOutput(res.output || 'Code executed successfully (no output)');
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runPracticeCode = async () => {
    setIsPracticeLoading(true);
    setPracticeOutput('');

    try {
      const res = await apiFetch("/code/run", { method: "POST", body: JSON.stringify({ code: practiceCode }) }, token);
      setPracticeOutput(res.output || 'Code executed successfully (no output)');
    } catch (error: any) {
      setPracticeOutput(`Error: ${error.message}`);
    } finally {
      setIsPracticeLoading(false);
    }
  };

  const loadPracticeExample = (starterCode: string) => {
    setPracticeCode(starterCode);
    setPracticeOutput('');
  };

  const currentLesson = lessons.find(lesson => lesson.id === selectedLesson);
  const activeQuiz = backendQuizQuestions.length ? backendQuizQuestions : (currentLesson?.quiz || []);
  const completedLessons = studentDashboard?.completedLessons ?? 0;
  const totalLessons = studentDashboard?.totalLessons ?? lessons.length;
  const ecosystemProgress = Math.round((completedLessons / Math.max(totalLessons, 1)) * 100);
  const xpEarned = completedLessons * 120 + (studentDashboard?.quizAttempts ?? 0) * 45 + (studentDashboard?.codeRunCount ?? 0) * 10;
  const currentRank = rankLadder[Math.min(rankLadder.length - 1, Math.floor(xpEarned / 600))];

  useEffect(() => {
    const loadTopicQuiz = async () => {
      try {
        if (!currentLesson) return;
        const lessonId = lessonIdByLocalId[selectedLesson];
        if (!lessonId) {
          setBackendQuizQuestions([]);
          return;
        }
        const quiz = await apiFetch(`/student/quizzes/${lessonId}`, {}, token);
        const normalized = (quiz?.questions || []).map((q: any) => ({
          question: q.question,
          options: q.options,
          correct: q.correctAnswer
        }));
        setBackendQuizQuestions(normalized);
      } catch {
        setBackendQuizQuestions([]);
      }
    };
    if (token) loadTopicQuiz();
  }, [token, selectedLesson, lessonIdByLocalId, currentLesson]);

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    const key = `${selectedLesson}-${questionIndex}`;
    setQuizAnswers(prev => ({
      ...prev,
      [key]: answerIndex
    }));
  };

  const submitQuiz = async () => {
    if (!currentLesson) return;
    
    const results: {[key: string]: boolean} = {};
    activeQuiz.forEach((question, index) => {
      const key = `${selectedLesson}-${index}`;
      const userAnswer = quizAnswers[key];
      results[key] = userAnswer === question.correct;
    });
    
    setQuizResults(results);

    const lessonId = lessonIdByLocalId[selectedLesson];
    if (!lessonId) return;
    const answers = activeQuiz.map((_, index) => {
      const key = `${selectedLesson}-${index}`;
      return quizAnswers[key];
    });
    try {
      await apiFetch(`/student/quizzes/${lessonId}/submit`, { method: "POST", body: JSON.stringify({ answers }) }, token);
    } catch {
      // Keep local score UX even if tracking call fails.
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-indigo-100 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950">
      <div className="flex h-screen">
        {/* Left Sidebar - Course Menu */}
        <div className="w-80 bg-white/90 shadow-2xl border-r border-cyan-100 overflow-y-auto backdrop-blur dark:bg-slate-950/90 dark:border-slate-800">
          <div className="p-6 border-b border-cyan-100 bg-gradient-to-r from-slate-950 via-cyan-800 to-indigo-700">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="h-8 w-8" />
              Robokidy Python
            </h1>
            <p className="text-cyan-100 text-sm mt-2">Python programming lessons and practice</p>
            <div className="mt-4 rounded-lg border border-white/15 bg-white/10 p-3 text-white">
              <div className="flex items-center justify-between text-xs">
                <span>{currentRank}</span>
                <span>{xpEarned} XP</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${Math.min(ecosystemProgress, 100)}%` }} />
              </div>
              <Button
                variant="secondary"
                className="mt-3 w-full justify-center gap-2 bg-white text-slate-900 hover:bg-cyan-50"
                onClick={() => window.location.href = "/student/materials"}
              >
                <FileText className="h-4 w-4" />
                Materials
              </Button>
            </div>
          </div>
          
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Python Curriculum
            </h2>
            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setSelectedLesson(lesson.id);
                  }}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-200 hover:bg-blue-50 border-2 ${
                    selectedLesson === lesson.id 
                      ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-md' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          selectedLesson === lesson.id 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-semibold text-sm leading-tight">{lesson.title}</h3>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed pl-8">{lesson.description}</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform flex-shrink-0 mt-1 ${
                      selectedLesson === lesson.id ? 'rotate-90 text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white/85 shadow-sm border-b border-cyan-100 p-6 backdrop-blur dark:bg-slate-950/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Robokidy Innovative Centre</p>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100">{currentLesson?.title}</h1>
                <p className="text-gray-600 mt-1 text-lg dark:text-slate-300">{currentLesson?.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 text-sm px-3 py-1">
                  {currentRank}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === "dark" ? "Light" : "Black"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full ring-offset-background focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <Avatar className="h-10 w-10 border-2 border-blue-200">
                        <AvatarFallback className="bg-blue-600 text-white font-semibold">
                          {user?.username?.slice(0, 2).toUpperCase() || "ST"}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>
                      <p className="font-semibold">{user?.username}</p>
                      <p className="text-xs text-muted-foreground">Keep learning, your progress is growing.</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1 space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>Total lessons</span><span className="font-semibold">{studentDashboard?.totalLessons ?? "-"}</span></div>
                      <div className="flex items-center justify-between"><span>Completed lessons</span><span className="font-semibold">{studentDashboard?.completedLessons ?? "-"}</span></div>
                      <div className="flex items-center justify-between"><span>Quiz attempts</span><span className="font-semibold">{studentDashboard?.quizAttempts ?? "-"}</span></div>
                      <div className="flex items-center justify-between"><span>Code runs</span><span className="font-semibold">{studentDashboard?.codeRunCount ?? "-"}</span></div>
                      <div className="flex items-center justify-between"><span>Pending topics</span><span className="font-semibold text-amber-600">{pendingTopics}</span></div>
                      <div className="flex items-center justify-between"><span>Pending questions</span><span className="font-semibold text-amber-600">{pendingTopics * 5}</span></div>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                      <Dialog open={progressOpen} onOpenChange={setProgressOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full mb-2">View Full Progress</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>My Full Learning Progress</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
                            {topicRows.map((row) => (
                              <div key={row.title} className="border rounded-lg p-3 bg-white">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-semibold text-sm">{row.title}</p>
                                  <Badge className={row.completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                                    {row.completed ? "Completed" : "Pending"}
                                  </Badge>
                                </div>
                                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-700">
                                  <p>Attempts: <span className="font-semibold">{row.attempts}</span></p>
                                  <p>Best: <span className="font-semibold">{row.bestScore ?? "-"}</span></p>
                                  <p>Last: <span className="font-semibold">{row.lastScore ?? "-"}</span></p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="destructive" className="w-full" onClick={logout}>Logout</Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <Tabs defaultValue="lesson" className="h-full flex flex-col">
              <TabsList className="mx-6 mt-4 grid w-fit grid-cols-4 bg-gray-100 dark:bg-slate-900">
                <TabsTrigger value="lesson" className="flex items-center gap-2 px-4 py-2">
                  <Book className="h-4 w-4" />
                  Lesson
                </TabsTrigger>
                <TabsTrigger value="example" className="flex items-center gap-2 px-4 py-2">
                  <Code className="h-4 w-4" />
                  Example
                </TabsTrigger>
                <TabsTrigger value="practice" className="flex items-center gap-2 px-4 py-2">
                  <Terminal className="h-4 w-4" />
                  Code Space
                </TabsTrigger>
                <TabsTrigger value="quiz" className="flex items-center gap-2 px-4 py-2">
                  <Trophy className="h-4 w-4" />
                  Quiz
                </TabsTrigger>
              </TabsList>

              {/* Lesson Content */}
              <TabsContent value="lesson" className="flex-1 overflow-y-auto p-6">
                <Card className="shadow-lg border-0">
                  <CardContent className="p-8">
                    <div 
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: currentLesson?.content || '' }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Code Example */}
              <TabsContent value="example" className="flex-1 overflow-hidden p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Code className="h-5 w-5 text-blue-600" />
                        Code Example
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <pre className="bg-gray-900 text-gray-100 p-6 rounded-b-lg overflow-x-auto text-sm leading-relaxed">
                        <code>{currentLesson?.codeExample}</code>
                      </pre>
                    </CardContent>
                  </Card>

                  <Card className="shadow-lg">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Play className="h-5 w-5 text-green-600" />
                        Interactive Editor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full h-40 p-4 border-2 border-gray-300 rounded-lg font-mono text-sm bg-gray-50 focus:border-blue-500 focus:outline-none"
                        placeholder="Write your Python code here..."
                      />
                      <Button 
                        onClick={runCode} 
                        disabled={isLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2"
                      >
                        {isLoading ? 'Running...' : 'Run Code'}
                      </Button>
                      <div className="bg-black text-green-400 p-4 rounded-lg h-32 overflow-y-auto font-mono text-sm">
                        <div className="text-gray-400 mb-2">Output:</div>
                        <pre className="whitespace-pre-wrap">{output}</pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Practice Code Space */}
              <TabsContent value="practice" className="flex-1 overflow-hidden p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  {/* Practice Exercises */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Trophy className="h-5 w-5 text-purple-600" />
                        Practice Exercises
                      </CardTitle>
                      <CardDescription className="text-gray-700">
                        Try these challenges to practice your skills
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 overflow-y-auto max-h-96">
                      {currentLesson?.practicePrograms.map((program, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <h3 className="font-semibold text-gray-800 mb-2">{program.title}</h3>
                          <p className="text-sm text-gray-600 mb-3">{program.description}</p>
                          <Button
                            onClick={() => loadPracticeExample(program.starterCode)}
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            Load Challenge
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Python Code Space */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Terminal className="h-5 w-5 text-green-600" />
                        Python Code Space
                      </CardTitle>
                      <CardDescription className="text-gray-700">
                        Write and run Python code with instant feedback
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <textarea
                        value={practiceCode}
                        onChange={(e) => setPracticeCode(e.target.value)}
                        className="w-full h-48 p-4 border-2 border-gray-300 rounded-lg font-mono text-sm bg-gray-50 focus:border-green-500 focus:outline-none resize-none"
                        placeholder="Write your Python code here..."
                      />
                      <Button 
                        onClick={runPracticeCode} 
                        disabled={isPracticeLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2"
                      >
                        {isPracticeLoading ? 'Running...' : 'Run Python Code'}
                      </Button>
                      <div className="bg-black text-green-400 p-4 rounded-lg h-40 overflow-y-auto font-mono text-sm">
                        <div className="text-gray-400 mb-2 flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          Console Output:
                        </div>
                        <pre className="whitespace-pre-wrap">{practiceOutput}</pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Quiz */}
              <TabsContent value="quiz" className="flex-1 overflow-y-auto p-6">
                <Card className="shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Trophy className="h-5 w-5 text-purple-600" />
                      Knowledge Check
                    </CardTitle>
                    <CardDescription className="text-gray-700 text-base">Test your understanding of {currentLesson?.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {activeQuiz.map((question, questionIndex) => (
                      <div key={questionIndex} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {questionIndex + 1}. {question.question}
                        </h3>
                        <div className="space-y-3">
                          {question.options.map((option, optionIndex) => {
                            const key = `${selectedLesson}-${questionIndex}`;
                            const isSelected = quizAnswers[key] === optionIndex;
                            const isCorrect = optionIndex === question.correct;
                            const showResult = quizResults[key] !== undefined;
                            
                            return (
                              <button
                                key={optionIndex}
                                onClick={() => handleQuizAnswer(questionIndex, optionIndex)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                                  showResult
                                    ? isCorrect
                                      ? 'bg-green-100 border-green-400 text-green-800'
                                      : isSelected
                                      ? 'bg-red-100 border-red-400 text-red-800'
                                      : 'bg-gray-50 border-gray-200'
                                    : isSelected
                                    ? 'bg-blue-100 border-blue-400 text-blue-800'
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected ? 'border-current bg-current' : 'border-gray-400'
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                  </div>
                                  {option}
                                  {showResult && isCorrect && (
                                    <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={submitQuiz}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
                        disabled={Object.keys(quizAnswers).filter(key => key.startsWith(selectedLesson)).length < (activeQuiz.length || 0)}
                      >
                        Submit Quiz
                      </Button>
                      
                      {Object.keys(quizResults).some(key => key.startsWith(selectedLesson)) && (
                        <div className="mt-4 text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-lg font-semibold text-blue-800">
                            Score: {Object.entries(quizResults)
                              .filter(([key]) => key.startsWith(selectedLesson))
                              .filter(([, correct]) => correct).length} / {activeQuiz.length}
                          </p>
                          {Object.entries(quizResults)
                            .filter(([key]) => key.startsWith(selectedLesson))
                            .filter(([, correct]) => correct).length === activeQuiz.length && (
                            <p className="text-green-600 font-medium mt-2">Perfect Score! Well done! 🎉</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
