import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Calendar as CalendarWidget } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Users, Briefcase, FileText, Calendar, CheckSquare,
  Receipt, DollarSign, Plus, Search, Clock, AlertTriangle,
  TrendingUp, FolderOpen, Mail, FileArchive, PieChart,
  Target, Scale, Gavel, Building, UserCheck, Download,
  Copy, Eye, Edit, Trash2, Send, CreditCard, Phone,
  FileSignature, ChevronRight, ArrowUpRight, ArrowDownRight,
  FileCheck, Stamp, Pen, Type, QrCode, RefreshCw, History,
  MoreVertical, Archive, FileOutput, Grid3X3, LayoutList,
  CalendarDays, List, ChevronLeft, Share2, MapPin, Bell,
  CalendarIcon, ClockIcon
} from "lucide-react";
import axios from "axios";
import { format } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL;

// Reusable Confirmation Dialog Component
const ConfirmDialog = ({ open, onOpenChange, title, description, confirmText = "Confirm", cancelText = "Cancel", variant = "default", onConfirm }) => {
  const variantStyles = {
    default: "bg-tls-blue-electric hover:bg-tls-blue-electric/90",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white"
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#0a0d14] border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-white/60">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variantStyles[variant]}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Date Picker Component
const DateTimePicker = ({ value, onChange, label, includeTime = true }) => {
  const [date, setDate] = useState(value ? new Date(value) : null);
  const [time, setTime] = useState(value ? value.slice(11, 16) : "09:00");
  const [open, setOpen] = useState(false);
  
  const handleDateSelect = (newDate) => {
    setDate(newDate);
    if (newDate) {
      const dateStr = format(newDate, "yyyy-MM-dd");
      onChange(includeTime ? `${dateStr}T${time}` : dateStr);
    }
    if (!includeTime) setOpen(false);
  };
  
  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    setTime(newTime);
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      onChange(`${dateStr}T${newTime}`);
    }
  };
  
  return (
    <div className="space-y-1">
      {label && <label className="text-xs text-white/50 block">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 ${!date && "text-white/50"}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-white/50" />
            {date ? (
              <span>
                {format(date, "PPP")}
                {includeTime && ` at ${time}`}
              </span>
            ) : (
              <span>Pick a date{includeTime ? " & time" : ""}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-[#1a1f2e] border-white/10" align="start">
          <CalendarWidget
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            className="rounded-md"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center text-white",
              caption_label: "text-sm font-medium text-white",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-white/10 hover:bg-white/20 text-white rounded-md p-0 flex items-center justify-center",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-white/50 rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal text-white/70 hover:bg-white/10 rounded-md flex items-center justify-center cursor-pointer",
              day_selected: "bg-tls-blue-electric text-white hover:bg-tls-blue-electric",
              day_today: "bg-white/20 text-white font-bold",
              day_outside: "text-white/30",
            }}
          />
          {includeTime && (
            <div className="p-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-white/50" />
                <input
                  type="time"
                  value={time}
                  onChange={handleTimeChange}
                  className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

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
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth >= 768 ? "table" : "card";
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
        <div className="hidden md:flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
          <button 
            onClick={() => setViewMode("table")} 
            className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
            title="Table view"
            data-testid="clients-view-table-btn"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode("card")} 
            className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
            title="Card view"
            data-testid="clients-view-card-btn"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
        <Button onClick={() => { setEditClient(null); setShowForm(true); }} className="bg-tls-blue-electric" data-testid="add-client-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      <ClientFormModal isOpen={showForm} onClose={() => { setShowForm(false); setEditClient(null); }} onSave={handleSaveClient} editData={editClient} />

      {clients.length > 0 && viewMode === "table" ? (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white/50 text-sm font-medium">Client</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Type</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Email</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Phone</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Company</th>
                <th className="text-right p-3 text-white/50 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-white/5 hover:bg-white/5 transition-colors" data-testid={`client-row-${client.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-tls-blue-electric/20 flex items-center justify-center">
                        {getTypeIcon(client.client_type)}
                      </div>
                      <span className="text-white font-medium">{client.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs border-white/20 text-white/70 capitalize">{client.client_type}</Badge>
                  </td>
                  <td className="p-3 text-white/70">{client.email || "-"}</td>
                  <td className="p-3 text-white/70">{client.phone || "-"}</td>
                  <td className="p-3 text-white/50">{client.company || "-"}</td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[140px]">
                        <DropdownMenuItem onClick={() => { setEditClient(client); setShowForm(true); }} className="hover:bg-white/10 cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={() => handleDeleteClient(client.id)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : clients.length > 0 ? (
        /* Card View */
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[140px]">
                      <DropdownMenuItem onClick={() => { setEditClient(client); setShowForm(true); }} className="hover:bg-white/10 cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={() => handleDeleteClient(client.id)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
      ) : null}

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
  const [editCase, setEditCase] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    // Default to table on desktop, card on mobile
    return window.innerWidth >= 768 ? "table" : "card";
  });
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
      if (editCase) {
        await axios.put(`${API}/api/practice/cases/${editCase.id}`, formData, { headers });
        toast.success("Case updated successfully");
      } else {
        await axios.post(`${API}/api/practice/cases`, formData, { headers });
        toast.success("Case created successfully");
      }
      setShowForm(false);
      setEditCase(null);
      setFormData({ title: "", client_id: "", case_type: "litigation", status: "active", priority: "medium", description: "", court: "", opposing_party: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save case");
    }
  };

  const handleEditCase = (caseItem) => {
    setEditCase(caseItem);
    setFormData({
      title: caseItem.title,
      client_id: caseItem.client_id,
      case_type: caseItem.case_type,
      status: caseItem.status,
      priority: caseItem.priority,
      description: caseItem.description || "",
      court: caseItem.court || "",
      opposing_party: caseItem.opposing_party || ""
    });
    setShowForm(true);
  };

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm("Are you sure you want to delete this case?")) return;
    try {
      await axios.delete(`${API}/api/practice/cases/${caseId}`, { headers });
      toast.success("Case deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete case");
    }
  };

  const handleUpdateStatus = async (caseId, newStatus) => {
    try {
      await axios.put(`${API}/api/practice/cases/${caseId}`, { status: newStatus }, { headers });
      toast.success(`Case status updated to ${newStatus}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
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
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
            <button 
              onClick={() => setViewMode("table")} 
              className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
              title="Table view"
              data-testid="view-table-btn"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("card")} 
              className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
              title="Card view"
              data-testid="view-card-btn"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric" disabled={clients.length === 0} data-testid="new-case-btn">
            <Plus className="w-4 h-4 mr-2" /> New Case
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-medium mb-4">{editCase ? "Edit Case" : "New Case"}</h3>
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
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
              </select>
              <Input placeholder="Court" value={formData.court} onChange={(e) => setFormData({...formData, court: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Opposing Party" value={formData.opposing_party} onChange={(e) => setFormData({...formData, opposing_party: e.target.value})} className="bg-white/5 border-white/10 text-white md:col-span-2" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">{editCase ? "Update Case" : "Create Case"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditCase(null); }} className="border-white/20 text-white">Cancel</Button>
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
      ) : cases.length > 0 && viewMode === "table" ? (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white/50 text-sm font-medium">Case</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Client</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Type</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Priority</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Court</th>
                <th className="text-right p-3 text-white/50 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => (
                <tr key={caseItem.id} className="border-b border-white/5 hover:bg-white/5 transition-colors" data-testid={`case-row-${caseItem.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(caseItem.priority)}`} />
                      <div>
                        <p className="text-white font-medium">{caseItem.title}</p>
                        <p className="text-white/40 text-xs">{caseItem.reference}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-white/70">{caseItem.client_name}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs border-white/20 text-white/70 capitalize">{caseItem.case_type}</Badge>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(caseItem.status)}`}>{caseItem.status}</span>
                  </td>
                  <td className="p-3 text-white/70 capitalize">{caseItem.priority}</td>
                  <td className="p-3 text-white/50 text-sm">{caseItem.court || "-"}</td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[160px]">
                        <DropdownMenuItem onClick={() => handleEditCase(caseItem)} className="hover:bg-white/10 cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" /> Edit Case
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={() => handleUpdateStatus(caseItem.id, "active")} className="hover:bg-white/10 cursor-pointer" disabled={caseItem.status === "active"}>
                          <Target className="mr-2 h-4 w-4 text-emerald-400" /> Set Active
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(caseItem.id, "pending")} className="hover:bg-white/10 cursor-pointer" disabled={caseItem.status === "pending"}>
                          <Clock className="mr-2 h-4 w-4 text-amber-400" /> Set Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(caseItem.id, "on_hold")} className="hover:bg-white/10 cursor-pointer" disabled={caseItem.status === "on_hold"}>
                          <Archive className="mr-2 h-4 w-4 text-purple-400" /> Put On Hold
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(caseItem.id, "closed")} className="hover:bg-white/10 cursor-pointer" disabled={caseItem.status === "closed"}>
                          <FileCheck className="mr-2 h-4 w-4 text-gray-400" /> Close Case
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={() => handleDeleteCase(caseItem.id)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Case
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : cases.length > 0 ? (
        /* Card View */
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10" data-testid={`case-actions-${caseItem.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[160px]">
                      <DropdownMenuItem onClick={() => handleEditCase(caseItem)} className="hover:bg-white/10 cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" /> Edit Case
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={() => handleUpdateStatus(caseItem.id, "active")} className="hover:bg-white/10 cursor-pointer" disabled={caseItem.status === "active"}>
                        <Target className="mr-2 h-4 w-4 text-emerald-400" /> Set Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(caseItem.id, "pending")} className="hover:bg-white/10 cursor-pointer" disabled={caseItem.status === "pending"}>
                        <Clock className="mr-2 h-4 w-4 text-amber-400" /> Set Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(caseItem.id, "on_hold")} className="hover:bg-white/10 cursor-pointer" disabled={caseItem.status === "on_hold"}>
                        <Archive className="mr-2 h-4 w-4 text-purple-400" /> Put On Hold
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(caseItem.id, "closed")} className="hover:bg-white/10 cursor-pointer" disabled={caseItem.status === "closed"}>
                        <FileCheck className="mr-2 h-4 w-4 text-gray-400" /> Close Case
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem onClick={() => handleDeleteCase(caseItem.id)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Case
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

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
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth >= 768 ? "table" : "card";
  });

  const csrfToken = localStorage.getItem("tls_csrf_token") || "";
  const headers = { 
    Authorization: `Bearer ${token}`,
    "X-CSRF-Token": csrfToken
  };

  const fetchData = async () => {
    try {
      const params = { folder: selectedFolder };
      if (searchQuery) params.search = searchQuery;
      
      const [docsRes, foldersRes] = await Promise.all([
        axios.get(`${API}/api/practice/documents`, { headers, params }),
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

  useEffect(() => { fetchData(); }, [selectedFolder, searchQuery]);

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

  const handleDownload = async (doc) => {
    try {
      // Use fetch instead of axios to avoid responseText issues with blob
      const response = await fetch(`${API}/api/practice/documents/${doc.id}/download`, {
        headers: headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        // For error responses, parse as JSON
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to download document");
        return;
      }
      
      // For success, get as blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.original_filename || doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Document downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document. Please try again.");
    }
  };

  const handleShare = async (doc) => {
    setSelectedDoc(doc);
    try {
      // Use fetch instead of axios for blob downloads
      const response = await fetch(`${API}/api/practice/documents/${doc.id}/download`, {
        headers: headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to share document");
        return;
      }
      
      const blob = await response.blob();
      const file = new File([blob], doc.original_filename || doc.name, { type: doc.file_type || 'application/pdf' });
      
      // Check if Web Share API supports file sharing
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: doc.name,
          text: 'Document from TLS Portal'
        });
        toast.success("Document shared!");
      } else {
        // Fallback: Download the file
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.original_filename || doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.info("Document downloaded. Share it manually via WhatsApp or email.");
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error("Failed to share document. Please try again.");
      }
    }
  };

  const handleShareWhatsApp = async (doc) => {
    try {
      // Use fetch instead of axios for blob downloads
      const response = await fetch(`${API}/api/practice/documents/${doc.id}/download`, {
        headers: headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to share");
        return;
      }
      
      const blob = await response.blob();
      const file = new File([blob], doc.original_filename || doc.name, { type: doc.file_type || 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: doc.name,
          text: 'Document from TLS Portal'
        });
        toast.success("Document shared!");
      } else {
        handleDownload(doc);
        toast.info("Document downloaded. Please attach in WhatsApp manually.");
        window.open('https://wa.me/', '_blank');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error("Failed to share. Please try again.");
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDoc) return;
    try {
      await axios.delete(`${API}/api/practice/documents/${deleteDoc.id}`, { headers });
      toast.success("Document deleted successfully");
      setDeleteDoc(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocIcon = (doc) => {
    if (doc.generated_doc_id) return <FileCheck className="w-5 h-5 text-emerald-500" />;
    if (doc.file_type?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (doc.file_type?.includes('image')) return <FileArchive className="w-5 h-5 text-blue-500" />;
    return <FileText className="w-5 h-5 text-teal-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteDoc}
        onOpenChange={(open) => !open && setDeleteDoc(null)}
        title="Delete Document"
        description={`Are you sure you want to delete "${deleteDoc?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">Document Vault</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input 
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border-white/10 text-white pl-9 w-48"
            />
          </div>
          <label className="cursor-pointer">
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            <Button className="bg-tls-blue-electric" disabled={uploading} asChild>
              <span><Plus className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload'}</span>
            </Button>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!selectedFolder ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFolder(null)}
            className={!selectedFolder ? "bg-tls-blue-electric" : "border-white/20 text-white"}
          >
            All Documents ({documents.length})
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
        <div className="hidden md:flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
          <button 
            onClick={() => setViewMode("table")} 
            className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
            title="Table view"
            data-testid="docs-view-table-btn"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode("card")} 
            className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
            title="Card view"
            data-testid="docs-view-card-btn"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {documents.length > 0 && viewMode === "table" ? (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white/50 text-sm font-medium">Document</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Folder</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Size</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Date</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Status</th>
                <th className="text-right p-3 text-white/50 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors" data-testid={`doc-row-${doc.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.generated_doc_id ? 'bg-emerald-500/20' : 'bg-teal-500/20'}`}>
                        {getDocIcon(doc)}
                      </div>
                      <span className="text-white font-medium truncate max-w-[200px]">{doc.name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs border-white/20 text-white/60">{doc.folder}</Badge>
                  </td>
                  <td className="p-3 text-white/70 text-sm">{formatFileSize(doc.file_size)}</td>
                  <td className="p-3 text-white/50 text-sm">{new Date(doc.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    {doc.generated_doc_id && <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mr-1">Generated</Badge>}
                    {doc.verification_id && <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">Verified</Badge>}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10" title="Download">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleShare(doc)} className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10" title="Share">
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteDoc(doc)} className="h-8 w-8 p-0 text-red-400/70 hover:text-red-400 hover:bg-red-500/10" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : documents.length > 0 ? (
        /* Card View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="glass-card border-white/10 hover:border-white/20 transition-all group" data-testid={`doc-card-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.generated_doc_id ? 'bg-emerald-500/20' : 'bg-teal-500/20'}`}>
                    {getDocIcon(doc)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{doc.name}</h3>
                    <p className="text-xs text-white/50">{formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs border-white/20 text-white/60">{doc.folder}</Badge>
                      {doc.generated_doc_id && (
                        <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Generated</Badge>
                      )}
                      {doc.verification_id && (
                        <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                          <QrCode className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* Action buttons - always visible */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(doc)} className="flex-1 border-white/20 text-white hover:bg-white/10 text-xs">
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare(doc)} className="flex-1 border-white/20 text-white hover:bg-white/10 text-xs">
                    <Share2 className="w-3 h-3 mr-1" /> Share
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteDoc(doc)} className="text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {documents.length === 0 && !loading && (
        <div className="text-center py-12">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No documents yet</p>
          <p className="text-white/30 text-sm mt-1">Upload documents or generate from templates</p>
        </div>
      )}
    </div>
  );
};

// Calendar Tab
const CalendarTab = ({ token }) => {
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [viewEvent, setViewEvent] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("list");
  const [formData, setFormData] = useState({
    title: "", event_type: "meeting", start_datetime: "", end_datetime: "", location: "", description: "", client_id: "", case_id: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [eventsRes, clientsRes, casesRes] = await Promise.all([
        axios.get(`${API}/api/practice/events`, { headers }),
        axios.get(`${API}/api/practice/clients`, { headers }),
        axios.get(`${API}/api/practice/cases`, { headers })
      ]);
      setEvents(eventsRes.data.events);
      setClients(clientsRes.data.clients);
      setCases(casesRes.data.cases);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editEvent) {
        await axios.put(`${API}/api/practice/events/${editEvent.id}`, formData, { headers });
        toast.success("Event updated successfully");
      } else {
        await axios.post(`${API}/api/practice/events`, formData, { headers });
        toast.success("Event created successfully");
      }
      setShowForm(false);
      setEditEvent(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save event");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", event_type: "meeting", start_datetime: "", end_datetime: "", location: "", description: "", client_id: "", case_id: "" });
  };

  const handleEditEvent = (event) => {
    setEditEvent(event);
    setFormData({
      title: event.title,
      event_type: event.event_type,
      start_datetime: event.start_datetime ? new Date(event.start_datetime).toISOString().slice(0, 16) : "",
      end_datetime: event.end_datetime ? new Date(event.end_datetime).toISOString().slice(0, 16) : "",
      location: event.location || "",
      description: event.description || "",
      client_id: event.client_id || "",
      case_id: event.case_id || ""
    });
    setShowForm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteEvent) return;
    try {
      await axios.delete(`${API}/api/practice/events/${deleteEvent.id}`, { headers });
      toast.success("Event deleted successfully");
      setDeleteEvent(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const handleDuplicateEvent = async (event) => {
    const duplicateData = {
      title: `${event.title} (Copy)`,
      event_type: event.event_type,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      location: event.location,
      description: event.description,
      client_id: event.client_id,
      case_id: event.case_id
    };
    try {
      await axios.post(`${API}/api/practice/events`, duplicateData, { headers });
      toast.success("Event duplicated successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to duplicate event");
    }
  };

  const getEventTypeColor = (type) => {
    const colors = { 
      court_hearing: "bg-red-500 text-red-100", 
      meeting: "bg-blue-500 text-blue-100", 
      deadline: "bg-amber-500 text-amber-100", 
      reminder: "bg-purple-500 text-purple-100", 
      appointment: "bg-emerald-500 text-emerald-100" 
    };
    return colors[type] || colors.meeting;
  };

  const getEventTypeIcon = (type) => {
    switch(type) {
      case 'court_hearing': return <Gavel className="w-4 h-4" />;
      case 'deadline': return <AlertTriangle className="w-4 h-4" />;
      case 'reminder': return <Clock className="w-4 h-4" />;
      case 'appointment': return <UserCheck className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const date = new Date(event.start_datetime).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  // Get dates with events for calendar highlighting
  const eventDates = events.map(e => new Date(e.start_datetime));
  
  // Get events for selected date
  const selectedDateEvents = events.filter(e => {
    const eventDate = new Date(e.start_datetime).toDateString();
    return eventDate === selectedDate.toDateString();
  }).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

  // Get upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(e => new Date(e.start_datetime) >= new Date())
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 10);

  // Get overdue events
  const overdueEvents = events.filter(e => 
    e.event_type === 'deadline' && 
    new Date(e.start_datetime) < new Date() &&
    !e.completed
  );

  // Get event count by type for selected date
  const getEventTypeCount = (type) => {
    return selectedDateEvents.filter(e => e.event_type === type).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Calendar & Events</h2>
          {overdueEvents.length > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {overdueEvents.length} overdue
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
            <button 
              onClick={() => setViewMode("list")} 
              className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
              title="List view"
              data-testid="calendar-view-list-btn"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("calendar")} 
              className={`p-1.5 rounded transition-colors ${viewMode === "calendar" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
              title="Calendar view"
              data-testid="calendar-view-grid-btn"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => { setEditEvent(null); resetForm(); setShowForm(true); }} className="bg-tls-blue-electric" data-testid="add-event-btn">
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        </div>
      </div>

      {/* Event Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditEvent(null); resetForm(); } }}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">{editEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
            <DialogDescription className="text-white/60">
              {editEvent ? "Update the event details below" : "Fill in the details for your new event"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/50">Event Title *</label>
                <Input placeholder="Enter event title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Event Type</label>
                <select value={formData.event_type} onChange={(e) => setFormData({...formData, event_type: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                  <option value="meeting">Meeting</option>
                  <option value="court_hearing">Court Hearing</option>
                  <option value="deadline">Deadline</option>
                  <option value="reminder">Reminder</option>
                  <option value="appointment">Appointment</option>
                </select>
              </div>
              <DateTimePicker 
                label="Start Date & Time *" 
                value={formData.start_datetime} 
                onChange={(val) => setFormData({...formData, start_datetime: val})} 
              />
              <DateTimePicker 
                label="End Date & Time" 
                value={formData.end_datetime} 
                onChange={(val) => setFormData({...formData, end_datetime: val})} 
              />
              <div className="space-y-1">
                <label className="text-xs text-white/50">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input placeholder="Enter location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="pl-10 bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Link to Client</label>
                <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                  <option value="">Select client (optional)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-white/50">Link to Case</label>
                <select value={formData.case_id} onChange={(e) => setFormData({...formData, case_id: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                  <option value="">Select case (optional)</option>
                  {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-white/50">Description</label>
                <Textarea placeholder="Add event notes or description..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-white/5 border-white/10 text-white" rows={3} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditEvent(null); resetForm(); }} className="border-white/20 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button type="submit" className="bg-tls-blue-electric hover:bg-tls-blue-electric/90">
                {editEvent ? "Save Changes" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Event Modal */}
      <Dialog open={!!viewEvent} onOpenChange={(open) => !open && setViewEvent(null)}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-lg">
          {viewEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEventTypeColor(viewEvent.event_type)}`}>
                    {getEventTypeIcon(viewEvent.event_type)}
                  </div>
                  <div>
                    <DialogTitle className="text-white text-lg">{viewEvent.title}</DialogTitle>
                    <Badge className="capitalize mt-1">{viewEvent.event_type.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 text-white/70">
                  <CalendarIcon className="w-4 h-4 text-white/50" />
                  <span>
                    {new Date(viewEvent.start_datetime).toLocaleString('en-GB', { 
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
                {viewEvent.end_datetime && (
                  <div className="flex items-center gap-3 text-white/70">
                    <ClockIcon className="w-4 h-4 text-white/50" />
                    <span>Until {new Date(viewEvent.end_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {viewEvent.location && (
                  <div className="flex items-center gap-3 text-white/70">
                    <MapPin className="w-4 h-4 text-white/50" />
                    <span>{viewEvent.location}</span>
                  </div>
                )}
                {viewEvent.description && (
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-white/60 text-sm">{viewEvent.description}</p>
                  </div>
                )}
                {(viewEvent.client_name || viewEvent.case_title) && (
                  <div className="flex flex-wrap gap-2">
                    {viewEvent.client_name && <Badge variant="outline" className="border-white/20 text-white/70">{viewEvent.client_name}</Badge>}
                    {viewEvent.case_title && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">{viewEvent.case_title}</Badge>}
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { handleEditEvent(viewEvent); setViewEvent(null); }} className="border-white/20 text-white hover:bg-white/10">
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" onClick={() => { handleDuplicateEvent(viewEvent); setViewEvent(null); }} className="border-white/20 text-white hover:bg-white/10">
                  <Copy className="w-4 h-4 mr-2" /> Duplicate
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteEvent}
        onOpenChange={(open) => !open && setDeleteEvent(null)}
        title="Delete Event"
        description={`Are you sure you want to delete "${deleteEvent?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      {/* Calendar View Mode */}
      {viewMode === "calendar" ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Calendar Widget */}
          <Card className="glass-card border-white/10 lg:col-span-1">
            <CardContent className="p-4">
              <CalendarWidget
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md bg-transparent text-white"
                modifiers={{
                  hasEvent: eventDates
                }}
                modifiersStyles={{
                  hasEvent: { 
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    borderRadius: '50%',
                    fontWeight: 'bold'
                  }
                }}
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center text-white",
                  caption_label: "text-sm font-medium text-white",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-white/10 hover:bg-white/20 text-white rounded-md p-0 flex items-center justify-center",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex justify-between",
                  head_cell: "text-white/50 rounded-md w-8 font-normal text-[0.8rem] text-center",
                  row: "flex w-full mt-2 justify-between",
                  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                  day: "h-8 w-8 p-0 font-normal text-white/70 hover:bg-white/10 rounded-md flex items-center justify-center cursor-pointer",
                  day_selected: "bg-tls-blue-electric text-white hover:bg-tls-blue-electric",
                  day_today: "bg-white/20 text-white font-bold",
                  day_outside: "text-white/30",
                  day_disabled: "text-white/20",
                }}
              />
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/50 mb-2">Legend</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Meeting</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Court</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Deadline</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Appointment</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Selected Day Events */}
          <Card className="glass-card border-white/10 lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-sm text-white/50">
                    {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} scheduled
                  </p>
                </div>
                {selectedDateEvents.length > 0 && (
                  <div className="flex gap-2">
                    {getEventTypeCount('meeting') > 0 && <Badge className="bg-blue-500/20 text-blue-400">{getEventTypeCount('meeting')} meetings</Badge>}
                    {getEventTypeCount('court_hearing') > 0 && <Badge className="bg-red-500/20 text-red-400">{getEventTypeCount('court_hearing')} court</Badge>}
                    {getEventTypeCount('deadline') > 0 && <Badge className="bg-amber-500/20 text-amber-400">{getEventTypeCount('deadline')} deadlines</Badge>}
                  </div>
                )}
              </div>
              
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedDateEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getEventTypeColor(event.event_type)}`}>
                        {getEventTypeIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-white">{event.title}</h4>
                            <p className="text-xs text-white/50">
                              {new Date(event.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              {event.end_datetime && ` - ${new Date(event.end_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                            {event.location && <p className="text-xs text-white/40 mt-1">{event.location}</p>}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/50 hover:text-white">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[160px]">
                              <DropdownMenuItem onClick={() => setViewEvent(event)} className="hover:bg-white/10 cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditEvent(event)} className="hover:bg-white/10 cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit Event
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateEvent(event)} className="hover:bg-white/10 cursor-pointer">
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem onClick={() => setDeleteEvent(event)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-white/20" />
                  <p className="text-white/40">No events on this day</p>
                  <Button 
                    onClick={() => {
                      const dateStr = selectedDate.toISOString().slice(0, 16);
                      setFormData({...formData, start_datetime: dateStr});
                      setShowForm(true);
                    }} 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 border-white/20 text-white"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="glass-card border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-white">{events.length}</p>
                <p className="text-xs text-white/50">Total Events</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{upcomingEvents.length}</p>
                <p className="text-xs text-white/50">Upcoming</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{events.filter(e => e.event_type === 'deadline').length}</p>
                <p className="text-xs text-white/50">Deadlines</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{events.filter(e => e.event_type === 'court_hearing').length}</p>
                <p className="text-xs text-white/50">Court Hearings</p>
              </CardContent>
            </Card>
          </div>

          {/* Events List */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/70">Upcoming Events</h3>
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="glass-card border-white/10 hover:border-white/20 transition-all" data-testid={`event-card-${event.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEventTypeColor(event.event_type)}`}>
                      {getEventTypeIcon(event.event_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-white">{event.title}</h3>
                          <p className="text-sm text-white/50 mt-1">
                            {new Date(event.start_datetime).toLocaleString('en-GB', { 
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                          {event.location && (
                            <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                              <Building className="w-3 h-3" /> {event.location}
                            </p>
                          )}
                          {(event.client_name || event.case_title) && (
                            <div className="flex items-center gap-2 mt-2">
                              {event.client_name && <Badge variant="outline" className="text-xs border-white/20 text-white/60">{event.client_name}</Badge>}
                              {event.case_title && <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">{event.case_title}</Badge>}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[160px]">
                            <DropdownMenuItem onClick={() => setViewEvent(event)} className="hover:bg-white/10 cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditEvent(event)} className="hover:bg-white/10 cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateEvent(event)} className="hover:bg-white/10 cursor-pointer">
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => setDeleteEvent(event)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {events.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No events scheduled</p>
          <p className="text-white/30 text-sm mt-1">Create your first event to get started</p>
        </div>
      )}
    </div>
  );
};

// Tasks Tab
const TasksTab = ({ token }) => {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filter, setFilter] = useState("all");
  const [formData, setFormData] = useState({ 
    title: "", description: "", due_date: "", priority: "medium", status: "pending", client_id: "", case_id: "" 
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const [tasksRes, clientsRes, casesRes] = await Promise.all([
        axios.get(`${API}/api/practice/tasks`, { headers, params }),
        axios.get(`${API}/api/practice/clients`, { headers }),
        axios.get(`${API}/api/practice/cases`, { headers })
      ]);
      setTasks(tasksRes.data.tasks);
      setClients(clientsRes.data.clients);
      setCases(casesRes.data.cases);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editTask) {
        await axios.put(`${API}/api/practice/tasks/${editTask.id}`, formData, { headers });
        toast.success("Task updated");
      } else {
        await axios.post(`${API}/api/practice/tasks`, formData, { headers });
        toast.success("Task created");
      }
      setShowForm(false);
      setEditTask(null);
      setFormData({ title: "", description: "", due_date: "", priority: "medium", status: "pending", client_id: "", case_id: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save task");
    }
  };

  const handleEditTask = (task) => {
    setEditTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date ? task.due_date.split('T')[0] : "",
      priority: task.priority,
      status: task.status,
      client_id: task.client_id || "",
      case_id: task.case_id || ""
    });
    setShowForm(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await axios.delete(`${API}/api/practice/tasks/${taskId}`, { headers });
      toast.success("Task deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await axios.put(`${API}/api/practice/tasks/${taskId}`, { status: newStatus }, { headers });
      toast.success(newStatus === "completed" ? "Task completed!" : "Task reopened");
      fetchData();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(`${API}/api/practice/tasks/${taskId}`, { status: newStatus }, { headers });
      toast.success(`Task status updated to ${newStatus.replace('_', ' ')}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const getPriorityColor = (priority) => {
    const colors = { low: "text-gray-400 bg-gray-500/10", medium: "text-blue-400 bg-blue-500/10", high: "text-amber-400 bg-amber-500/10", urgent: "text-red-400 bg-red-500/10" };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = { pending: "text-amber-400", in_progress: "text-blue-400", completed: "text-emerald-400" };
    return colors[status] || colors.pending;
  };

  // Calculate stats
  const overdueTasks = tasks.filter(t => 
    t.due_date && 
    new Date(t.due_date) < new Date() && 
    t.status !== 'completed'
  );
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "in_progress", "completed"].map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className={filter === f ? "bg-tls-blue-electric" : "border-white/20 text-white"}>
              {f === "all" ? "All" : f.replace('_', ' ')}
            </Button>
          ))}
        </div>
        <Button onClick={() => { setEditTask(null); setShowForm(!showForm); }} className="bg-tls-blue-electric" data-testid="add-task-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Task
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{tasks.length}</p>
            <p className="text-xs text-white/50">Total Tasks</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{completedTasks.length}</p>
            <p className="text-xs text-white/50">Completed</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{overdueTasks.length}</p>
            <p className="text-xs text-white/50">Overdue</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{urgentTasks.length}</p>
            <p className="text-xs text-white/50">Urgent</p>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-medium mb-4">{editTask ? "Edit Task" : "New Task"}</h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Task Title *" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              <div>
                <label className="text-xs text-white/50 block mb-1">Due Date</label>
                <Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              </div>
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="">Link to Client (optional)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={formData.case_id} onChange={(e) => setFormData({...formData, case_id: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="">Link to Case (optional)</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-white/5 border-white/10 text-white md:col-span-2" rows={2} />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">{editTask ? "Update Task" : "Create Task"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditTask(null); }} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && filter === "all" && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">{overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}</p>
                <p className="text-red-400/70 text-sm">Please review and complete these tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
          return (
            <Card key={task.id} className={`glass-card border-white/10 hover:border-white/20 transition-all ${task.status === 'completed' ? 'opacity-60' : ''} ${isOverdue ? 'border-red-500/30' : ''}`} data-testid={`task-card-${task.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => toggleTaskStatus(task.id, task.status)} 
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 hover:border-white/50'}`}
                  >
                    {task.status === 'completed' && <CheckSquare className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-white/50' : 'text-white'}`}>{task.title}</h3>
                        {task.description && <p className="text-sm text-white/40 mt-1 truncate">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {task.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-white/50'}`}>
                              <Clock className="w-3 h-3" />
                              {isOverdue ? 'Overdue: ' : 'Due: '}{new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {task.client_name && <Badge variant="outline" className="text-xs border-white/20 text-white/60">{task.client_name}</Badge>}
                          {task.case_title && <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">{task.case_title}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[160px]">
                            <DropdownMenuItem onClick={() => handleEditTask(task)} className="hover:bg-white/10 cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "pending")} className="hover:bg-white/10 cursor-pointer" disabled={task.status === "pending"}>
                              <Clock className="mr-2 h-4 w-4 text-amber-400" /> Set Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "in_progress")} className="hover:bg-white/10 cursor-pointer" disabled={task.status === "in_progress"}>
                              <Target className="mr-2 h-4 w-4 text-blue-400" /> Set In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "completed")} className="hover:bg-white/10 cursor-pointer" disabled={task.status === "completed"}>
                              <CheckSquare className="mr-2 h-4 w-4 text-emerald-400" /> Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No tasks yet</p>
          <p className="text-white/30 text-sm mt-1">Create your first task to get started</p>
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

// Document Templates Tab - Enhanced with Rich Editor
const TemplatesTab = ({ token }) => {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: "", category: "contract", content: "", description: "", placeholders: []
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [showUseTemplate, setShowUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [useFormData, setUseFormData] = useState({});
  const [generating, setGenerating] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(false);
  const [includeQrStamp, setIncludeQrStamp] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/templates`, { headers });
      setTemplates(response.data.templates || []);
    } catch (error) {
      toast.error("Failed to fetch templates");
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // Extract placeholders from content
  const extractPlaceholders = (content) => {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  };

  // Handle content change and auto-extract placeholders
  const handleContentChange = (newContent) => {
    const placeholders = extractPlaceholders(newContent);
    setFormData({ ...formData, content: newContent, placeholders });
  };

  // Insert placeholder at cursor
  const insertPlaceholder = (placeholder) => {
    const newContent = formData.content + `{{${placeholder}}}`;
    handleContentChange(newContent);
  };

  // Common placeholders
  const commonPlaceholders = [
    { name: "client_name", label: "Client Name" },
    { name: "client_address", label: "Client Address" },
    { name: "client_phone", label: "Client Phone" },
    { name: "client_email", label: "Client Email" },
    { name: "advocate_name", label: "Advocate Name" },
    { name: "date", label: "Date" },
    { name: "case_number", label: "Case Number" },
    { name: "court_name", label: "Court Name" },
    { name: "amount", label: "Amount" },
    { name: "witness_name", label: "Witness Name" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await axios.put(`${API}/api/practice/templates/${editingTemplate.id}`, formData, { headers });
        toast.success("Template updated");
      } else {
        await axios.post(`${API}/api/practice/templates`, formData, { headers });
        toast.success("Template created");
      }
      setShowForm(false);
      setEditingTemplate(null);
      setFormData({ name: "", category: "contract", content: "", description: "", placeholders: [] });
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save template");
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      content: template.content || "",
      description: template.description || "",
      placeholders: template.placeholders || extractPlaceholders(template.content || "")
    });
    setShowForm(true);
  };

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    try {
      await axios.delete(`${API}/api/practice/templates/${template.id}`, { headers });
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handlePreview = () => {
    let content = formData.content;
    // Replace placeholders with sample data
    formData.placeholders.forEach(p => {
      content = content.replace(new RegExp(`\\{\\{${p}\\}\\}`, 'g'), `<span class="bg-yellow-200 px-1">[${p}]</span>`);
    });
    setPreviewContent(content);
    setShowPreview(true);
  };

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    // Initialize form with empty values for placeholders
    const initialData = {};
    (template.placeholders || []).forEach(p => {
      initialData[p] = "";
    });
    setUseFormData(initialData);
    setShowUseTemplate(true);
  };

  const handleGenerateFromTemplate = async () => {
    if (!selectedTemplate) return;
    setGenerating(true);
    try {
      const response = await axios.post(`${API}/api/templates/custom/generate`, {
        template_id: selectedTemplate.id,
        data: useFormData,
        include_signature: includeSignature,
        include_qr_stamp: includeQrStamp,
        save_to_vault: true
      }, { headers, responseType: 'blob' });

      // Download PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedTemplate.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Document generated and saved to vault!");
      setShowUseTemplate(false);
    } catch (error) {
      toast.error("Failed to generate document");
    } finally {
      setGenerating(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      contract: <FileText className="w-5 h-5" />,
      affidavit: <Scale className="w-5 h-5" />,
      power_of_attorney: <FileSignature className="w-5 h-5" />,
      letter: <Mail className="w-5 h-5" />,
      court_filing: <Gavel className="w-5 h-5" />,
      other: <FileText className="w-5 h-5" />
    };
    return icons[category] || icons.other;
  };

  const getCategoryColor = (category) => {
    const colors = {
      contract: "bg-emerald-500/20 text-emerald-400",
      affidavit: "bg-amber-500/20 text-amber-400",
      power_of_attorney: "bg-purple-500/20 text-purple-400",
      letter: "bg-blue-500/20 text-blue-400",
      court_filing: "bg-red-500/20 text-red-400",
      other: "bg-gray-500/20 text-gray-400"
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Custom Templates</h2>
          <p className="text-sm text-white/50">Create reusable document templates with placeholders</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingTemplate(null); setFormData({ name: "", category: "contract", content: "", description: "", placeholders: [] }); }} className="bg-tls-blue-electric">
          <Plus className="w-4 h-4 mr-2" /> Create Template
        </Button>
      </div>

      {/* Template Editor Form */}
      {showForm && (
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">{editingTemplate ? 'Edit Template' : 'New Template'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input 
                  placeholder="Template Name *" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  className="bg-white/5 border-white/10 text-white" 
                  required 
                />
                <select 
                  value={formData.category} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})} 
                  className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2"
                >
                  <option value="contract">Contract</option>
                  <option value="affidavit">Affidavit</option>
                  <option value="power_of_attorney">Power of Attorney</option>
                  <option value="letter">Letter</option>
                  <option value="court_filing">Court Filing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Input 
                placeholder="Description (optional)" 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                className="bg-white/5 border-white/10 text-white" 
              />

              {/* Placeholder insertion */}
              <div className="space-y-2">
                <p className="text-sm text-white/60">Insert Placeholder:</p>
                <div className="flex flex-wrap gap-2">
                  {commonPlaceholders.map(p => (
                    <Button 
                      key={p.name} 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="border-white/20 text-white text-xs h-7"
                      onClick={() => insertPlaceholder(p.name)}
                    >
                      {`{{${p.name}}}`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Content editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/60">Template Content *</p>
                  <Button type="button" size="sm" variant="outline" className="border-white/20 text-white" onClick={handlePreview}>
                    <Eye className="w-3 h-3 mr-1" /> Preview
                  </Button>
                </div>
                <Textarea 
                  placeholder="Enter your template content here. Use {{placeholder_name}} for dynamic fields.

Example:
This document is made between {{client_name}} residing at {{client_address}} and {{advocate_name}}.

Date: {{date}}"
                  value={formData.content} 
                  onChange={(e) => handleContentChange(e.target.value)} 
                  className="bg-white/5 border-white/10 text-white min-h-[300px] font-mono text-sm" 
                  required
                />
              </div>

              {/* Detected placeholders */}
              {formData.placeholders.length > 0 && (
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <p className="text-xs text-emerald-400 mb-2">Detected Placeholders ({formData.placeholders.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.placeholders.map(p => (
                      <Badge key={p} variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                        {`{{${p}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingTemplate(null); }} className="border-white/20 text-white">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Templates Grid */}
      {templates.length === 0 && !showForm ? (
        <Card className="glass-card border-white/10 border-dashed">
          <CardContent className="p-12 text-center">
            <FileSignature className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/60 mb-2">No custom templates yet</p>
            <p className="text-sm text-white/40 mb-4">Create reusable templates for your frequently used documents</p>
            <Button onClick={() => setShowForm(true)} className="bg-tls-blue-electric">
              <Plus className="w-4 h-4 mr-2" /> Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="glass-card border-white/10 hover:border-white/20 transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(template.category)}`}>
                    {getCategoryIcon(template.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white">{template.name}</h3>
                    {template.description && (
                      <p className="text-xs text-white/50 mt-1 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={`text-xs capitalize ${getCategoryColor(template.category)}`}>
                        {template.category?.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-white/30">{template.placeholders?.length || 0} fields</span>
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8" onClick={() => handleUseTemplate(template)}>
                    <FileCheck className="w-3 h-3 mr-1" /> Use
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 border-white/20 text-white" onClick={() => handleEdit(template)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(template)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Template Preview</DialogTitle>
            <DialogDescription className="text-white/60">
              Placeholders are highlighted in yellow
            </DialogDescription>
          </DialogHeader>
          <div className="bg-white rounded-lg p-6 max-h-[500px] overflow-y-auto">
            <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: previewContent.replace(/\n/g, '<br/>') }} />
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)} className="bg-tls-blue-electric">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Use Template Modal */}
      <Dialog open={showUseTemplate} onOpenChange={setShowUseTemplate}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-2xl w-[90vw]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-500" />
              Generate Document
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Fill in the fields to generate "{selectedTemplate?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {selectedTemplate?.placeholders?.map(placeholder => (
              <div key={placeholder} className="space-y-1">
                <label className="text-xs text-white/60 capitalize">{placeholder.replace(/_/g, ' ')}</label>
                <Input
                  placeholder={`Enter ${placeholder.replace(/_/g, ' ')}`}
                  value={useFormData[placeholder] || ""}
                  onChange={(e) => setUseFormData({ ...useFormData, [placeholder]: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            ))}

            {/* Options */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Include Signature</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={includeSignature} onChange={(e) => setIncludeSignature(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">Include QR Stamp</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={includeQrStamp} onChange={(e) => setIncludeQrStamp(e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUseTemplate(false)} className="border-white/20 text-white">
              Cancel
            </Button>
            <Button onClick={handleGenerateFromTemplate} disabled={generating} className="bg-emerald-600 hover:bg-emerald-700">
              {generating ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Download className="w-4 h-4 mr-2" /> Generate PDF</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState(null); // Store the PDF blob
  const [lastGeneratedFileName, setLastGeneratedFileName] = useState("");
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
      
      // Store the PDF blob for sharing
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const fileName = `${selectedTemplate.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      setLastGeneratedPdf(blob);
      setLastGeneratedFileName(fileName);
      
      // Download the PDF
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
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

  // Download the last generated PDF again
  const handleDownloadAgain = () => {
    if (!lastGeneratedPdf) return;
    const url = window.URL.createObjectURL(lastGeneratedPdf);
    const link = document.createElement('a');
    link.href = url;
    link.download = lastGeneratedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Document downloaded!");
  };

  // Share via WhatsApp using Web Share API
  const handleShareWhatsApp = async () => {
    if (!lastGeneratedPdf) {
      toast.error("No document to share");
      return;
    }
    
    setSharing(true);
    try {
      // Create a File object from the blob
      const file = new File([lastGeneratedPdf], lastGeneratedFileName, { type: 'application/pdf' });
      
      // Check if Web Share API supports file sharing
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: lastGeneratedFileName,
          text: 'Legal document from TLS Portal'
        });
        toast.success("Document shared!");
      } else {
        // Fallback: Download first, then open WhatsApp
        handleDownloadAgain();
        toast.info("Document downloaded. Please attach it manually in WhatsApp.");
        window.open('https://wa.me/', '_blank');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        // User cancelled share is not an error
        toast.error("Failed to share document");
      }
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

                {/* Client & Case Linking Section */}
                <div className="pt-4 border-t border-white/10 mt-4">
                  <p className="text-sm text-white/60 font-medium mb-3">Link Document (Optional)</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-white/60">Link to Client</label>
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
                        data-testid="client-select"
                      >
                        <option value="">-- No Client --</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-white/60">Link to Case</label>
                      <select
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm"
                        data-testid="case-select"
                      >
                        <option value="">-- No Case --</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.id}>{c.title} ({c.reference})</option>
                        ))}
                      </select>
                    </div>
                  </div>
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

                {/* Save to Vault Option */}
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-white font-medium">Auto-Save to Document Vault</p>
                      <p className="text-xs text-white/50">Save generated document to your vault for easy access</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={saveToVault} 
                      onChange={(e) => setSaveToVault(e.target.checked)}
                      className="sr-only peer"
                      data-testid="save-vault-toggle"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
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
                  <><Download className="w-4 h-4 mr-2" /> Generate & Save</>
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

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-500" />
              Document Generated Successfully!
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Your document has been generated{saveToVault ? ' and saved to your vault' : ''}. Share it with your client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Document info */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{lastGeneratedFileName}</p>
                  <p className="text-xs text-white/50">PDF Document • Ready to share</p>
                </div>
              </div>
            </div>

            {/* Share options */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="border-white/20 text-white flex-col h-auto py-5 hover:bg-white/10"
                onClick={handleDownloadAgain}
                data-testid="download-again-btn"
              >
                <Download className="w-7 h-7 mb-2 text-blue-400" />
                <span className="text-sm font-medium">Download</span>
                <span className="text-xs text-white/50">Save & share manually</span>
              </Button>
              <Button 
                variant="outline" 
                className="border-white/20 text-white flex-col h-auto py-5 hover:bg-emerald-500/20"
                onClick={handleShareWhatsApp}
                disabled={sharing}
                data-testid="share-whatsapp-btn"
              >
                <Phone className="w-7 h-7 mb-2 text-emerald-500" />
                <span className="text-sm font-medium">{sharing ? 'Sharing...' : 'WhatsApp'}</span>
                <span className="text-xs text-white/50">Share directly</span>
              </Button>
            </div>

            <p className="text-xs text-white/40 text-center">
              WhatsApp share uses your device's share feature. If not supported, download and attach manually.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setShowShareModal(false); setLastGeneratedPdf(null); setLastGeneratedFileName(""); }} 
              className="border-white/20 text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
