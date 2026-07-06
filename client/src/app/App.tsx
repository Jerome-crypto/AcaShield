import { useState, useRef, useCallback, useEffect } from "react";
import { authLogin, authRegister, authLogout, authGetMe, getCurrentUser, getUserInitials, getUserDisplayName, authForgotPassword, authResetPassword, type AuthUser } from "../lib/auth";
import {
  fetchStudentDashboard, fetchStudentProjects, fetchStudentReports,
  fetchSupervisorDashboard, fetchReviewQueue, fetchSupervisorStudents,
  fetchProjects, fetchRepositoryProjects, searchRepository, fetchRepositoryFilters,
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  fetchUsers, createUser, updateUser, deleteUser, updateUserStatus,
  fetchSettings, updateSettings, fetchAuditLogs,
  fetchReportsDashboard, fetchSubmissionTrends, fetchSimilarityTrends,
  fetchRepositoryGrowth, fetchDepartmentPerformance,
  uploadProjectDocument, submitProject, resubmitProject, createProject,
  approveProject, requestRevision, rejectProject,
  fetchSimilarityReport, fetchSimilarityMatches, runSimilarityCheck,
  fetchProjectVersions, fetchReviewHistory, fetchSupervisorProject,
  fetchDepartments, fetchProgrammes, fetchSupervisors,
  getRepositoryDownloadUrl,
} from "../lib/storage";
import {
  Shield, BookOpen, Search, Upload, FileText, Bell, User, Settings,
  BarChart2, Users, LogOut, ChevronRight, ChevronDown, Check, X,
  Home, Folder, Archive, Eye, Download, Plus, Filter, ArrowUpRight,
  Menu, Star, HelpCircle, Mail, Clock, TrendingUp, Database, Lock,
  Globe, Zap, Award, CheckCircle, XCircle, AlertCircle, Send,
  Trash2, MoreHorizontal, GraduationCap, Activity, RefreshCw,
  ChevronUp, Layers, BookMarked, Building2, ExternalLink, Edit2,
  AlertTriangle, Info, FileCheck, Cpu, Hash
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type View = "landing" | "login" | "register" | "student" | "supervisor" | "admin" | "forgot-password" | "reset-password";
type StudentTab = "dashboard" | "upload" | "projects" | "repository" | "reports" | "notifications" | "profile";
type SupervisorTab = "dashboard" | "reviews" | "students" | "analytics";
type AdminTab = "dashboard" | "users" | "repository" | "engine" | "reports" | "settings";

// ─── Static Content (Marketing / Landing Page) ────────────────────────────────

const faqs = [
  { q: "How does AcaShield detect plagiarism?", a: "AcaShield uses advanced NLP algorithms to compare submitted projects against our local institutional archive and detect textual similarity. It produces an originality score and highlights matching sections with matched sources." },
  { q: "What file formats are supported for submission?", a: "AcaShield currently supports PDF and DOCX formats. Files up to 50MB are accepted. All submitted documents are securely stored and encrypted at rest." },
  { q: "Can students see their similarity reports immediately?", a: "Similarity reports are generated within minutes of submission. Students are notified via email and in-app when their report is ready for viewing." },
  { q: "How is institutional data protected?", a: "All data is encrypted in transit (TLS 1.3) and at rest (AES-256). AcaShield is hosted on compliant cloud infrastructure with regular security audits and access logging." },
  { q: "Can multiple universities use the same platform?", a: "Yes. AcaShield supports multi-tenant deployment. Each institution maintains a completely isolated repository with separate user management, branding, and settings." },
];

const testimonials = [
  { name: "Prof. Amina Bello", role: "Dean of Research, University of Lagos", text: "AcaShield has transformed how we manage project submissions. The similarity detection is accurate, and the admin dashboard gives us full visibility into institutional research trends.", avatar: "AB" },
  { name: "Dr. James Mensah", role: "Head of Department, KNUST", text: "Our supervisors have saved hours per week. The review interface is clean, and the PDF reports are professional enough to share with external examiners.", avatar: "JM" },
  { name: "Chisom Okafor", role: "Final Year Student, OAU", text: "Submitting my project was straightforward. I could track my review status in real-time and the similarity report helped me improve my work before final submission.", avatar: "CO" },
];

// ─── Utility Components ───────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function Badge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    pending: { label: "Pending Review", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    revision: { label: "Revision Requested", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
    active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    inactive: { label: "Inactive", cls: "bg-gray-100 text-gray-600 border-gray-200" },
    student: { label: "Student", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    supervisor: { label: "Supervisor", cls: "bg-purple-50 text-purple-700 border-purple-200" },
    admin: { label: "Admin", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    high: { label: "High Priority", cls: "bg-red-50 text-red-700 border-red-200" },
    medium: { label: "Medium", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    low: { label: "Low", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const c = config[status] ?? { label: status, cls: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", c.cls)}>
      {c.label}
    </span>
  );
}

function SimilarityBadge({ score }: { score: number }) {
  const cls = score <= 15 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : score <= 30 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border", cls)}>
      {score}% similarity
    </span>
  );
}

function Btn({
  children, variant = "primary", onClick, className, type = "button", disabled = false, size = "md"
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#065F46] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary: "bg-[#065F46] text-white hover:bg-[#054a38] active:bg-[#043d2f] shadow-sm",
    secondary: "bg-emerald-50 text-[#065F46] hover:bg-emerald-100 border border-emerald-200",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    outline: "border border-[#065F46] text-[#065F46] hover:bg-emerald-50",
    destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={cn(base, sizes[size], variants[variant], className)}>
      {children}
    </button>
  );
}

function StatCard({ label, value, change, icon: Icon, color = "emerald" }: {
  label: string; value: string; change?: string; icon: React.ElementType; color?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-[#065F46]",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorMap[color] ?? colorMap.emerald)}>
          <Icon size={20} />
        </div>
        {change && (
          <span className={cn("text-xs font-medium flex items-center gap-0.5", change.startsWith("+") ? "text-emerald-600" : "text-red-500")}>
            {change.startsWith("+") ? <TrendingUp size={12} /> : <ChevronDown size={12} />}
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div className={cn("rounded-full bg-[#065F46] text-white font-semibold flex items-center justify-center flex-shrink-0", s[size])}>
      {initials}
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
  role, activeTab, setTab, onLogout, open, onClose
}: {
  role: "student" | "supervisor" | "admin";
  activeTab: string;
  setTab: (t: string) => void;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const navItems: Record<string, { icon: React.ElementType; label: string; tab: string }[]> = {
    student: [
      { icon: Home, label: "Dashboard", tab: "dashboard" },
      { icon: Upload, label: "Upload Project", tab: "upload" },
      { icon: Folder, label: "My Projects", tab: "projects" },
      { icon: Archive, label: "Repository", tab: "repository" },
      { icon: FileText, label: "Reports", tab: "reports" },
      { icon: Bell, label: "Notifications", tab: "notifications" },
      { icon: User, label: "Profile", tab: "profile" },
    ],
    supervisor: [
      { icon: Home, label: "Dashboard", tab: "dashboard" },
      { icon: FileCheck, label: "Review Queue", tab: "reviews" },
      { icon: Users, label: "My Students", tab: "students" },
      { icon: BarChart2, label: "Analytics", tab: "analytics" },
    ],
    admin: [
      { icon: Home, label: "Dashboard", tab: "dashboard" },
      { icon: Users, label: "User Management", tab: "users" },
      { icon: Database, label: "Repository", tab: "repository" },
      { icon: Cpu, label: "Similarity Engine", tab: "engine" },
      { icon: BarChart2, label: "Reports", tab: "reports" },
      { icon: Settings, label: "Settings", tab: "settings" },
    ],
  };

  const roleLabel = { student: "Student Portal", supervisor: "Supervisor Portal", admin: "Admin Console" }[role];
  const items = navItems[role];

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-60 bg-white border-r border-[#E5E7EB] flex flex-col z-40 transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 bg-[#065F46] rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">AcaShield</span>
          </div>
          <span className="text-xs text-gray-400 font-medium pl-[2.6rem]">{roleLabel}</span>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {items.map(({ icon: Icon, label, tab }) => (
              <li key={tab}>
                <button
                  onClick={() => { setTab(tab); onClose(); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab
                      ? "bg-[#065F46] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon size={17} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <Avatar initials={getUserInitials(getCurrentUser())} size="sm" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {getUserDisplayName(getCurrentUser())}
              </div>
              <div className="text-xs text-gray-400 truncate capitalize">{role}</div>
            </div>
          </div>
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200 animate-pulse">
      <AlertTriangle size={12} /> Offline
    </span>
  );
}

function TopBar({ title, onMenuToggle, role }: { title: string; onMenuToggle: () => void; role: "student" | "supervisor" | "admin" }) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-[#E5E7EB] px-4 lg:px-6 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Menu size={20} />
        </button>
        <h1 className="font-semibold text-gray-900 text-base">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <OfflineIndicator />
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-50 border border-[#E5E7EB] rounded-lg w-52">
          <Search size={15} className="text-gray-400" />
          <input placeholder="Search…" className="bg-transparent text-sm outline-none w-full text-gray-600 placeholder-gray-400" />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <Avatar initials={role === "student" ? "AO" : role === "supervisor" ? "SO" : "AD"} size="sm" />
      </div>
    </header>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

function LandingNav({ setView }: { setView: (v: View) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#065F46] rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">AcaShield</span>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Btn variant="ghost" onClick={() => setView("login")}>Sign In</Btn>
          <Btn variant="primary" onClick={() => setView("login")}>Access Portal</Btn>
        </div>
        <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-[#E5E7EB] px-4 py-4 space-y-2">
          <div className="pt-2 flex flex-col gap-2">
            <Btn variant="outline" onClick={() => setView("login")} className="w-full justify-center">Sign In</Btn>
          </div>
        </div>
      )}
    </nav>
  );
}

function LandingHero({ setView }: { setView: (v: View) => void }) {
  const handleRequestAccess = () => {
    alert("AcaShield is an institutional system. Please contact your institution's administrator or IT department to request an account.");
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1 text-xs font-semibold mb-6">
            <Zap size={12} />
            Trusted by 40+ African universities
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-5">
            Securing Academic <span className="text-[#065F46]">Integrity</span> at Scale
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
            AcaShield centralises final-year project submissions, detects plagiarism against your institution's own archive, and gives supervisors a powerful review workspace — all in one platform.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Btn variant="primary" size="lg" onClick={() => setView("login")}>
              Access Portal <ChevronRight size={18} />
            </Btn>
            <Btn variant="outline" size="lg" onClick={handleRequestAccess}>
              Request Access
            </Btn>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { label: "Admin-managed accounts" },
              { label: "WCAG AA accessible" },
              { label: "Data stays on your servers" },
            ].map(({ label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-gray-400">
                <Check size={14} className="text-[#065F46]" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="relative">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl overflow-hidden">
            <div className="bg-[#065F46] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-white/80" />
                <span className="text-white text-xs font-semibold">AcaShield — Student Dashboard</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 bg-white/30 rounded-full" />
                <div className="w-2.5 h-2.5 bg-white/30 rounded-full" />
                <div className="w-2.5 h-2.5 bg-white/30 rounded-full" />
              </div>
            </div>
            <div className="p-4 bg-[#F9FAFB]">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: "My Projects", value: "3", icon: Folder, color: "text-[#065F46] bg-emerald-50" },
                  { label: "Pending Review", value: "1", icon: Clock, color: "text-amber-600 bg-amber-50" },
                  { label: "Approved", value: "1", icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
                  { label: "Avg Similarity", value: "15%", icon: BarChart2, color: "text-blue-600 bg-blue-50" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-lg p-3 border border-[#E5E7EB]">
                    <div className={cn("w-6 h-6 rounded flex items-center justify-center mb-2 text-xs", color)}>
                      <Icon size={13} />
                    </div>
                    <div className="text-lg font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-400">{label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg border border-[#E5E7EB] p-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Recent Projects</div>
                {[
                  { id: 1, title: "Machine Learning in Healthcare", status: "approved" },
                  { id: 2, title: "Blockchain Land Registry System", status: "under_review" },
                ].map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <div className="text-xs text-gray-700 truncate max-w-[60%]">{p.title}</div>
                    <Badge status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 bg-white rounded-xl border border-[#E5E7EB] shadow-lg p-3 flex items-center gap-3 w-48">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CheckCircle size={16} className="text-[#065F46]" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-900">Similarity: 4%</div>
              <div className="text-xs text-gray-400">Excellent originality</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandingStats() {
  const stats = [
    { value: "40+", label: "Universities" },
    { value: "12,500+", label: "Projects archived" },
    { value: "99.2%", label: "Uptime SLA" },
    { value: "< 3 min", label: "Avg. report time" },
  ];
  return (
    <section className="bg-[#065F46]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
        {stats.map(({ value, label }) => (
          <div key={label}>
            <div className="text-3xl font-extrabold mb-1">{value}</div>
            <div className="text-emerald-300 text-sm">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingFeatures() {
  const features = [
    { icon: Archive, title: "Institutional Repository", desc: "Archive every final-year project in a searchable, structured database. Preserve decades of institutional knowledge." },
    { icon: Shield, title: "Plagiarism Detection", desc: "Compare submissions against your own local archive with NLP-powered analysis. Accurate, fast, institution-specific." },
    { icon: FileText, title: "Originality Reports", desc: "Professional PDF reports with highlighted matches, similarity scores, and actionable recommendations for students." },
    { icon: Eye, title: "Supervisor Review", desc: "A powerful review workspace where supervisors can annotate, approve, reject, or request revisions with full context." },
    { icon: Search, title: "Research Discovery", desc: "Students and staff can search and browse archived projects by keyword, department, programme, or year." },
    { icon: BarChart2, title: "Institutional Analytics", desc: "Track submission trends, department activity, similarity distributions, and repository growth over time." },
  ];
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <div className="text-center mb-12">
        <div className="text-xs font-semibold text-[#065F46] uppercase tracking-widest mb-3">Platform Features</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything your institution needs</h2>
        <p className="text-gray-500 max-w-xl mx-auto">From submission to archival, AcaShield handles the entire project lifecycle with tools built for every role.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl border border-[#E5E7EB] p-6 hover:shadow-md hover:border-emerald-200 transition-all group">
            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#065F46] transition-colors">
              <Icon size={22} className="text-[#065F46] group-hover:text-white transition-colors" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingHowItWorks({ setView }: { setView: (v: View) => void }) {
  const steps = [
    { n: "01", title: "Student Submits Project", desc: "Upload PDF or DOCX with metadata — title, abstract, keywords, department, supervisor, and academic year." },
    { n: "02", title: "AI Analyses Originality", desc: "AcaShield scans the submission against the institution's archive and generates a similarity score within minutes." },
    { n: "03", title: "Supervisor Reviews", desc: "Assigned supervisors receive the project and originality report side by side and can approve, reject, or request revisions." },
    { n: "04", title: "Archived & Published", desc: "Approved projects are automatically archived in the repository, contributing to institutional knowledge." },
  ];
  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-[#065F46] uppercase tracking-widest mb-3">How It Works</div>
          <h2 className="text-3xl font-bold text-gray-900">A clear, structured workflow</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map(({ n, title, desc }, i) => (
            <div key={n} className="relative">
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 h-full">
                <div className="text-4xl font-black text-emerald-100 mb-3">{n}</div>
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
              {i < 3 && <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 text-gray-300"><ChevronRight size={20} /></div>}
            </div>
          ))}
        </div>
        <div className="text-center">
          <Btn variant="primary" size="lg" onClick={() => setView("login")}>
            Access Portal <ArrowUpRight size={18} />
          </Btn>
        </div>
      </div>
    </section>
  );
}

function LandingTestimonials() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <div className="text-center mb-12">
        <div className="text-xs font-semibold text-[#065F46] uppercase tracking-widest mb-3">Testimonials</div>
        <h2 className="text-3xl font-bold text-gray-900">Trusted by educators and students</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <div key={t.name} className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <div className="flex gap-1 mb-4">
              {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
            <div className="flex items-center gap-3">
              <Avatar initials={t.avatar} size="sm" />
              <div>
                <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-400">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="bg-gray-50 py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-[#065F46] uppercase tracking-widest mb-3">FAQ</div>
          <h2 className="text-3xl font-bold text-gray-900">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left">
                <span className="font-medium text-gray-900 text-sm pr-4">{f.q}</span>
                {open === i ? <ChevronUp size={18} className="text-[#065F46] flex-shrink-0" /> : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
              </button>
              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-gray-500 leading-relaxed">{f.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingCTA({ setView }: { setView: (v: View) => void }) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
      <div className="bg-[#065F46] rounded-2xl p-10 md:p-16 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Ready to secure your institution's academic integrity?</h2>
        <p className="text-emerald-300 mb-8 max-w-lg mx-auto">Join over 40 African universities already using AcaShield to manage, protect, and preserve academic work.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Btn variant="secondary" size="lg" onClick={() => setView("login")}>Access Portal</Btn>
          <button onClick={() => setView("login")} className="px-6 py-3 text-base font-medium text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors">
            Sign In →
          </button>
        </div>
      </div>
    </section>
  );
}

function DemoSwitcher({ setView }: { setView: (v: View) => void }) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Info size={18} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800 font-medium">Try the live demo — explore each user role:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" variant="primary" onClick={() => setView("student")}>Student View</Btn>
          <Btn size="sm" variant="secondary" onClick={() => setView("supervisor")}>Supervisor View</Btn>
          <button onClick={() => setView("admin")} className="px-3 py-1.5 text-sm font-medium border border-orange-300 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">Admin Console</button>
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-[#065F46] rounded-lg flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <span className="font-bold text-white">AcaShield</span>
            </div>
            <p className="text-sm leading-relaxed">Securing academic integrity for universities and research institutions across Africa and beyond.</p>
          </div>
          {[
            { title: "Product", links: ["Features", "How It Works", "Pricing", "Changelog"] },
            { title: "Support", links: ["Documentation", "API Reference", "System Status", "Contact"] },
            { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Security", "GDPR"] },
          ].map(({ title, links }) => (
            <div key={title}>
              <div className="text-white font-semibold text-sm mb-3">{title}</div>
              <ul className="space-y-2">
                {links.map(l => <li key={l}><a href="#" className="text-sm hover:text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span>© 2025 AcaShield. All rights reserved.</span>
          <div className="flex gap-1 items-center text-emerald-500">
            <Lock size={11} />
            <span>AES-256 Encrypted · TLS 1.3 · SOC 2 Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function LandingPage({ setView }: { setView: (v: View) => void }) {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav setView={setView} />
      <LandingHero setView={setView} />
      <LandingStats />
      <LandingFeatures />
      <LandingHowItWorks setView={setView} />
      <LandingTestimonials />
      <LandingFAQ />
      <LandingCTA setView={setView} />
      <DemoSwitcher setView={setView} />
      <LandingFooter />
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function AuthLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      <div className="hidden lg:flex lg:w-[480px] bg-[#065F46] flex-col justify-between p-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">AcaShield</span>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">Securing Academic Integrity at Your Institution</h2>
          <p className="text-emerald-300 text-sm leading-relaxed mb-8">Manage project submissions, detect plagiarism, and preserve institutional knowledge — all in one platform.</p>
          <div className="space-y-3">
            {[
              "Local plagiarism detection — your archive, your data",
              "Professional originality reports in minutes",
              "Role-based portals for students, supervisors & admins",
            ].map(t => (
              <div key={t} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-emerald-400/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={11} className="text-emerald-300" />
                </div>
                <span className="text-emerald-200 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-emerald-400 text-xs">Trusted by 40+ universities · SOC 2 · AES-256 Encrypted</p>
      </div>
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 py-12">
        <div className="max-w-sm mx-auto w-full">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#065F46] rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">AcaShield</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
          <p className="text-sm text-gray-500 mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function InputField({
  label, type = "text", placeholder, error, value, onChange, name, disabled = false, required = false
}: {
  label: string; type?: string; placeholder: string; error?: string;
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string; disabled?: boolean; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} name={name} disabled={disabled} required={required}
        className={cn(
          "w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm outline-none transition-all",
          error ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100" : "border-[#E5E7EB] focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10"
        )} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ForgotPasswordView({ setView }: { setView: (v: View) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Email is required."); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await authForgotPassword(email);
      setSuccess("If the email is registered, a password reset link has been sent.");
      setEmail("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Password" subtitle="Enter your email to receive a password reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-[#065F46] text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={15} /> {success}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Institutional Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@university.edu.ng" required
            className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" />
        </div>
        <Btn variant="primary" className="w-full justify-center" size="lg" type="submit" disabled={loading}>
          {loading ? "Sending link…" : "Send Reset Link"}
        </Btn>
        <button type="button" onClick={() => setView("login")} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto pt-2">
          <ChevronRight size={12} className="rotate-180" /> Back to Sign In
        </button>
      </form>
    </AuthLayout>
  );
}

function ResetPasswordView({ setView, token }: { setView: (v: View) => void; token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { setError("Password is required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true); setError(""); setSuccess("");
    try {
      await authResetPassword(token, password);
      setSuccess("Password reset successfully. You can now sign in.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Enter New Password" subtitle="Please choose a strong password containing at least 6 characters">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-[#065F46] text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={15} /> {success}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required
            className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••" required
            className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" />
        </div>
        <Btn variant="primary" className="w-full justify-center" size="lg" type="submit" disabled={loading || !!success}>
          {loading ? "Resetting…" : "Reset Password"}
        </Btn>
        <button type="button" onClick={() => setView("login")} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto pt-2">
          <ChevronRight size={12} className="rotate-180" /> Back to Sign In
        </button>
      </form>
    </AuthLayout>
  );
}

function LoginView({ setView, onLogin }: { setView: (v: View) => void; onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Email and password are required."); return; }
    setLoading(true); setError("");
    try {
      const user = await authLogin(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your AcaShield account">
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Institutional Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@university.edu.ng"
            className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" />
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300 accent-[#065F46]" />
            Remember me
          </label>
          <button type="button" onClick={() => setView("forgot-password")} className="text-[#065F46] hover:underline font-medium">Forgot password?</button>
        </div>
        <Btn variant="primary" className="w-full justify-center" size="lg" type="submit"
          onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </Btn>
        <p className="text-center text-xs text-gray-400 mt-2">
          Don't have an account? Please contact your institution administrator.
        </p>
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative text-center"><span className="bg-[#F9FAFB] px-3 text-xs text-gray-400">default credentials</span></div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
          <div><span className="font-medium">Admin:</span> admin@acashield.local / Admin@12345</div>
          <div><span className="font-medium">Supervisor:</span> supervisor@acashield.local / Supervisor@12345</div>
          <div><span className="font-medium">Student:</span> student@acashield.local / Student@12345</div>
        </div>
        <button onClick={() => setView("landing")} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto">
          <ChevronRight size={12} className="rotate-180" /> Back to homepage
        </button>
      </div>
    </AuthLayout>
  );
}


function RegisterView({ setView, onLogin }: { setView: (v: View) => void; onLogin: (user: AuthUser) => void }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"STUDENT" | "SUPERVISOR">("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    studentNumber: "", registrationNumber: "", programme: "", department: "", academicYear: "2024/2025",
    staffNumber: "", title: "Dr.", specialization: "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    setLoading(true); setError("");
    try {
      const payload = { ...form, role };
      const user = await authRegister(payload);
      onLogin(user);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Registration failed. Please check your details.");
      setStep(1);
    } finally { setLoading(false); }
  };

  return (
    <AuthLayout title={step === 1 ? "Create your account" : "Profile details"} subtitle={step === 1 ? "Join AcaShield" : "Complete your profile"}>
      <div className="space-y-4">
        <div className="flex gap-2 mb-2">
          {[1, 2].map(s => (
            <div key={s} className={cn("flex-1 h-1 rounded-full transition-colors", step >= s ? "bg-[#065F46]" : "bg-gray-200")} />
          ))}
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {step === 1 ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Adaeze" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Obi" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Institutional Email</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="a.obi@unilag.edu.ng" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 6 characters" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10">
                <option value="STUDENT">Student</option>
                <option value="SUPERVISOR">Supervisor / Lecturer</option>
              </select></div>
            <Btn variant="primary" className="w-full justify-center" size="lg" onClick={() => setStep(2)}>
              Continue <ChevronRight size={18} />
            </Btn>
          </>
        ) : (
          <>
            {role === "STUDENT" ? (
              <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Student Number</label>
                  <input value={form.studentNumber} onChange={e => set("studentNumber", e.target.value)} placeholder="e.g. 190403021" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Registration Number</label>
                  <input value={form.registrationNumber} onChange={e => set("registrationNumber", e.target.value)} placeholder="e.g. REG001" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                  <input value={form.department} onChange={e => set("department", e.target.value)} placeholder="Computer Science" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Programme</label>
                  <input value={form.programme} onChange={e => set("programme", e.target.value)} placeholder="BSc Computer Science" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
              </>
            ) : (
              <>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Staff Number</label>
                  <input value={form.staffNumber} onChange={e => set("staffNumber", e.target.value)} placeholder="e.g. SN001" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                  <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Dr. / Prof." className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                  <input value={form.department} onChange={e => set("department", e.target.value)} placeholder="Computer Science" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Specialization</label>
                  <input value={form.specialization} onChange={e => set("specialization", e.target.value)} placeholder="Machine Learning" className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" /></div>
              </>
            )}
            <Btn variant="primary" className="w-full justify-center" size="lg" onClick={handleRegister} disabled={loading}>
              {loading ? "Creating account…" : <><CheckCircle size={18} /> Create Account</>}
            </Btn>
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700 text-center w-full">← Back</button>
          </>
        )}
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <button onClick={() => setView("login")} className="text-[#065F46] font-medium hover:underline">Sign in</button>
        </p>
      </div>
    </AuthLayout>
  );
}


interface MatchSource {
  id: string;
  similarityScore: number;
  matchedText: string;
  sourceText: string;
  matchedProject: {
    title: string;
    academicYear: string;
    student: { firstName: string; lastName: string };
    department: { name: string };
  };
  matchedDocument: { fileName: string; version: number };
}

function SimilarityReportViewer({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [report, setReport] = useState<any>(null);
  const [matches, setMatches] = useState<MatchSource[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchSimilarityReport(projectId)
      .then(rep => {
        setReport(rep);
        if (rep.id) {
          return fetchSimilarityMatches(rep.id);
        }
        throw new Error("No report generated yet.");
      })
      .then(mats => {
        setMatches(mats || []);
        if (mats && mats.length > 0) {
          setSelectedMatch(mats[0]);
        }
      })
      .catch(err => {
        console.error(err);
        setError(err.message || "Failed to load similarity report.");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-center shadow-2xl">
          <RefreshCw className="mx-auto mb-4 animate-spin text-[#065F46]" size={32} />
          <p className="text-sm font-medium text-gray-700">Analyzing matching sources…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-center shadow-2xl space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={40} />
          <h3 className="text-lg font-bold text-gray-900">Originality Report Unavailable</h3>
          <p className="text-sm text-gray-500">{error || "No originality report exists for this project yet."}</p>
          <Btn variant="primary" onClick={onClose}>Close Report</Btn>
        </div>
      </div>
    );
  }

  const score = report.overallScore || 0;
  const risk = report.riskLevel || "LOW";
  const riskColor = risk === "HIGH" || risk === "CRITICAL" ? "text-red-600 bg-red-50 border-red-200" : risk === "MEDIUM" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-600 bg-emerald-50 border-emerald-200";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 md:p-6">
      <div className="bg-[#F9FAFB] w-full h-full md:max-w-6xl md:h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-[#065F46]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-base">Originality Report</h3>
              <p className="text-xs text-gray-400 truncate max-w-xs sm:max-w-md md:max-w-xl">{report.project?.title || "Project similarity report"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1", riskColor)}>
              <span>{score}% similarity</span>
              <span>·</span>
              <span className="uppercase">{risk} Risk</span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Matches List */}
          <div className="w-full md:w-80 bg-white border-r border-[#E5E7EB] flex flex-col min-h-0">
            <div className="p-4 border-b border-[#E5E7EB] bg-gray-50/50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Matched Sources ({matches.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {matches.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-gray-50/50 transition-colors flex items-start justify-between gap-3",
                    selectedMatch?.id === m.id ? "bg-emerald-50/60 border-l-4 border-[#065F46]" : ""
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate mb-0.5">{m.matchedProject?.title}</div>
                    <div className="text-xs text-gray-400 truncate">
                      By {m.matchedProject?.student?.firstName} {m.matchedProject?.student?.lastName}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">
                      {m.matchedProject?.department?.name}
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0",
                    m.similarityScore > 40 ? "bg-red-50 text-red-700 border-red-100" : m.similarityScore > 20 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                  )}>
                    {m.similarityScore}%
                  </span>
                </button>
              ))}
              {matches.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500 opacity-60" />
                  <p className="text-xs font-medium">No matching documents found</p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Comparison Panel */}
          <div className="flex-1 bg-gray-50 overflow-y-auto p-4 md:p-6 min-h-0">
            {selectedMatch ? (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active Comparison Source</h4>
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{selectedMatch.matchedProject?.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      File: {selectedMatch.matchedDocument?.fileName} (v{selectedMatch.matchedDocument?.version}) · Academic Year {selectedMatch.matchedProject?.academicYear}
                    </p>
                  </div>
                  <div className="flex-shrink-0 px-3 py-1 bg-emerald-50 border border-emerald-100 text-[#065F46] rounded-lg text-xs font-bold text-center">
                    Match Confidence: {selectedMatch.similarityScore}%
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left: Student Submission */}
                  <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded inline-block uppercase tracking-wider">
                      Student Submission
                    </h4>
                    <div className="text-sm text-gray-700 leading-relaxed bg-red-50/40 p-4 rounded-lg border border-red-100/60 font-mono whitespace-pre-wrap">
                      {selectedMatch.matchedText}
                    </div>
                  </div>

                  {/* Right: Source Document */}
                  <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded inline-block uppercase tracking-wider">
                      Archived Source Text
                    </h4>
                    <div className="text-sm text-gray-700 leading-relaxed bg-emerald-50/30 p-4 rounded-lg border border-emerald-100/50 font-mono whitespace-pre-wrap">
                      {selectedMatch.sourceText}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex gap-2">
                  <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Reviewer Tip:</span> Highlighted matches represent sentences with high syntactic overlap (Jaccard similarity coefficient &gt; 0.45). Paraphrasing or direct quoting without proper citation should be investigated.
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-2 opacity-30 text-[#065F46]" />
                  <p className="text-sm font-medium">Select a source from the left panel to inspect comparison details.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectDetailsDrawer({ project, onClose, onOpenReport }: { project: any; onClose: () => void; onOpenReport: (projectId: string) => void }) {
  const [history, setHistory] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    if (!project) return;
    setLoadingHistory(true);
    fetchReviewHistory(project.id)
      .then(res => setHistory(res || []))
      .catch(console.error)
      .finally(() => setLoadingHistory(false));

    setLoadingVersions(true);
    fetchProjectVersions(project.id)
      .then(res => setVersions(res || []))
      .catch(console.error)
      .finally(() => setLoadingVersions(false));
  }, [project]);

  if (!project) return null;

  const handleDownloadVersion = (versionId: string) => {
    const url = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/projects/${project.id}/document?versionId=${versionId}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={onClose} />

      <div className="relative w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full z-50">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Project Details</h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage details, history and originality scores.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Stats */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-gray-900 leading-snug">{project.title}</h4>
            
            <div className="flex flex-wrap gap-2.5">
              <Badge status={project.status?.toLowerCase()} />
              <SimilarityBadge score={project.similarityScore || 0} />
              {project.similarityScore !== null && (
                <button
                  onClick={() => onOpenReport(project.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#065F46] hover:text-[#054a38] hover:underline"
                >
                  <ExternalLink size={12} /> View Interactive Report
                </button>
              )}
            </div>
          </div>

          {/* General Metadata */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-4">
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Project Metadata</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 text-xs block mb-0.5">Category</span>
                <span className="font-medium text-gray-800">{project.category || "Thesis"}</span>
              </div>
              <div>
                <span className="text-gray-500 text-xs block mb-0.5">Academic Year</span>
                <span className="font-medium text-gray-800">{project.academicYear}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 text-xs block mb-0.5">Department & Programme</span>
                <span className="font-medium text-gray-800">
                  {project.department?.name} · <span className="text-gray-500">{project.programme?.name}</span>
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 text-xs block mb-0.5">Supervisor</span>
                <span className="font-medium text-gray-800">
                  {project.supervisor?.firstName ? `${project.supervisor.firstName} ${project.supervisor.lastName}` : "No supervisor assigned"}
                </span>
              </div>
            </div>
            <div className="pt-2">
              <span className="text-gray-500 text-xs block mb-1">Abstract</span>
              <p className="text-xs text-gray-600 leading-relaxed bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-wrap max-h-36 overflow-y-auto">
                {project.abstract || "No abstract provided."}
              </p>
            </div>
          </div>

          {/* Version History */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Version History</h5>
            {loadingVersions ? (
              <div className="text-xs text-gray-400 py-2">Loading versions…</div>
            ) : versions.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">No documents uploaded.</div>
            ) : (
              <div className="space-y-2">
                {versions.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 border border-gray-100 hover:border-emerald-100 hover:bg-emerald-50/20 rounded-xl transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText size={15} className="text-[#065F46]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-800 truncate">{v.fileName}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Version {v.version} · {(v.fileSize / (1024 * 1024)).toFixed(2)} MB · {new Date(v.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadVersion(v.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-[#065F46] transition-colors"
                      title="Download version"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Submission Timeline</h5>
            {loadingHistory ? (
              <div className="text-xs text-gray-400 py-2">Loading review history…</div>
            ) : (
              <div className="relative border-l border-gray-100 pl-4 ml-2 space-y-5">
                {/* Current Status */}
                <div className="relative">
                  <div className="absolute -left-[21px] mt-1 w-2.5 h-2.5 rounded-full bg-[#065F46] ring-4 ring-emerald-50" />
                  <div>
                    <div className="text-xs font-bold text-gray-900 capitalize">
                      Current Status: {project.status?.toLowerCase().replace("_", " ")}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Last updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Reviews History */}
                {history.map((rev) => {
                  const actionName = rev.decision === "APPROVED" ? "Approved" : rev.decision === "REVISION_REQUESTED" ? "Revision Requested" : "Rejected";
                  const bulletColor = rev.decision === "APPROVED" ? "bg-emerald-500" : rev.decision === "REVISION_REQUESTED" ? "bg-amber-500" : "bg-red-500";
                  return (
                    <div key={rev.id} className="relative">
                      <div className={cn("absolute -left-[21px] mt-1 w-2.5 h-2.5 rounded-full", bulletColor)} />
                      <div>
                        <div className="text-xs font-bold text-gray-800">{actionName}</div>
                        <p className="text-[10px] text-gray-400 mt-0.5">By Supervisor · {new Date(rev.createdAt).toLocaleDateString()}</p>
                        {rev.comments && (
                          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-2.5 mt-2 leading-relaxed whitespace-pre-wrap italic">
                            "{rev.comments}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Initial Submission */}
                {project.submittedAt && (
                  <div className="relative">
                    <div className="absolute -left-[21px] mt-1 w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-xs font-bold text-gray-800">Submitted for review</div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(project.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                {/* Created */}
                <div className="relative">
                  <div className="absolute -left-[21px] mt-1 w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <div>
                    <div className="text-xs font-bold text-gray-800">Draft created</div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(project.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Student Dashboard ────────────────────────────────────────────────────────


function StudentDashboardHome({ setTab }: { setTab: (t: StudentTab) => void }) {
  const user = getCurrentUser();
  const [dashboard, setDashboard] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchStudentDashboard().catch(() => null),
      fetchStudentProjects().catch(() => ({ data: [] })),
      fetchNotifications().catch(() => ({ data: [] })),
    ]).then(([dash, proj, notifData]) => {
      setDashboard(dash);
      setProjects(Array.isArray(proj?.data) ? proj.data.slice(0, 3) : []);
      setNotifs(Array.isArray(notifData?.data) ? notifData.data.slice(0, 3) : []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = dashboard?.stats;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="bg-[#065F46] rounded-xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-emerald-300 text-sm mb-1">{greeting},</div>
          <h2 className="text-xl font-bold">{user ? `${user.firstName} ${user.lastName}` : "Welcome back"}</h2>
          <p className="text-emerald-300 text-sm mt-1">
            {user?.studentProfile?.programme || "Student"}
            {user?.studentProfile?.academicYear ? ` · ${user.studentProfile.academicYear}` : ""}
          </p>
        </div>
        <Btn variant="secondary" onClick={() => setTab("upload")}>
          <Upload size={16} /> Submit Project
        </Btn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="My Projects" value={loading ? "—" : String(stats?.totalProjects ?? 0)} icon={Folder} />
        <StatCard label="Pending Review" value={loading ? "—" : String(stats?.pendingReviews ?? 0)} icon={Clock} color="amber" />
        <StatCard label="Approved" value={loading ? "—" : String(stats?.approvedProjects ?? 0)} icon={CheckCircle} />
        <StatCard label="Avg Similarity" value={loading ? "—" : `${stats?.avgSimilarity ?? 0}%`} icon={BarChart2} color="blue" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">My Projects</h3>
            <button onClick={() => setTab("projects")} className="text-xs text-[#065F46] font-medium hover:underline">View all →</button>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Folder size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No projects yet. <button onClick={() => setTab("upload")} className="text-[#065F46] hover:underline">Submit one!</button></p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((p: any) => (
                <div key={p.id} className="flex items-start gap-4 p-3.5 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer">
                  <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={17} className="text-[#065F46]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.department?.name || "—"} · {p.academicYear || "—"}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge status={p.status?.toLowerCase()} />
                    <SimilarityBadge score={p.similarityScore} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Upload New Project", icon: Upload, tab: "upload" as StudentTab },
                { label: "Browse Repository", icon: Archive, tab: "repository" as StudentTab },
                { label: "View Reports", icon: FileText, tab: "reports" as StudentTab },
              ].map(({ label, icon: Icon, tab }) => (
                <button key={label} onClick={() => setTab(tab)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50 text-sm text-gray-700 hover:text-[#065F46] transition-all text-left">
                  <Icon size={16} />
                  {label}
                  <ChevronRight size={14} className="ml-auto text-gray-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Recent Notifications</h3>
            <div className="space-y-3">
              {notifs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No notifications yet</p>
              ) : notifs.map((n: any) => (
                <div key={n.id} className={cn("flex gap-3 p-2.5 rounded-lg text-xs", !n.isRead && "bg-emerald-50")}>
                  <div className={cn("w-2 h-2 rounded-full mt-1 flex-shrink-0", n.type === "success" ? "bg-emerald-500" : n.type === "warning" ? "bg-amber-500" : "bg-blue-500")} />
                  <div>
                    <div className="font-medium text-gray-900">{n.title}</div>
                    <div className="text-gray-500 mt-0.5 leading-relaxed">{n.message}</div>
                    <div className="text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




function StudentUploadView() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Lookup state
  const [departments, setDepartments] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: "",
    abstract: "",
    keywords: "",
    category: "Thesis",
    academicYear: "2024/2025",
    departmentId: "",
    programmeId: "",
    supervisorId: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(console.error);
    fetchSupervisors().then(setSupervisors).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.departmentId) {
      fetchProgrammes(form.departmentId).then(setProgrammes).catch(console.error);
    } else {
      setProgrammes([]);
    }
  }, [form.departmentId]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      setError("");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError("");
    }
  };

  const handleSave = async (submitAfterUpload: boolean) => {
    if (!navigator.onLine) { setError("You are offline. Document upload and submissions are disabled."); return; }
    if (!form.title.trim()) { setError("Project title is required."); return; }
    if (!form.departmentId) { setError("Department is required."); return; }
    if (!form.supervisorId) { setError("Supervisor is required."); return; }
    if (!file) { setError("Please select/drag a project document first."); return; }

    setError("");
    setSuccess("");
    setUploading(true);
    setProgress(10);

    try {
      // 1. Create project draft
      const project = await createProject(form);
      setProgress(40);

      // 2. Upload file
      const uploadInterval = setInterval(() => {
        setProgress(p => (p < 85 ? p + 5 : p));
      }, 100);

      await uploadProjectDocument(project.id, file);
      clearInterval(uploadInterval);
      setProgress(90);

      // 3. Optional submission
      if (submitAfterUpload) {
        setSubmitting(true);
        await submitProject(project.id);
      }

      setProgress(100);
      setSuccess(submitAfterUpload ? "Project submitted successfully for originality review!" : "Project draft saved successfully!");
      setFile(null);
      setForm({
        title: "", abstract: "", keywords: "", category: "Thesis",
        academicYear: "2024/2025", departmentId: "", programmeId: "", supervisorId: ""
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save or upload project.");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Project</h2>
        <p className="text-sm text-gray-500">Submit your final year project for similarity analysis and supervisor review.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-[#065F46] text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept=".pdf,.docx" />

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer",
          dragging ? "border-[#065F46] bg-emerald-50" : file ? "border-emerald-400 bg-emerald-50/50" : "border-gray-200 hover:border-[#065F46]/50 hover:bg-emerald-50/20"
        )}
      >
        {file ? (
          <div>
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <FileText size={26} className="text-[#065F46]" />
            </div>
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            {uploading ? (
              <div className="mt-3 max-w-xs mx-auto">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Uploading & Parsing…</span><span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#065F46] rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-1.5 justify-center text-emerald-600 text-sm font-medium">
                <CheckCircle size={15} /> Document attached
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Upload size={26} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Drag and drop your file here, or click to browse</p>
            <p className="text-xs text-gray-400">Supported: PDF, DOCX · Max 20 MB</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Project Metadata</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <InputField label="Project Title" placeholder="e.g. Machine Learning in Healthcare Diagnostics" value={form.title} onChange={e => set("title", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Abstract</label>
            <textarea rows={4} placeholder="A brief summary of your project, objectives, methodology, and findings…"
              value={form.abstract} onChange={e => set("abstract", e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10 resize-none" />
          </div>
          <InputField label="Keywords" placeholder="machine learning, healthcare, NLP" value={form.keywords} onChange={e => set("keywords", e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10">
              <option value="Thesis">Thesis</option>
              <option value="Dissertation">Dissertation</option>
              <option value="Design Project">Design Project</option>
              <option value="Research Paper">Research Paper</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
            <select value={form.departmentId} onChange={e => set("departmentId", e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10">
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Programme</label>
            <select value={form.programmeId} onChange={e => set("programmeId", e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10" disabled={!form.departmentId}>
              <option value="">Select Programme</option>
              {programmes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Academic Year</label>
            <select value={form.academicYear} onChange={e => set("academicYear", e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10">
              <option value="2024/2025">2024/2025</option>
              <option value="2023/2024">2023/2024</option>
              <option value="2022/2023">2022/2023</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Supervisor</label>
            <select value={form.supervisorId} onChange={e => set("supervisorId", e.target.value)} className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10">
              <option value="">Select Supervisor</option>
              {supervisors.map(s => (
                <option key={s.id} value={s.id}>
                  {s.supervisorProfile?.title ? `${s.supervisorProfile.title} ` : ""}{s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Btn variant="primary" size="lg" disabled={!file || uploading || submitting} onClick={() => handleSave(true)}>
          {submitting ? "Submitting…" : <><Send size={17} /> Submit Project</>}
        </Btn>
        <Btn variant="outline" size="lg" disabled={!file || uploading} onClick={() => handleSave(false)}>
          Save Draft
        </Btn>
      </div>
    </div>
  );
}

function StudentProjectsView() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [activeReportProjectId, setActiveReportProjectId] = useState<string | null>(null);

  const loadProjects = () => {
    setLoading(true);
    fetchStudentProjects()
      .then(res => {
        setProjects(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filtered = projects.filter((p: any) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Stop drawer from opening
    const url = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/projects/${id}/document`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">My Projects</h2>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg">
            <Search size={15} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…" className="bg-transparent text-sm outline-none w-32 sm:w-48 text-gray-600 placeholder-gray-400" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="hidden md:grid grid-cols-12 px-5 py-3 bg-gray-50 border-b border-[#E5E7EB] text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div className="col-span-5">Project</div>
          <div className="col-span-2">Dept</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Similarity</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading projects…</div>
        ) : filtered.map((p: any) => (
          <div key={p.id} onClick={() => setSelectedProject(p)} className="grid md:grid-cols-12 gap-2 md:gap-0 px-5 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-0 cursor-pointer">
            <div className="md:col-span-5 flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText size={17} className="text-[#065F46]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                <div className="text-xs text-gray-400">
                  {p.submittedAt ? `Submitted ${new Date(p.submittedAt).toLocaleDateString()}` : "Draft"} · {p.supervisor?.firstName ? `${p.supervisor.firstName} ${p.supervisor.lastName}` : "No supervisor"}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 flex items-center"><span className="text-sm text-gray-600">{p.department?.name || "—"}</span></div>
            <div className="md:col-span-2 flex items-center"><Badge status={p.status?.toLowerCase()} /></div>
            <div className="md:col-span-2 flex items-center"><SimilarityBadge score={p.similarityScore || 0} /></div>
            <div className="md:col-span-1 flex items-center justify-end gap-1">
              <button onClick={(e) => handleDownload(e, p.id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" title="Download Document">
                <Download size={15} />
              </button>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <Folder size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No projects found</p>
          </div>
        )}
      </div>

      {selectedProject && (
        <ProjectDetailsDrawer
          project={selectedProject}
          onClose={() => {
            setSelectedProject(null);
            loadProjects();
          }}
          onOpenReport={(pid) => {
            setActiveReportProjectId(pid);
          }}
        />
      )}

      {activeReportProjectId && (
        <SimilarityReportViewer
          projectId={activeReportProjectId}
          onClose={() => setActiveReportProjectId(null)}
        />
      )}
    </div>
  );
}

function StudentReportsView() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReportProjectId, setActiveReportProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentReports()
      .then(res => {
        setReports(res || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadReport = (projectId: string) => {
    const url = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/plagiarism/report/${projectId}/download`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Originality Reports</h2>
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading originality reports…</div>
      ) : reports.length === 0 ? (
        <div className="p-16 text-center text-gray-400 bg-white border border-[#E5E7EB] rounded-xl">
          <FileText size={40} className="mx-auto mb-3 opacity-40 text-gray-400" />
          <p className="font-medium">No reports available yet</p>
          <p className="text-xs mt-1 text-gray-400">Reports will appear here once similarity analysis is complete.</p>
        </div>
      ) : reports.map((p: any) => {
        const score = p.similarityScore || 0;
        const risk = p.riskLevel || "LOW";
        const riskColor = risk === "HIGH" ? "text-red-600" : risk === "MEDIUM" ? "text-amber-600" : "text-emerald-600";
        const riskBg = risk === "HIGH" ? "bg-red-500" : risk === "MEDIUM" ? "bg-amber-500" : "bg-emerald-500";

        return (
          <div key={p.id} className="bg-white rounded-xl border border-[#E5E7EB] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{p.title}</h3>
                <div className="text-xs text-gray-400">
                  {p.department?.name || "—"} · Submitted {p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : "—"}
                </div>
              </div>
              <div className="flex gap-2">
                <Btn variant="outline" size="sm" onClick={() => setActiveReportProjectId(p.id)}><Eye size={14} />Interactive Report</Btn>
                <Btn variant="outline" size="sm" onClick={() => handleDownloadReport(p.id)}><Download size={14} />Download PDF</Btn>
              </div>
            </div>
            <div className="grid sm:grid-cols-4 gap-4 mb-5">
              {[
                { label: "Similarity Score", value: `${score}%`, color: riskColor },
                { label: "Risk Level", value: risk.charAt(0) + risk.slice(1).toLowerCase(), color: riskColor },
                { label: "Document Name", value: p.documents?.[0]?.fileName || "—", color: "text-gray-900 truncate text-sm" },
                { label: "Report Status", value: "Complete", color: "text-emerald-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3.5 min-w-0">
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className={cn("text-lg font-bold", color)}>{value}</div>
                </div>
              ))}
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className={cn("h-full rounded-full transition-all", riskBg)} style={{ width: `${score}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>0% (Unique)</span><span>50%+ (High risk)</span>
            </div>
          </div>
        );
      })}

      {activeReportProjectId && (
        <SimilarityReportViewer
          projectId={activeReportProjectId}
          onClose={() => setActiveReportProjectId(null)}
        />
      )}
    </div>
  );
}

function StudentRepositoryView() {
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [departments, setDepartments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { q: search };
    if (selectedDept !== "All") {
      params.department = selectedDept;
    }
    fetchRepositoryProjects(params)
      .then(res => {
        setProjects(res.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, selectedDept]);

  const handleDownload = (id: string) => {
    window.open(getRepositoryDownloadUrl(id), "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Research Repository</h2>
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg flex-1 sm:flex-none sm:w-72">
          <Search size={15} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, author, department…" className="bg-transparent text-sm outline-none flex-1 text-gray-600 placeholder-gray-400" />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedDept("All")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            selectedDept === "All"
              ? "bg-[#065F46] text-white border-[#065F46]"
              : "bg-white text-gray-600 border-gray-200 hover:border-[#065F46] hover:text-[#065F46]"
          )}
        >
          All
        </button>
        {departments.map((d: any) => (
          <button
            key={d.id}
            onClick={() => setSelectedDept(d.name)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              selectedDept === d.name
                ? "bg-[#065F46] text-white border-[#065F46]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#065F46] hover:text-[#065F46]"
            )}
          >
            {d.name}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Searching repository…</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border border-[#E5E7EB] rounded-xl">
          <BookMarked size={40} className="mx-auto mb-3 opacity-40 text-gray-400" />
          <p className="font-medium">No published projects found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((r: any) => (
            <div key={r.id} className="bg-white rounded-xl border border-[#E5E7EB] p-5 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group">
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-[#065F46] transition-colors">
                <BookMarked size={17} className="text-[#065F46] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{r.title}</h3>
              <div className="text-xs text-gray-400 mb-3">
                {r.student?.firstName} {r.student?.lastName} · {r.academicYear || "—"}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#065F46] bg-emerald-50 px-2 py-0.5 rounded-full font-medium">{r.department?.name || "—"}</span>
                <button onClick={() => handleDownload(r.id)} className="text-gray-400 hover:text-[#065F46] transition-colors" title="Download Project PDF">
                  <Download size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentNotificationsView() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    fetchNotifications()
      .then(res => setItems(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      loadNotifications();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      loadNotifications();
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const iconMap = {
    success: <CheckCircle size={16} className="text-emerald-500" />,
    warning: <AlertTriangle size={16} className="text-amber-500" />,
    info: <Info size={16} className="text-blue-500" />,
    error: <XCircle size={16} className="text-red-500" />
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
        <button onClick={handleMarkAllRead} className="text-sm text-[#065F46] font-medium hover:underline">Mark all as read</button>
      </div>
      <div className="bg-white rounded-xl border border-[#E5E7EB] divide-y divide-gray-50">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading notifications…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No notifications found.</div>
        ) : items.map((n: any) => (
          <div key={n.id} className={cn("flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer", !n.isRead && "bg-emerald-50/40")}>
            <div className="mt-0.5" onClick={() => handleMarkRead(n.id)}>{iconMap[n.type as keyof typeof iconMap] ?? iconMap.info}</div>
            <div className="flex-1 min-w-0" onClick={() => handleMarkRead(n.id)}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-gray-900">{n.title}</span>
                {!n.isRead && <span className="w-2 h-2 bg-[#065F46] rounded-full" />}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{n.message}</p>
              <span className="text-xs text-gray-400 mt-1 block">{new Date(n.createdAt).toLocaleDateString()}</span>
            </div>
            <button onClick={() => handleDelete(n.id)} className="text-gray-300 hover:text-gray-500 mt-0.5">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentProfileView() {
  const user = getCurrentUser();
  const initials = user ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}` : "AO";

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Profile & Settings</h2>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar initials={initials} size="lg" />
          <div>
            <h3 className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</h3>
            <p className="text-sm text-gray-500">Student Profile</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField label="First Name" placeholder="First Name" value={user?.firstName} disabled />
          <InputField label="Last Name" placeholder="Last Name" value={user?.lastName} disabled />
          <InputField label="Email" type="email" placeholder="Email" value={user?.email} disabled />
          <InputField label="Student Number" placeholder="Student Number" value={user?.studentProfile?.studentNumber || "—"} disabled />
          <InputField label="Registration Number" placeholder="Registration Number" value={user?.studentProfile?.registrationNumber || "—"} disabled />
          <InputField label="Academic Year" placeholder="Academic Year" value={user?.studentProfile?.academicYear || "—"} disabled />
        </div>
      </div>
    </div>
  );
}

// ─── Supervisor Dashboard ─────────────────────────────────────────────────────

function SupervisorDashboardHome() {
  const user = getCurrentUser();
  const [dashboard, setDashboard] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSupervisorDashboard().catch(() => null),
      fetchReviewQueue().catch(() => []),
    ]).then(([dash, q]) => {
      setDashboard(dash);
      setQueue(q.slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  const stats = dashboard?.stats;

  return (
    <div className="space-y-6">
      <div className="bg-[#065F46] rounded-xl p-6 text-white">
        <div className="text-emerald-300 text-sm mb-1">Welcome back,</div>
        <h2 className="text-xl font-bold">{user ? `${user.supervisorProfile?.title || ""} ${user.firstName} ${user.lastName}` : "Supervisor Portal"}</h2>
        <p className="text-emerald-300 text-sm mt-1">
          {user?.supervisorProfile?.specialization || "Lecturer"}
          {user?.supervisorProfile?.department ? ` · ${user.supervisorProfile.department}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Reviews" value={loading ? "—" : String(stats?.pendingReviews ?? 0)} icon={Clock} color="amber" />
        <StatCard label="Assigned Students" value={loading ? "—" : String(stats?.totalStudents ?? 0)} icon={Users} />
        <StatCard label="Approved Projects" value={loading ? "—" : String(stats?.approvedProjects ?? 0)} icon={CheckCircle} />
        <StatCard label="Avg Similarity" value={loading ? "—" : `${stats?.avgSimilarity ?? 0}%`} icon={Activity} color="blue" />
      </div>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Review Queue</h3>
          <Badge status="pending" />
        </div>
        {loading ? (
          <div className="text-center py-4 text-gray-400">Loading queue…</div>
        ) : queue.length === 0 ? (
          <div className="text-center py-8 text-gray-400">All caught up! No pending reviews.</div>
        ) : (
          <div className="space-y-3">
            {queue.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all">
                <Avatar initials={`${r.student?.firstName?.[0] || ""}${r.student?.lastName?.[0] || ""}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{r.title}</div>
                  <div className="text-xs text-gray-400">{r.student?.firstName} {r.student?.lastName} · {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <SimilarityBadge score={r.similarityScore || 0} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SupervisorReviewView() {
  const [queue, setQueue] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeReportProjectId, setActiveReportProjectId] = useState<string | null>(null);

  const loadQueue = () => {
    setLoading(true);
    fetchReviewQueue()
      .then(q => {
        setQueue(q);
        if (q.length > 0) {
          setSelected(q[0]);
        } else {
          setSelected(null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleAction = async (action: "approve" | "reject" | "revision" | "comment") => {
    if (!selected) return;
    setActionLoading(true);
    setMessage("");
    try {
      if (action === "approve") {
        await approveProject(selected.id, comment);
        setMessage("Project approved successfully!");
      } else if (action === "reject") {
        await rejectProject(selected.id, comment);
        setMessage("Project rejected.");
      } else if (action === "revision") {
        if (!comment.trim()) {
          alert("Please write revision comments.");
          setActionLoading(false);
          return;
        }
        await requestRevision(selected.id, comment);
        setMessage("Revision requested successfully.");
      } else {
        if (!comment.trim()) {
          alert("Please enter a progress note.");
          setActionLoading(false);
          return;
        }
        await postComment(selected.id, comment);
        setMessage("Progress note added successfully.");
      }
      setComment("");
      loadQueue();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = (id: string) => {
    const url = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"}/projects/${id}/document`;
    window.open(url, "_blank");
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading reviews…</div>;

  if (queue.length === 0) {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold text-gray-900">Project Review</h2>
        <div className="p-16 text-center text-gray-400 bg-white border border-[#E5E7EB] rounded-xl">
          <FileCheck size={40} className="mx-auto mb-3 opacity-40 text-gray-400" />
          <p className="font-medium">No projects to review</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Project Review</h2>
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-[#065F46] text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={15} /> {message}
        </div>
      )}
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-1 space-y-2">
          {queue.map(r => (
            <button key={r.id} onClick={() => { setSelected(r); setComment(""); setMessage(""); }}
              className={cn("w-full text-left p-3.5 rounded-xl border transition-all", selected?.id === r.id ? "border-[#065F46] bg-emerald-50" : "border-gray-200 bg-white hover:border-emerald-300")}>
              <div className="text-xs font-semibold text-gray-900 truncate mb-1">{r.student?.firstName} {r.student?.lastName}</div>
              <div className="text-xs text-gray-400 truncate mb-2">{r.title}</div>
              <SimilarityBadge score={r.similarityScore || 0} />
            </button>
          ))}
        </div>
        {selected && (
          <div className="lg:col-span-4 grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-sm">Project Document</h3>
                <Btn variant="outline" size="sm" onClick={() => handleDownload(selected.id)}><Download size={14} />Download</Btn>
              </div>
              <div className="bg-gray-50 rounded-lg h-64 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200">
                <div className="text-center p-4">
                  <FileText size={36} className="mx-auto mb-2 opacity-50 text-[#065F46]" />
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">{selected.title}</p>
                  <p className="text-xs mt-2 text-gray-400">Click Download to review full PDF/DOCX content.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Originality Report</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Similarity Score</span>
                    <SimilarityBadge score={selected.similarityScore || 0} />
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", (selected.similarityScore || 0) <= 15 ? "bg-emerald-500" : (selected.similarityScore || 0) <= 30 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${selected.similarityScore || 0}%` }} />
                  </div>
                  <div className="text-xs text-gray-500">
                    Risk Level: <span className="font-semibold uppercase">{selected.riskLevel || "LOW"}</span>
                  </div>
                  {selected.similarityScore !== null && (
                    <button
                      onClick={() => setActiveReportProjectId(selected.id)}
                      className="w-full text-center mt-3 text-xs font-semibold text-[#065F46] hover:text-[#054a38] bg-emerald-50 border border-emerald-100 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye size={13} /> View Interactive Report
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Supervisor Comments</h3>
                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Add feedback or notes for the student…"
                  className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10 resize-none mb-3" />
                <div className="flex flex-wrap gap-2">
                  <Btn variant="primary" size="sm" disabled={actionLoading} onClick={() => handleAction("approve")}><Check size={14} />Approve</Btn>
                  <Btn variant="destructive" size="sm" disabled={actionLoading} onClick={() => handleAction("reject")}><X size={14} />Reject</Btn>
                  <Btn variant="outline" size="sm" disabled={actionLoading} onClick={() => handleAction("revision")}><RefreshCw size={14} />Request Revision</Btn>
                  <Btn variant="secondary" size="sm" disabled={actionLoading} onClick={() => handleAction("comment")}><Send size={14} />Add Note</Btn>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeReportProjectId && (
        <SimilarityReportViewer
          projectId={activeReportProjectId}
          onClose={() => setActiveReportProjectId(null)}
        />
      )}
    </div>
  );
}

function SupervisorStudentsView() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupervisorStudents()
      .then(setStudents)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">My Students</h2>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading students…</div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white border border-[#E5E7EB] rounded-xl">
          <Users size={40} className="mx-auto mb-3 opacity-40 text-gray-400" />
          <p className="font-medium">No assigned students found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {students.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-[#E5E7EB] p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <Avatar initials={`${s.firstName?.[0] || ""}${s.lastName?.[0] || ""}`} size="sm" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{s.firstName} {s.lastName}</div>
                  <div className="text-xs text-gray-400">{s.studentProfile?.matricNumber || "No Matric"}</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1 mb-3">
                <div className="font-medium text-gray-800 line-clamp-1">Project: {s.projectTitle || "Untitled"}</div>
                <div className="text-gray-400 capitalize">Status: {s.projectStatus?.toLowerCase()}</div>
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                <span className="text-gray-500">Project Similarity</span>
                <SimilarityBadge score={s.projectSimilarity || 0} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SupervisorAnalyticsView() {
  const [trends, setTrends] = useState<any[]>([]);
  const [similarity, setSimilarity] = useState<any[]>([]);
  const [deptPerf, setDeptPerf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSubmissionTrends().catch(() => []),
      fetchSimilarityTrends().catch(() => []),
      fetchDepartmentPerformance().catch(() => []),
    ]).then(([trendData, simData, deptData]) => {
      setTrends(trendData);
      setSimilarity(simData);
      setDeptPerf(deptData);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
      {loading ? (
        <div className="text-center py-12 text-gray-400 font-medium">Loading analytics…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Submission Trends</h3>
              <ResponsiveContainer width="100%" height={220}>
                {trends.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">No submission data yet</div>
                ) : (
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#065F46" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#065F46" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="submissions" name="Submissions" stroke="#065F46" strokeWidth={2} fill="url(#subGrad)" />
                    <Area type="monotone" dataKey="approved" name="Approved" stroke="#10B981" strokeWidth={2} fill="none" strokeDasharray="4 4" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Similarity Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                {similarity.every(s => s.count === 0) ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">No similarity data yet</div>
                ) : (
                  <BarChart data={similarity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
                    <Bar dataKey="count" name="Projects" fill="#065F46" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          {deptPerf.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="font-semibold text-gray-900 mb-4 text-sm">Department Performance</h3>
              <div className="space-y-3">
                {deptPerf.map((d: any, idx: number) => {
                  const colors = ["#065F46", "#10B981", "#34D399", "#3B82F6", "#F59E0B", "#8B5CF6"];
                  const color = colors[idx % colors.length];
                  return (
                    <div key={d.department} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-gray-700 font-medium truncate max-w-[180px]">{d.department}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-500">
                          <span>{d.total} projects</span>
                          <span className="text-emerald-600 font-semibold">{d.approvalRate}% approved</span>
                          <span>avg {d.avgSimilarity}% sim.</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${d.approvalRate}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboardHome() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [institutionName, setInstitutionName] = useState("AcaShield");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchReportsDashboard().catch(() => null),
      fetchSubmissionTrends().catch(() => []),
      fetchSettings().catch(() => ({ settings: {} })),
    ]).then(([dash, trendData, s]) => {
      setDashboard(dash);
      setTrends(trendData);
      if (s?.settings?.institutionName) setInstitutionName(s.settings.institutionName);
    }).finally(() => setLoading(false));
  }, []);

  const stats = dashboard?.summary;
  const colors = ["#065F46", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#3B82F6", "#F59E0B"];

  return (
    <div className="space-y-6">
      <div className="bg-[#065F46] rounded-xl p-6 text-white">
        <div className="text-emerald-300 text-sm mb-1">Administrator Console</div>
        <h2 className="text-xl font-bold">{institutionName} — Academic Integrity System</h2>
        <p className="text-emerald-300 text-sm mt-1">
          {loading ? "Loading system status…" : `${stats?.totalProjects ?? 0} projects · ${stats?.totalUsers ?? 0} registered users · System operational`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={loading ? "—" : String(stats?.totalProjects ?? 0)} icon={Database} />
        <StatCard label="Active Users" value={loading ? "—" : String(stats?.totalUsers ?? 0)} icon={Users} />
        <StatCard label="Pending Reviews" value={loading ? "—" : String(stats?.pendingProjects ?? 0)} icon={Clock} color="amber" />
        <StatCard label="Avg Similarity" value={loading ? "—" : `${stats?.avgSimilarity ?? 0}%`} icon={BarChart2} color="blue" />
      </div>

      {!loading && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Submission Trends</h3>
            <ResponsiveContainer width="100%" height={220}>
              {trends.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">No submission data yet</div>
              ) : (
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#065F46" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#065F46" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="submissions" name="Submissions" stroke="#065F46" strokeWidth={2} fill="url(#adminGrad)" />
                  <Area type="monotone" dataKey="approved" name="Approved" stroke="#10B981" strokeWidth={2} fill="none" strokeDasharray="4 4" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">By Department</h3>
            <div className="space-y-3 mt-2">
              {dashboard?.departmentBreakdown?.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No department records found</p>
              ) : dashboard?.departmentBreakdown?.map((d: any, idx: number) => {
                const color = colors[idx % colors.length];
                return (
                  <div key={d.department} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-gray-600 truncate max-w-[150px]">{d.department}</span>
                      </div>
                      <span className="font-semibold text-gray-900">{d.count} projects</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${(d.count / (stats?.totalProjects || 1)) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminUsersView() {
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  
  const [subTab, setSubTab] = useState<"all" | "student" | "supervisor" | "admin" | "assignments">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string } | null>(null);
  
  // Create / Edit Form state
  const [role, setRole] = useState<"STUDENT" | "SUPERVISOR">("STUDENT");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  
  // Student Profile fields
  const [studentNumber, setStudentNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [academicYear, setAcademicYear] = useState("2024/2025");
  
  // Supervisor Profile fields
  const [staffNumber, setStaffNumber] = useState("");
  const [title, setTitle] = useState("Dr.");
  const [specialization, setSpecialization] = useState("");

  const loadData = () => {
    setLoading(true);
    const requests: Promise<any>[] = [
      fetchUsers({ role: subTab === "assignments" || subTab === "all" ? undefined : subTab.toUpperCase(), q: search }),
      fetchDepartments().catch(() => []),
      fetchSupervisors().catch(() => []),
    ];
    
    if (subTab === "assignments") {
      requests.push(fetchProjects().catch(() => ({ data: [] })));
    } else {
      requests.push(Promise.resolve({ data: [] }));
    }

    Promise.all(requests)
      .then(([usersRes, depts, sups, projRes]) => {
        setUsers(usersRes.data || []);
        setDepartments(depts || []);
        setSupervisors(sups || []);
        setProjects(projRes.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [subTab, search]);

  useEffect(() => {
    if (departmentId) {
      fetchProgrammes(departmentId)
        .then(setProgrammes)
        .catch(() => setProgrammes([]));
    } else {
      setProgrammes([]);
    }
  }, [departmentId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? All their projects, files, and reviews will be impacted.")) return;
    try {
      await deleteUser(id);
      loadData();
    } catch (err) {
      alert("Failed to delete user.");
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await updateUserStatus(user.id, nextStatus);
      loadData();
    } catch (err) {
      alert("Failed to update user status.");
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tempPassword = `AcaShield@${Math.random().toString(36).slice(-6).toUpperCase()}`;
    const selectedDept = departments.find(d => d.id === departmentId)?.name || "";
    const selectedProg = programmes.find(p => p.id === programmeId)?.name || "";

    const payload = {
      email,
      password: tempPassword,
      firstName,
      lastName,
      role,
      phone,
      studentNumber,
      registrationNumber,
      programme: selectedProg,
      department: selectedDept,
      academicYear,
      staffNumber,
      title,
      specialization,
    };

    try {
      await createUser(payload);
      setCreatedCredentials({ email, pass: tempPassword });
      // Reset form
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setStudentNumber("");
      setRegistrationNumber("");
      setProgrammeId("");
      setDepartmentId("");
      setStaffNumber("");
      setSpecialization("");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create user.");
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setPhone(user.phone || "");
    setStatus(user.status || "ACTIVE");
    
    if (user.role === "STUDENT") {
      setStudentNumber(user.studentProfile?.studentNumber || "");
      setRegistrationNumber(user.studentProfile?.registrationNumber || "");
      setAcademicYear(user.studentProfile?.academicYear || "2024/2025");
      // Pre-select department and programme if matching text names exist
      const matchedDept = departments.find(d => d.name === user.studentProfile?.department);
      if (matchedDept) {
        setDepartmentId(matchedDept.id);
        fetchProgrammes(matchedDept.id).then((progs) => {
          setProgrammes(progs);
          const matchedProg = progs.find((p: any) => p.name === user.studentProfile?.programme);
          if (matchedProg) setProgrammeId(matchedProg.id);
        });
      }
    } else if (user.role === "SUPERVISOR") {
      setStaffNumber(user.supervisorProfile?.staffNumber || "");
      setTitle(user.supervisorProfile?.title || "Dr.");
      setSpecialization(user.supervisorProfile?.specialization || "");
      const matchedDept = departments.find(d => d.name === user.supervisorProfile?.department);
      if (matchedDept) setDepartmentId(matchedDept.id);
    }
    
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDept = departments.find(d => d.id === departmentId)?.name || "";
    const selectedProg = programmes.find(p => p.id === programmeId)?.name || "";

    const payload = {
      firstName,
      lastName,
      phone,
      status,
      role: editingUser.role,
      studentNumber,
      registrationNumber,
      programme: selectedProg,
      department: selectedDept,
      academicYear,
      staffNumber,
      title,
      specialization,
    };

    try {
      await updateUser(editingUser.id, payload);
      setIsEditOpen(false);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update user.");
    }
  };

  const handleAssignSupervisor = async (projectId: string, supervisorId: string) => {
    if (!supervisorId) return;
    try {
      await assignSupervisor(projectId, supervisorId);
      loadData();
    } catch (err) {
      alert("Failed to assign supervisor.");
    }
  };

  const copyCreds = () => {
    if (!createdCredentials) return;
    navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}`);
    alert("Credentials copied to clipboard!");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Administration</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage accounts, profiles, and supervisor assignments.</p>
        </div>
        <div className="flex gap-2">
          {subTab !== "assignments" && (
            <Btn variant="primary" onClick={() => { setCreatedCredentials(null); setIsCreateOpen(true); }} className="flex items-center gap-1.5">
              <Plus size={16} /> Add User Account
            </Btn>
          )}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg">
            <Search size={15} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm outline-none w-40 text-gray-600 placeholder-gray-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "all", label: "All Users" },
          { id: "student", label: "Students" },
          { id: "supervisor", label: "Supervisors" },
          { id: "admin", label: "Admins" },
          { id: "assignments", label: "Project Assignments" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              subTab === t.id
                ? "border-[#065F46] text-[#065F46]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "assignments" ? (
        // Assignments Sub-Tab
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-5 py-3 bg-gray-50 border-b border-[#E5E7EB] text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-5">Project Title / Student</div>
            <div className="col-span-3">Department</div>
            <div className="col-span-4">Assigned Supervisor</div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading assignments…</div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No active projects found</div>
          ) : (
            projects.map((p: any) => (
              <div key={p.id} className="grid md:grid-cols-12 gap-2 md:gap-0 px-5 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-0 items-center">
                <div className="md:col-span-5 pr-4">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Student: {p.student?.firstName} {p.student?.lastName}
                  </div>
                </div>
                <div className="md:col-span-3 flex items-center text-sm text-gray-500">
                  {p.department?.name || "—"}
                </div>
                <div className="md:col-span-4 flex items-center gap-2">
                  <select
                    value={p.supervisorId || ""}
                    onChange={(e) => handleAssignSupervisor(p.id, e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-[#065F46]"
                  >
                    <option value="" disabled>Select Supervisor</option>
                    {supervisors.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.supervisorProfile?.title || "Dr."} {s.firstName} {s.lastName} ({s.supervisorProfile?.specialization || "General"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Standard User Management list
        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-5 py-3 bg-gray-50 border-b border-[#E5E7EB] text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-4">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-3">Matric / Staff Number</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading user directory…</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No accounts found</div>
          ) : (
            users.map((u: any) => (
              <div key={u.id} className="grid md:grid-cols-12 gap-2 md:gap-0 px-5 py-4 border-b border-gray-50 hover:bg-gray-50/60 transition-colors last:border-0 items-center">
                <div className="md:col-span-4 flex items-center gap-3">
                  <Avatar initials={`${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`} size="sm" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-gray-400 truncate">{u.email}</div>
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center"><Badge status={u.role?.toLowerCase()} /></div>
                <div className="md:col-span-3 flex items-center text-sm text-gray-600">
                  {u.role === "STUDENT" ? u.studentProfile?.studentNumber || "—" : u.supervisorProfile?.staffNumber || "—"}
                </div>
                <div className="md:col-span-2 flex items-center">
                  <button onClick={() => handleToggleStatus(u)} className="hover:underline">
                    <Badge status={u.status?.toLowerCase()} />
                  </button>
                </div>
                <div className="md:col-span-1 flex items-center justify-end gap-1">
                  <button onClick={() => openEdit(u)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-[#065F46]" title="Edit Account">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500" title="Delete User">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E5E7EB] w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#065F46] px-5 py-4 text-white flex items-center justify-between">
              <h3 className="font-semibold text-lg">Create New Account</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-white/80 hover:text-white"><X size={18} /></button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1">
              {createdCredentials ? (
                // Success Credentials Screen
                <div className="space-y-4 py-2">
                  <div className="text-center">
                    <CheckCircle className="mx-auto text-emerald-600 mb-2" size={40} />
                    <h4 className="font-bold text-gray-900 text-lg">Account Generated!</h4>
                    <p className="text-xs text-gray-400 mt-1">Copy the credentials below. The password will not be shown again.</p>
                  </div>
                  
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 font-mono text-sm text-[#065F46] space-y-2 select-all">
                    <div><strong>Email:</strong> {createdCredentials.email}</div>
                    <div><strong>Password:</strong> {createdCredentials.pass}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Btn variant="outline" onClick={copyCreds} className="flex-1 justify-center">Copy Credentials</Btn>
                    <Btn variant="primary" onClick={() => { setCreatedCredentials(null); setIsCreateOpen(false); }} className="flex-1 justify-center">Close</Btn>
                  </div>
                </div>
              ) : (
                // Input Form
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  {/* Role selection */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Account Role</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                      <button type="button" onClick={() => setRole("STUDENT")} className={cn("py-1.5 text-xs font-semibold rounded-md transition-all", role === "STUDENT" ? "bg-white text-[#065F46] shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                        Student Account
                      </button>
                      <button type="button" onClick={() => setRole("SUPERVISOR")} className={cn("py-1.5 text-xs font-semibold rounded-md transition-all", role === "SUPERVISOR" ? "bg-white text-[#065F46] shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                        Supervisor Account
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="First Name" placeholder="e.g. John" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    <InputField label="Last Name" placeholder="e.g. Doe" value={lastName} onChange={e => setLastName(e.target.value)} required />
                  </div>
                  
                  <InputField label="Email Address" type="email" placeholder="e.g. j.doe@unilag.edu.ng" value={email} onChange={e => setEmail(e.target.value)} required />
                  <InputField label="Phone Number" placeholder="e.g. +234 803 123 4567" value={phone} onChange={e => setPhone(e.target.value)} />

                  {/* Profile sub-forms */}
                  {role === "STUDENT" ? (
                    <div className="border-t border-gray-100 pt-3 space-y-3">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student Profile Details</div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Matric Number" placeholder="e.g. 190403021" value={studentNumber} onChange={e => setStudentNumber(e.target.value)} required />
                        <InputField label="Registration ID" placeholder="e.g. REG-0988" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} required />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                          <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#065F46]" required>
                            <option value="">Select Department</option>
                            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Programme</label>
                          <select value={programmeId} onChange={e => setProgrammeId(e.target.value)} className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#065F46]" required>
                            <option value="">Select Programme</option>
                            {programmes.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                      
                      <InputField label="Academic Year" placeholder="e.g. 2024/2025" value={academicYear} onChange={e => setAcademicYear(e.target.value)} required />
                    </div>
                  ) : (
                    <div className="border-t border-gray-100 pt-3 space-y-3">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Supervisor Profile Details</div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="Staff Number" placeholder="e.g. STF-0012" value={staffNumber} onChange={e => setStaffNumber(e.target.value)} required />
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Title</label>
                          <select value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#065F46]" required>
                            <option value="Dr.">Dr.</option>
                            <option value="Prof.">Prof.</option>
                            <option value="Mr.">Mr.</option>
                            <option value="Mrs.">Mrs.</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                        <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#065F46]" required>
                          <option value="">Select Department</option>
                          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      
                      <InputField label="Research Specialization" placeholder="e.g. Distributed Cryptography" value={specialization} onChange={e => setSpecialization(e.target.value)} required />
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                    <Btn variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Btn>
                    <Btn variant="primary" type="submit">Generate Account</Btn>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT DRAWER */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-white h-full w-full max-w-md shadow-2xl border-l border-[#E5E7EB] p-6 overflow-y-auto animate-in slide-in-from-right duration-200 flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Edit User Profile</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editingUser.email}</p>
              </div>
              <button onClick={() => { setIsEditOpen(false); setEditingUser(null); }} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <InputField label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                <InputField label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
              
              <InputField label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Account Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#065F46]">
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              {editingUser.role === "STUDENT" ? (
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Student Profile details</div>
                  <InputField label="Matric Number" value={studentNumber} onChange={e => setStudentNumber(e.target.value)} required />
                  <InputField label="Registration ID" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} required />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                      <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#065F46]" required>
                        <option value="">Select Department</option>
                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Programme</label>
                      <select value={programmeId} onChange={e => setProgrammeId(e.target.value)} className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#065F46]" required>
                        <option value="">Select Programme</option>
                        {programmes.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <InputField label="Academic Year" value={academicYear} onChange={e => setAcademicYear(e.target.value)} required />
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-3 space-y-3">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Supervisor Profile details</div>
                  <InputField label="Staff Number" value={staffNumber} onChange={e => setStaffNumber(e.target.value)} required />
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Title</label>
                    <select value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#065F46]" required>
                      <option value="Dr.">Dr.</option>
                      <option value="Prof.">Prof.</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                    <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#065F46]" required>
                      <option value="">Select Department</option>
                      {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  
                  <InputField label="Research Specialization" value={specialization} onChange={e => setSpecialization(e.target.value)} required />
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-100 flex gap-2">
                <Btn variant="ghost" type="button" className="flex-1 justify-center" onClick={() => { setIsEditOpen(false); setEditingUser(null); }}>Cancel</Btn>
                <Btn variant="primary" type="submit" className="flex-1 justify-center">Save Changes</Btn>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminRepositoryView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = ["#065F46", "#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#3B82F6", "#F59E0B"];

  useEffect(() => {
    fetchDepartmentPerformance()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalProjects = data.reduce((acc, d) => acc + d.total, 0);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Repository Management</h2>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading department performance…</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white border border-[#E5E7EB] rounded-xl">No department records available</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((d: any, idx: number) => {
            const color = colors[idx % colors.length];
            const pct = totalProjects > 0 ? Math.round((d.total / totalProjects) * 100) : 0;
            return (
              <div key={d.department} className="bg-white rounded-xl border border-[#E5E7EB] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
                    <Building2 size={18} style={{ color }} />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{d.total}</span>
                </div>
                <h3 className="font-medium text-gray-900 text-sm mb-1">{d.department}</h3>
                <p className="text-xs text-gray-400 mb-2">Approved: {d.approved} ({d.approvalRate}% rate)</p>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                  <span>Avg similarity: {d.avgSimilarity}%</span>
                  <span>{pct}% of total</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminEngineView() {
  const [queue, setQueue] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(30);
  const [savingThreshold, setSavingThreshold] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchProjects({ status: "PROCESSING", limit: 20 }).catch(() => ({ data: [] })),
      fetchReportsDashboard().catch(() => null),
      fetchSettings().catch(() => ({ settings: {} })),
    ]).then(([proj, dash, s]) => {
      setQueue(Array.isArray(proj?.data) ? proj.data : []);
      setStats(dash?.summary ?? null);
      const s2 = s?.settings ?? {};
      setSettings(s2);
      if (s2.similarityThresholdMedium) setThreshold(Number(s2.similarityThresholdMedium));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSaveThreshold = async () => {
    setSavingThreshold(true);
    try {
      await updateSettings({ similarityThresholdMedium: String(threshold) });
    } catch (err) {
      alert("Failed to save threshold.");
    } finally {
      setSavingThreshold(false);
    }
  };

  const processingCount = queue.filter(p => p.status === "PROCESSING").length;
  const totalProcessed = stats?.approvedProjects ?? 0;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Similarity Engine</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Processing Queue" value={loading ? "—" : String(processingCount)} icon={Cpu} color="blue" />
        <StatCard label="Total Approved" value={loading ? "—" : String(totalProcessed)} icon={CheckCircle} />
        <StatCard label="Pending Review" value={loading ? "—" : String(stats?.pendingProjects ?? 0)} icon={Clock} color="amber" />
      </div>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 text-sm">Active Processing Queue</h3>
          <Btn variant="outline" size="sm" onClick={load}><RefreshCw size={14} />Refresh</Btn>
        </div>
        {loading ? (
          <div className="text-center py-6 text-gray-400 text-sm">Loading queue…</div>
        ) : queue.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <CheckCircle size={28} className="mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-medium">No projects currently processing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((p: any) => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100">
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", p.status === "PROCESSING" ? "bg-emerald-500 animate-pulse" : "bg-amber-400")} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{p.title}</div>
                  <div className="text-xs text-gray-400">
                    {p.student?.firstName} {p.student?.lastName} · {p.submittedAt ? new Date(p.submittedAt).toLocaleString() : "—"}
                  </div>
                </div>
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", p.status === "PROCESSING" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                  {p.status === "PROCESSING" ? "Processing…" : p.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Engine Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <div className="text-sm font-medium text-gray-900">Similarity Threshold (Medium Risk)</div>
              <div className="text-xs text-gray-400">Projects above this score are flagged for medium-risk review</div>
            </div>
            <div className="flex items-center gap-2">
              <input type="range" min={10} max={60} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-24 accent-[#065F46]" />
              <span className="text-sm font-semibold text-gray-900 w-8">{threshold}%</span>
              <Btn variant="outline" size="sm" disabled={savingThreshold} onClick={handleSaveThreshold}>
                {savingThreshold ? "…" : "Save"}
              </Btn>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-gray-900">Allowed File Types</div>
              <div className="text-xs text-gray-400">Comma-separated list of accepted file extensions</div>
            </div>
            <span className="text-sm text-gray-600 font-medium">{settings.allowedFileTypes || "pdf, docx"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminReportsView() {
  const [trends, setTrends] = useState<any[]>([]);
  const [similarity, setSimilarity] = useState<any[]>([]);
  const [deptPerf, setDeptPerf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSubmissionTrends().catch(() => []),
      fetchSimilarityTrends().catch(() => []),
      fetchDepartmentPerformance().catch(() => []),
    ]).then(([trendData, simData, deptData]) => {
      setTrends(trendData);
      setSimilarity(simData);
      setDeptPerf(deptData);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Reports &amp; Analytics</h2>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading reports…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Submission Volume</h3>
              <ResponsiveContainer width="100%" height={200}>
                {trends.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">No submission data yet</div>
                ) : (
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="submissions" name="Submissions" fill="#065F46" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="approved" name="Approved" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Similarity Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                {similarity.every(s => s.count === 0) ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">No similarity data yet</div>
                ) : (
                  <BarChart data={similarity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
                    <Bar dataKey="count" name="Projects" fill="#065F46" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
          {deptPerf.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Department Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="text-left py-2 pr-4 font-semibold">Department</th>
                      <th className="text-right py-2 px-4 font-semibold">Total</th>
                      <th className="text-right py-2 px-4 font-semibold">Approved</th>
                      <th className="text-right py-2 px-4 font-semibold">Approval Rate</th>
                      <th className="text-right py-2 pl-4 font-semibold">Avg Similarity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptPerf.map((d: any) => (
                      <tr key={d.department} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{d.department}</td>
                        <td className="py-2.5 px-4 text-right text-gray-600">{d.total}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 font-medium">{d.approved}</td>
                        <td className="py-2.5 px-4 text-right">
                          <span className={cn("font-semibold", d.approvalRate >= 70 ? "text-emerald-600" : d.approvalRate >= 40 ? "text-amber-600" : "text-red-500")}>
                            {d.approvalRate}%
                          </span>
                        </td>
                        <td className="py-2.5 pl-4 text-right">
                          <span className={cn("font-semibold", d.avgSimilarity <= 20 ? "text-emerald-600" : d.avgSimilarity <= 40 ? "text-amber-600" : "text-red-500")}>
                            {d.avgSimilarity}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminSettingsView() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadSettings = () => {
    fetchSettings()
      .then(res => {
        setSettings(res.settings || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await updateSettings(settings);
      setMessage("Settings updated successfully!");
      loadSettings();
    } catch (err) {
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const setKey = (k: string, v: string) => setSettings(s => ({ ...s, [k]: v }));

  if (loading) return <div className="text-center py-12 text-gray-400">Loading system settings…</div>;

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Institution Settings</h2>
      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-[#065F46] text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={15} /> {message}
        </div>
      )}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">Institution Profile</h3>
        <InputField label="Institution Name" placeholder="Institution Name" value={settings.institutionName || ""} onChange={e => setKey("institutionName", e.target.value)} />
        <InputField label="Support Email Address" type="email" placeholder="Support Email Address" value={settings.institutionEmail || ""} onChange={e => setKey("institutionEmail", e.target.value)} />
        <Btn variant="primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Profile Settings"}
        </Btn>
      </div>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Similarity Rules</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Upload Size (bytes)</label>
          <input className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46]"
            value={settings.maxUploadSize || ""} onChange={e => setKey("maxUploadSize", e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Allowed File Extensions</label>
          <input className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#065F46]"
            value={settings.allowedFileTypes || ""} onChange={e => setKey("allowedFileTypes", e.target.value)} />
        </div>
        <Btn variant="primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Similarity Rules"}
        </Btn>
      </div>
    </form>
  );
}

// ─── App Layout Wrapper ───────────────────────────────────────────────────────

function AppLayout({
  role, onLogout, children, activeTab, setActiveTab, title
}: {
  role: "student" | "supervisor" | "admin";
  onLogout: () => void;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (t: string) => void;
  title: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      <Sidebar role={role} activeTab={activeTab} setTab={setActiveTab} onLogout={onLogout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-60 min-h-screen flex flex-col">
        <TopBar title={title} onMenuToggle={() => setSidebarOpen(o => !o)} role={role} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function StudentApp({ onLogout, user }: { onLogout: () => void; user: AuthUser }) {
  const [tab, setTab] = useState<StudentTab>("dashboard");
  const titles: Record<StudentTab, string> = {
    dashboard: "Dashboard", upload: "Upload Project", projects: "My Projects",
    repository: "Research Repository", reports: "Originality Reports",
    notifications: "Notifications", profile: "Profile & Settings"
  };
  return (
    <AppLayout role="student" onLogout={onLogout} activeTab={tab} setActiveTab={t => setTab(t as StudentTab)} title={titles[tab]}>
      {tab === "dashboard" && <StudentDashboardHome setTab={setTab} />}
      {tab === "upload" && <StudentUploadView />}
      {tab === "projects" && <StudentProjectsView />}
      {tab === "repository" && <StudentRepositoryView />}
      {tab === "reports" && <StudentReportsView />}
      {tab === "notifications" && <StudentNotificationsView />}
      {tab === "profile" && <StudentProfileView />}
    </AppLayout>
  );
}

function SupervisorApp({ onLogout, user }: { onLogout: () => void; user: AuthUser }) {
  const [tab, setTab] = useState<SupervisorTab>("dashboard");
  const titles: Record<SupervisorTab, string> = {
    dashboard: "Dashboard", reviews: "Review Queue", students: "My Students", analytics: "Analytics"
  };
  return (
    <AppLayout role="supervisor" onLogout={onLogout} activeTab={tab} setActiveTab={t => setTab(t as SupervisorTab)} title={titles[tab]}>
      {tab === "dashboard" && <SupervisorDashboardHome />}
      {tab === "reviews" && <SupervisorReviewView />}
      {tab === "students" && <SupervisorStudentsView />}
      {tab === "analytics" && <SupervisorAnalyticsView />}
    </AppLayout>
  );
}

function AdminApp({ onLogout, user }: { onLogout: () => void; user: AuthUser }) {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const titles: Record<AdminTab, string> = {
    dashboard: "Admin Dashboard", users: "User Management", repository: "Repository",
    engine: "Similarity Engine", reports: "Reports", settings: "Settings"
  };
  return (
    <AppLayout role="admin" onLogout={onLogout} activeTab={tab} setActiveTab={t => setTab(t as AdminTab)} title={titles[tab]}>
      {tab === "dashboard" && <AdminDashboardHome />}
      {tab === "users" && <AdminUsersView />}
      {tab === "repository" && <AdminRepositoryView />}
      {tab === "engine" && <AdminEngineView />}
      {tab === "reports" && <AdminReportsView />}
      {tab === "settings" && <AdminSettingsView />}
    </AppLayout>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [resetToken, setResetToken] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Restore session on first load & parse URL parameters
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    
    if (path.includes("reset-password") || token) {
      if (token) {
        setResetToken(token);
        setView("reset-password");
      }
    } else {
      const stored = getCurrentUser();
      if (stored) {
        setCurrentUser(stored);
        const roleView = stored.role === "STUDENT" ? "student" : stored.role === "SUPERVISOR" ? "supervisor" : "admin";
        setView(roleView);
      }
    }
    setInitializing(false);
  }, []);

  const handleLogin = (user: AuthUser) => {
    setCurrentUser(user);
    const roleView = user.role === "STUDENT" ? "student" : user.role === "SUPERVISOR" ? "supervisor" : "admin";
    setView(roleView);
  };

  const handleLogout = async () => {
    await authLogout();
    setCurrentUser(null);
    setView("landing");
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 bg-[#065F46] rounded-xl flex items-center justify-center animate-pulse">
            <Shield size={20} className="text-white" />
          </div>
          <p className="text-sm text-gray-500">Loading AcaShield…</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (view === "landing") return <LandingPage setView={setView} />;
    if (view === "login") return <LoginView setView={setView} onLogin={handleLogin} />;
    if (view === "register") return <RegisterView setView={setView} onLogin={handleLogin} />;
    if (view === "forgot-password") return <ForgotPasswordView setView={setView} />;
    if (view === "reset-password") return <ResetPasswordView setView={setView} token={resetToken} />;
    if (view === "student" && currentUser) return <StudentApp onLogout={handleLogout} user={currentUser} />;
    if (view === "supervisor" && currentUser) return <SupervisorApp onLogout={handleLogout} user={currentUser} />;
    if (view === "admin" && currentUser) return <AdminApp onLogout={handleLogout} user={currentUser} />;
    return <LoginView setView={setView} onLogin={handleLogin} />;
  };

  return (
    <>
      {isOffline && (
        <div className="bg-red-600 text-white py-2.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <AlertTriangle size={14} className="animate-pulse" />
          You are currently offline. Document upload and submissions are disabled.
        </div>
      )}
      {renderContent()}
    </>
  );
}

