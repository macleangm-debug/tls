import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import {
  Building, Shield, Key, Eye, Package, CreditCard, Loader2,
  CheckCircle2, AlertTriangle, LogOut, Copy, ExternalLink,
  TrendingUp, Calendar, Users, FileText, Code, BarChart3,
  Zap, Lock, Globe, Hospital, Landmark, Building2, ArrowRight,
  Sparkles, Clock, Activity, Search, Download, Upload, 
  ShieldCheck, XCircle, RefreshCw, ChevronRight, Menu, X,
  QrCode, Fingerprint, Bell, Settings, HelpCircle, Webhook,
  Receipt, FileCheck, Send, AlertCircle,
  RotateCcw, Trash2, PlayCircle
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ORGANIZATION_TYPES = [
  { id: "bank", name: "Bank / Financial Institution", icon: Landmark, color: "blue" },
  { id: "government", name: "Government Agency", icon: Building2, color: "purple" },
  { id: "hospital", name: "Hospital / Healthcare", icon: Hospital, color: "red" },
  { id: "court", name: "Court / Legal Institution", icon: Building, color: "amber" },
  { id: "corporate", name: "Corporate / Business", icon: Globe, color: "emerald" },
  { id: "other", name: "Other Organization", icon: Building, color: "gray" }
];

const InstitutionalPortal = () => {
  const navigate = useNavigate();
  const [view, setView] = useState("login");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("inst_token"));
  const [institution, setInstitution] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [packages, setPackages] = useState(null);
  const [apiDocs, setApiDocs] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [verifyStampId, setVerifyStampId] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Form states
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "", organization_type: "", contact_name: "",
    contact_email: "", contact_phone: "", billing_address: "", password: ""
  });
  const [billing, setBilling] = useState(null);
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState([]);
  const [savingWebhook, setSavingWebhook] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDashboard();
    }
  }, [token]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, pkgRes, docsRes] = await Promise.all([
        axios.get(`${API}/institutional/dashboard`, getAuthHeaders()),
        axios.get(`${API}/institutional/packages`),
        axios.get(`${API}/institutional/api-docs`, getAuthHeaders())
      ]);
      setDashboard(dashRes.data);
      setInstitution(dashRes.data.institution);
      setPackages(pkgRes.data);
      setApiDocs(docsRes.data);
      setView("dashboard");
      
      // Fetch billing and webhook info
      fetchBilling();
      fetchWebhooks();
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
      }
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", loginForm.email);
      formData.append("password", loginForm.password);
      
      const response = await axios.post(`${API}/institutional/login`, formData);
      localStorage.setItem("inst_token", response.data.token);
      setToken(response.data.token);
      setInstitution(response.data.institution);
      toast.success("Welcome back!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(registerForm).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      await axios.post(`${API}/institutional/register`, formData);
      toast.success("Registration successful! Please login.");
      setView("login");
      setLoginForm({ email: registerForm.contact_email, password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchBilling = async () => {
    try {
      const response = await axios.get(`${API}/institutional/billing`, getAuthHeaders());
      setBilling(response.data);
    } catch (error) {
      console.error("Failed to fetch billing:", error);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const [webhookRes, logsRes] = await Promise.all([
        axios.get(`${API}/institutional/webhooks`, getAuthHeaders()),
        axios.get(`${API}/institutional/webhooks/logs`, getAuthHeaders())
      ]);
      setWebhookConfig(webhookRes.data);
      setWebhookLogs(logsRes.data.logs || []);
      
      if (webhookRes.data.webhook) {
        setWebhookUrl(webhookRes.data.webhook.url || "");
        setWebhookEvents(webhookRes.data.webhook.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch webhooks:", error);
    }
  };

  const saveWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }
    
    setSavingWebhook(true);
    try {
      await axios.post(`${API}/institutional/webhooks`, {
        url: webhookUrl,
        events: webhookEvents.length > 0 ? webhookEvents : ["verification.success", "verification.failed"],
        enabled: true
      }, getAuthHeaders());
      
      toast.success("Webhook saved successfully!");
      fetchWebhooks();
    } catch (error) {
      toast.error("Failed to save webhook");
    } finally {
      setSavingWebhook(false);
    }
  };

  const testWebhook = async () => {
    try {
      const response = await axios.post(`${API}/institutional/webhooks/test`, {}, getAuthHeaders());
      if (response.data.error) {
        toast.error(response.data.message);
      } else {
        toast.success(response.data.message);
        fetchWebhooks();
      }
    } catch (error) {
      toast.error("Failed to test webhook");
    }
  };

  const regenerateSecret = async () => {
    try {
      const response = await axios.post(`${API}/institutional/webhooks/regenerate-secret`, {}, getAuthHeaders());
      toast.success("Signing secret regenerated!");
      fetchWebhooks();
    } catch (error) {
      toast.error("Failed to regenerate secret");
    }
  };

  const handleSubscribe = async (packageId) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("package", packageId);
      
      await axios.post(`${API}/institutional/billing/subscribe`, formData, getAuthHeaders());
      toast.success("Subscription activated!");
      fetchDashboard();
      fetchBilling();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Subscription failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStamp = async (e) => {
    e.preventDefault();
    if (!verifyStampId.trim()) return;
    
    setVerifying(true);
    setVerifyResult(null);
    try {
      const response = await axios.get(
        `${API}/institutional/verify/${verifyStampId}`,
        getAuthHeaders()
      );
      setVerifyResult(response.data);
    } catch (error) {
      setVerifyResult({
        valid: false,
        message: error.response?.data?.detail || "Verification failed"
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("inst_token");
    setToken(null);
    setInstitution(null);
    setDashboard(null);
    setView("login");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // LOGIN VIEW - Modern Design
  if (view === "login" && !token) {
    return (
      <div className="min-h-screen bg-[#02040A] flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-transparent relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          <div className="relative z-10 flex flex-col justify-center px-16">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/30">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              TLS Institutional<br />Verification Portal
            </h1>
            <p className="text-xl text-white/60 mb-8 max-w-md">
              Secure document verification API for banks, hospitals, courts, and government agencies.
            </p>
            
            <div className="space-y-4">
              {[
                { icon: Zap, text: "Real-time verification API" },
                { icon: Lock, text: "Enterprise-grade security" },
                { icon: BarChart3, text: "Detailed analytics dashboard" },
                { icon: Users, text: "Unlimited team members" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-white/70">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute top-20 right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Institutional Portal</h1>
            </div>

            <Card className="bg-white/[0.03] border-white/10 rounded-3xl shadow-2xl">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
                <CardDescription className="text-white/50">
                  Sign in to your institutional account
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-4">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">Email Address</Label>
                    <Input
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:border-blue-500"
                      placeholder="institution@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 text-sm">Password</Label>
                    <Input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl focus:border-blue-500"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl text-lg font-semibold shadow-lg shadow-blue-500/25" 
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                  </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-center text-white/40 text-sm mb-4">New organization?</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setView("register")} 
                    className="w-full h-11 border-white/20 text-white hover:bg-white/10 rounded-xl"
                  >
                    Register Your Organization
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-white/30 text-sm mt-6">
              Powered by Tanganyika Law Society
            </p>
          </div>
        </div>
      </div>
    );
  }

  // REGISTER VIEW - Modern Design
  if (view === "register" && !token) {
    return (
      <div className="min-h-screen bg-[#02040A] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <button 
            onClick={() => setView("login")}
            className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Login
          </button>

          <Card className="bg-white/[0.03] border-white/10 rounded-3xl shadow-2xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-white">Register Organization</CardTitle>
              <CardDescription className="text-white/50">
                Create your institutional verification account
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <form onSubmit={handleRegister} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-white/70">Organization Name *</Label>
                    <Input
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                      placeholder="e.g., National Bank of Tanzania"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-white/70">Organization Type *</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ORGANIZATION_TYPES.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setRegisterForm({ ...registerForm, organization_type: type.id })}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                            registerForm.organization_type === type.id
                              ? "bg-blue-500/20 border-blue-500"
                              : "bg-white/5 border-white/10 hover:border-white/30"
                          }`}
                        >
                          <type.icon className={`w-5 h-5 ${
                            registerForm.organization_type === type.id ? "text-blue-400" : "text-white/50"
                          }`} />
                          <span className={`text-xs ${
                            registerForm.organization_type === type.id ? "text-white" : "text-white/60"
                          }`}>
                            {type.name.split(" / ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70">Contact Person *</Label>
                    <Input
                      value={registerForm.contact_name}
                      onChange={(e) => setRegisterForm({ ...registerForm, contact_name: e.target.value })}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                      placeholder="Full name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70">Contact Phone *</Label>
                    <Input
                      value={registerForm.contact_phone}
                      onChange={(e) => setRegisterForm({ ...registerForm, contact_phone: e.target.value })}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                      placeholder="+255 XXX XXX XXX"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70">Email Address *</Label>
                    <Input
                      type="email"
                      value={registerForm.contact_email}
                      onChange={(e) => setRegisterForm({ ...registerForm, contact_email: e.target.value })}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                      placeholder="email@organization.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70">Password *</Label>
                    <Input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                      placeholder="Min 8 characters"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-white/70">Billing Address</Label>
                    <Input
                      value={registerForm.billing_address}
                      onChange={(e) => setRegisterForm({ ...registerForm, billing_address: e.target.value })}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                      placeholder="Full address"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl text-lg font-semibold" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // DASHBOARD LOADING
  if (loading && !dashboard) {
    return (
      <div className="min-h-screen bg-[#02040A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-white/50">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const usage = dashboard?.usage || {};
  const OrgType = ORGANIZATION_TYPES.find(t => t.id === institution?.organization_type);
  const OrgIcon = OrgType?.icon || Building;

  // DASHBOARD VIEW - Modern Design with Sidebar
  return (
    <div className="min-h-screen bg-[#02040A] flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0a0f1a] border-r border-white/10 transform transition-transform lg:transform-none overflow-hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">TLS Verify</p>
                <p className="text-white/40 text-xs">Institutional Portal</p>
              </div>
            </div>
          </div>

          {/* Organization Info */}
          <div className="p-4 mx-4 mt-4 bg-white/5 rounded-2xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-${OrgType?.color || 'blue'}-500/20 flex items-center justify-center`}>
                <OrgIcon className={`w-6 h-6 text-${OrgType?.color || 'blue'}-400`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{institution?.name}</p>
                <p className="text-white/40 text-xs capitalize">{institution?.organization_type}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Badge className={`${
                institution?.subscription_status === "active" 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              }`}>
                {institution?.subscription_status || "Inactive"}
              </Badge>
              <span className="text-white/40 text-xs capitalize">{institution?.package || "Free"} Plan</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            {[
              { id: "overview", icon: BarChart3, label: "Overview" },
              { id: "verify", icon: ShieldCheck, label: "Verify Document" },
              { id: "api", icon: Code, label: "API Integration" },
              { id: "webhooks", icon: Globe, label: "Webhooks" },
              { id: "billing", icon: CreditCard, label: "Billing" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-white/10 space-y-2 flex-shrink-0">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-all">
              <HelpCircle className="w-5 h-5" />
              <span>Help & Support</span>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#02040A]/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-white capitalize">{activeTab}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20 rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Eye className="w-5 h-5 text-blue-400" />
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 border-0 text-xs">This Period</Badge>
                    </div>
                    <p className="text-3xl font-bold text-white">{usage.current || 0}</p>
                    <p className="text-sm text-white/50 mt-1">Verifications Used</p>
                    <Progress value={usage.percentage || 0} className="mt-3 h-1.5 bg-white/10" />
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{usage.total_all_time || 0}</p>
                    <p className="text-sm text-white/50 mt-1">Total All Time</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20 rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{institution?.days_remaining || 0}</p>
                    <p className="text-sm text-white/50 mt-1">Days Remaining</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/20 rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-amber-400" />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {typeof usage.limit === 'number' ? usage.limit : '∞'}
                    </p>
                    <p className="text-sm text-white/50 mt-1">Monthly Limit</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Verify + API Key */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Quick Verify */}
                <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      Quick Verify
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleVerifyStamp} className="flex gap-2">
                      <Input
                        value={verifyStampId}
                        onChange={(e) => setVerifyStampId(e.target.value.toUpperCase())}
                        placeholder="Enter Stamp ID (TLS-XXXXXXXX)"
                        className="flex-1 h-11 bg-white/5 border-white/10 text-white rounded-xl font-mono"
                      />
                      <Button 
                        type="submit" 
                        disabled={verifying}
                        className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                      >
                        {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                      </Button>
                    </form>
                    
                    {verifyResult && (
                      <div className={`mt-4 p-4 rounded-xl ${
                        verifyResult.valid 
                          ? "bg-emerald-500/10 border border-emerald-500/30" 
                          : "bg-red-500/10 border border-red-500/30"
                      }`}>
                        <div className="flex items-center gap-3">
                          {verifyResult.valid ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-400" />
                          )}
                          <div>
                            <p className={`font-semibold ${verifyResult.valid ? "text-emerald-400" : "text-red-400"}`}>
                              {verifyResult.valid ? "Valid Document" : "Invalid"}
                            </p>
                            <p className="text-white/60 text-sm">{verifyResult.message}</p>
                          </div>
                        </div>
                        {verifyResult.valid && verifyResult.advocate_name && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-white/50 text-xs">Certified by</p>
                            <p className="text-white font-medium">{verifyResult.advocate_name}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* API Key */}
                <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Key className="w-5 h-5 text-yellow-400" />
                      Your API Key
                    </CardTitle>
                    <CardDescription className="text-white/50">
                      Use this key to authenticate API requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-3 bg-black/40 rounded-xl text-emerald-400 font-mono text-sm truncate">
                        {institution?.api_key}
                      </code>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(institution?.api_key)}
                        className="h-10 px-3 border-white/20 text-white hover:bg-white/10 rounded-xl"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-white/40 text-xs mt-3 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Keep this key secure. Do not share publicly.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Verifications */}
              <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg text-white">Recent Verifications</CardTitle>
                  <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {dashboard?.recent_verifications?.length > 0 ? (
                    <div className="space-y-2">
                      {dashboard.recent_verifications.slice(0, 5).map((v, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <span className="text-white font-mono text-sm">{v.stamp_id}</span>
                              {v.document_name && (
                                <p className="text-white/40 text-xs">{v.document_name}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-white/40 text-sm">
                            {new Date(v.verified_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-white/20" />
                      </div>
                      <p className="text-white/40">No verifications yet</p>
                      <p className="text-white/30 text-sm mt-1">Start verifying documents using the API</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* VERIFY TAB */}
          {activeTab === "verify" && (
            <div className="max-w-2xl mx-auto">
              <Card className="bg-white/[0.03] border-white/10 rounded-3xl">
                <CardHeader className="text-center pb-2">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-10 h-10 text-emerald-400" />
                  </div>
                  <CardTitle className="text-2xl text-white">Verify Document</CardTitle>
                  <CardDescription className="text-white/50">
                    Enter a stamp ID to verify document authenticity
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleVerifyStamp} className="space-y-4">
                    <div className="relative">
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                      <Input
                        value={verifyStampId}
                        onChange={(e) => setVerifyStampId(e.target.value.toUpperCase())}
                        placeholder="TLS-20250205-XXXXXXXX"
                        className="h-14 pl-12 bg-white/5 border-white/10 text-white rounded-xl font-mono text-lg"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={verifying}
                      className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl text-lg font-semibold"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5 mr-2" />
                          Verify Document
                        </>
                      )}
                    </Button>
                  </form>

                  {verifyResult && (
                    <div className={`mt-6 p-6 rounded-2xl ${
                      verifyResult.valid 
                        ? "bg-emerald-500/10 border border-emerald-500/30" 
                        : "bg-red-500/10 border border-red-500/30"
                    }`}>
                      <div className="flex items-center gap-4">
                        {verifyResult.valid ? (
                          <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-white" />
                          </div>
                        )}
                        <div>
                          <p className={`text-2xl font-bold ${verifyResult.valid ? "text-emerald-400" : "text-red-400"}`}>
                            {verifyResult.valid ? "AUTHENTIC" : "INVALID"}
                          </p>
                          <p className="text-white/60">{verifyResult.message}</p>
                        </div>
                      </div>
                      
                      {verifyResult.valid && (
                        <div className="mt-4 pt-4 border-t border-white/10 grid gap-3">
                          {verifyResult.advocate_name && (
                            <div className="flex justify-between">
                              <span className="text-white/50">Certified By</span>
                              <span className="text-white font-medium">{verifyResult.advocate_name}</span>
                            </div>
                          )}
                          {verifyResult.document_name && (
                            <div className="flex justify-between">
                              <span className="text-white/50">Document</span>
                              <span className="text-white">{verifyResult.document_name}</span>
                            </div>
                          )}
                          {verifyResult.created_at && (
                            <div className="flex justify-between">
                              <span className="text-white/50">Stamped On</span>
                              <span className="text-white">{new Date(verifyResult.created_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* API TAB */}
          {activeTab === "api" && (
            <div className="space-y-6">
              <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white">API Documentation</CardTitle>
                  <CardDescription className="text-white/50">
                    Integrate TLS document verification into your systems
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Endpoint */}
                  <div className="p-4 bg-black/40 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-0">GET</Badge>
                      <code className="text-white/80">/api/institutional/verify/{'{stamp_id}'}</code>
                    </div>
                    <p className="text-white/50 text-sm">Verify a document by stamp ID</p>
                  </div>

                  {/* Headers */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Headers</h4>
                    <div className="bg-black/40 rounded-xl p-4 font-mono text-sm">
                      <p><span className="text-purple-400">Authorization</span>: <span className="text-emerald-400">Bearer {'{your_api_key}'}</span></p>
                      <p><span className="text-purple-400">Content-Type</span>: <span className="text-amber-400">application/json</span></p>
                    </div>
                  </div>

                  {/* Example */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Example Request</h4>
                    <div className="bg-black/40 rounded-xl p-4 font-mono text-sm overflow-x-auto">
                      <pre className="text-white/80">{`curl -X GET \\
  "${API}/institutional/verify/TLS-20250205-ABC123" \\
  -H "Authorization: Bearer ${institution?.api_key || 'your_api_key'}"
`}</pre>
                    </div>
                  </div>

                  {/* Response */}
                  <div>
                    <h4 className="text-white font-medium mb-3">Success Response</h4>
                    <div className="bg-black/40 rounded-xl p-4 font-mono text-sm overflow-x-auto">
                      <pre className="text-emerald-400">{`{
  "valid": true,
  "stamp_id": "TLS-20250205-ABC123",
  "advocate_name": "John Doe",
  "document_name": "Sale Agreement",
  "created_at": "2025-02-05T10:30:00Z",
  "expires_at": "2026-02-05T10:30:00Z"
}`}</pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* BILLING TAB */}
          {/* WEBHOOKS TAB */}
          {activeTab === "webhooks" && (
            <div className="space-y-6">
              {/* Webhook Configuration */}
              <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-purple-400" />
                    Webhook Configuration
                  </CardTitle>
                  <CardDescription className="text-white/50">
                    Receive real-time notifications when documents are verified
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Webhook URL */}
                  <div className="space-y-2">
                    <Label className="text-white/70">Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://your-server.com/webhooks/tls"
                        className="flex-1 h-11 bg-white/5 border-white/10 text-white rounded-xl"
                      />
                      <Button 
                        onClick={saveWebhook}
                        disabled={savingWebhook}
                        className="h-11 px-6 bg-purple-500 hover:bg-purple-600 rounded-xl"
                      >
                        {savingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </div>

                  {/* Event Selection */}
                  <div className="space-y-3">
                    <Label className="text-white/70">Events to Subscribe</Label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {webhookConfig?.available_events && Object.entries(webhookConfig.available_events).map(([key, desc]) => (
                        <label 
                          key={key}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            webhookEvents.includes(key)
                              ? "bg-purple-500/20 border-purple-500/50"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={webhookEvents.includes(key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setWebhookEvents([...webhookEvents, key]);
                              } else {
                                setWebhookEvents(webhookEvents.filter(k => k !== key));
                              }
                            }}
                            className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500"
                          />
                          <div>
                            <p className="text-white text-sm font-medium">{key}</p>
                            <p className="text-white/40 text-xs">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Signing Secret */}
                  {webhookConfig?.webhook && (
                    <div className="space-y-2">
                      <Label className="text-white/70">Signing Secret</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-3 bg-black/40 rounded-xl text-emerald-400 font-mono text-sm truncate">
                          {webhookConfig.signing_secret}
                        </code>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(webhookConfig.signing_secret)}
                          className="h-10 px-3 border-white/20 text-white hover:bg-white/10 rounded-xl"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={regenerateSecret}
                          className="h-10 px-3 border-white/20 text-white hover:bg-white/10 rounded-xl"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-white/40 text-xs flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Use this secret to verify webhook signatures
                      </p>
                    </div>
                  )}

                  {/* Test Webhook */}
                  {webhookConfig?.webhook && (
                    <Button 
                      onClick={testWebhook}
                      variant="outline"
                      className="w-full h-11 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 rounded-xl"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Send Test Webhook
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Webhook Logs */}
              <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Recent Webhook Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  {webhookLogs.length > 0 ? (
                    <div className="space-y-2">
                      {webhookLogs.map((log, i) => (
                        <div 
                          key={i}
                          className={`flex items-center justify-between p-3 rounded-xl ${
                            log.success ? "bg-emerald-500/10" : "bg-red-500/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {log.success ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400" />
                            )}
                            <div>
                              <p className="text-white font-medium text-sm">{log.event}</p>
                              <p className="text-white/40 text-xs">
                                {new Date(log.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={log.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                            {log.response_status || "Error"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Globe className="w-12 h-12 text-white/20 mx-auto mb-3" />
                      <p className="text-white/40">No webhook deliveries yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Webhook Documentation */}
              <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Webhook Payload Format</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-emerald-400">{`{
  "event": "verification.success",
  "timestamp": "2025-02-05T10:30:00Z",
  "data": {
    "stamp_id": "TLS-20250205-ABC123",
    "document_name": "Sale Agreement",
    "advocate_name": "John Doe",
    "verified_at": "2025-02-05T10:30:00Z"
  }
}`}</pre>
                  </div>
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-blue-300 text-sm">
                      <strong>Verify signatures:</strong> Use HMAC-SHA256 with your signing secret to verify the <code className="text-blue-400">X-TLS-Signature</code> header.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              {/* Current Subscription */}
              <div className="grid lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 bg-gradient-to-br from-blue-500/20 to-purple-500/10 border-blue-500/20 rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white/50 text-sm">Current Plan</p>
                        <p className="text-3xl font-bold text-white capitalize mt-1">
                          {billing?.subscription?.package_name || "Free"}
                        </p>
                        <div className="flex items-center gap-4 mt-4">
                          <div>
                            <p className="text-white/40 text-xs">Verifications Used</p>
                            <p className="text-white font-semibold">
                              {billing?.subscription?.verification_used || 0} / {billing?.subscription?.verification_limit === -1 ? "∞" : billing?.subscription?.verification_limit || 0}
                            </p>
                          </div>
                          <div className="w-px h-8 bg-white/20" />
                          <div>
                            <p className="text-white/40 text-xs">Days Remaining</p>
                            <p className="text-white font-semibold">{billing?.subscription?.days_remaining || 0}</p>
                          </div>
                          <div className="w-px h-8 bg-white/20" />
                          <div>
                            <p className="text-white/40 text-xs">Next Billing</p>
                            <p className="text-white font-semibold">
                              {billing?.subscription?.next_billing 
                                ? new Date(billing.subscription.next_billing).toLocaleDateString()
                                : "N/A"
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${
                        billing?.subscription?.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }`}>
                        {billing?.subscription?.status || "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-white/50 text-sm">Monthly Cost</p>
                      <p className="text-4xl font-bold text-white mt-2">
                        TZS {(billing?.subscription?.price || 0).toLocaleString()}
                      </p>
                      {billing?.subscription?.auto_renew && (
                        <p className="text-emerald-400 text-xs mt-2 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Auto-renew enabled
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Available Plans */}
              <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Available Plans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {packages?.map((pkg) => {
                      const isCurrent = pkg.id === institution?.package;
                      return (
                        <div 
                          key={pkg.id}
                          className={`p-6 rounded-2xl border-2 transition-all ${
                            isCurrent
                              ? "bg-emerald-500/10 border-emerald-500/50"
                              : "bg-white/5 border-white/10 hover:border-blue-500/50"
                          }`}
                        >
                          {isCurrent && (
                            <Badge className="bg-emerald-500 text-white border-0 mb-3">Current</Badge>
                          )}
                          <h3 className="text-xl font-bold text-white capitalize">{pkg.name}</h3>
                          <p className="text-3xl font-bold text-white mt-2">
                            TZS {pkg.price.toLocaleString()}
                            <span className="text-sm text-white/50 font-normal">/mo</span>
                          </p>
                          <ul className="mt-4 space-y-2">
                            <li className="flex items-center gap-2 text-white/70 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              {pkg.verifications === -1 ? "Unlimited" : pkg.verifications.toLocaleString()} verifications
                            </li>
                            <li className="flex items-center gap-2 text-white/70 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              Full API access
                            </li>
                            <li className="flex items-center gap-2 text-white/70 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              Webhook notifications
                            </li>
                            <li className="flex items-center gap-2 text-white/70 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              {pkg.id === "enterprise" ? "Priority support" : "Email support"}
                            </li>
                          </ul>
                          <Button 
                            onClick={() => handleSubscribe(pkg.id)}
                            disabled={isCurrent || loading}
                            className={`w-full mt-4 rounded-xl h-11 ${
                              isCurrent
                                ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                                : "bg-blue-500 hover:bg-blue-600"
                            }`}
                          >
                            {isCurrent ? "Current Plan" : "Upgrade"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-400" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {billing?.payment_history?.length > 0 ? (
                    <div className="space-y-2">
                      {billing.payment_history.map((payment, i) => (
                        <div 
                          key={i}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">{payment.package} Plan</p>
                              <p className="text-white/40 text-sm">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-semibold">TZS {payment.amount.toLocaleString()}</p>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Receipt className="w-12 h-12 text-white/20 mx-auto mb-3" />
                      <p className="text-white/40">No payment history</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Billing Information */}
              <Card className="bg-white/[0.03] border-white/10 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Billing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl">
                      <p className="text-white/40 text-xs mb-1">Organization</p>
                      <p className="text-white font-medium">{billing?.billing_info?.organization_name}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl">
                      <p className="text-white/40 text-xs mb-1">Billing Email</p>
                      <p className="text-white font-medium">{billing?.billing_info?.billing_email || "Not set"}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl md:col-span-2">
                      <p className="text-white/40 text-xs mb-1">Billing Address</p>
                      <p className="text-white font-medium">{billing?.billing_info?.billing_address || "Not set"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InstitutionalPortal;
