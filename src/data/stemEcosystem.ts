import {
  AppWindow,
  Bot,
  Box,
  BrainCircuit,
  CircuitBoard,
  Code,
  Cpu,
  Globe2,
  Hammer,
  Lightbulb,
  Medal,
  Plane,
  RadioTower,
  Trophy,
  Users,
  Wrench
} from "lucide-react";

export const rankLadder = [
  "Beginner Builder",
  "Junior Innovator",
  "Robotics Explorer",
  "AI Creator",
  "STEM Champion",
  "Innovation Master"
];

export const learningTracks = [
  {
    title: "Dashboard",
    icon: Trophy,
    progress: 78,
    lessons: 12,
    locked: false,
    modules: ["Mission Control", "Daily Streak", "Recommended Next"]
  },
  {
    title: "LEGO Robotics",
    icon: Bot,
    progress: 64,
    lessons: 48,
    locked: false,
    modules: ["LEGO Essential 2.0", "LEGO WeDo", "LEGO Spike Prime", "LEGO Mindstorms", "LEGO Advanced Robotics"]
  },
  {
    title: "Arduino",
    icon: CircuitBoard,
    progress: 38,
    lessons: 30,
    locked: false,
    modules: ["Boards & Pins", "Sensors", "Motors", "Smart Projects"]
  },
  {
    title: "Python Programming",
    icon: Code,
    progress: 72,
    lessons: 36,
    locked: false,
    modules: ["Foundations", "Loops", "Functions", "Games", "Automation"]
  },
  {
    title: "AI & Machine Learning",
    icon: BrainCircuit,
    progress: 22,
    lessons: 28,
    locked: false,
    modules: ["AI Basics", "Data", "Computer Vision", "Prompt Labs"]
  },
  {
    title: "IoT Systems",
    icon: RadioTower,
    progress: 18,
    lessons: 24,
    locked: false,
    modules: ["Cloud Sensors", "Smart Home", "Dashboards", "Alerts"]
  },
  {
    title: "Tinkercad",
    icon: Box,
    progress: 45,
    lessons: 18,
    locked: false,
    modules: ["Circuit Design", "Simulation", "Arduino Blocks"]
  },
  {
    title: "Web Development",
    icon: Globe2,
    progress: 14,
    lessons: 32,
    locked: false,
    modules: ["HTML", "CSS", "JavaScript", "Portfolio Sites"]
  },
  {
    title: "Electronics",
    icon: Cpu,
    progress: 31,
    lessons: 26,
    locked: false,
    modules: ["Components", "Breadboards", "Circuits", "Troubleshooting"]
  },
  {
    title: "App Development",
    icon: AppWindow,
    progress: 8,
    lessons: 22,
    locked: true,
    modules: ["UI Basics", "App Logic", "Publishing"]
  },
  {
    title: "3D Design & Printing",
    icon: Box,
    progress: 12,
    lessons: 20,
    locked: false,
    modules: ["CAD Basics", "Robot Parts", "Print Prep"]
  },
  {
    title: "Drone Technology",
    icon: Plane,
    progress: 0,
    lessons: 16,
    locked: true,
    modules: ["Flight Basics", "Sensors", "Safety Missions"]
  },
  {
    title: "Automation Projects",
    icon: Wrench,
    progress: 27,
    lessons: 18,
    locked: false,
    modules: ["Home Automation", "Timers", "Robotic Arms"]
  },
  {
    title: "Competitions",
    icon: Medal,
    progress: 55,
    lessons: 10,
    locked: false,
    modules: ["Hackathons", "Robotics League", "Coding Contests"]
  },
  {
    title: "Certifications",
    icon: Trophy,
    progress: 40,
    lessons: 8,
    locked: false,
    modules: ["Python Explorer", "LEGO Builder", "AI Starter"]
  },
  {
    title: "Student Portfolio",
    icon: Hammer,
    progress: 68,
    lessons: 6,
    locked: false,
    modules: ["Projects", "Badges", "Videos", "Certificates"]
  },
  {
    title: "Leaderboard",
    icon: Trophy,
    progress: 80,
    lessons: 5,
    locked: false,
    modules: ["Weekly XP", "Team Rankings", "Challenge Winners"]
  },
  {
    title: "Community Hub",
    icon: Users,
    progress: 34,
    lessons: 12,
    locked: false,
    modules: ["Clubs", "Showcase", "Mentor Notes"]
  }
];

export const legoEcosystem = [
  {
    category: "LEGO Essential 2.0",
    levels: ["Beginner Level", "Intermediate Level", "Advanced Level"],
    lessons: ["Simple machines", "Story builds", "Motion experiments", "Team design challenge"]
  },
  {
    category: "LEGO WeDo",
    levels: ["Beginner Level", "Intermediate Level", "Advanced Level"],
    lessons: ["Motors and movement", "Tilt sensor", "Pulling robot", "Science fair build"]
  },
  {
    category: "LEGO Spike Prime",
    levels: ["Beginner Level", "Intermediate Level", "Advanced Level"],
    lessons: ["Introduction to sensors", "Motors and movement", "Line follower robot", "Obstacle avoidance robot", "Smart AI robot"]
  },
  {
    category: "LEGO Mindstorms",
    levels: ["Beginner Level", "Intermediate Level", "Advanced Level"],
    lessons: ["Drive base", "Gyro turns", "Mission strategy", "Autonomous navigation"]
  },
  {
    category: "LEGO Advanced Robotics",
    levels: ["Beginner Level", "Intermediate Level", "Advanced Level"],
    lessons: ["Robot simulations", "Sensor fusion", "Competition design", "AI-assisted robot"]
  }
];

export const projectHub = [
  {
    title: "Line Follower Robot",
    category: "Robotics",
    difficulty: "Intermediate",
    time: "2 hrs",
    components: "Spike Prime hub, color sensor, motors",
    accent: "from-emerald-500 to-cyan-500"
  },
  {
    title: "AI Hand Gesture Game",
    category: "Computer Vision",
    difficulty: "Advanced",
    time: "3 hrs",
    components: "Python, webcam, ML model",
    accent: "from-fuchsia-500 to-rose-500"
  },
  {
    title: "Smart Home Alert",
    category: "IoT",
    difficulty: "Beginner",
    time: "90 min",
    components: "Arduino, buzzer, sensor, dashboard",
    accent: "from-amber-500 to-lime-500"
  }
];

export const aiRecommendations = [
  {
    title: "Weak topic detected",
    detail: "Loops need one revision sprint. Try a 5-question mini quiz and the LED pattern project.",
    icon: Lightbulb
  },
  {
    title: "Next best lesson",
    detail: "Move from Python conditions into Arduino sensor logic to connect code with hardware.",
    icon: BrainCircuit
  },
  {
    title: "AI tutor prompt",
    detail: "Ask: Explain line follower logic like I am building it with LEGO Spike Prime.",
    icon: Bot
  }
];

export const adminCapabilityMap = [
  "Create Track",
  "Create Module",
  "Create Lesson",
  "Add Projects",
  "Add Quizzes",
  "Add XP Rewards",
  "Add Certificates",
  "Upload Resources",
  "Set Difficulty",
  "Set Prerequisites"
];
