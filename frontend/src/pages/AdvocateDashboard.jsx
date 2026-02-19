import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  Scale, LogOut, User, FileText, QrCode, ShoppingCart, History, 
  Plus, ShieldCheck, Clock, CheckCircle2, AlertCircle,
  LayoutDashboard, Users, Menu, X, Download, Eye, Copy,
  Stamp, CreditCard, Truck, Award, Lock, Fingerprint,
  Sparkles, ArrowRight, Globe, TrendingUp, Share2, BookOpen,
  Play, ChevronRight, ExternalLink, Zap, Target, BarChart3,
  Info, HelpCircle, MousePointer, Upload, Scan, LinkIcon, DollarSign
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Profile Completion Modal - Shows on first login if profile incomplete
const ProfileCompletionModal = ({ isOpen, onClose, completion, onNavigate }) => {
  const benefits = [
    { icon: Globe, text: "Appear in the public advocate directory", color: "text-emerald-400" },
    { icon: Users, text: "Get discovered by potential clients", color: "text-blue-400" },
    { icon: TrendingUp, text: "Increase your professional visibility", color: "text-purple-400" },
    { icon: Award, text: "Showcase your expertise & achievements", color: "text-yellow-400" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0d14] border-white/10 max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center text-white">
            Complete Your Professional Profile
          </DialogTitle>
          <DialogDescription className="text-center text-white/60">
            You're only {100 - completion}% away from unlocking your full professional presence!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Profile Completion</span>
              <span className="text-purple-400 font-bold">{completion}%</span>
            </div>
            <Progress value={completion} className="h-3 bg-white/10" />
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            {benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <benefit.icon className={`w-5 h-5 ${benefit.color}`} />
                <span className="text-white/80 text-sm">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 border-white/20 text-white hover:bg-white/10">
            Later
          </Button>
          <Button 
            onClick={() => { onClose(); onNavigate(); }}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            Complete Profile
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Stamp Tutorial Modal
const StampTutorialModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    {
      title: "Upload Your Document",
      description: "Click 'Stamp Document' and upload a PDF, DOCX, or image file. We support files up to 10MB.",
      icon: Upload,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Position Your Stamp",
      description: "Drag the stamp preview to position it on your document. You can resize and place it on any page.",
      icon: MousePointer,
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Customize & Generate",
      description: "Choose your stamp shape, add your signature, and click Generate. Your stamped PDF downloads automatically.",
      icon: Zap,
      color: "from-emerald-500 to-green-500"
    },
    {
      title: "Share & Verify",
      description: "Recipients can scan the QR code or visit the verification page to confirm authenticity.",
      icon: Scan,
      color: "from-orange-500 to-red-500"
    }
  ];

  const currentStep = steps[step];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0d14] border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            How to Stamp Documents
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === step ? 'w-8 bg-emerald-500' : 'bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Current Step */}
          <div className="text-center">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center mx-auto mb-4`}>
              <currentStep.icon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Step {step + 1}: {currentStep.title}
            </h3>
            <p className="text-white/60">{currentStep.description}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex-1 border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
          >
            Previous
          </Button>
          {step < steps.length - 1 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Link to="/documents" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600">
                Start Stamping
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Share Profile Modal
const ShareProfileModal = ({ isOpen, onClose, user }) => {
  const profileUrl = `${window.location.origin}/advocate/${user?.id}`;
  const verifyUrl = `${window.location.origin}/verify`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const shareLinks = [
    { label: "Your Profile", url: profileUrl, icon: User, color: "text-purple-400" },
    { label: "Verification Page", url: verifyUrl, icon: ShieldCheck, color: "text-emerald-400" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0d14] border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-400" />
            Share Your Links
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Share these links with clients and colleagues
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {shareLinks.map((link, i) => (
            <div key={i} className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <link.icon className={`w-4 h-4 ${link.color}`} />
                <span className="text-white font-medium">{link.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={link.url}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(link.url, link.label)}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 text-white">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const DashboardLayout = ({ children, title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  const navItems = isAdmin ? [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: Users, label: "Advocates", path: "/admin/advocates" },
    { icon: ShoppingCart, label: "Orders", path: "/admin/orders" },
  ] : [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BarChart3, label: "Practice Management", path: "/practice" },
    { icon: DollarSign, label: "Payments", path: "/payments" },
    { icon: FileText, label: "Stamp Document", path: "/documents" },
    { icon: QrCode, label: "Stamp Verification", path: "/stamp-verification" },
    { icon: Stamp, label: "Physical Stamps", path: "/order-stamp" },
    { icon: History, label: "Order History", path: "/orders" },
    { icon: User, label: "My Profile", path: "/profile" },
    { icon: Fingerprint, label: "My Stamps", path: "/my-stamps" },
  ];

  return (
    <div className="min-h-screen bg-[#02040A] text-white">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-white p-1">
              <img src="/assets/tls-logo.png" alt="TLS" className="w-full h-full object-contain" />
            </div>
          </Link>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white/60">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-72 bg-[#050810] border-r border-white/5 z-40 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-white p-1.5">
              <img src="/assets/tls-logo.png" alt="TLS" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-white font-heading font-semibold">TLS Portal</p>
              <p className="text-white/40 text-xs">{isAdmin ? "Administration" : "Advocate Portal"}</p>
            </div>
          </Link>
        </div>

        {/* User Card */}
        {!isAdmin && (
          <div className="p-4 border-b border-white/5">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-tls-gold/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-tls-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{user?.full_name}</p>
                  <p className="text-white/40 text-xs font-mono">{user?.tls_member_number}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge className={user?.practicing_status === "Active" ? "bg-tls-verified/20 text-tls-verified border-tls-verified/30" : "bg-yellow-500/20 text-yellow-500"}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {user?.practicing_status}
                </Badge>
                <span className="text-xs text-white/40">{user?.region}</span>
              </div>
            </div>
          </div>
        )}
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-tls-gold/20 text-tls-gold border border-tls-gold/30' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-white/50 hover:text-white hover:bg-white/5 rounded-xl"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        {/* Page Header */}
        <div className="glass border-b border-white/5 px-6 lg:px-8 py-6 sticky top-0 lg:top-0 z-20">
          <h1 className="font-heading text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-white/50 mt-1">{subtitle}</p>}
        </div>
        
        {/* Page Content */}
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

const AdvocateDashboard = () => {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentStamps, setRecentStamps] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentVerifications, setRecentVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [missingFields, setMissingFields] = useState([]);
  const [showProfileBanner, setShowProfileBanner] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    checkFirstLogin();
  }, []);

  const checkFirstLogin = () => {
    const hasSeenModal = localStorage.getItem(`profile_modal_seen_${user?.id}`);
    if (!hasSeenModal && user?.id) {
      setTimeout(() => {
        if (profileCompletion < 80) {
          setShowProfileModal(true);
          localStorage.setItem(`profile_modal_seen_${user?.id}`, 'true');
        }
      }, 1500);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [statsRes, stampsRes, ordersRes, verificationsRes] = await Promise.all([
        axios.get(`${API}/advocate/stats`, getAuthHeaders()),
        axios.get(`${API}/digital-stamps`, getAuthHeaders()),
        axios.get(`${API}/orders`, getAuthHeaders()),
        axios.get(`${API}/advocate/recent-verifications?limit=5`, getAuthHeaders()).catch(() => ({ data: { verifications: [] } }))
      ]);
      
      setStats(statsRes.data);
      setRecentStamps(stampsRes.data?.slice(0, 5) || []);
      setRecentOrders(ordersRes.data?.slice(0, 3) || []);
      setRecentVerifications(verificationsRes.data?.verifications || []);
      setProfileCompletion(statsRes.data?.profile_completion || 0);
      
      // Calculate missing fields
      calculateMissingFields();
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMissingFields = () => {
    const fields = [
      { key: 'full_name', label: 'Full Name', check: () => !!user?.full_name },
      { key: 'bio', label: 'Professional Bio', check: () => !!user?.public_profile?.bio },
      { key: 'practice_areas', label: 'Practice Areas', check: () => user?.public_profile?.practice_areas?.length > 0 },
      { key: 'education', label: 'Education', check: () => user?.public_profile?.education?.length > 0 },
      { key: 'experience', label: 'Experience', check: () => user?.public_profile?.experience?.length > 0 },
      { key: 'location', label: 'Location', check: () => !!user?.public_profile?.location },
    ];
    const missing = fields.filter(f => !f.check()).map(f => f.label);
    setMissingFields(missing);
  };

  const copyStampId = (id) => {
    navigator.clipboard.writeText(id);
    toast.success("Stamp ID copied!");
  };

  const copyVerifyLink = (stampId) => {
    const url = `${window.location.origin}/verify?id=${stampId}`;
    navigator.clipboard.writeText(url);
    toast.success("Verification link copied!");
  };

  return (
    <DashboardLayout title="Welcome Back" subtitle={user?.full_name}>
      {/* Profile Completion Modal */}
      <ProfileCompletionModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        completion={profileCompletion}
        onNavigate={() => navigate('/profile?tab=public')}
      />

      {/* Stamp Tutorial Modal */}
      <StampTutorialModal 
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
      />

      {/* Share Profile Modal */}
      <ShareProfileModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        user={user}
      />

      {/* ========== SECTION 1: Welcome & Primary CTA ========== */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Welcome Card */}
        <Card className="lg:col-span-2 glass-card rounded-2xl border-tls-gold/20" data-testid="credential-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-tls-gold/20 flex items-center justify-center">
                <Award className="w-7 h-7 text-tls-gold" />
              </div>
              <div className="flex-1">
                <p className="text-white/50 text-xs">TLS Member</p>
                <p className="font-heading text-xl font-bold text-white">{user?.tls_member_number}</p>
                <div className="flex items-center gap-3 mt-1">
                  <Badge className="bg-tls-verified/20 text-tls-verified border-0 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {user?.practicing_status}
                  </Badge>
                  <span className="text-white/40 text-xs">Roll: {user?.roll_number}</span>
                </div>
              </div>
              <div className="hidden md:flex gap-2">
                <div className="glass rounded-lg px-3 py-2 text-center">
                  <p className="text-[10px] text-white/40">Ranking</p>
                  <p className="text-sm font-bold text-yellow-400">
                    {stats?.percentile_rank <= 10 ? "Top 10%" : `Top ${stats?.percentile_rank || 100}%`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary CTA - Stamp Document */}
        <Link to="/documents" className="block">
          <Card className="h-full glass-card rounded-2xl border-emerald-500/30 hover:border-emerald-500/50 transition-all bg-gradient-to-br from-emerald-500/10 to-green-500/5 cursor-pointer group" data-testid="quick-stamp-document">
            <CardContent className="p-5 h-full flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white">Stamp Document</h3>
                <p className="text-white/50 text-xs">Add QR verification</p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ========== SECTION 2: Key Stats ========== */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="glass-card rounded-xl border-white/10">
          <CardContent className="p-4 text-center">
            <QrCode className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats?.stamp_count || 0}</p>
            <p className="text-[10px] text-white/50">Documents Stamped</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card rounded-xl border-white/10">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats?.total_verifications || 0}</p>
            <p className="text-[10px] text-white/50">Times Verified</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card rounded-xl border-white/10">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats?.this_week_stamps || 0}</p>
            <p className="text-[10px] text-white/50">This Week</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card rounded-xl border-white/10">
          <CardContent className="p-4 text-center">
            <CreditCard className="w-6 h-6 text-tls-gold mx-auto mb-2" />
            <p className="text-xl font-bold text-emerald-400">{((stats?.savings?.total_savings || 150000) / 1000).toFixed(0)}K</p>
            <p className="text-[10px] text-white/50">TZS Saved</p>
          </CardContent>
        </Card>
      </div>

      {/* ========== SECTION 3: Two Column - Progress & Activity ========== */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column: Progress & Achievements */}
        <div className="space-y-4">
          {/* Next Achievement Progress */}
          {stats?.next_achievement && (
            <Card className="glass-card rounded-2xl border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5" data-testid="next-achievement">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-2xl">
                    {stats.next_achievement.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">{stats.next_achievement.name}</h3>
                      <span className="text-yellow-400 text-sm font-medium">
                        {stats.next_achievement.current}/{stats.next_achievement.threshold}
                      </span>
                    </div>
                    <p className="text-white/50 text-xs">{stats.next_achievement.description}</p>
                  </div>
                </div>
                <Progress value={stats.next_achievement.progress} className="h-2 bg-white/10" />
              </CardContent>
            </Card>
          )}

          {/* Earned Achievements */}
          {stats?.earned_achievements?.length > 0 && (
            <Card className="glass-card rounded-2xl border-white/10" data-testid="earned-achievements">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" />
                  Your Achievements ({stats.earned_achievements.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.earned_achievements.slice(0, 6).map((ach) => (
                    <div 
                      key={ach.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                      title={ach.description}
                    >
                      <span className="text-lg">{ach.icon}</span>
                      <span className="text-xs font-medium text-white">{ach.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Savings */}
          <Card className="glass-card rounded-2xl border-emerald-500/20" data-testid="cost-savings">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Savings vs Physical Stamps
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-red-500/10 rounded-lg text-center">
                  <p className="text-[10px] text-red-400">Physical</p>
                  <p className="text-lg font-bold text-red-400">{(stats?.savings?.total_physical_cost || 150000).toLocaleString()}</p>
                  <p className="text-[10px] text-white/30">TZS</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg text-center">
                  <p className="text-[10px] text-emerald-400">Digital</p>
                  <p className="text-lg font-bold text-emerald-400">FREE</p>
                  <p className="text-[10px] text-white/30">with TLS</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="space-y-4">
          {/* Recent Verifications */}
          <Card className="glass-card rounded-2xl border-purple-500/20" data-testid="recent-verifications">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                Recent Verifications
              </h3>
              {recentVerifications.length === 0 ? (
                <div className="text-center py-4">
                  <Target className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-xs">Verifications will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentVerifications.slice(0, 4).map((v, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">
                          {v.institution || "Document verified"}
                        </p>
                        <p className="text-[10px] text-white/40">{v.stamp_id}</p>
                      </div>
                      <span className="text-[10px] text-white/30">
                        {new Date(v.verified_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Stamps */}
          <Card className="glass-card rounded-2xl border-white/10" data-testid="recent-stamps-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  Recent Stamps
                </h3>
                <Link to="/stamp-verification" className="text-emerald-400 text-xs hover:underline">
                  View All →
                </Link>
              </div>
              {recentStamps.length === 0 ? (
                <div className="text-center py-4">
                  <QrCode className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-xs">No stamps yet</p>
                  <Link to="/documents">
                    <Button size="sm" className="mt-2 bg-emerald-500 hover:bg-emerald-600 text-xs h-8">
                      Create First Stamp
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentStamps.slice(0, 4).map((stamp) => (
                    <div key={stamp.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        <span className="font-mono text-xs text-white">{stamp.stamp_id}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyVerifyLink(stamp.stamp_id)}
                          className="h-6 w-6 p-0 text-white/40 hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Link to={`/verify?id=${stamp.stamp_id}`}>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-400">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========== SECTION 4: Quick Actions Bar ========== */}
      <Card className="glass-card rounded-2xl border-white/10 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setShowTutorialModal(true)}
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10 h-9 text-xs"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                How to Stamp
              </Button>
              <Button 
                onClick={() => setShowShareModal(true)}
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10 h-9 text-xs"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Links
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/my-stamps">
                <Button variant="ghost" className="text-white/60 hover:text-white h-9 text-xs">
                  <Fingerprint className="w-4 h-4 mr-1" />
                  Stamp Templates
                </Button>
              </Link>
              <Link to="/order-stamp">
                <Button variant="ghost" className="text-white/60 hover:text-white h-9 text-xs">
                  <Stamp className="w-4 h-4 mr-1" />
                  Physical Stamps
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" className="text-white/60 hover:text-white h-9 text-xs">
                  <User className="w-4 h-4 mr-1" />
                  Profile
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== SECTION 5: Profile Completion (if incomplete) ========== */}
      {showProfileBanner && profileCompletion < 100 && (
        <Card className="glass-card rounded-2xl border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-purple-500/10 overflow-hidden relative" data-testid="profile-completion-banner">
          <button 
            onClick={() => setShowProfileBanner(false)}
            className="absolute top-3 right-3 text-white/40 hover:text-white z-10"
          >
            <X className="w-4 h-4" />
          </button>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-white text-sm">Complete Your Profile</h3>
                  <span className={`text-sm font-medium ${profileCompletion >= 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                    {profileCompletion}%
                  </span>
                </div>
                <Progress value={profileCompletion} className="h-1.5 bg-white/10" />
              </div>
              <Link to="/profile?tab=public">
                <Button size="sm" className="bg-purple-500 hover:bg-purple-600 text-xs h-8">
                  Complete
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
};

export default AdvocateDashboard;
export { DashboardLayout };
