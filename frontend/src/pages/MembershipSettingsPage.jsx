import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import {
  CreditCard, Settings, Users, AlertTriangle, Shield, DollarSign,
  Calendar, Clock, Check, X, RefreshCw, Download, History
} from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function MembershipSettingsPage() {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [payments, setPayments] = useState([]);
  
  const [policy, setPolicy] = useState({
    enabled: false,
    mode: "fixed",
    period: "annual",
    currency: "TZS",
    fixed_price: 50000,
    grace_days: 7,
    enforcement: "warn_only"
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, statsRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/api/admin/membership/settings`, getAuthHeaders()),
        axios.get(`${API}/api/admin/membership/stats`, getAuthHeaders()),
        axios.get(`${API}/api/admin/membership/payments?limit=20`, getAuthHeaders())
      ]);
      
      if (settingsRes.data.policy) {
        setPolicy(settingsRes.data.policy);
      }
      setStats(statsRes.data);
      setPayments(paymentsRes.data.payments || []);
    } catch (error) {
      console.error("Failed to fetch membership data:", error);
      toast.error("Failed to load membership settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.patch(`${API}/api/admin/membership/settings`, policy, getAuthHeaders());
      toast.success("Membership policy updated successfully");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update policy");
    } finally {
      setSaving(false);
    }
  };

  const enforcementInfo = {
    warn_only: {
      label: "Warn Only",
      description: "Show warning banners but allow all features",
      color: "bg-amber-500/20 text-amber-400"
    },
    block_stamping: {
      label: "Block Stamping",
      description: "Disable document stamping for unpaid members",
      color: "bg-orange-500/20 text-orange-400"
    },
    block_all: {
      label: "Block All Access",
      description: "Restrict platform access except billing page",
      color: "bg-red-500/20 text-red-400"
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="membership-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Membership Billing</h1>
            <p className="text-white/50 text-sm">IDC Control Panel - Manage member access and billing policy</p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700"
          data-testid="save-policy-btn"
        >
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Save Policy
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.total_advocates || 0}</p>
              <p className="text-xs text-white/50">Total Advocates</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.active_members || 0}</p>
              <p className="text-xs text-white/50">Active Members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.expiring_soon || 0}</p>
              <p className="text-xs text-white/50">Expiring Soon</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <X className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.unpaid_estimate || 0}</p>
              <p className="text-xs text-white/50">Unpaid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.total_payments || 0}</p>
              <p className="text-xs text-white/50">Total Payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Policy Settings */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5" /> Billing Policy
            </CardTitle>
            <CardDescription>Configure membership billing rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
              <div>
                <p className="text-white font-medium">Enable Membership Billing</p>
                <p className="text-xs text-white/50">Master ON/OFF switch for billing enforcement</p>
              </div>
              <Switch
                checked={policy.enabled}
                onCheckedChange={(checked) => setPolicy({...policy, enabled: checked})}
                data-testid="billing-toggle"
              />
            </div>

            {policy.enabled && (
              <>
                {/* Billing Mode */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Billing Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPolicy({...policy, mode: "fixed"})}
                      className={`p-3 rounded-xl border transition-all ${
                        policy.mode === "fixed" 
                          ? "bg-emerald-500/20 border-emerald-500/30" 
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <DollarSign className={`w-5 h-5 mx-auto mb-1 ${policy.mode === "fixed" ? "text-emerald-400" : "text-white/50"}`} />
                      <p className={`text-sm font-medium ${policy.mode === "fixed" ? "text-white" : "text-white/70"}`}>Fixed Price</p>
                    </button>
                    <button
                      onClick={() => setPolicy({...policy, mode: "subscription"})}
                      className={`p-3 rounded-xl border transition-all ${
                        policy.mode === "subscription" 
                          ? "bg-blue-500/20 border-blue-500/30" 
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <RefreshCw className={`w-5 h-5 mx-auto mb-1 ${policy.mode === "subscription" ? "text-blue-400" : "text-white/50"}`} />
                      <p className={`text-sm font-medium ${policy.mode === "subscription" ? "text-white" : "text-white/70"}`}>Subscription</p>
                    </button>
                  </div>
                </div>

                {/* Fixed Price Input */}
                {policy.mode === "fixed" && (
                  <div>
                    <label className="text-xs text-white/50 mb-2 block">Membership Fee ({policy.currency})</label>
                    <Input
                      type="number"
                      value={policy.fixed_price || ""}
                      onChange={(e) => setPolicy({...policy, fixed_price: parseFloat(e.target.value) || 0})}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="50000"
                    />
                  </div>
                )}

                {/* Period */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Billing Period</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPolicy({...policy, period: "monthly"})}
                      className={`p-3 rounded-xl border transition-all ${
                        policy.period === "monthly" 
                          ? "bg-purple-500/20 border-purple-500/30" 
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <Calendar className={`w-4 h-4 mx-auto mb-1 ${policy.period === "monthly" ? "text-purple-400" : "text-white/50"}`} />
                      <p className={`text-sm ${policy.period === "monthly" ? "text-white" : "text-white/70"}`}>Monthly</p>
                    </button>
                    <button
                      onClick={() => setPolicy({...policy, period: "annual"})}
                      className={`p-3 rounded-xl border transition-all ${
                        policy.period === "annual" 
                          ? "bg-purple-500/20 border-purple-500/30" 
                          : "bg-white/5 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <Calendar className={`w-4 h-4 mx-auto mb-1 ${policy.period === "annual" ? "text-purple-400" : "text-white/50"}`} />
                      <p className={`text-sm ${policy.period === "annual" ? "text-white" : "text-white/70"}`}>Annual</p>
                    </button>
                  </div>
                </div>

                {/* Grace Days */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Grace Period (days after expiry)</label>
                  <Input
                    type="number"
                    min="0"
                    max="30"
                    value={policy.grace_days || 7}
                    onChange={(e) => setPolicy({...policy, grace_days: parseInt(e.target.value) || 0})}
                    className="bg-white/5 border-white/10 text-white w-24"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Enforcement Settings */}
        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" /> Enforcement
            </CardTitle>
            <CardDescription>What happens when membership expires</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {policy.enabled ? (
              <>
                {Object.entries(enforcementInfo).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setPolicy({...policy, enforcement: key})}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${
                      policy.enforcement === key 
                        ? `${info.color} border-current` 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                    data-testid={`enforcement-${key}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${policy.enforcement === key ? "" : "text-white"}`}>{info.label}</p>
                        <p className={`text-xs mt-1 ${policy.enforcement === key ? "opacity-80" : "text-white/50"}`}>
                          {info.description}
                        </p>
                      </div>
                      {policy.enforcement === key && (
                        <Check className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                ))}

                {/* Enforcement Warning */}
                {policy.enforcement !== "warn_only" && (
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p className="text-xs text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {policy.enforcement === "block_stamping" 
                        ? "Unpaid members won't be able to stamp documents"
                        : "Unpaid members will have restricted platform access"}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center">
                <Shield className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">Enable billing to configure enforcement</p>
              </div>
            )}

            {/* Current Status */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 mt-6">
              <p className="text-xs text-white/50 mb-2">Current Status</p>
              <div className="flex items-center gap-3">
                <Badge className={policy.enabled ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                  {policy.enabled ? "Billing Active" : "Billing Disabled"}
                </Badge>
                {policy.enabled && (
                  <Badge className={enforcementInfo[policy.enforcement]?.color}>
                    {enforcementInfo[policy.enforcement]?.label}
                  </Badge>
                )}
              </div>
              {policy.updated_at && (
                <p className="text-xs text-white/30 mt-2">
                  Last updated: {new Date(policy.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card className="glass-card border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="w-5 h-5" /> Recent Payments
              </CardTitle>
              <CardDescription>Membership payment history</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              No membership payments recorded yet
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="p-3 bg-white/5 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{payment.user_name || payment.user_email}</p>
                      <p className="text-xs text-white/50">{payment.reference || payment.id.slice(0,8)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{payment.currency} {payment.amount?.toLocaleString()}</p>
                    <p className="text-xs text-white/50">{payment.period} • {new Date(payment.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
