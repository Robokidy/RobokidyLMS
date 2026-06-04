require("dotenv").config();
const connectDB = require("./config/db");
const User = require("./models/User");
const Lesson = require("./models/Lesson");
const Quiz = require("./models/Quiz");
const { ensureBaseCourses } = require("./utils/courses");
const { DEFAULT_FIRST_PASSWORD } = require("./utils/password");

const CTO_DEFAULT = {
  username: "cto",
  email: "cto@robokidy.com",
  password: "CtoRobokidy"
};

const topics = [
  "Python Introduction",
  "Python History",
  "Variables",
  "Data Types",
  "Operators",
  "Conditions",
  "Loops",
  "Functions"
];

const questionBank = {
  "Python Introduction": [
    { question: "What is Python?", options: ["A programming language", "A web browser", "An operating system", "A database"], correctAnswer: 0 },
    { question: "Python code is known for being:", options: ["Hard to read", "Beginner-friendly", "Only for experts", "Only for games"], correctAnswer: 1 },
    { question: "Which symbol is used to write comments in Python?", options: ["//", "<!-- -->", "#", "/* */"], correctAnswer: 2 },
    { question: "Which function prints output to the screen?", options: ["show()", "echo()", "display()", "print()"], correctAnswer: 3 },
    { question: "Python is commonly used for:", options: ["Web development", "Automation", "Data science", "All of the above"], correctAnswer: 3 }
  ],
  "Python History": [
    { question: "Who created Python?", options: ["James Gosling", "Guido van Rossum", "Dennis Ritchie", "Bjarne Stroustrup"], correctAnswer: 1 },
    { question: "Python was first released in:", options: ["1991", "1985", "2001", "2015"], correctAnswer: 0 },
    { question: "The name Python comes from:", options: ["A snake species", "A math formula", "Monty Python", "A city"], correctAnswer: 2 },
    { question: "Python 3.0 was introduced in:", options: ["1998", "2008", "2018", "2023"], correctAnswer: 1 },
    { question: "Python became popular mainly because it is:", options: ["Verbose", "Complex", "Readable and versatile", "Only for AI"], correctAnswer: 2 }
  ],
  "Variables": [
    { question: "A variable in Python is used to:", options: ["Store data", "Compile code", "Draw UI", "Connect internet"], correctAnswer: 0 },
    { question: "Which is a valid variable name?", options: ["2name", "user-name", "user_name", "class"], correctAnswer: 2 },
    { question: "Python variable names are:", options: ["Case-sensitive", "Always uppercase", "Always numbers", "Fixed length"], correctAnswer: 0 },
    { question: "What does '=' do in 'x = 10'?", options: ["Compares values", "Assigns value", "Deletes value", "Prints value"], correctAnswer: 1 },
    { question: "Which variable name is best practice?", options: ["a", "x1", "student_score", "zzz"], correctAnswer: 2 }
  ],
  "Data Types": [
    { question: "Which data type stores text?", options: ["int", "str", "float", "bool"], correctAnswer: 1 },
    { question: "Which data type stores decimal numbers?", options: ["float", "str", "list", "bool"], correctAnswer: 0 },
    { question: "What is the type of True in Python?", options: ["int", "float", "bool", "str"], correctAnswer: 2 },
    { question: "Which type is used for whole numbers?", options: ["int", "str", "dict", "tuple"], correctAnswer: 0 },
    { question: "What is the type of [1, 2, 3]?", options: ["set", "tuple", "list", "dict"], correctAnswer: 2 }
  ],
  "Operators": [
    { question: "Which operator is used for addition?", options: ["*", "+", "%", "="], correctAnswer: 1 },
    { question: "What does '%' return?", options: ["Power", "Division result", "Remainder", "Absolute value"], correctAnswer: 2 },
    { question: "Which is a comparison operator?", options: ["+=", "==", "//", "**"], correctAnswer: 1 },
    { question: "What is the result of 10 // 3?", options: ["3", "3.33", "1", "0"], correctAnswer: 0 },
    { question: "Which operator checks 'not equal'?", options: ["<>", "!==", "!=", "=/="], correctAnswer: 2 }
  ],
  "Conditions": [
    { question: "Which keyword starts a condition in Python?", options: ["for", "if", "def", "while"], correctAnswer: 1 },
    { question: "Which keyword is used for another condition check?", options: ["elseif", "else if", "elif", "then"], correctAnswer: 2 },
    { question: "Which block runs when all conditions fail?", options: ["default", "none", "else", "except"], correctAnswer: 2 },
    { question: "What is indentation used for in condition blocks?", options: ["Decoration", "Grouping code", "Comments", "Imports"], correctAnswer: 1 },
    { question: "Which is a valid condition?", options: ["if x > 5:", "if x > 5 then", "if (x > 5)", "if x > 5 {}"], correctAnswer: 0 }
  ],
  "Loops": [
    { question: "Which loop is commonly used to iterate over a list?", options: ["while", "for", "do-while", "repeat"], correctAnswer: 1 },
    { question: "Which keyword exits a loop immediately?", options: ["skip", "break", "stop", "exit"], correctAnswer: 1 },
    { question: "Which keyword skips current iteration?", options: ["continue", "next", "pass", "return"], correctAnswer: 0 },
    { question: "A while loop runs while:", options: ["Condition is False", "Condition is True", "List exists", "Function returns"], correctAnswer: 1 },
    { question: "range(5) produces numbers:", options: ["1 to 5", "0 to 5", "0 to 4", "5 to 0"], correctAnswer: 2 }
  ],
  "Functions": [
    { question: "Which keyword is used to define a function?", options: ["function", "def", "fun", "lambda"], correctAnswer: 1 },
    { question: "What is a function parameter?", options: ["A return value", "Input to function", "Loop variable", "A comment"], correctAnswer: 1 },
    { question: "Which keyword sends a value back from a function?", options: ["print", "yield", "return", "send"], correctAnswer: 2 },
    { question: "What does a function help with?", options: ["Code duplication", "Code reuse", "Syntax errors", "Slower execution"], correctAnswer: 1 },
    { question: "What happens if no return is written?", options: ["Error", "Returns 0", "Returns None", "Returns empty string"], correctAnswer: 2 }
  ]
};

