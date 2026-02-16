import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import {
  TrendingUp, DollarSign, QrCode, CheckCircle2, Clock, Shield,
  Calendar, Eye, AlertTriangle, Zap, Award, ArrowUpRight,
  Package, CreditCard, Loader2, FileCheck, Users, Building
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SUBSCRIPTION_COLORS = {
  trial: "#F59E0B",
  active: "#10B981",
  grace: "#EF4444",
  expired: "#6B7280",
  none: "#6B7280"
};

const StampVerificationPage = () => {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [packages, setPackages] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, subRes, pkgRes] = await Promise.all([
        axios.get(`${API}/advocate/verification-stats`, getAuthHeaders()),
        axios.get(`${API}/subscription/status`, getAuthHeaders()),
        axios.get(`${API}/subscription/packages`)
      ]);
      setStats(statsRes.data);
      setSubscription(subRes.data);
      setPackages(pkgRes.data);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load verification data");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = async () => {
    try {
      await axios.post(`${API}/subscription/start-trial`, {}, getAuthHeaders());
      toast.success("30-day free trial started!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start trial");
    }
  };

  const handleSubscribe = async (packageId) => {
    setSubscribing(true);
    try {
      await axios.post(`${API}/subscription/subscribe`, 
        { package: packageId, payment_method: "mobile_money" },
        getAuthHeaders()
      );
      toast.success("Subscription successful!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to subscribe");
    } finally {
      setSubscribing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      trial: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      grace: "bg-red-500/20 text-red-400 border-red-500/30",
      expired: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      none: "bg-gray-500/20 text-gray-400 border-gray-500/30"
    };
    const labels = {
      trial: "Free Trial",
      active: "Active",
      grace: "Grace Period",
      expired: "Expired",
      none: "No Subscription"
    };
    return (
      <Badge className={`${styles[status] || styles.none} border`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const REVENUE_COLORS = ["#10B981", "#3B82F6", "#8B5CF6"];

  if (loading) {
    return (
      <DashboardLayout title="Stamp Verification" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </DashboardLayout>
    );
  }

  const summary = stats?.summary || {};
  const chartData = stats?.chart_data || [];
  const revenueBreakdown = stats?.revenue_breakdown || {};
  const recentStamps = stats?.recent_stamps || [];

  const pieData = [
    { name: "Advocate", value: revenueBreakdown.advocate_share_pct || 30, color: "#10B981" },
    { name: "TLS", value: revenueBreakdown.tls_share_pct || 35, color: "#3B82F6" },
    { name: "IDC", value: revenueBreakdown.idc_share_pct || 35, color: "#8B5CF6" }
  ];

  return (
    <DashboardLayout title="Stamp Verification" subtitle="Monitor your QR stamps and earnings">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <TrendingUp className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="earnings" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <DollarSign className="w-4 h-4 mr-2" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="subscription" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
            <Package className="w-4 h-4 mr-2" />
            Subscription
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Subscription Status Banner */}
          {subscription && (
            <Card className={`glass-card rounded-2xl border-l-4 ${
              subscription.status === "trial" ? "border-l-yellow-500" :
              subscription.status === "active" ? "border-l-emerald-500" :
              subscription.status === "grace" ? "border-l-red-500" :
              "border-l-gray-500"
            }`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      subscription.status === "trial" ? "bg-yellow-500/20" :
                      subscription.status === "active" ? "bg-emerald-500/20" :
                      "bg-gray-500/20"
                    }`}>
                      {subscription.status === "trial" ? (
                        <Clock className="w-6 h-6 text-yellow-400" />
                      ) : subscription.status === "active" ? (
                        <Shield className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">
                          {subscription.status === "trial" ? "Free Trial Active" :
                           subscription.status === "active" ? "Subscription Active" :
                           subscription.status === "grace" ? "Grace Period" :
                           "No Active Subscription"}
                        </h3>
                        {getStatusBadge(subscription.status)}
                      </div>
                      <p className="text-sm text-white/50 mt-1">
                        {subscription.status === "trial" && subscription.trial_ends_at && (
                          <>Trial ends: {new Date(subscription.trial_ends_at).toLocaleDateString()}</>
                        )}
                        {subscription.status === "active" && subscription.subscription_ends_at && (
                          <>Renews: {new Date(subscription.subscription_ends_at).toLocaleDateString()}</>
                        )}
                        {subscription.status === "grace" && (
                          <>Grace period - Subscribe to continue earning</>
                        )}
                        {subscription.status === "none" && (
                          <>Start your 30-day free trial today!</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!subscription.can_earn_revenue && (
                      <span className="text-xs text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full">
                        Earnings Locked
                      </span>
                    )}
                    {subscription.status === "none" && subscription.eligible_for_trial && (
                      <Button onClick={handleStartTrial} className="bg-yellow-500 hover:bg-yellow-600">
                        Start Free Trial
                      </Button>
                    )}
                    {(subscription.status === "trial" || subscription.status === "grace" || subscription.status === "expired") && (
                      <Button onClick={() => setActiveTab("subscription")} className="bg-emerald-500 hover:bg-emerald-600">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Subscribe Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                    Active
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">{summary.active_stamps || 0}</p>
                <p className="text-sm text-white/50">Active Stamps</p>
                <p className="text-xs text-white/30 mt-1">of {summary.total_stamps || 0} total</p>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-bold text-white">{summary.total_verifications || 0}</p>
                <p className="text-sm text-white/50">Total Verifications</p>
                <p className="text-xs text-white/30 mt-1">All time</p>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                  {subscription?.can_earn_revenue ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                <p className="text-3xl font-bold text-white">
                  {(summary.total_earnings || 0).toLocaleString()}
                </p>
                <p className="text-sm text-white/50">Total Earnings (TZS)</p>
                {!subscription?.can_earn_revenue && (
                  <p className="text-xs text-yellow-400 mt-1">Subscribe to unlock</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Award className="w-5 h-5 text-purple-400" />
                  <span className="text-xs text-purple-400">
                    {revenueBreakdown.advocate_share_pct || 30}%
                  </span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {revenueBreakdown.advocate_share_pct || 30}%
                </p>
                <p className="text-sm text-white/50">Your Revenue Share</p>
                <p className="text-xs text-white/30 mt-1">Per verification</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">Verification Activity (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVerifications" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} />
                    <YAxis stroke="#ffffff40" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#1a1a2e", 
                        border: "1px solid #ffffff20",
                        borderRadius: "8px"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="verifications" 
                      stroke="#10B981" 
                      fillOpacity={1} 
                      fill="url(#colorVerifications)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-white/40">
                  <div className="text-center">
                    <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No verification data yet</p>
                    <p className="text-sm">Create your first stamp to get started</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Stamps */}
          <Card className="glass-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-white">Recent Stamps</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/stamp-document")} className="text-emerald-400">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {recentStamps.length > 0 ? (
                <div className="space-y-3">
                  {recentStamps.map((stamp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <FileCheck className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{stamp.document_name}</p>
                          <p className="text-white/40 text-xs">{stamp.stamp_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-sm">{stamp.verification_count || 0} verifications</p>
                        <p className="text-white/30 text-xs">
                          {new Date(stamp.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/40">
                  <p>No stamps created yet</p>
                  <Button 
                    className="mt-3 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => navigate("/stamp-document")}
                  >
                    Create Your First Stamp
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EARNINGS TAB */}
        <TabsContent value="earnings" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Earnings Summary */}
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Earnings Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-4">
                  <p className="text-white/50 text-sm mb-2">Total Earnings</p>
                  <p className="text-5xl font-bold text-emerald-400">
                    {(summary.total_earnings || 0).toLocaleString()}
                  </p>
                  <p className="text-white/40 text-sm mt-1">TZS</p>
                </div>
                
                {!subscription?.can_earn_revenue && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-400 font-medium">Earnings Locked</p>
                        <p className="text-white/50 text-sm mt-1">
                          {subscription?.status === "trial" 
                            ? "Subscribe to unlock your earnings. During trial, IDC and TLS receive verification fees."
                            : "Subscribe to start earning from your stamp verifications."}
                        </p>
                        <Button 
                          onClick={() => setActiveTab("subscription")} 
                          className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-black"
                          size="sm"
                        >
                          Subscribe Now
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-white/60">Total Verifications</span>
                    <span className="text-white font-semibold">{summary.total_verifications || 0}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-white/60">Active Stamps</span>
                    <span className="text-white font-semibold">{summary.active_stamps || 0}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-white/60">Avg. Per Stamp</span>
                    <span className="text-white font-semibold">
                      {summary.active_stamps > 0 
                        ? Math.round(summary.total_earnings / summary.active_stamps).toLocaleString()
                        : 0} TZS
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Split */}
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-white">Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-6">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="space-y-3">
                  {pieData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-white/70">{item.name}</span>
                      </div>
                      <span className="text-white font-semibold">{item.value}%</span>
                    </div>
                  ))}
                </div>
                
                <p className="text-white/40 text-xs text-center mt-4">
                  Revenue is split between Advocate, TLS, and IDC for each verification
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SUBSCRIPTION TAB */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan */}
          <Card className="glass-card rounded-2xl border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-lg text-white">Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-white capitalize">
                      {subscription?.package || "No Plan"}
                    </h3>
                    {getStatusBadge(subscription?.status || "none")}
                  </div>
                  {subscription?.subscription_ends_at && (
                    <p className="text-white/50 mt-1">
                      Valid until {new Date(subscription.subscription_ends_at).toLocaleDateString()}
                    </p>
                  )}
                  {subscription?.trial_ends_at && subscription.status === "trial" && (
                    <p className="text-yellow-400 mt-1">
                      Trial ends {new Date(subscription.trial_ends_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-sm">Stamps Created</p>
                  <p className="text-2xl font-bold text-white">{subscription?.total_stamps_created || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Packages */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages?.packages && Object.entries(packages.packages).map(([id, pkg]) => (
              <Card 
                key={id} 
                className={`glass-card rounded-2xl transition-all hover:border-emerald-500/50 ${
                  subscription?.package === id ? "border-emerald-500" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                    {pkg.savings > 0 && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 mt-2">
                        Save {pkg.savings}%
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-white">
                      {(pkg.price / 1000).toFixed(0)}K
                    </span>
                    <span className="text-white/50 ml-1">TZS</span>
                    <p className="text-white/40 text-sm">
                      {pkg.duration_days} days
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center gap-2 text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Unlimited QR stamps
                    </li>
                    <li className="flex items-center gap-2 text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Earn from verifications
                    </li>
                    <li className="flex items-center gap-2 text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Priority support
                    </li>
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(id)}
                    disabled={subscribing || subscription?.package === id}
                    className={`w-full ${
                      subscription?.package === id 
                        ? "bg-white/10 text-white/50" 
                        : "bg-emerald-500 hover:bg-emerald-600"
                    }`}
                  >
                    {subscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : subscription?.package === id ? (
                      "Current Plan"
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-white/40 text-sm">
            All subscriptions include a 7-day grace period after expiry. Payments are processed securely via mobile money.
          </p>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default StampVerificationPage;
