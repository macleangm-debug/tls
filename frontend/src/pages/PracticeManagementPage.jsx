import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import {
  Users, Briefcase, FileText, Calendar, CheckSquare,
  Receipt, DollarSign, BarChart3, Plus, Search,
  Clock, AlertTriangle, TrendingUp, FolderOpen,
  Mail, FileArchive, LayoutDashboard
} from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

// Dashboard Overview Component
const DashboardOverview = ({ analytics, onNavigate }) => {
  const statCards = [
    { label: "Active Cases", value: analytics?.summary?.active_cases || 0, icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Clients", value: analytics?.summary?.total_clients || 0, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending Tasks", value: analytics?.summary?.pending_tasks || 0, icon: CheckSquare, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Upcoming Events", value: analytics?.summary?.upcoming_events || 0, icon: Calendar, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Documents", value: analytics?.summary?.total_documents || 0, icon: FileText, color: "text-teal-500", bg: "bg-teal-500/10" },
    { label: "Stamps This Month", value: analytics?.summary?.stamps_this_month || 0, icon: FileArchive, color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="glass-card border-white/10 hover:border-white/20 transition-all cursor-pointer" onClick={() => onNavigate(stat.label.toLowerCase().replace(' ', '-'))}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/50">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-500">
              TZS {(analytics?.financials?.monthly_revenue || 0).toLocaleString()}
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Pending Invoices</span>
                <span className="text-amber-400">TZS {(analytics?.financials?.pending_invoices || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Total Paid</span>
                <span className="text-emerald-400">TZS {(analytics?.financials?.paid_total || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.summary?.overdue_tasks > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-white font-medium">{analytics.summary.overdue_tasks} Overdue Tasks</p>
                    <p className="text-xs text-white/50">Requires immediate attention</p>
                  </div>
                </div>
              )}
              {analytics?.financials?.pending_count > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg">
                  <Receipt className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-white font-medium">{analytics.financials.pending_count} Unpaid Invoices</p>
                    <p className="text-xs text-white/50">Follow up with clients</p>
                  </div>
                </div>
              )}
              {(!analytics?.summary?.overdue_tasks && !analytics?.financials?.pending_count) && (
                <p className="text-white/50 text-center py-4">All caught up!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Quick Actions Bar
const QuickActions = ({ onAction }) => (
  <div className="flex flex-wrap gap-2">
    <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => onAction('new-client')}>
      <Plus className="w-4 h-4 mr-1" /> Client
    </Button>
    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => onAction('new-case')}>
      <Plus className="w-4 h-4 mr-1" /> Case
    </Button>
    <Button size="sm" className="bg-purple-500 hover:bg-purple-600" onClick={() => onAction('new-task')}>
      <Plus className="w-4 h-4 mr-1" /> Task
    </Button>
    <Button size="sm" className="bg-amber-500 hover:bg-amber-600" onClick={() => onAction('new-event')}>
      <Plus className="w-4 h-4 mr-1" /> Event
    </Button>
    <Button size="sm" className="bg-teal-500 hover:bg-teal-600" onClick={() => onAction('new-invoice')}>
      <Plus className="w-4 h-4 mr-1" /> Invoice
    </Button>
  </div>
);

// Main Practice Management Page
const PracticeManagementPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/practice/analytics/dashboard`, { headers });
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleQuickAction = (action) => {
    switch (action) {
      case 'new-client':
        setActiveTab('clients');
        break;
      case 'new-case':
        setActiveTab('cases');
        break;
      case 'new-task':
        setActiveTab('tasks');
        break;
      case 'new-event':
        setActiveTab('calendar');
        break;
      case 'new-invoice':
        setActiveTab('invoices');
        break;
      default:
        break;
    }
  };

  const handleNavigate = (tab) => {
    const tabMap = {
      'active-cases': 'cases',
      'total-clients': 'clients',
      'pending-tasks': 'tasks',
      'upcoming-events': 'calendar',
      'documents': 'documents',
      'stamps-this-month': 'dashboard'
    };
    setActiveTab(tabMap[tab] || 'dashboard');
  };

  return (
    <div className="min-h-screen bg-[#02040A] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <LayoutDashboard className="w-7 h-7 text-tls-blue-electric" />
              Practice Management
            </h1>
            <p className="text-white/50 text-sm mt-1">Manage your clients, cases, tasks, and billing</p>
          </div>
          <QuickActions onAction={handleQuickAction} />
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex-wrap h-auto">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <BarChart3 className="w-4 h-4 mr-2" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="clients" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <Users className="w-4 h-4 mr-2" /> Clients
            </TabsTrigger>
            <TabsTrigger value="cases" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <Briefcase className="w-4 h-4 mr-2" /> Cases
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <FolderOpen className="w-4 h-4 mr-2" /> Documents
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <Calendar className="w-4 h-4 mr-2" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <CheckSquare className="w-4 h-4 mr-2" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <Receipt className="w-4 h-4 mr-2" /> Invoices
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <Mail className="w-4 h-4 mr-2" /> Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardOverview analytics={analytics} onNavigate={handleNavigate} />
          </TabsContent>

          <TabsContent value="clients">
            <ClientsTab token={token} />
          </TabsContent>

          <TabsContent value="cases">
            <CasesTab token={token} />
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

          <TabsContent value="messages">
            <MessagesTab token={token} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Clients Tab Component
const ClientsTab = ({ token }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", company: "", client_type: "individual", address: "", notes: ""
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/practice/clients`, formData, { headers });
      toast.success("Client created successfully");
      setShowForm(false);
      setFormData({ name: "", email: "", phone: "", company: "", client_type: "individual", address: "", notes: "" });
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create client");
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
          />
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric">
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Full Name *" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              <Input placeholder="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <select value={formData.client_type} onChange={(e) => setFormData({...formData, client_type: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
                <option value="government">Government</option>
              </select>
              <Input placeholder="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Save Client</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="glass-card border-white/10 hover:border-white/20 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{client.name}</h3>
                  <p className="text-sm text-white/50">{client.company || client.email}</p>
                </div>
                <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                  {client.client_type}
                </Badge>
              </div>
              <div className="mt-3 text-sm text-white/60">
                {client.phone && <p>{client.phone}</p>}
                {client.address && <p className="truncate">{client.address}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {clients.length === 0 && !loading && (
        <div className="text-center py-12 text-white/50">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No clients yet. Add your first client to get started!</p>
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
    const colors = { active: "text-emerald-400", pending: "text-amber-400", closed: "text-gray-400", on_hold: "text-purple-400" };
    return colors[status] || colors.active;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Cases & Matters</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric">
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
            <p className="text-white/50">You need to add clients before creating cases.</p>
            <p className="text-sm text-white/30 mt-2">Go to the Clients tab to add your first client.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cases.map((caseItem) => (
            <Card key={caseItem.id} className="glass-card border-white/10 hover:border-white/20 transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(caseItem.priority)}`} />
                      <h3 className="font-semibold text-white">{caseItem.title}</h3>
                    </div>
                    <p className="text-sm text-white/50 mt-1">{caseItem.client_name} • {caseItem.reference}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-xs border-white/20 text-white/70">{caseItem.case_type}</Badge>
                      <span className={`text-xs ${getStatusColor(caseItem.status)}`}>{caseItem.status}</span>
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
        <div className="text-center py-12 text-white/50">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No cases yet. Create your first case!</p>
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
      toast.success("Document uploaded successfully");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload document");
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
          <Button className="bg-tls-blue-electric" disabled={uploading}>
            <Plus className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload Document'}
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
          <Card key={doc.id} className="glass-card border-white/10 hover:border-white/20 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-teal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{doc.name}</h3>
                  <p className="text-xs text-white/50">{formatFileSize(doc.file_size)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">{doc.folder}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {documents.length === 0 && !loading && (
        <div className="text-center py-12 text-white/50">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No documents yet. Upload your first document!</p>
        </div>
      )}
    </div>
  );
};

// Calendar Tab Component
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
      toast.success("Event created successfully");
      setShowForm(false);
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create event");
    }
  };

  const getEventTypeColor = (type) => {
    const colors = {
      court_hearing: "bg-red-500", meeting: "bg-blue-500", deadline: "bg-amber-500",
      reminder: "bg-purple-500", appointment: "bg-emerald-500"
    };
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
              <Input placeholder="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-white/5 border-white/10 text-white" />
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
                <Badge variant="outline" className="border-white/20 text-white/70">{event.event_type.replace('_', ' ')}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12 text-white/50">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No events scheduled. Add your first event!</p>
        </div>
      )}
    </div>
  );
};

// Tasks Tab Component
const TasksTab = ({ token }) => {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [formData, setFormData] = useState({
    title: "", description: "", due_date: "", priority: "medium", status: "pending"
  });

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
      toast.success("Task created successfully");
      setShowForm(false);
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
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? "bg-tls-blue-electric" : "border-white/20 text-white"}
            >
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
                <button
                  onClick={() => toggleTaskStatus(task.id, task.status)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 hover:border-white/50'}`}
                >
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
        <div className="text-center py-12 text-white/50">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No tasks yet. Add your first task!</p>
        </div>
      )}
    </div>
  );
};

// Invoices Tab Component
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
      toast.success("Invoice created successfully");
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
                    <span className="text-xs text-white/50">{invoice.status}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {invoices.length === 0 && clients.length > 0 && (
        <div className="text-center py-12 text-white/50">
          <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No invoices yet. Create your first invoice!</p>
        </div>
      )}

      {clients.length === 0 && (
        <div className="text-center py-12 text-white/50">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Add clients first before creating invoices.</p>
        </div>
      )}
    </div>
  );
};

// Messages Tab Component
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
        <div className="flex gap-2">
          {["inbox", "sent", "archived"].map((f) => (
            <Button
              key={f}
              variant={folder === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFolder(f)}
              className={folder === f ? "bg-tls-blue-electric" : "border-white/20 text-white"}
            >
              {f}
            </Button>
          ))}
        </div>
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
        <div className="text-center py-12 text-white/50">
          <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No messages in {folder}.</p>
        </div>
      )}
    </div>
  );
};

export default PracticeManagementPage;
