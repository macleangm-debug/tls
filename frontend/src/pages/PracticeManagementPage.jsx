import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  Users, Briefcase, FileText, Calendar, CheckSquare,
  Receipt, DollarSign, Plus, Search, Clock, AlertTriangle,
  TrendingUp, FolderOpen, Mail, FileArchive, PieChart,
  Target, Scale, Gavel, Building, UserCheck, Download,
  Copy, Eye, Edit, Trash2, Send, CreditCard, Phone,
  FileSignature, ChevronRight, ArrowUpRight, ArrowDownRight,
  FileCheck, Stamp, Pen, Type, QrCode, RefreshCw, History
} from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

// Simple Chart Components (no external library needed)
const DonutChart = ({ data, colors, size = 120 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  
  const segments = data.map((item, idx) => {
    const angle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = 50 + 40 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
    const y2 = 50 + 40 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
    const largeArc = angle > 180 ? 1 : 0;
    
    return (
      <path
        key={idx}
        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={colors[idx % colors.length]}
        className="transition-all duration-300 hover:opacity-80"
      />
    );
  });

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {segments}
      <circle cx="50" cy="50" r="25" fill="#0a0d14" />
      <text x="50" y="50" textAnchor="middle" dy="0.3em" fill="white" fontSize="12" fontWeight="bold">
        {total}
      </text>
    </svg>
  );
};

