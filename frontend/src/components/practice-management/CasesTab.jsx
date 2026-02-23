import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
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
  LayoutList, Grid3X3, Target, Clock, Archive, FileCheck 
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

  const StatusDropdown = ({ caseItem }) => (
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
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Cases & Matters</h2>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
            <button onClick={() => setViewMode("table")} className={`p-1.5 rounded transition-colors ${viewMode === "table" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`} data-testid="view-table-btn">
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("card")} className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`} data-testid="view-card-btn">
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
                  <td className="p-3"><Badge variant="outline" className="text-xs border-white/20 text-white/70 capitalize">{caseItem.case_type}</Badge></td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(caseItem.status)}`}>{caseItem.status}</span></td>
                  <td className="p-3 text-white/70 capitalize">{caseItem.priority}</td>
                  <td className="p-3 text-white/50 text-sm">{caseItem.court || "-"}</td>
                  <td className="p-3 text-right">
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
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <StatusDropdown caseItem={caseItem} />
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
