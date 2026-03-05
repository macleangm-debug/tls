import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  Settings, LogOut, Users, Shield, DollarSign, TrendingUp,
  Activity, Database, Percent, Save, Plus, UserCog, LayoutDashboard,
  FileText, Eye, Building, Menu, X, Package, CreditCard, Printer
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const { user, logout, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({
    verification_fee_fixed: 500,
    verification_fee_percentage: 0,
    advocate_revenue_share: 30,
    currency: "TZS",
    official_stamp_price: 5000,
    commissioner_stamp_price: 7500,
    notary_stamp_price: 10000
  });
  const [admins, setAdmins] = useState([]);
  const [pricingTiers, setPricingTiers] = useState([]);
  const [publicFee, setPublicFee] = useState(50000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCreateTier, setShowCreateTier] = useState(false);
  const [newTier, setNewTier] = useState({ name: "", credits: "", price_per_unit: "", description: "", popular: false });
  const [newAdmin, setNewAdmin] = useState({ email: "", password: "", full_name: "", organization: "TLS" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, settingsRes, adminsRes, tiersRes] = await Promise.all([
        axios.get(`${API}/super-admin/stats`, getAuthHeaders()),
        axios.get(`${API}/super-admin/settings`, getAuthHeaders()),
        axios.get(`${API}/super-admin/admins`, getAuthHeaders()),
        axios.get(`${API}/super-admin/verification-tiers`, getAuthHeaders()).catch(() => ({ data: { tiers: [] } }))
      ]);
      
      setStats(statsRes.data);
      setSettings(settingsRes.data);
      setAdmins(adminsRes.data);
      setPricingTiers(tiersRes.data.tiers || tiersRes.data || []);
      setPublicFee(tiersRes.data.minimum_price ? tiersRes.data.minimum_price * 3.33 : 50000);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/super-admin/settings`, settings, getAuthHeaders());
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      const formData = new FormData();
      formData.append('email', newAdmin.email);
      formData.append('password', newAdmin.password);
      formData.append('full_name', newAdmin.full_name);
      formData.append('organization', newAdmin.organization);

      await axios.post(`${API}/super-admin/create-admin`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success("Admin created successfully");
      setShowCreateAdmin(false);
      setNewAdmin({ email: "", password: "", full_name: "", organization: "TLS" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create admin");
    }
  };

  const handleCreateTier = async () => {
    try {
      const response = await axios.post(`${API}/super-admin/verification-tiers`, {
        name: newTier.name,
        credits: parseInt(newTier.credits),
        price_per_unit: parseInt(newTier.price_per_unit),
        description: newTier.description,
        popular: newTier.popular
      }, getAuthHeaders());
      
      toast.success("Pricing tier created successfully");
      setShowCreateTier(false);
      setNewTier({ name: "", credits: "", price_per_unit: "", description: "", popular: false });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create tier");
    }
  };

  const handleDeleteTier = async (tierId) => {
    if (!confirm("Are you sure you want to deactivate this tier?")) return;
    try {
      await axios.delete(`${API}/super-admin/verification-tiers/${tierId}`, getAuthHeaders());
      toast.success("Tier deactivated");
      fetchData();
    } catch (error) {
      toast.error("Failed to deactivate tier");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  // Grouped navigation items for super admin
  const navGroups = [
    {
      label: "Overview",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/super-admin" },
      ]
    },
    {
      label: "Order Management",
      items: [
        { icon: Package, label: "Physical Orders", path: "/super-admin/orders" },
      ]
    },
    {
      label: "Documents",
      items: [
        { icon: FileText, label: "Product Presentation", path: "/super-admin/presentation" },
        { icon: Printer, label: "Printable Version", path: "/super-admin/presentation-print" },
      ]
    },
    {
      label: "Configuration",
      items: [
        { icon: CreditCard, label: "Membership Billing", path: "/super-admin/membership" },
        { icon: DollarSign, label: "Pricing Tiers", path: "/super-admin#pricing" },
        { icon: Settings, label: "System Settings", path: "/super-admin#settings" },
      ]
    },
    {
      label: "User Management",
      items: [
        { icon: UserCog, label: "Manage Admins", path: "/super-admin#admins" },
      ]
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02040A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040A] text-white">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="font-heading font-semibold">IDC Super Admin</span>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-white/60">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-72 bg-[#050810] border-r border-white/5 z-40 transform transition-transform duration-300 lg:translate-x-0 flex flex-col overflow-hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-heading font-semibold">IDC Platform</p>
              <p className="text-purple-400 text-xs">Super Administrator</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/5 flex-shrink-0">
          <div className="glass-card rounded-xl p-4">
            <p className="text-white font-semibold">{user?.full_name}</p>
            <p className="text-white/40 text-xs">{user?.email}</p>
            <Badge className="mt-2 bg-purple-500/20 text-purple-400 border-purple-500/30">
              Super Admin
            </Badge>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {navGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {/* Group Label */}
              <p className="px-4 mb-2 text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                {group.label}
              </p>
              {/* Group Items */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path || (item.path.includes('#') && location.hash === '#' + item.path.split('#')[1]);
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                        isActive 
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </a>
                  );
                })}
              </div>
              {/* Separator between groups (except last) */}
              {groupIndex < navGroups.length - 1 && (
                <div className="h-px bg-white/5 mt-4" />
              )}
            </div>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-white/50 hover:text-white hover:bg-white/5 rounded-xl"
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
        <div className="glass border-b border-white/5 px-6 lg:px-8 py-6 sticky top-0 lg:top-0 z-20">
          <h1 className="font-heading text-2xl font-bold text-white">Super Admin Dashboard</h1>
          <p className="text-white/50 mt-1">IDC System Management Portal</p>
        </div>
        
        <div className="p-6 lg:p-8 space-y-8">
          {/* Platform Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card rounded-2xl border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats?.total_advocates || 0}</p>
                    <p className="text-xs text-white/50">Total Advocates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card rounded-2xl border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats?.total_stamps || 0}</p>
                    <p className="text-xs text-white/50">Total Stamps</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card rounded-2xl border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats?.total_verifications || 0}</p>
                    <p className="text-xs text-white/50">Verifications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card rounded-2xl border-white/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-tls-gold/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-tls-gold" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{(stats?.total_revenue || 0).toLocaleString()}</p>
                    <p className="text-xs text-white/50">Total Revenue (TZS)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="glass-card rounded-2xl border-white/10">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-white/70">Total Platform Revenue</span>
                  <span className="text-white font-bold">{(stats?.total_revenue || 0).toLocaleString()} TZS</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-emerald-500/10 rounded-xl">
                  <span className="text-emerald-400">Advocate Earnings (Paid Out)</span>
                  <span className="text-emerald-400 font-bold">{(stats?.total_advocate_earnings || 0).toLocaleString()} TZS</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-purple-500/10 rounded-xl">
                  <span className="text-purple-400">Platform Revenue (IDC + TLS)</span>
                  <span className="text-purple-400 font-bold">{(stats?.platform_revenue || 0).toLocaleString()} TZS</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="glass-card rounded-2xl border-white/10">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  System Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-white/70">Total Admins (TLS)</span>
                  <span className="text-white font-bold">{stats?.total_admins || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-white/70">Document Stamps</span>
                  <span className="text-white font-bold">{stats?.total_document_stamps || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
                  <span className="text-white/70">Digital Stamps (Legacy)</span>
                  <span className="text-white font-bold">{stats?.total_digital_stamps || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verification Pricing Tiers */}
          <Card className="glass-card rounded-2xl border-emerald-500/20" id="pricing">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    Verification Pricing Tiers
                  </CardTitle>
                  <p className="text-white/50 text-sm mt-1">Manage prepaid credit packs for institutional verification</p>
                </div>
                <Button 
                  onClick={() => setShowCreateTier(true)} 
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Public Rate Info */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-400 font-medium">Public Verification Rate (No Account)</p>
                    <p className="text-white/50 text-sm">This is the premium price for non-registered users</p>
                  </div>
                  <div className="text-2xl font-bold text-red-400">TZS 50,000</div>
                </div>
              </div>

              {/* Tiers Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricingTiers.map((tier) => (
                  <div 
                    key={tier.id} 
                    className={`relative rounded-xl p-4 border ${tier.popular ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10'}`}
                  >
                    {tier.popular && (
                      <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white">
                        Popular
                      </Badge>
                    )}
                    <div className="text-center mb-4 mt-2">
                      <h4 className="text-lg font-semibold text-white">{tier.name}</h4>
                      <p className="text-3xl font-bold text-emerald-400 my-2">{tier.credits}</p>
                      <p className="text-white/40 text-sm">verifications</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/50">Per unit</span>
                        <span className="text-white">TZS {tier.price_per_unit?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Total</span>
                        <span className="text-emerald-400 font-bold">TZS {tier.total_price?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">Savings</span>
                        <span className="text-emerald-400">{Math.round((1 - tier.price_per_unit / 50000) * 100)}%</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-white/10 text-white/60 hover:bg-white/5"
                        disabled
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDeleteTier(tier.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {pricingTiers.length === 0 && (
                <div className="text-center py-8 text-white/40">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pricing tiers configured. Add your first tier above.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="glass-card rounded-2xl border-purple-500/20" id="settings">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-purple-400" />
                Revenue & Fee Settings
              </CardTitle>
              <p className="text-white/50 text-sm">Configure verification fees and advocate revenue share</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/70">Fixed Verification Fee (TZS)</Label>
                  <Input
                    type="number"
                    value={settings.verification_fee_fixed}
                    onChange={(e) => setSettings(s => ({ ...s, verification_fee_fixed: parseFloat(e.target.value) || 0 }))}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  />
                  <p className="text-xs text-white/40">Fixed fee charged per verification</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/70">Percentage Fee (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.verification_fee_percentage}
                    onChange={(e) => setSettings(s => ({ ...s, verification_fee_percentage: parseFloat(e.target.value) || 0 }))}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  />
                  <p className="text-xs text-white/40">Additional % of stamp price per verification</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/70">Advocate Revenue Share (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.advocate_revenue_share}
                    onChange={(e) => setSettings(s => ({ ...s, advocate_revenue_share: parseFloat(e.target.value) || 0 }))}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  />
                  <p className="text-xs text-white/40">% of verification fee that goes to the advocate</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/70">Currency</Label>
                  <Input
                    value={settings.currency}
                    onChange={(e) => setSettings(s => ({ ...s, currency: e.target.value }))}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <p className="text-purple-400 font-semibold mb-2">Revenue Split Preview</p>
                <p className="text-white/70 text-sm">
                  For a {settings.verification_fee_fixed.toLocaleString()} TZS verification fee:
                </p>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <p className="text-emerald-400 font-bold">{((settings.verification_fee_fixed * settings.advocate_revenue_share) / 100).toLocaleString()} TZS</p>
                    <p className="text-white/40 text-xs">To Advocate</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <p className="text-purple-400 font-bold">{((settings.verification_fee_fixed * (100 - settings.advocate_revenue_share)) / 100).toLocaleString()} TZS</p>
                    <p className="text-white/40 text-xs">Platform Revenue</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-purple-500 hover:bg-purple-600 rounded-xl"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Stamp Type Pricing */}
          <Card className="glass-card rounded-2xl border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-400" />
                Stamp Type Pricing
              </CardTitle>
              <p className="text-white/50 text-sm">Set prices for different stamp types</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-white/70 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    Official Stamp (TZS)
                  </Label>
                  <Input
                    type="number"
                    value={settings.official_stamp_price}
                    onChange={(e) => setSettings(s => ({ ...s, official_stamp_price: parseFloat(e.target.value) || 0 }))}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  />
                  <p className="text-xs text-white/40">Standard advocate stamp</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/70 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    Commissioner for Oaths (TZS)
                  </Label>
                  <Input
                    type="number"
                    value={settings.commissioner_stamp_price}
                    onChange={(e) => setSettings(s => ({ ...s, commissioner_stamp_price: parseFloat(e.target.value) || 0 }))}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  />
                  <p className="text-xs text-white/40">For oaths and affidavits</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white/70 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    Notary Public (TZS)
                  </Label>
                  <Input
                    type="number"
                    value={settings.notary_stamp_price}
                    onChange={(e) => setSettings(s => ({ ...s, notary_stamp_price: parseFloat(e.target.value) || 0 }))}
                    className="h-12 bg-white/5 border-white/10 text-white rounded-xl"
                  />
                  <p className="text-xs text-white/40">Notarized documents</p>
                </div>
              </div>

              <Button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Pricing
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Admin Management */}
          <Card className="glass-card rounded-2xl border-white/10" id="admins">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <UserCog className="w-6 h-6 text-blue-400" />
                  TLS Administrators
                </CardTitle>
                <p className="text-white/50 text-sm mt-1">Manage admin accounts for TLS</p>
              </div>
              <Button onClick={() => setShowCreateAdmin(true)} className="bg-blue-500 hover:bg-blue-600 rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Admin
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <UserCog className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{admin.full_name}</p>
                        <p className="text-white/40 text-sm">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={admin.role === "super_admin" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}>
                        {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                      </Badge>
                      <Badge className="bg-white/10 text-white/50">
                        {admin.firm_affiliation || "TLS"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateAdmin} onOpenChange={setShowCreateAdmin}>
        <DialogContent className="sm:max-w-md bg-[#0B1120] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Create New Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/70">Full Name</Label>
              <Input
                value={newAdmin.full_name}
                onChange={(e) => setNewAdmin(a => ({ ...a, full_name: e.target.value }))}
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Email</Label>
              <Input
                type="email"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin(a => ({ ...a, email: e.target.value }))}
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                placeholder="admin@tls.or.tz"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Password</Label>
              <Input
                type="password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin(a => ({ ...a, password: e.target.value }))}
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Organization</Label>
              <Input
                value={newAdmin.organization}
                onChange={(e) => setNewAdmin(a => ({ ...a, organization: e.target.value }))}
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                placeholder="Tanganyika Law Society"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateAdmin(false)} className="text-white/60">
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin} className="bg-blue-500 hover:bg-blue-600 rounded-xl">
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Pricing Tier Dialog */}
      <Dialog open={showCreateTier} onOpenChange={setShowCreateTier}>
        <DialogContent className="sm:max-w-md bg-[#0B1120] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Create New Pricing Tier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white/70">Tier Name</Label>
              <Input
                value={newTier.name}
                onChange={(e) => setNewTier(t => ({ ...t, name: e.target.value }))}
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                placeholder="e.g., Basic, Standard, Enterprise"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Credits (Verifications)</Label>
                <Input
                  type="number"
                  value={newTier.credits}
                  onChange={(e) => setNewTier(t => ({ ...t, credits: e.target.value }))}
                  className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                  placeholder="e.g., 50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Price Per Unit (TZS)</Label>
                <Input
                  type="number"
                  value={newTier.price_per_unit}
                  onChange={(e) => setNewTier(t => ({ ...t, price_per_unit: e.target.value }))}
                  className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                  placeholder="e.g., 20000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Description</Label>
              <Input
                value={newTier.description}
                onChange={(e) => setNewTier(t => ({ ...t, description: e.target.value }))}
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
                placeholder="e.g., Best for growing companies"
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <input
                type="checkbox"
                id="popular"
                checked={newTier.popular}
                onChange={(e) => setNewTier(t => ({ ...t, popular: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="popular" className="text-white/70 cursor-pointer">Mark as Popular tier</Label>
            </div>
            {newTier.credits && newTier.price_per_unit && (
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                <p className="text-emerald-400 font-medium">Total Price: TZS {(parseInt(newTier.credits) * parseInt(newTier.price_per_unit)).toLocaleString()}</p>
                <p className="text-white/50 text-sm">Savings vs public rate: {Math.round((1 - parseInt(newTier.price_per_unit) / 50000) * 100)}%</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateTier(false)} className="text-white/60">
              Cancel
            </Button>
            <Button onClick={handleCreateTier} className="bg-emerald-500 hover:bg-emerald-600 rounded-xl">
              Create Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
