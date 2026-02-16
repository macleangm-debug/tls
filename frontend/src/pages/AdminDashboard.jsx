import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { Users, QrCode, ShoppingCart, TrendingUp, AlertTriangle, DollarSign, Activity, Clock } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, getAuthHeaders());
      setStats(response.data);
    } catch (error) {
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout title="Admin Dashboard" subtitle="System Overview">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-tls-blue-electric"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard" subtitle="System Overview">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="glass-card rounded-2xl border-white/10" data-testid="stat-advocates">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-1">Total Advocates</p>
                <p className="text-3xl font-bold text-white">{stats?.total_advocates || 0}</p>
                <p className="text-xs text-tls-verified mt-1">{stats?.active_advocates || 0} active</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-tls-blue-electric/20 flex items-center justify-center">
                <Users className="w-7 h-7 text-tls-blue-electric" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-white/10" data-testid="stat-stamps">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-1">Digital Stamps</p>
                <p className="text-3xl font-bold text-white">{stats?.total_stamps_issued || 0}</p>
                <p className="text-xs text-tls-verified mt-1">{stats?.active_stamps || 0} active</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                <QrCode className="w-7 h-7 text-cyan-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-white/10" data-testid="stat-orders">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-white">{stats?.total_orders || 0}</p>
                <p className="text-xs text-yellow-500 mt-1">{stats?.pending_orders || 0} pending</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-tls-gold/20 flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 text-tls-gold" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-white/10" data-testid="stat-revenue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-tls-gold">{formatCurrency(stats?.total_revenue || 0)}</p>
                <p className="text-xs text-white/40 mt-1">{formatCurrency(stats?.monthly_revenue || 0)} this month</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card rounded-2xl border-white/10" data-testid="stat-suspended">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-white/50">Suspended Advocates</p>
                <p className="text-2xl font-bold text-white">{stats?.suspended_advocates || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-white/10" data-testid="stat-pending">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-white/50">Pending Orders</p>
                <p className="text-2xl font-bold text-white">{stats?.pending_orders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-white/10" data-testid="stat-fraud">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats?.fraud_alerts > 0 ? "bg-red-500/20" : "bg-tls-verified/20"}`}>
                <AlertTriangle className={`w-6 h-6 ${stats?.fraud_alerts > 0 ? "text-red-500" : "text-tls-verified"}`} />
              </div>
              <div>
                <p className="text-sm text-white/50">Fraud Alerts</p>
                <p className="text-2xl font-bold text-white">{stats?.fraud_alerts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="glass-card rounded-2xl border-white/10">
        <CardHeader>
          <CardTitle className="font-heading text-lg text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <a href="/admin/advocates" className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-tls-blue-electric/30 hover:bg-white/10 transition-all group">
              <Users className="w-6 h-6 text-tls-blue-electric mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-white">Manage Advocates</p>
              <p className="text-sm text-white/50 mt-1">View and update advocate status</p>
            </a>
            <a href="/admin/orders" className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-tls-gold/30 hover:bg-white/10 transition-all group">
              <ShoppingCart className="w-6 h-6 text-tls-gold mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-white">Process Orders</p>
              <p className="text-sm text-white/50 mt-1">Approve and track orders</p>
            </a>
            <a href="/verify" className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 transition-all group">
              <QrCode className="w-6 h-6 text-cyan-500 mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-white">Verify Stamps</p>
              <p className="text-sm text-white/50 mt-1">Public verification portal</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminDashboard;
