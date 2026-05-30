import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { aiRecommendations, legoEcosystem, projectHub, rankLadder } from "@/data/stemEcosystem";
import { Award, Bot, CalendarDays, Flame, Lock, Sparkles, Star, Trophy, Upload } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

const skillData = [
  { skill: "Coding", value: 82 },
  { skill: "Robotics", value: 68 },
  { skill: "AI", value: 45 },
  { skill: "Electronics", value: 58 },
  { skill: "Design", value: 51 },
  { skill: "Teamwork", value: 74 }
];

const activity = [80, 40, 70, 95, 55, 30, 88, 60, 92, 76, 44, 69, 90, 64, 38, 73, 84, 57];

export default function StemEcosystemPanel() {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="overflow-hidden border-0 bg-slate-950 text-white shadow-2xl">
          <CardContent className="relative p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.22),transparent_32%)]" />
            <div className="relative grid gap-5 lg:grid-cols-[1fr_220px]">
              <div>
                <Badge className="mb-4 bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/20">
                  Robokidy Innovative Centre
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight">STEM Mission Control</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Continue the current lesson flow while unlocking robotics builds, AI labs, certificates, competitions, and portfolio-ready projects.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    ["1,840", "XP earned"],
                    ["12 days", "Daily streak"],
                    ["7", "Projects shipped"]
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-3 backdrop-blur">
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-slate-300">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid place-items-center">
                <div className="relative h-44 w-44 rounded-full bg conic-gradient-stem p-3">
                  <div className="grid h-full w-full place-items-center rounded-full bg-slate-950 text-center">
                    <Trophy className="mx-auto h-8 w-8 text-amber-300" />
                    <p className="mt-2 text-3xl font-bold">78%</p>
                    <p className="text-xs text-slate-300">Track completion</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-100/70 bg-white/80 shadow-lg backdrop-blur dark:bg-slate-950/70 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-cyan-600" />
              AI Learning Coach
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiRecommendations.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-lg border bg-white/70 p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900/60">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-cyan-600" />
                    <p className="font-semibold">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>LEGO Robotics Learning Ecosystem</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {legoEcosystem.map((category) => (
              <div key={category.category} className="rounded-lg border p-4 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{category.category}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Lessons, projects, quizzes, build challenges, simulations, and assessments</p>
                  </div>
                  <Badge variant="secondary">{category.lessons.length} labs</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {category.levels.map((level) => <Badge key={level} variant="outline">{level}</Badge>)}
                </div>
                <div className="mt-3 grid gap-2">
                  {category.lessons.slice(0, 3).map((lesson, index) => (
                    <div key={lesson} className="flex items-center gap-2 text-sm">
                      {index < 2 ? <Star className="h-3.5 w-3.5 text-amber-500" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span>{lesson}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Skill Radar</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <Radar dataKey="value" stroke="#0891b2" fill="#06b6d4" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>STEM Projects Hub</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {projectHub.map((project) => (
              <div key={project.title} className="overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:bg-slate-950">
                <div className={`h-24 bg-gradient-to-br ${project.accent} grid place-items-center text-white`}>
                  <Sparkles className="h-9 w-9" />
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-tight">{project.title}</p>
                    <Badge variant="outline">{project.difficulty}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{project.category} - {project.time}</p>
                  <p className="text-xs leading-5 text-muted-foreground">{project.components}</p>
                  <div className="flex items-center gap-2 text-xs font-medium text-cyan-700">
                    <Upload className="h-3.5 w-3.5" />
                    Submission ready
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Gamification & Portfolio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                [Flame, "12", "Day streak"],
                [Award, "16", "Badges"],
                [CalendarDays, "92%", "Attendance"],
                [Trophy, "#4", "Weekly rank"]
              ].map(([Icon, value, label]) => {
                const TypedIcon = Icon as typeof Flame;
                return (
                  <div key={String(label)} className="rounded-lg border p-3">
                    <TypedIcon className="h-4 w-4 text-cyan-600" />
                    <p className="mt-2 text-2xl font-bold">{String(value)}</p>
                    <p className="text-xs text-muted-foreground">{String(label)}</p>
                  </div>
                );
              })}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Rank pathway</p>
              <div className="space-y-2">
                {rankLadder.map((rank, index) => (
                  <div key={rank} className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${index <= 2 ? "bg-cyan-500" : "bg-slate-200"}`} />
                    <span className="text-sm">{rank}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Weekly activity heatmap</p>
              <div className="grid grid-cols-9 gap-1">
                {activity.map((value, index) => (
                  <div
                    key={index}
                    className="h-7 rounded"
                    style={{ backgroundColor: `rgba(8, 145, 178, ${Math.max(0.16, value / 100)})` }}
                    title={`${value}% active`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