const mkQuestions = (topic) => questionBank[topic] || [];

(async () => {
  await connectDB();

  const adminUsername = (process.env.ADMIN_USERNAME || "teacher").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_FIRST_PASSWORD;

  let admin = await User.findOne({ role: "admin" });
  if (!admin) {
    admin = await User.create({ username: adminUsername, password: adminPassword, role: "admin", firstLogin: true });
    console.log("Admin created");
  } else {
    admin.username = adminUsername;
    admin.password = adminPassword;
    admin.firstLogin = true;
    await admin.save();
    console.log("Admin updated");
  }

  let cto = await User.findOne({ role: "cto" });
  if (!cto) {
    cto = await User.create({
      username: CTO_DEFAULT.username,
      email: CTO_DEFAULT.email,
      password: CTO_DEFAULT.password,
      role: "cto",
      active: true,
      firstLogin: true,
      fullName: "Chief Technology Officer"
    });
    console.log("CTO created");
  } else {
    cto.username = CTO_DEFAULT.username;
    cto.email = CTO_DEFAULT.email;
    cto.password = CTO_DEFAULT.password;
    cto.active = true;
    cto.firstLogin = true;
    cto.fullName = cto.fullName || "Chief Technology Officer";
    await cto.save();
    console.log("CTO updated");
  }

  const courses = await ensureBaseCourses();
  const pythonCourse = courses.find((course) => course.slug === "python");

  for (const topic of topics) {
    let lesson = await Lesson.findOne({ title: topic });
    if (!lesson) {
      lesson = await Lesson.create({
        title: topic,
        courseId: pythonCourse?._id,
        content: `${topic} explained in a beginner-friendly way with real-life analogy and examples.`,
        createdBy: admin._id,
        examples: [
          { code: `print(\"${topic}\")`, output: topic, explanation: `Basic ${topic} output example` }
        ]
      });
    } else if (!lesson.courseId && pythonCourse) {
      lesson.courseId = pythonCourse._id;
      if (!lesson.createdBy) lesson.createdBy = admin._id;
      await lesson.save();
    }

    const questions = mkQuestions(topic);
    const quiz = await Quiz.findOne({ lessonId: lesson._id });
    if (!quiz) {
      await Quiz.create({
        title: `${topic} Quiz`,
        lessonId: lesson._id,
        courseId: pythonCourse?._id,
        questions,
        createdBy: admin._id
      });
    } else {
      quiz.title = quiz.title || `${topic} Quiz`;
      quiz.courseId = quiz.courseId || pythonCourse?._id;
      quiz.createdBy = quiz.createdBy || admin._id;
      quiz.questions = questions;
      await quiz.save();
    }
  }

  console.log("Seeding complete");
  process.exit(0);
})();
