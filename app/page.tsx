import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bot, BookOpen, UserCheck, GraduationCap, BarChart } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900">

      {/* Hero */}
      <main className="flex-1">
        <section className="relative py-32 px-6 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-100 via-white to-white"></div>
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold mb-4 border border-indigo-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              New: AI-Powered Insights Live
            </div>
            <h2 className="text-6xl md:text-7xl font-black tracking-tight leading-tight">
              Master Your Exams with <br />
              <span className="bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">Intelligent Testing</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              The all-in-one platform for conducting secure, scalable, and smart examinations.
              From instant results to deep performance analytics, we empower excellence.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all hover:scale-105">
                  Start Testing Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-slate-50">
                View Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h3 className="text-4xl font-bold mb-4">Everything You Need</h3>
              <p className="text-xl text-slate-500">A complete suite of tools built for modern education.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<BookOpen className="h-8 w-8 text-blue-600" />}
                title="Question Bank"
                desc="Upload thousands of questions instantly via CSV. Supports images, complex formulas, and multiple-choice formats."
              />
              <FeatureCard
                icon={<UserCheck className="h-8 w-8 text-green-600" />}
                title="Secure Exams"
                desc="Anti-cheat measures, timed windows, and randomized question sets ensure fair and rigorous testing environments."
              />
              <FeatureCard
                icon={<BarChart className="h-8 w-8 text-purple-600" />}
                title="Deep Analytics"
                desc="Go beyond scores. Analyze weak areas, track progress over time, and generate detailed PDF reports instantly."
              />
            </div>
          </div>
        </section>

        {/* AI Chatbot Spotlight */}
        <section id="ai" className="py-24 px-6 bg-white relative">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2 space-y-6">
              <div className="inline-block p-3 rounded-2xl bg-orange-100 text-orange-700 mb-2">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-4xl font-bold text-slate-900">Meet Your 24/7 AI Tutor</h3>
              <p className="text-lg text-slate-600 leading-relaxed">
                Stuck on a concept? Need help navigating the platform?
                Our built-in <span className="font-semibold text-indigo-600">Puruda AI Assistant</span> is always one click away via the floating chat button.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-700">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div> Instant answers to platform queries
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div> Guidance on creating better tests
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div> Helps students with test strategies
                </li>
              </ul>
            </div>
            <div className="md:w-1/2 bg-slate-100 rounded-3xl p-8 border border-slate-200 shadow-2xl skew-y-1">
              {/* Mock Chat UI */}
              <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center"><Bot className="h-5 w-5 text-indigo-600" /></div>
                  <div className="bg-slate-100 p-3 rounded-lg rounded-tl-none text-sm text-slate-700">Hello! accurate and efficient testing starts here. How can I help you today?</div>
                </div>
                <div className="flex gap-3 justify-end">
                  <div className="bg-indigo-600 p-3 rounded-lg rounded-tr-none text-sm text-white">How do I verify the test results?</div>
                  <div className="h-8 w-8 rounded-full bg-slate-200"></div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center"><Bot className="h-5 w-5 text-indigo-600" /></div>
                  <div className="bg-slate-100 p-3 rounded-lg rounded-tl-none text-sm text-slate-700">Go to the Analytics tab! You can see real-time leaderboards and individual breakdown reports there. 📊</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section id="roles" className="py-24 px-6 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <h3 className="text-3xl font-bold">Tailored for Every Role</h3>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h4 className="text-xl font-bold mb-2 text-blue-400">Students</h4>
                <p className="text-slate-400 text-sm">Access assigned tests, view result history, and download simplified progress reports.</p>
              </div>
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h4 className="text-xl font-bold mb-2 text-purple-400">Teachers</h4>
                <p className="text-slate-400 text-sm">Create batches, assign homework, and review class performance with a single glance.</p>
              </div>
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h4 className="text-xl font-bold mb-2 text-rose-400">Admins</h4>
                <p className="text-slate-400 text-sm">Full control over users, courses, and system settings. The command center of the platform.</p>
              </div>
            </div>
            <div className="pt-8 text-center">
              <p className="text-slate-400 mb-6 font-medium">Ready to transform your assessment process?</p>
              <Link href="/login">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-200 rounded-full px-10">Get Started Today</Button>
              </Link>
            </div>
          </div>
        </section>

      </main>

    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="mb-6">{icon}</div>
      <h4 className="text-xl font-bold mb-3 text-slate-900">{title}</h4>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  )
}
