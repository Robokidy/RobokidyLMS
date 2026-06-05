import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft, ChevronRight, Eye, EyeOff, Lock, Menu, Rocket, Sparkles, Trophy, User, X } from "lucide-react";
import { apiFetch } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const courses = [
  { name: "LEGO Essentials", icon: "🧱", image: "/legoessential.png", color: "#00D4AA", tagline: "Build your first engineering ideas with colorful bricks.", why: "Learn to think like an engineer. LEGO Essentials teaches you how to build structures, understand basic mechanics, and solve real-world problems while having a blast.", fact: "LEGO bricks are so precise, only 18 in a billion are rejected for quality." },
  { name: "LEGO WeDo 2.0", icon: "⚙️", image: "/legowedo.png", color: "#FF6B35", tagline: "Make your LEGO creations move with simple coding.", why: "WeDo 2.0 lets you build robots and control them with a computer using simple drag-and-drop programming. You will build working models like a soccer robot or science rover.", fact: "WeDo robots can sense movement, tilt, and even sound." },
  { name: "LEGO Spike Prime", icon: "🚀", image: "/legospikeprime.png", color: "#FFD700", tagline: "Advanced robotics with sensors, motors, and code.", why: "Spike Prime takes robotics to the next level with sensors, motors, and Python or block coding. Build advanced robots that react to the world around them.", fact: "LEGO Spike Prime is used in World Robot Olympiad competitions." },
  { name: "Python Programming", icon: "🐍", image: "/python.png", color: "#7B2FBE", tagline: "Create games, tools, websites, and AI experiments.", why: "Python is used by NASA, Google, and Netflix. Learning it gives you coding superpowers for games, automation, websites, and AI.", fact: "Python was named after Monty Python's Flying Circus, not the snake." },
  { name: "Scratch Coding", icon: "🐱", image: "/scartch.png", color: "#FF6B35", tagline: "Make your own games, stories, and animations.", why: "Scratch is the perfect first coding language. Colorful drag-and-drop blocks help you build games, stories, and animations while learning real programming thinking.", fact: "Scratch was created at MIT and is used by kids worldwide." },
  { name: "TinkerCAD Design", icon: "🛠️", image: "/tinkercad.png", color: "#00D4AA", tagline: "Design 3D objects that can become real things.", why: "TinkerCAD lets you design objects in 3D on your computer. From robot parts to creative models, your imagination becomes something you can build.", fact: "TinkerCAD is used by professional engineers and architects." }
];

