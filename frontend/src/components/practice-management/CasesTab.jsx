import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../ui/dropdown-menu";
import { toast } from "sonner";
import { 
  Briefcase, Users, Plus, Edit, Trash2, MoreVertical, 
  LayoutList, Grid3X3, Target, Clock, Archive, FileCheck,
  Calendar, Gavel, MapPin, User, Building, ChevronRight,
  CheckCircle2, AlertTriangle, ListTodo, CalendarPlus, X, Loader2
} from "lucide-react";
import axios from "axios";
import { API } from "./shared";

export const CasesTab = ({ token }) => {
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCase, setEditCase] = useState(null);
  const [viewMode, setViewMode] = useState(() => window.innerWidth >= 768 ? "table" : "card");
  const [formData, setFormData] = useState({
    title: "", client_id: "", case_type: "litigation", status: "active", priority: "medium", 
    description: "", court: "", judge: "", opposing_party: "", case_number: ""
  });

  // Case detail modal
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseDetail, setShowCaseDetail] = useState(false);
  const [caseHearings, setCaseHearings] = useState([]);
  const [caseTasks, setCaseTasks] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Hearing form
  const [showHearingForm, setShowHearingForm] = useState(false);
  const [hearingData, setHearingData] = useState({
    title: "", hearing_date: "", hearing_time: "09:00", court: "", courtroom: "",
    judge: "", purpose: "", notes: "", add_to_calendar: true
  });
  const [savingHearing, setSavingHearing] = useState(false);

  // Task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskData, setTaskData] = useState({
    title: "", description: "", due_date: "", priority: "medium", add_to_calendar: true
  });
  const [savingTask, setSavingTask] = useState(false);

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

  // Fetch case detail with hearings and tasks
  const fetchCaseDetail = async (caseItem) => {
    setSelectedCase(caseItem);
    setShowCaseDetail(true);
    setLoadingDetail(true);
    
    try {
      const [hearingsRes, tasksRes] = await Promise.all([
        axios.get(`${API}/api/practice/cases/${caseItem.id}/hearings`, { headers }).catch(() => ({ data: { hearings: [] } })),
        axios.get(`${API}/api/practice/cases/${caseItem.id}/tasks`, { headers }).catch(() => ({ data: { tasks: [] } }))
      ]);
      setCaseHearings(hearingsRes.data.hearings || []);
      setCaseTasks(tasksRes.data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch case details:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

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
      setFormData({ title: "", client_id: "", case_type: "litigation", status: "active", priority: "medium", description: "", court: "", judge: "", opposing_party: "", case_number: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save case");
    }
  };

  // Add hearing
  const handleAddHearing = async (e) => {
    e.preventDefault();
    if (!hearingData.title || !hearingData.hearing_date) {
      toast.error("Please fill in required fields");
      return;
    }
    
    setSavingHearing(true);
    try {
      // Save hearing
      const hearingPayload = {
        ...hearingData,
        case_id: selectedCase.id,
        hearing_datetime: `${hearingData.hearing_date}T${hearingData.hearing_time}:00`
      };
      
      await axios.post(`${API}/api/practice/cases/${selectedCase.id}/hearings`, hearingPayload, { headers });
      
      // Add to calendar if requested
      if (hearingData.add_to_calendar) {
        try {
          await axios.post(`${API}/api/practice/events`, {
            title: `Court: ${hearingData.title}`,
            start: `${hearingData.hearing_date}T${hearingData.hearing_time}:00`,
            end: `${hearingData.hearing_date}T${parseInt(hearingData.hearing_time.split(':')[0]) + 2}:00:00`,
            type: "court_hearing",
            priority: "high",
            case_id: selectedCase.id,
            location: hearingData.court ? `${hearingData.court}${hearingData.courtroom ? `, ${hearingData.courtroom}` : ''}` : null,
            notes: `Case: ${selectedCase.title}\nJudge: ${hearingData.judge || selectedCase.judge || 'TBD'}\n${hearingData.purpose || ''}`
          }, { headers });
          toast.success("Hearing added and synced to calendar");
        } catch (calError) {
          toast.success("Hearing added (calendar sync failed)");
        }
      } else {
        toast.success("Hearing added successfully");
      }
      
      setShowHearingForm(false);
      setHearingData({ title: "", hearing_date: "", hearing_time: "09:00", court: "", courtroom: "", judge: "", purpose: "", notes: "", add_to_calendar: true });
      fetchCaseDetail(selectedCase);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add hearing");
    } finally {
      setSavingHearing(false);
    }
  };

  // Add task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskData.title) {
      toast.error("Please enter a task title");
      return;
    }
    
    setSavingTask(true);
    try {
      // Save task
      const taskPayload = {
        ...taskData,
        case_id: selectedCase.id,
        client_id: selectedCase.client_id
      };
      
      await axios.post(`${API}/api/practice/tasks`, taskPayload, { headers });
      
      // Add to calendar if requested and has due date
      if (taskData.add_to_calendar && taskData.due_date) {
        try {
          await axios.post(`${API}/api/practice/calendar/events`, {
            title: `Task: ${taskData.title}`,
            start: `${taskData.due_date}T09:00:00`,
            end: `${taskData.due_date}T10:00:00`,
            type: "deadline",
            priority: taskData.priority,
            case_id: selectedCase.id,
            notes: `Case: ${selectedCase.title}\n${taskData.description || ''}`
          }, { headers });
          toast.success("Task added and synced to calendar");
        } catch (calError) {
          toast.success("Task added (calendar sync failed)");
        }
      } else {
        toast.success("Task added successfully");
      }
      
      setShowTaskForm(false);
      setTaskData({ title: "", description: "", due_date: "", priority: "medium", add_to_calendar: true });
      fetchCaseDetail(selectedCase);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add task");
    } finally {
      setSavingTask(false);
    }
  };

  // Delete hearing
  const handleDeleteHearing = async (hearingId) => {
    if (!window.confirm("Delete this hearing?")) return;
    try {
      await axios.delete(`${API}/api/practice/cases/${selectedCase.id}/hearings/${hearingId}`, { headers });
      toast.success("Hearing deleted");
      fetchCaseDetail(selectedCase);
    } catch (error) {
      toast.error("Failed to delete hearing");
    }
  };

  // Complete task
  const handleCompleteTask = async (taskId) => {
    try {
      await axios.patch(`${API}/api/practice/tasks/${taskId}`, { status: "completed" }, { headers });
      toast.success("Task completed");
      fetchCaseDetail(selectedCase);
    } catch (error) {
      toast.error("Failed to update task");
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
      judge: caseItem.judge || "",
      opposing_party: caseItem.opposing_party || "",
      case_number: caseItem.case_number || ""
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
      await axios.patch(`${API}/api/practice/cases/${caseId}/status`, { status: newStatus }, { headers });
      toast.success(`Case status updated to ${newStatus.replace('_', ' ')}`);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  // Get next hearing for a case
  const getNextHearing = (caseItem) => {
    const hearings = caseItem.hearings || [];
    const now = new Date();
    const upcoming = hearings.filter(h => new Date(h.hearing_datetime) > now).sort((a, b) => 
      new Date(a.hearing_datetime) - new Date(b.hearing_datetime)
    );
    return upcoming[0];
  };

  const StatusDropdown = ({ caseItem }) => (
    <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[160px]">
      <DropdownMenuItem onClick={() => fetchCaseDetail(caseItem)} className="hover:bg-white/10 cursor-pointer">
        <ChevronRight className="mr-2 h-4 w-4" /> View Details
      </DropdownMenuItem>
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
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Cases & Matters</h2>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
            <button onClick={() => setViewMode("table")} className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}>
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("card")} className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric" disabled={clients.length === 0}>
            <Plus className="w-4 h-4 mr-2" /> New Case
          </Button>
        </div>
      </div>

      {/* New/Edit Case Form */}
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
              <Input placeholder="Case/File Number" value={formData.case_number} onChange={(e) => setFormData({...formData, case_number: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <select value={formData.case_type} onChange={(e) => setFormData({...formData, case_type: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="litigation">Litigation</option>
                <option value="corporate">Corporate</option>
                <option value="family">Family</option>
                <option value="property">Property</option>
                <option value="criminal">Criminal</option>
                <option value="tax">Tax</option>
                <option value="employment">Employment</option>
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
              <Input placeholder="Judge Name" value={formData.judge} onChange={(e) => setFormData({...formData, judge: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              <Input placeholder="Opposing Party" value={formData.opposing_party} onChange={(e) => setFormData({...formData, opposing_party: e.target.value})} className="bg-white/5 border-white/10 text-white md:col-span-2" />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">{editCase ? "Update Case" : "Create Case"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditCase(null); }} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Cases List */}
      {clients.length === 0 ? (
        <Card className="glass-card border-white/10">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <p className="text-white/50">Add clients first before creating cases</p>
          </CardContent>
        </Card>
      ) : cases.length > 0 && viewMode === "table" ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-3 text-white/50 text-sm font-medium">Case</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Client</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Type</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Next Hearing</th>
                <th className="text-left p-3 text-white/50 text-sm font-medium">Court</th>
                <th className="text-right p-3 text-white/50 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => (
                <tr key={caseItem.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => fetchCaseDetail(caseItem)}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(caseItem.priority)}`} />
                      <div>
                        <p className="text-white font-medium">{caseItem.title}</p>
                        <p className="text-white/40 text-xs">{caseItem.case_number || caseItem.reference}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-white/70">{caseItem.client_name}</td>
                  <td className="p-3"><Badge variant="outline" className="text-xs border-white/20 text-white/70 capitalize">{caseItem.case_type}</Badge></td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(caseItem.status)}`}>{caseItem.status}</span></td>
                  <td className="p-3 text-white/50 text-sm">
                    {caseItem.next_hearing_date ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(caseItem.next_hearing_date)}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="p-3 text-white/50 text-sm">{caseItem.court || "-"}</td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <StatusDropdown caseItem={caseItem} />
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : cases.length > 0 ? (
        <div className="space-y-3">
          {cases.map((caseItem) => (
            <Card key={caseItem.id} className="glass-card border-white/10 hover:border-white/20 transition-all cursor-pointer" onClick={() => fetchCaseDetail(caseItem)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(caseItem.priority)}`} />
                      <h3 className="font-semibold text-white">{caseItem.title}</h3>
                    </div>
                    <p className="text-sm text-white/50 mt-1">{caseItem.client_name} • {caseItem.case_number || caseItem.reference}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <Badge variant="outline" className="text-xs border-white/20 text-white/70 capitalize">{caseItem.case_type}</Badge>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(caseItem.status)}`}>{caseItem.status}</span>
                      {caseItem.court && <span className="text-xs text-white/40 flex items-center gap-1"><Gavel className="w-3 h-3" /> {caseItem.court}</span>}
                      {caseItem.next_hearing_date && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Next: {formatDate(caseItem.next_hearing_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <StatusDropdown caseItem={caseItem} />
                    </DropdownMenu>
                  </div>
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
        </div>
      )}

      {/* Case Detail Modal */}
      <Dialog open={showCaseDetail} onOpenChange={setShowCaseDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0a0f1a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              Case Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedCase && (
            <div className="space-y-6">
              {/* Case Header */}
              <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(selectedCase.priority)}`} />
                    <h3 className="text-lg font-semibold text-white">{selectedCase.title}</h3>
                  </div>
                  <p className="text-white/50 mt-1">{selectedCase.client_name} • {selectedCase.case_number || selectedCase.reference}</p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full capitalize ${getStatusColor(selectedCase.status)}`}>
                  {selectedCase.status}
                </span>
              </div>

              {/* Case Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-white/50">Type</p>
                  <p className="text-white capitalize">{selectedCase.case_type}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Court</p>
                  <p className="text-white">{selectedCase.court || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Judge</p>
                  <p className="text-white">{selectedCase.judge || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Opposing Party</p>
                  <p className="text-white">{selectedCase.opposing_party || "-"}</p>
                </div>
              </div>

              {/* Tabs for Hearings and Tasks */}
              <Tabs defaultValue="hearings" className="space-y-4">
                <TabsList className="bg-white/5 border border-white/10">
                  <TabsTrigger value="hearings" className="data-[state=active]:bg-emerald-600">
                    <Gavel className="w-4 h-4 mr-2" />
                    Hearings
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="data-[state=active]:bg-emerald-600">
                    <ListTodo className="w-4 h-4 mr-2" />
                    Tasks
                  </TabsTrigger>
                </TabsList>

                {/* Hearings Tab */}
                <TabsContent value="hearings" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">Court Hearings</h4>
                    <Button size="sm" onClick={() => setShowHearingForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Add Hearing
                    </Button>
                  </div>

                  {loadingDetail ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
                  ) : caseHearings.length > 0 ? (
                    <div className="space-y-2">
                      {caseHearings.map((hearing) => (
                        <div key={hearing.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                              <Gavel className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{hearing.title}</p>
                              <p className="text-xs text-white/50">
                                {formatDateTime(hearing.hearing_datetime)} • {hearing.court || selectedCase.court || "Court TBD"}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteHearing(hearing.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No hearings scheduled</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium">To-Do List</h4>
                    <Button size="sm" onClick={() => setShowTaskForm(true)} className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </div>

                  {loadingDetail ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>
                  ) : caseTasks.length > 0 ? (
                    <div className="space-y-2">
                      {caseTasks.map((task) => (
                        <div key={task.id} className={`flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 ${task.status === 'completed' ? 'opacity-60' : ''}`}>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => task.status !== 'completed' && handleCompleteTask(task.id)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                task.status === 'completed' 
                                  ? 'border-emerald-500 bg-emerald-500' 
                                  : 'border-white/30 hover:border-emerald-400'
                              }`}
                            >
                              {task.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </button>
                            <div>
                              <p className={`font-medium ${task.status === 'completed' ? 'text-white/50 line-through' : 'text-white'}`}>
                                {task.title}
                              </p>
                              {task.due_date && (
                                <p className={`text-xs ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-400' : 'text-white/50'}`}>
                                  Due: {formatDate(task.due_date)}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-xs ${
                            task.priority === 'high' ? 'border-red-500/30 text-red-400' :
                            task.priority === 'medium' ? 'border-amber-500/30 text-amber-400' :
                            'border-white/20 text-white/50'
                          }`}>
                            {task.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-white/40">
                      <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No tasks yet</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Hearing Form Modal */}
      <Dialog open={showHearingForm} onOpenChange={setShowHearingForm}>
        <DialogContent className="bg-[#0a0f1a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-emerald-400" />
              Add Court Hearing
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddHearing} className="space-y-4">
            <div>
              <Label className="text-white/70">Hearing Title *</Label>
              <Input
                value={hearingData.title}
                onChange={(e) => setHearingData({...hearingData, title: e.target.value})}
                placeholder="e.g., Mention, Ruling, Trial Day 1"
                className="mt-1 bg-white/5 border-white/10 text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Date *</Label>
                <Input
                  type="date"
                  value={hearingData.hearing_date}
                  onChange={(e) => setHearingData({...hearingData, hearing_date: e.target.value})}
                  className="mt-1 bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  required
                />
              </div>
              <div>
                <Label className="text-white/70">Time</Label>
                <Input
                  type="time"
                  value={hearingData.hearing_time}
                  onChange={(e) => setHearingData({...hearingData, hearing_time: e.target.value})}
                  className="mt-1 bg-white/5 border-white/10 text-white [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Court</Label>
                <Input
                  value={hearingData.court}
                  onChange={(e) => setHearingData({...hearingData, court: e.target.value})}
                  placeholder={selectedCase?.court || "Court name"}
                  className="mt-1 bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Courtroom</Label>
                <Input
                  value={hearingData.courtroom}
                  onChange={(e) => setHearingData({...hearingData, courtroom: e.target.value})}
                  placeholder="e.g., Room 5"
                  className="mt-1 bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-white/70">Judge</Label>
              <Input
                value={hearingData.judge}
                onChange={(e) => setHearingData({...hearingData, judge: e.target.value})}
                placeholder={selectedCase?.judge || "Judge name"}
                className="mt-1 bg-white/5 border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-white/70">Purpose/Notes</Label>
              <Textarea
                value={hearingData.notes}
                onChange={(e) => setHearingData({...hearingData, notes: e.target.value})}
                placeholder="What is this hearing for?"
                className="mt-1 bg-white/5 border-white/10 text-white"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="add-hearing-calendar"
                checked={hearingData.add_to_calendar}
                onChange={(e) => setHearingData({...hearingData, add_to_calendar: e.target.checked})}
                className="rounded border-white/20"
              />
              <Label htmlFor="add-hearing-calendar" className="text-white/70 cursor-pointer">
                Add to calendar automatically
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowHearingForm(false)} className="border-white/10 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button type="submit" disabled={savingHearing} className="bg-emerald-600 hover:bg-emerald-700">
                {savingHearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarPlus className="w-4 h-4 mr-2" />}
                Add Hearing
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Task Form Modal */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="bg-[#0a0f1a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-emerald-400" />
              Add Task
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <Label className="text-white/70">Task Title *</Label>
              <Input
                value={taskData.title}
                onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                placeholder="What needs to be done?"
                className="mt-1 bg-white/5 border-white/10 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white/70">Description</Label>
              <Textarea
                value={taskData.description}
                onChange={(e) => setTaskData({...taskData, description: e.target.value})}
                placeholder="Additional details..."
                className="mt-1 bg-white/5 border-white/10 text-white"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/70">Due Date</Label>
                <Input
                  type="date"
                  value={taskData.due_date}
                  onChange={(e) => setTaskData({...taskData, due_date: e.target.value})}
                  className="mt-1 bg-white/5 border-white/10 text-white [color-scheme:dark]"
                />
              </div>
              <div>
                <Label className="text-white/70">Priority</Label>
                <select
                  value={taskData.priority}
                  onChange={(e) => setTaskData({...taskData, priority: e.target.value})}
                  className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="add-task-calendar"
                checked={taskData.add_to_calendar}
                onChange={(e) => setTaskData({...taskData, add_to_calendar: e.target.checked})}
                className="rounded border-white/20"
              />
              <Label htmlFor="add-task-calendar" className="text-white/70 cursor-pointer">
                Add deadline to calendar
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTaskForm(false)} className="border-white/10 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button type="submit" disabled={savingTask} className="bg-emerald-600 hover:bg-emerald-700">
                {savingTask ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