const BarChart = ({ data, color = "#3B82F6", height = 150 }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="flex items-end gap-1 h-[150px]">
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <div 
            className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
            style={{ 
              height: `${(item.value / maxValue) * 100}%`,
              backgroundColor: color,
              minHeight: item.value > 0 ? '4px' : '0'
            }}
          />
          <span className="text-[10px] text-white/40 truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// Enhanced Dashboard with Charts and Insights
const EnhancedDashboard = ({ analytics, caseAnalytics, revenueData, recentActivity, onNavigate }) => {
  const caseStatusData = caseAnalytics?.by_status ? Object.entries(caseAnalytics.by_status).map(([key, value]) => ({ label: key, value })) : [];
  const caseTypeData = caseAnalytics?.by_type ? Object.entries(caseAnalytics.by_type).map(([key, value]) => ({ label: key, value })) : [];
  const revenueChartData = revenueData ? Object.entries(revenueData).map(([key, value]) => ({ label: key.slice(-2), value })).slice(-6) : [];

  const statusColors = ["#10B981", "#F59E0B", "#6B7280", "#8B5CF6"];
  const typeColors = ["#3B82F6", "#EC4899", "#14B8A6", "#F97316", "#8B5CF6", "#6B7280"];

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-white/10" data-testid="metric-active-cases">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{analytics?.summary?.active_cases || 0}</p>
                <p className="text-xs text-white/50">Active Cases</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 mr-1" />
              <span className="text-emerald-500">+2 this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10" data-testid="metric-total-clients">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{analytics?.summary?.total_clients || 0}</p>
                <p className="text-xs text-white/50">Total Clients</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <UserCheck className="w-3 h-3 text-emerald-500 mr-1" />
              <span className="text-white/50">Active relationships</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10" data-testid="metric-pending-tasks">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{analytics?.summary?.pending_tasks || 0}</p>
                <p className="text-xs text-white/50">Pending Tasks</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            {analytics?.summary?.overdue_tasks > 0 && (
              <div className="mt-2 flex items-center text-xs">
                <AlertTriangle className="w-3 h-3 text-red-500 mr-1" />
                <span className="text-red-400">{analytics.summary.overdue_tasks} overdue</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10" data-testid="metric-revenue">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">TZS {((analytics?.financials?.monthly_revenue || 0) / 1000).toFixed(0)}K</p>
                <p className="text-xs text-white/50">Monthly Revenue</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-teal-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <Receipt className="w-3 h-3 text-amber-500 mr-1" />
              <span className="text-amber-400">{analytics?.financials?.pending_count || 0} pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Case Status Distribution */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-500" />
              Cases by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              {caseStatusData.length > 0 ? (
                <>
                  <DonutChart data={caseStatusData} colors={statusColors} size={100} />
                  <div className="space-y-1">
                    {caseStatusData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[idx % statusColors.length] }} />
                        <span className="text-white/60 capitalize">{item.label}</span>
                        <span className="text-white font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-white/40 text-sm py-8">No cases yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Case Types */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Gavel className="w-4 h-4 text-purple-500" />
              Cases by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {caseTypeData.length > 0 ? (
              <div className="space-y-2">
                {caseTypeData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 capitalize">{item.label}</span>
                        <span className="text-white">{item.value}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${(item.value / Math.max(...caseTypeData.map(d => d.value))) * 100}%`,
                            backgroundColor: typeColors[idx % typeColors.length]
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm py-8 text-center">No cases yet</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <BarChart data={revenueChartData} color="#10B981" />
            ) : (
              <div className="h-[150px] flex items-center justify-center">
                <p className="text-white/40 text-sm">No revenue data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Alerts & Upcoming */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Attention Required */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.summary?.overdue_tasks > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg cursor-pointer hover:bg-red-500/20 transition-all" onClick={() => onNavigate('tasks')}>
                  <Clock className="w-5 h-5 text-red-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{analytics.summary.overdue_tasks} Overdue Tasks</p>
                    <p className="text-xs text-white/50">Requires immediate attention</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              )}
              {analytics?.financials?.pending_count > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg cursor-pointer hover:bg-amber-500/20 transition-all" onClick={() => onNavigate('invoices')}>
                  <Receipt className="w-5 h-5 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{analytics.financials.pending_count} Unpaid Invoices</p>
                    <p className="text-xs text-white/50">TZS {(analytics.financials.pending_invoices || 0).toLocaleString()} pending</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              )}
              {analytics?.summary?.upcoming_events > 0 && (
                <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg cursor-pointer hover:bg-purple-500/20 transition-all" onClick={() => onNavigate('calendar')}>
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{analytics.summary.upcoming_events} Upcoming Events</p>
                    <p className="text-xs text-white/50">In the next 7 days</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              )}
              {!analytics?.summary?.overdue_tasks && !analytics?.financials?.pending_count && !analytics?.summary?.upcoming_events && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <CheckSquare className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-white/60 text-sm">All caught up!</p>
                  <p className="text-white/40 text-xs">No urgent items</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Stats */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              Quick Stats & Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-white">{analytics?.summary?.total_documents || 0}</p>
                <p className="text-xs text-white/50">Documents Stored</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-white">{analytics?.summary?.stamps_this_month || 0}</p>
                <p className="text-xs text-white/50">Stamps This Month</p>
              </div>
              <Button className="col-span-2 bg-tls-blue-electric hover:bg-tls-blue-electric/90" onClick={() => onNavigate('new-case')}>
                <Plus className="w-4 h-4 mr-2" /> New Case
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => onNavigate('new-client')}>
                <Users className="w-4 h-4 mr-2" /> Add Client
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => onNavigate('new-invoice')}>
                <Receipt className="w-4 h-4 mr-2" /> New Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Client Form Modal
const ClientFormModal = ({ isOpen, onClose, onSave, editData = null }) => {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", company: "", client_type: "individual", address: "", notes: ""
  });

  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      setFormData({ name: "", email: "", phone: "", company: "", client_type: "individual", address: "", notes: "" });
    }
  }, [editData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0d14] border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{editData ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          <DialogDescription className="text-white/50">Enter client information below</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Full Name *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-white/5 border-white/10 text-white" />
            <Input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-white/5 border-white/10 text-white" />
          </div>
          <Input placeholder="Company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="bg-white/5 border-white/10 text-white" />
          <select value={formData.client_type} onChange={(e) => setFormData({...formData, client_type: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
            <option value="individual">Individual</option>
            <option value="corporate">Corporate</option>
            <option value="government">Government</option>
          </select>
          <Textarea placeholder="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="bg-white/5 border-white/10 text-white" rows={2} />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600">{editData ? 'Update' : 'Add'} Client</Button>
            <Button type="button" variant="outline" onClick={onClose} className="border-white/20 text-white">Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Clients Tab Component
const ClientsTab = ({ token, onShowForm }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/clients`, { headers, params: { search } });
      setClients(response.data.clients);
    } catch (error) {
      toast.error("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, [search]);

  const handleSaveClient = async (formData) => {
    try {
      if (editClient) {
        await axios.put(`${API}/api/practice/clients/${editClient.id}`, formData, { headers });
        toast.success("Client updated");
      } else {
        await axios.post(`${API}/api/practice/clients`, formData, { headers });
        toast.success("Client created");
      }
      setShowForm(false);
      setEditClient(null);
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save client");
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      await axios.delete(`${API}/api/practice/clients/${clientId}`, { headers });
      toast.success("Client deleted");
      fetchClients();
    } catch (error) {
      toast.error("Failed to delete client");
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'corporate': return <Building className="w-4 h-4" />;
      case 'government': return <Scale className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white"
            data-testid="search-clients-input"
          />
        </div>
        <Button onClick={() => { setEditClient(null); setShowForm(true); }} className="bg-tls-blue-electric" data-testid="add-client-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      <ClientFormModal isOpen={showForm} onClose={() => { setShowForm(false); setEditClient(null); }} onSave={handleSaveClient} editData={editClient} />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="glass-card border-white/10 hover:border-white/20 transition-all group" data-testid={`client-card-${client.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-tls-blue-electric/20 flex items-center justify-center">
                    {getTypeIcon(client.client_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{client.name}</h3>
                    <p className="text-sm text-white/50">{client.company || client.email || 'No contact info'}</p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditClient(client); setShowForm(true); }}>
                    <Edit className="w-3 h-3 text-white/60" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteClient(client.id)}>
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-white/20 text-white/60 capitalize">
                  {client.client_type}
                </Badge>
                {client.phone && (
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {client.phone}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {clients.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/50">No clients yet</p>
          <p className="text-white/30 text-sm mt-1">Add your first client to get started</p>
        </div>
      )}
    </div>
  );
};

// Cases Tab Component
const CasesTab = ({ token }) => {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "", client_id: "", case_type: "litigation", status: "active", priority: "medium", description: "", court: "", opposing_party: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [casesRes, clientsRes] = await Promise.all([
        axios.get(`${API}/api/practice/cases`, { headers }),
        axios.get(`${API}/api/practice/clients`, { headers })
      ]);
      setCases(casesRes.data.cases);
      setClients(clientsRes.data.clients);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      toast.error("Please select a client");
      return;
    }
    try {
      await axios.post(`${API}/api/practice/cases`, formData, { headers });
      toast.success("Case created successfully");
      setShowForm(false);
      setFormData({ title: "", client_id: "", case_type: "litigation", status: "active", priority: "medium", description: "", court: "", opposing_party: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create case");
    }
  };

  const getPriorityColor = (priority) => {
    const colors = { low: "bg-gray-500", medium: "bg-blue-500", high: "bg-amber-500", urgent: "bg-red-500" };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = { active: "text-emerald-400 bg-emerald-500/10", pending: "text-amber-400 bg-amber-500/10", closed: "text-gray-400 bg-gray-500/10", on_hold: "text-purple-400 bg-purple-500/10" };
    return colors[status] || colors.active;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Cases & Matters</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric" disabled={clients.length === 0} data-testid="new-case-btn">
          <Plus className="w-4 h-4 mr-2" /> New Case
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Case Title *" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2" required>
                <option value="">Select Client *</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={formData.case_type} onChange={(e) => setFormData({...formData, case_type: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="litigation">Litigation</option>
                <option value="corporate">Corporate</option>
                <option value="family">Family</option>
                <option value="property">Property</option>
                <option value="criminal">Criminal</option>
                <option value="other">Other</option>
              </select>
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <Input placeholder="Court" value={formData.court} onChange={(e) => setFormData({...formData, court: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Opposing Party" value={formData.opposing_party} onChange={(e) => setFormData({...formData, opposing_party: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Create Case</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {clients.length === 0 ? (
        <Card className="glass-card border-white/10">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/50">Add clients first before creating cases</p>
            <p className="text-sm text-white/30 mt-2">Go to the Clients tab to add your first client</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((caseItem) => (
            <Card key={caseItem.id} className="glass-card border-white/10 hover:border-white/20 transition-all" data-testid={`case-card-${caseItem.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(caseItem.priority)}`} />
                      <h3 className="font-semibold text-white">{caseItem.title}</h3>
                    </div>
                    <p className="text-sm text-white/50 mt-1">{caseItem.client_name} • {caseItem.reference}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-xs border-white/20 text-white/70 capitalize">{caseItem.case_type}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(caseItem.status)}`}>{caseItem.status}</span>
                      {caseItem.court && <span className="text-xs text-white/40">{caseItem.court}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {cases.length === 0 && clients.length > 0 && !loading && (
        <div className="text-center py-12">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No cases yet</p>
          <p className="text-white/30 text-sm mt-1">Create your first case to start tracking</p>
        </div>
      )}
    </div>
  );
};

// Documents Tab Component  
const DocumentsTab = ({ token }) => {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [docsRes, foldersRes] = await Promise.all([
        axios.get(`${API}/api/practice/documents`, { headers, params: { folder: selectedFolder } }),
        axios.get(`${API}/api/practice/folders`, { headers })
      ]);
      setDocuments(docsRes.data.documents);
      setFolders(foldersRes.data.folders);
    } catch (error) {
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedFolder]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);
    formData.append('folder', selectedFolder || 'General');

    try {
      await axios.post(`${API}/api/practice/documents`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Document uploaded");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Document Vault</h2>
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button className="bg-tls-blue-electric" disabled={uploading} asChild>
            <span><Plus className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload Document'}</span>
          </Button>
        </label>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={!selectedFolder ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedFolder(null)}
          className={!selectedFolder ? "bg-tls-blue-electric" : "border-white/20 text-white"}
        >
          All Documents
        </Button>
        {folders.map((folder) => (
          <Button
            key={folder.id}
            variant={selectedFolder === folder.name ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFolder(folder.name)}
            className={selectedFolder === folder.name ? "bg-tls-blue-electric" : "border-white/20 text-white"}
          >
            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: folder.color }} />
            {folder.name}
          </Button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <Card key={doc.id} className="glass-card border-white/10 hover:border-white/20 transition-all">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-teal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{doc.name}</h3>
                  <p className="text-xs text-white/50">{formatFileSize(doc.file_size)}</p>
                  <Badge variant="outline" className="text-xs border-white/20 text-white/60 mt-2">{doc.folder}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {documents.length === 0 && !loading && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No documents yet</p>
          <p className="text-white/30 text-sm mt-1">Upload your first document</p>
        </div>
      )}
    </div>
  );
};

// Calendar Tab
const CalendarTab = ({ token }) => {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "", event_type: "meeting", start_datetime: "", end_datetime: "", location: "", description: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/events`, { headers });
      setEvents(response.data.events);
    } catch (error) {
      toast.error("Failed to fetch events");
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/practice/events`, formData, { headers });
      toast.success("Event created");
      setShowForm(false);
      setFormData({ title: "", event_type: "meeting", start_datetime: "", end_datetime: "", location: "", description: "" });
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create event");
    }
  };

  const getEventTypeColor = (type) => {
    const colors = { court_hearing: "bg-red-500", meeting: "bg-blue-500", deadline: "bg-amber-500", reminder: "bg-purple-500", appointment: "bg-emerald-500" };
    return colors[type] || colors.meeting;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Calendar & Events</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric">
          <Plus className="w-4 h-4 mr-2" /> Add Event
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Event Title *" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              <select value={formData.event_type} onChange={(e) => setFormData({...formData, event_type: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="meeting">Meeting</option>
                <option value="court_hearing">Court Hearing</option>
                <option value="deadline">Deadline</option>
                <option value="reminder">Reminder</option>
                <option value="appointment">Appointment</option>
              </select>
              <Input type="datetime-local" value={formData.start_datetime} onChange={(e) => setFormData({...formData, start_datetime: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              <Input type="datetime-local" value={formData.end_datetime} onChange={(e) => setFormData({...formData, end_datetime: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="bg-white/5 border-white/10 text-white md:col-span-2" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Create Event</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {events.map((event) => (
          <Card key={event.id} className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`w-1 h-12 rounded-full ${getEventTypeColor(event.event_type)}`} />
                <div className="flex-1">
                  <h3 className="font-medium text-white">{event.title}</h3>
                  <p className="text-sm text-white/50">
                    {new Date(event.start_datetime).toLocaleString()}
                    {event.location && ` • ${event.location}`}
                  </p>
                </div>
                <Badge variant="outline" className="border-white/20 text-white/70 capitalize">{event.event_type.replace('_', ' ')}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No events scheduled</p>
        </div>
      )}
    </div>
  );
};

// Tasks Tab
const TasksTab = ({ token }) => {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [formData, setFormData] = useState({ title: "", description: "", due_date: "", priority: "medium", status: "pending" });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTasks = async () => {
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const response = await axios.get(`${API}/api/practice/tasks`, { headers, params });
      setTasks(response.data.tasks);
    } catch (error) {
      toast.error("Failed to fetch tasks");
    }
  };

  useEffect(() => { fetchTasks(); }, [filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/practice/tasks`, formData, { headers });
      toast.success("Task created");
      setShowForm(false);
      setFormData({ title: "", description: "", due_date: "", priority: "medium", status: "pending" });
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create task");
    }
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await axios.put(`${API}/api/practice/tasks/${taskId}`, { status: newStatus }, { headers });
      fetchTasks();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const getPriorityColor = (priority) => {
    const colors = { low: "text-gray-400", medium: "text-blue-400", high: "text-amber-400", urgent: "text-red-400" };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["all", "pending", "in_progress", "completed"].map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className={filter === f ? "bg-tls-blue-electric" : "border-white/20 text-white"}>
              {f.replace('_', ' ')}
            </Button>
          ))}
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric">
          <Plus className="w-4 h-4 mr-2" /> Add Task
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Task Title *" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              <Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <Input placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Create Task</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <Card key={task.id} className={`glass-card border-white/10 transition-all ${task.status === 'completed' ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleTaskStatus(task.id, task.status)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 hover:border-white/50'}`}>
                  {task.status === 'completed' && <CheckSquare className="w-3 h-3 text-white" />}
                </button>
                <div className="flex-1">
                  <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-white/50' : 'text-white'}`}>{task.title}</h3>
                  {task.due_date && (
                    <p className="text-xs text-white/50 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No tasks yet</p>
        </div>
      )}
    </div>
  );
};

// Invoices Tab
const InvoicesTab = ({ token }) => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "", items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }], due_date: "", notes: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        axios.get(`${API}/api/practice/invoices`, { headers }),
        axios.get(`${API}/api/practice/clients`, { headers })
      ]);
      setInvoices(invoicesRes.data.invoices);
      setClients(clientsRes.data.clients);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      toast.error("Please select a client");
      return;
    }
    try {
      await axios.post(`${API}/api/practice/invoices`, formData, { headers });
      toast.success("Invoice created");
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create invoice");
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const getStatusColor = (status) => {
    const colors = { draft: "bg-gray-500", sent: "bg-blue-500", paid: "bg-emerald-500", overdue: "bg-red-500" };
    return colors[status] || colors.draft;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Invoices</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric" disabled={clients.length === 0}>
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2" required>
                  <option value="">Select Client *</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-white/50">Invoice Items</p>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="bg-white/5 border-white/10 text-white col-span-2" />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))} className="bg-white/5 border-white/10 text-white" />
                    <Input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-white/20 text-white">
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Create Invoice</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">{invoice.invoice_number}</h3>
                  <p className="text-sm text-white/50">{invoice.client_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">TZS {invoice.total?.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(invoice.status)}`} />
                    <span className="text-xs text-white/50 capitalize">{invoice.status}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {invoices.length === 0 && clients.length > 0 && (
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No invoices yet</p>
        </div>
      )}

      {clients.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">Add clients first before creating invoices</p>
        </div>
      )}
    </div>
  );
};

// Messages Tab
const MessagesTab = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [folder, setFolder] = useState("inbox");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/messages`, { headers, params: { folder } });
      setMessages(response.data.messages);
    } catch (error) {
      toast.error("Failed to fetch messages");
    }
  };

  useEffect(() => { fetchMessages(); }, [folder]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {["inbox", "sent", "archived"].map((f) => (
          <Button key={f} variant={folder === f ? "default" : "outline"} size="sm" onClick={() => setFolder(f)} className={folder === f ? "bg-tls-blue-electric" : "border-white/20 text-white capitalize"}>
            {f}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {messages.map((msg) => (
          <Card key={msg.id} className={`glass-card border-white/10 cursor-pointer ${!msg.read ? 'border-l-2 border-l-tls-blue-electric' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`font-medium ${!msg.read ? 'text-white' : 'text-white/70'}`}>{msg.subject}</h3>
                  <p className="text-sm text-white/50">{msg.sender_name}</p>
                </div>
                <span className="text-xs text-white/40">{new Date(msg.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No messages in {folder}</p>
        </div>
      )}
    </div>
  );
};

// Document Templates Tab
const TemplatesTab = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "", category: "contract", content: "", description: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/templates`, { headers });
      setTemplates(response.data.templates);
    } catch (error) {
      toast.error("Failed to fetch templates");
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/practice/templates`, formData, { headers });
      toast.success("Template created");
      setShowForm(false);
      setFormData({ name: "", category: "contract", content: "", description: "" });
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create template");
    }
  };

  const defaultTemplates = [
    { name: "Power of Attorney", category: "power_of_attorney", icon: FileSignature },
    { name: "Service Agreement", category: "contract", icon: FileText },
    { name: "Affidavit Template", category: "affidavit", icon: Scale },
    { name: "Legal Notice", category: "letter", icon: Mail },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Custom Templates</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric">
          <Plus className="w-4 h-4 mr-2" /> Create Template
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input placeholder="Template Name *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="contract">Contract</option>
                <option value="affidavit">Affidavit</option>
                <option value="power_of_attorney">Power of Attorney</option>
                <option value="letter">Letter</option>
                <option value="court_filing">Court Filing</option>
                <option value="other">Other</option>
              </select>
              <Textarea placeholder="Template content with {{placeholders}}" value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className="bg-white/5 border-white/10 text-white min-h-[200px] font-mono text-sm" />
              <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-white/5 border-white/10 text-white" rows={2} />
              <div className="flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Save Template</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.length === 0 && defaultTemplates.map((template, idx) => (
          <Card key={idx} className="glass-card border-white/10 border-dashed opacity-60 hover:opacity-100 transition-all cursor-pointer" onClick={() => setShowForm(true)}>
            <CardContent className="p-4 text-center">
              <template.icon className="w-8 h-8 mx-auto mb-2 text-white/40" />
              <p className="text-white/60 text-sm">{template.name}</p>
              <p className="text-xs text-white/30 mt-1">Click to create</p>
            </CardContent>
          </Card>
        ))}
        {templates.map((template) => (
          <Card key={template.id} className="glass-card border-white/10 hover:border-white/20 transition-all cursor-pointer">
            <CardContent className="p-4">
              <FileSignature className="w-8 h-8 mb-2 text-tls-blue-electric" />
              <h3 className="font-medium text-white">{template.name}</h3>
              <p className="text-xs text-white/50 capitalize mt-1">{template.category}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Document Generator Tab - Legal Document Generation with Templates
const DocumentGeneratorTab = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(false);
  const [includeQrStamp, setIncludeQrStamp] = useState(false);
  const [userSignature, setUserSignature] = useState(null);
  const [signatureType, setSignatureType] = useState("existing"); // existing, typed, drawn
  const [typedSignature, setTypedSignature] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const canvasRef = useState(null);
  
  // Client/Case linking
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [saveToVault, setSaveToVault] = useState(true);
  
  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastGeneratedDocId, setLastGeneratedDocId] = useState(null);
  const [shareLink, setShareLink] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch available templates from backend
  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/api/templates/list`, { headers });
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast.error("Failed to load document templates");
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's signature
  const fetchSignature = async () => {
    try {
      const response = await axios.get(`${API}/api/advocate/signature`, { headers });
      if (response.data.signature_data) {
        setUserSignature(response.data.signature_data);
        setSignatureType("existing");
      }
    } catch (error) {
      console.log("No existing signature found");
    }
  };

  // Fetch generation history
  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/api/templates/history`, { headers });
      setHistory(response.data.documents || []);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchSignature();
    fetchHistory();
    fetchClients();
    fetchCases();
  }, []);

  // Fetch clients for linking
  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/clients`, { headers });
      setClients(response.data.clients || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  // Fetch cases for linking
  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/cases`, { headers });
      setCases(response.data.cases || []);
    } catch (error) {
      console.error("Failed to fetch cases:", error);
    }
  };

  // Handle template selection
  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setPreviewHtml(null);
    setShowPreview(false);
    // Initialize form data with empty values for all placeholders
    const initialData = {};
    template.placeholders?.forEach(p => {
      initialData[p] = "";
    });
    setFormData(initialData);
  };

  // Preview document
  const handlePreview = async () => {
    if (!selectedTemplate) return;
    try {
      const response = await axios.post(`${API}/api/templates/preview`, {
        template_id: selectedTemplate.id,
        data: formData,
        include_signature: includeSignature,
        include_qr_stamp: includeQrStamp
      }, { headers });
      setPreviewHtml(response.data.content);
      setShowPreview(true);
    } catch (error) {
      toast.error("Failed to preview document");
    }
  };

  // Generate PDF
  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    
    // Check if signature is needed
    if (includeSignature && signatureType === "typed" && !typedSignature.trim()) {
      toast.error("Please enter your typed signature");
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post(`${API}/api/templates/generate`, {
        template_id: selectedTemplate.id,
        data: formData,
        include_signature: includeSignature,
        include_qr_stamp: includeQrStamp,
        save_to_vault: saveToVault,
        client_id: selectedClientId || null,
        case_id: selectedCaseId || null
      }, { 
        headers,
        responseType: 'blob'
      });
      
      // Get document ID from response headers
      const docId = response.headers['x-document-id'];
      const verificationId = response.headers['x-verification-id'];
      setLastGeneratedDocId(docId);
      
      // Download the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedTemplate.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(saveToVault ? "Document generated, saved to vault, and downloaded!" : "Document generated and downloaded!");
      fetchHistory();
      
      // Show share modal option
      setShowShareModal(true);
    } catch (error) {
      toast.error("Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  // Share document
  const handleShare = async (method) => {
    if (!lastGeneratedDocId) return;
    
    setSharing(true);
    try {
      const response = await axios.post(`${API}/api/templates/share`, {
        document_id: lastGeneratedDocId,
        share_via: method,
        recipient_email: shareEmail || null
      }, { headers });
      
      setShareLink(response.data.share_link);
      
      if (method === 'link') {
        navigator.clipboard.writeText(response.data.share_link);
        toast.success("Share link copied to clipboard!");
      } else if (method === 'whatsapp') {
        window.open(`https://wa.me/?text=${encodeURIComponent(`Document: ${response.data.share_link}`)}`, '_blank');
      }
    } catch (error) {
      toast.error("Failed to generate share link");
    } finally {
      setSharing(false);
    }
  };

  // Format placeholder names for display
  const formatPlaceholder = (name) => {
    return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      authorization: <UserCheck className="w-5 h-5" />,
      sworn_statement: <Scale className="w-5 h-5" />,
      notice: <Mail className="w-5 h-5" />,
      contract: <FileText className="w-5 h-5" />,
      court: <Gavel className="w-5 h-5" />,
      estate: <Building className="w-5 h-5" />
    };
    return icons[category] || <FileText className="w-5 h-5" />;
  };

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      authorization: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      sworn_statement: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      notice: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      contract: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      court: "bg-red-500/20 text-red-400 border-red-500/30",
      estate: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
    };
    return colors[category] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-tls-blue-electric" />
            Legal Document Generator
          </h2>
          <p className="text-sm text-white/50 mt-1">Generate professional legal documents with digital signatures and QR verification</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowHistory(!showHistory)}
          className="border-white/20 text-white"
          data-testid="toggle-history-btn"
        >
          <History className="w-4 h-4 mr-2" />
          History ({history.length})
        </Button>
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Recent Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.slice(0, 10).map((doc, idx) => (
                <div key={doc.id || idx} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm text-white">{doc.template_name}</p>
                    <p className="text-xs text-white/40">{new Date(doc.generated_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {doc.include_signature && <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">Signed</Badge>}
                    {doc.include_qr_stamp && <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">QR</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedTemplate ? (
        /* Template Selection Grid */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="glass-card border-white/10 hover:border-tls-blue-electric/50 transition-all cursor-pointer group"
              onClick={() => handleSelectTemplate(template)}
              data-testid={`template-card-${template.id}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColor(template.category)}`}>
                    {getCategoryIcon(template.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-tls-blue-electric transition-colors">{template.name}</h3>
                    {template.name_sw && template.name_sw !== template.name && (
                      <p className="text-xs text-white/40 italic">{template.name_sw}</p>
                    )}
                    <p className="text-sm text-white/60 mt-1">{template.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className={`text-xs capitalize ${getCategoryColor(template.category)}`}>
                        {template.category?.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-white/30">{template.placeholders?.length || 0} fields</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Document Form */
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="glass-card border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(selectedTemplate.category)}`}>
                      {getCategoryIcon(selectedTemplate.category)}
                    </div>
                    <div>
                      <CardTitle className="text-white">{selectedTemplate.name}</CardTitle>
                      <p className="text-xs text-white/50">{selectedTemplate.description}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedTemplate(null)}
                    className="border-white/20 text-white"
                    data-testid="back-to-templates-btn"
                  >
                    ← Back
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-white/60 font-medium">Fill in the document details:</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedTemplate.placeholders?.map((placeholder) => (
                    <div key={placeholder} className="space-y-1">
                      <label className="text-xs text-white/60">{formatPlaceholder(placeholder)}</label>
                      {placeholder.includes('content') || placeholder.includes('description') || placeholder.includes('bequests') ? (
                        <Textarea
                          placeholder={`Enter ${formatPlaceholder(placeholder).toLowerCase()}`}
                          value={formData[placeholder] || ""}
                          onChange={(e) => setFormData({ ...formData, [placeholder]: e.target.value })}
                          className="bg-white/5 border-white/10 text-white"
                          rows={3}
                        />
                      ) : (
                        <Input
                          placeholder={`Enter ${formatPlaceholder(placeholder).toLowerCase()}`}
                          value={formData[placeholder] || ""}
                          onChange={(e) => setFormData({ ...formData, [placeholder]: e.target.value })}
                          className="bg-white/5 border-white/10 text-white"
                          type={placeholder.includes('date') ? 'date' : placeholder.includes('amount') || placeholder.includes('price') || placeholder.includes('fee') || placeholder.includes('rent') || placeholder.includes('deposit') ? 'number' : 'text'}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Signature & QR Options */}
            <Card className="glass-card border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-emerald-500" />
                  Document Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR Stamp Option */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">QR Verification Stamp</p>
                      <p className="text-xs text-white/50">Add a scannable QR code for document verification</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={includeQrStamp} 
                      onChange={(e) => setIncludeQrStamp(e.target.checked)}
                      className="sr-only peer"
                      data-testid="qr-stamp-toggle"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Digital Signature Option */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Pen className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-white font-medium">Digital Signature</p>
                        <p className="text-xs text-white/50">Add your digital signature to the document</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={includeSignature} 
                        onChange={(e) => setIncludeSignature(e.target.checked)}
                        className="sr-only peer"
                        data-testid="signature-toggle"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Signature Type Selection */}
                  {includeSignature && (
                    <div className="pl-4 space-y-3 border-l-2 border-purple-500/30">
                      {/* Existing Signature */}
                      {userSignature && (
                        <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${signatureType === 'existing' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-white/5 hover:bg-white/10'}`}>
                          <input 
                            type="radio" 
                            name="signatureType" 
                            checked={signatureType === 'existing'} 
                            onChange={() => setSignatureType('existing')}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${signatureType === 'existing' ? 'border-purple-500 bg-purple-500' : 'border-white/30'}`}>
                            {signatureType === 'existing' && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">Use Saved Signature</p>
                            <img src={`data:image/png;base64,${userSignature}`} alt="Your signature" className="h-10 mt-1 object-contain" />
                          </div>
                        </label>
                      )}

                      {/* Typed Signature */}
                      <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${signatureType === 'typed' ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-white/5 hover:bg-white/10'}`}>
                        <input 
                          type="radio" 
                          name="signatureType" 
                          checked={signatureType === 'typed'} 
                          onChange={() => setSignatureType('typed')}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${signatureType === 'typed' ? 'border-purple-500 bg-purple-500' : 'border-white/30'}`}>
                          {signatureType === 'typed' && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Type className="w-4 h-4 text-white/60" />
                            <p className="text-white text-sm font-medium">Type Signature</p>
                          </div>
                          {signatureType === 'typed' && (
                            <Input
                              placeholder="Type your full name as signature"
                              value={typedSignature}
                              onChange={(e) => setTypedSignature(e.target.value)}
                              className="bg-white/10 border-white/20 text-white italic font-serif"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </label>

                      {/* No saved signature message */}
                      {!userSignature && (
                        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                          <p className="text-amber-400 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            No saved signature found. Use typed signature or go to Profile to upload one.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handlePreview} 
                variant="outline" 
                className="flex-1 border-white/20 text-white hover:bg-white/10"
                data-testid="preview-document-btn"
              >
                <Eye className="w-4 h-4 mr-2" /> Preview Document
              </Button>
              <Button 
                onClick={handleGenerate} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={generating}
                data-testid="generate-document-btn"
              >
                {generating ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> Generate PDF</>
                )}
              </Button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="lg:col-span-2">
            <Card className="glass-card border-white/10 sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-tls-blue-electric" />
                  Document Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showPreview && previewHtml ? (
                  <div 
                    className="bg-white rounded-lg p-4 max-h-[600px] overflow-y-auto text-black prose prose-sm"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div className="bg-white/5 rounded-lg p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-white/30" />
                    <p className="text-white/50 text-sm">Fill in the form and click "Preview Document" to see a preview</p>
                    <p className="text-white/30 text-xs mt-2">The preview will show how your document will look</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Practice Management Page
const PracticeManagementPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [analytics, setAnalytics] = useState(null);
  const [caseAnalytics, setCaseAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAnalytics = useCallback(async () => {
    try {
      const [dashRes, caseRes, revenueRes] = await Promise.all([
        axios.get(`${API}/api/practice/analytics/dashboard`, { headers }),
        axios.get(`${API}/api/practice/analytics/cases`, { headers }),
        axios.get(`${API}/api/practice/analytics/revenue`, { headers })
      ]);
      setAnalytics(dashRes.data);
      setCaseAnalytics(caseRes.data);
      setRevenueData(revenueRes.data.revenue_by_period);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleNavigate = (tab) => {
    if (tab.startsWith('new-')) {
      const section = tab.replace('new-', '') + 's';
      setActiveTab(section);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <DashboardLayout title="Practice Management" subtitle="Manage your clients, cases, tasks, and billing">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <PieChart className="w-4 h-4 mr-1" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Users className="w-4 h-4 mr-1" /> Clients
          </TabsTrigger>
          <TabsTrigger value="cases" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Briefcase className="w-4 h-4 mr-1" /> Cases
          </TabsTrigger>
          <TabsTrigger value="doc-generator" className="data-[state=active]:bg-emerald-600 rounded-lg text-xs px-3" data-testid="doc-generator-tab">
            <FileCheck className="w-4 h-4 mr-1" /> Doc Generator
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <FolderOpen className="w-4 h-4 mr-1" /> Documents
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Calendar className="w-4 h-4 mr-1" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <CheckSquare className="w-4 h-4 mr-1" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Receipt className="w-4 h-4 mr-1" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <FileSignature className="w-4 h-4 mr-1" /> Templates
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Mail className="w-4 h-4 mr-1" /> Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <EnhancedDashboard analytics={analytics} caseAnalytics={caseAnalytics} revenueData={revenueData} onNavigate={handleNavigate} />
        </TabsContent>

        <TabsContent value="clients">
          <ClientsTab token={token} />
        </TabsContent>

        <TabsContent value="cases">
          <CasesTab token={token} />
        </TabsContent>

        <TabsContent value="doc-generator">
          <DocumentGeneratorTab token={token} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab token={token} />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarTab token={token} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab token={token} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab token={token} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab token={token} />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesTab token={token} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default PracticeManagementPage;