const stats = [
  ["500+", "Students", "🎓"],
  ["6", "Courses", "📚"],
  ["10+", "Partner Schools", "🏫"],
  ["1000+", "Lessons Completed", "🌟"]
];

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [typed, setTyped] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const headline = "Where Young Innovators Are Born! 🚀";
  const tips = useMemo(() => [
    "Try coding for just 20 minutes a day - it changes everything!",
    "Build. Break. Learn. Repeat. That is how inventors grow.",
    "Python today, AI tomorrow. Your future starts with one lesson."
  ], []);

  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(headline.slice(0, index));
      if (index >= headline.length) window.clearInterval(timer);
    }, 55);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % courses.length), 3500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTipIndex((current) => (current + 1) % tips.length), 4200);
    return () => window.clearInterval(timer);
  }, [tips.length]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      setAuth(data.token, data.user);
      if (data.user.firstLogin) return navigate("/change-password");
      if (data.user.role === "admin") return navigate("/admin");
      if (data.user.role === "cto") return navigate("/cto");
      if (data.user.role === "cmo") return navigate("/cmo");
      if (data.user.role === "teacher") return navigate("/teacher");
      navigate("/student");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF] text-[#0D0D2B]" style={{ fontFamily: "'Poppins', sans-serif", backgroundImage: "linear-gradient(rgba(240,244,255,0.92), rgba(240,244,255,0.96)), url('/background.png')" }}>
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 rgba(255,107,53,0); } 50% { box-shadow: 0 0 28px rgba(255,107,53,.45); } }
        .rk-heading { font-family: 'Nunito', sans-serif; }
        .rk-number { font-family: 'Fredoka', sans-serif; }
        .rk-cta { background-size: 220% auto; animation: shimmer 5s linear infinite; }
        .rk-circuit { background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.22) 1px, transparent 0); background-size: 28px 28px; }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => goTo("home")} className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]" aria-label="RoboKidy home">
            <img src="/logo.png" alt="RoboKidy logo" className="h-12 w-auto transition-transform duration-500 hover:rotate-[360deg]" />
            <span className="rk-heading hidden text-xl font-black text-[#1A1F5E] sm:block">RoboKidy</span>
          </button>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#1A1F5E] md:flex">
            {["Home", "Courses", "Why RoboKidy?", "Contact"].map((item) => (
              <button key={item} onClick={() => goTo(item === "Why RoboKidy?" ? "why" : item.toLowerCase())} className="border-b-2 border-transparent py-2 hover:border-[#FFD700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]">{item}</button>
            ))}
          </nav>
          <div className="hidden md:block">
            <Button onClick={() => goTo("login")} className="rounded-full bg-[#FF6B35] px-6 text-white hover:bg-[#e85b27]">Login</Button>
          </div>
          <button className="rounded-md p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t bg-white px-4 py-4 md:hidden">
            {["Home", "Courses", "Why RoboKidy?", "Contact"].map((item) => (
              <button key={item} onClick={() => goTo(item === "Why RoboKidy?" ? "why" : item.toLowerCase())} className="block w-full rounded-md px-3 py-3 text-left font-semibold text-[#1A1F5E] hover:bg-[#F0F4FF]">{item}</button>
            ))}
          </div>
        )}
      </header>

      <main>
        <section id="home" className="relative overflow-hidden bg-[linear-gradient(135deg,#1A1F5E_0%,#2D3A8C_50%,#7B2FBE_100%)] text-white">
          <div className="rk-circuit absolute inset-0 opacity-60" />
          <div className="absolute left-[8%] top-24 text-3xl opacity-70 animate-[floaty_5s_ease-in-out_infinite]">🤖</div>
          <div className="absolute right-[12%] top-32 text-3xl opacity-70 animate-[floaty_4.5s_ease-in-out_infinite]">🐍</div>
          <div className="absolute bottom-24 left-[35%] text-3xl opacity-70 animate-[floaty_6s_ease-in-out_infinite]">💡</div>
          <div className="relative mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
              <p className="mb-4 inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">Robotics, Coding & STEM for Grades 3-8</p>
              <h1 className="rk-heading min-h-[120px] text-[clamp(2.5rem,7vw,5.8rem)] font-black leading-[0.95] tracking-normal">
                {typed}<span className="text-[#FFD700]">|</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85">Learn Robotics, Python, Scratch and more - made fun for students from Grade 3 to Grade 8.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => goTo("login")} className="rk-cta h-12 rounded-full bg-[linear-gradient(90deg,#FFD700,#FF6B35,#FFD700)] px-7 font-bold text-[#0D0D2B] hover:scale-[1.04]">Start Learning →</Button>
                <Button onClick={() => goTo("courses")} variant="outline" className="h-12 rounded-full border-white/50 bg-white/10 px-7 font-bold text-white hover:bg-white hover:text-[#1A1F5E]">Explore Courses</Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold">
                {["⭐ 500+ Students", "🏫 10+ Schools", "🎓 6 Exciting Courses"].map((badge) => <span key={badge} className="rounded-full bg-white/12 px-4 py-2 backdrop-blur">{badge}</span>)}
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl animate-[floaty_4s_ease-in-out_infinite]">
              <div className="absolute inset-6 rounded-full bg-[#FFD700]/25 blur-3xl" />
              <img src="/legospikeprime.png" alt="RoboKidy robotics course kit" className="relative aspect-square w-full rounded-[2rem] object-cover shadow-2xl ring-8 ring-white/15" />
            </div>
          </div>
        </section>

        <section id="courses" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="rk-heading text-4xl font-black text-[#1A1F5E]">✨ Our Amazing Courses - Pick Your Adventure!</h2>
              <p className="mt-2 text-[#5A6075]">Swipe, click, explore, and choose what you want to build next.</p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <Button variant="outline" size="icon" onClick={() => setSlide((slide - 1 + courses.length) % courses.length)} aria-label="Previous course"><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => setSlide((slide + 1) % courses.length)} aria-label="Next course"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {courses.map((course) => (
                <div key={course.name} className="min-w-full px-1">
                  <Card className="overflow-hidden rounded-2xl border-0 shadow-xl">
                    <div className="grid lg:grid-cols-2">
                      <img src={course.image} alt={`${course.name} course`} className="h-80 w-full object-cover lg:h-[420px]" />
                      <CardContent className="flex flex-col justify-center p-8 lg:p-12">
                        <span className="mb-4 w-fit rounded-full px-4 py-2 text-sm font-bold text-white" style={{ backgroundColor: course.color }}>{course.name} {course.icon}</span>
                        <h3 className="rk-heading text-4xl font-black text-[#1A1F5E]">{course.tagline}</h3>
                        <p className="mt-4 text-[#5A6075]">{course.why}</p>
                        <Button className="mt-6 w-fit rounded-full bg-[#1A1F5E] px-6 hover:bg-[#2D3A8C]">Learn More →</Button>
                      </CardContent>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex justify-center gap-2">
            {courses.map((course, index) => <button key={course.name} onClick={() => setSlide(index)} className={`h-3 rounded-full transition-all ${slide === index ? "w-9 bg-[#FF6B35]" : "w-3 bg-[#1A1F5E]/25"}`} aria-label={`Show ${course.name}`} />)}
          </div>
        </section>

        <section id="why" className="bg-white/80 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="rk-heading text-center text-4xl font-black text-[#1A1F5E]">🌟 Why These Courses Are a Game-Changer for You!</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {courses.map((course) => (
                <Card key={course.name} className="rounded-2xl border-0 shadow-md transition-all hover:-translate-y-2 hover:shadow-xl" style={{ borderLeft: `6px solid ${course.color}` }}>
                  <CardContent className="flex gap-4 p-5">
                    <img src={course.image} alt={`${course.name} thumbnail`} className="h-20 w-20 rounded-full object-cover" />
                    <div>
                      <h3 className="rk-heading text-xl font-black text-[#1A1F5E]">{course.icon} {course.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#5A6075]">{course.why}</p>
                      <p className="mt-3 rounded-full bg-[#F0F4FF] px-3 py-2 text-xs font-semibold text-[#1A1F5E]">🎯 Fun Fact: {course.fact}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="login" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl bg-[#1A1F5E] p-8 text-white shadow-xl">
            <Rocket className="h-12 w-12 text-[#FFD700]" />
            <h2 className="rk-heading mt-5 text-4xl font-black">Your next lesson is waiting! 🎓</h2>
            <p className="mt-4 text-white/80">Join 500+ young innovators already learning robotics, coding, and creative STEM skills.</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[BookOpen, Sparkles, Trophy].map((Icon, index) => <div key={index} className="grid h-24 place-items-center rounded-xl bg-white/10"><Icon className="h-8 w-8 text-[#FFD700]" /></div>)}
            </div>
          </div>

          <Card className="rounded-2xl border-0 bg-white/95 shadow-2xl">
            <CardHeader>
              <CardTitle className="rk-heading text-4xl font-black text-[#1A1F5E]">Welcome Back, Explorer! 🚀</CardTitle>
              <p className="text-sm text-[#5A6075]">Login & Continue Your Learning Journey</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-semibold">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6075]" />
                    <Input id="username" className="h-12 rounded-xl pl-9" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6075]" />
                    <Input id="password" type={showPassword ? "text" : "password"} className="h-12 rounded-xl px-9" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6075]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  </div>
                </div>
                {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <Button className="rk-cta h-12 w-full rounded-xl bg-[linear-gradient(90deg,#7B2FBE,#FF6B35,#FFD700)] font-bold text-white hover:scale-[1.02]" style={{ animation: "pulseGlow 3s ease-in-out infinite" }}>Login & Start Learning →</Button>
                <button type="button" className="text-sm font-semibold text-[#7B2FBE]">Forgotten password?</button>
                <p className="rounded-xl bg-[#F0F4FF] px-4 py-3 text-sm text-[#1A1F5E]">Tip: {tips[tipIndex]}</p>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="grid gap-4 md:grid-cols-4">
            {stats.map(([value, label, icon]) => (
              <Card key={label} className="rounded-2xl border-0 border-t-4 border-t-[#FF6B35] text-center shadow-lg">
                <CardContent className="p-6">
                  <p className="text-3xl">{icon}</p>
                  <p className="rk-number mt-2 text-4xl font-bold text-[#1A1F5E]">{value}</p>
                  <p className="font-semibold text-[#5A6075]">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="overflow-hidden bg-[#FFD700] py-4 text-[#1A1F5E]">
          <div className="flex w-[200%] animate-[marquee_22s_linear_infinite] gap-10 whitespace-nowrap font-bold">
            {Array.from({ length: 2 }).flatMap((_, group) => ["🚀 The best time to start coding is NOW!", "🤖 Every expert was once a beginner. Keep going!", "🧱 Build. Break. Learn. Repeat.", "🐍 Python today, AI tomorrow!", "🎯 You are learning to THINK!"].map((quote) => <span key={`${group}-${quote}`}>{quote}</span>))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="rk-heading text-center text-4xl font-black text-[#1A1F5E]">Getting Started is Super Easy! 🎉</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[["1", "Login 🔐", "Use your RoboKidy account to enter your learning dashboard."], ["2", "Pick Your Course 📚", "Choose robotics, Python, Scratch, TinkerCAD, or STEM lessons."], ["3", "Learn & Earn Badges 🏅", "Complete lessons, attempt quizzes, and grow every week."]].map(([step, title, text]) => (
              <Card key={step} className="rounded-2xl border-0 text-center shadow-md">
                <CardContent className="p-7">
                  <span className="rk-number mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#1A1F5E] text-2xl text-white">{step}</span>
                  <h3 className="rk-heading mt-4 text-2xl font-black text-[#1A1F5E]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#5A6075]">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-[#1A1F5E] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div>
              <img src="/logo.png" alt="RoboKidy logo" className="h-14 w-auto rounded-md bg-white p-1" />
              <p className="mt-4 max-w-md text-white/75">RoboKidy Innovative Centre - Empowering Young Minds Through STEM</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div><p className="font-bold">Courses</p><p className="mt-2 text-sm text-white/70">Python | Scratch | LEGO WeDo | LEGO Spike | TinkerCAD | Arduino</p></div>
              <div><p className="font-bold">Links</p><p className="mt-2 text-sm text-white/70">About | Contact | Privacy Policy</p></div>
            </div>
          </div>
          <p className="mt-8 border-t border-white/15 pt-5 text-sm text-white/60">© 2026 RoboKidy. Made with care for curious young minds.</p>
        </div>
      </footer>
    </div>
  );
}
