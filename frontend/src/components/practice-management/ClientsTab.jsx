import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../ui/dropdown-menu";
import { toast } from "sonner";
import { Users, Building, Scale, Search, Plus, Edit, Trash2, MoreVertical, Phone, LayoutList, Grid3X3 } from "lucide-react";
import axios from "axios";
import { API } from "./shared";

export const ClientFormModal = ({ isOpen, onClose, onSave, editData = null }) => {
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

export const ClientsTab = ({ token }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [viewMode, setViewMode] = useState(() => window.innerWidth >= 768 ? "table" : "card");

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
            data-testid="clients-view-table-btn"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode("card")} 
            className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
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
