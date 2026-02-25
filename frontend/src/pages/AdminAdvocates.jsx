import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { toast } from "sonner";
import { 
  Search, User, Mail, Phone, MapPin, CheckCircle2, XCircle, Clock, 
  AlertTriangle, Shield, Trash2, FileText, Loader2 
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminAdvocates = () => {
  const { getAuthHeaders } = useAuth();
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);

  useEffect(() => {
    fetchAdvocates();
  }, [statusFilter]);

  const fetchAdvocates = async () => {
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const response = await axios.get(`${API}/admin/advocates${params}`, getAuthHeaders());
      setAdvocates(response.data);
    } catch (error) {
      toast.error("Failed to load advocates");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (advocateId, newStatus) => {
    try {
      await axios.put(`${API}/admin/advocates/${advocateId}/status?status=${newStatus}`, {}, getAuthHeaders());
      setAdvocates(advocates.map(a => a.id === advocateId ? { ...a, practicing_status: newStatus } : a));
      toast.success(`Advocate status updated to ${newStatus}`);
      setSelectedAdvocate(null);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filteredAdvocates = advocates.filter(a => 
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.roll_number.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-700";
      case "Suspended": return "bg-red-100 text-red-700";
      case "Retired": return "bg-slate-100 text-slate-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Active": return <CheckCircle2 className="w-4 h-4" />;
      case "Suspended": return <XCircle className="w-4 h-4" />;
      case "Retired": return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout title="Manage Advocates" subtitle="View and manage advocate accounts">
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by name, roll number, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11"
                data-testid="search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-11" data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card data-testid="advocates-table">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-tls-blue"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Advocate</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdvocates.map((advocate) => (
                  <TableRow key={advocate.id} data-testid={`advocate-row-${advocate.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-tls-blue/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-tls-blue" />
                        </div>
                        <div>
                          <p className="font-medium text-tls-blue">{advocate.full_name}</p>
                          <p className="text-xs text-slate-500">{advocate.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{advocate.roll_number}</span>
                    </TableCell>
                    <TableCell>{advocate.region}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(advocate.practicing_status)}>
                        {getStatusIcon(advocate.practicing_status)}
                        <span className="ml-1">{advocate.practicing_status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedAdvocate(advocate)}
                        data-testid={`manage-${advocate.id}`}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manage Dialog */}
      <Dialog open={!!selectedAdvocate} onOpenChange={() => setSelectedAdvocate(null)}>
        <DialogContent className="sm:max-w-md" data-testid="manage-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-tls-blue">Manage Advocate</DialogTitle>
          </DialogHeader>
          
          {selectedAdvocate && (
            <div className="space-y-6">
              {/* Advocate Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-14 h-14 rounded-full bg-tls-blue/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-tls-blue" />
                </div>
                <div>
                  <h3 className="font-semibold text-tls-blue">{selectedAdvocate.full_name}</h3>
                  <p className="font-mono text-sm text-slate-500">{selectedAdvocate.roll_number}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span>{selectedAdvocate.email}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{selectedAdvocate.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedAdvocate.region}</span>
                </div>
              </div>

              {/* Status Actions */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-700">Update Status</p>
                <div className="flex gap-2">
                  <Button
                    variant={selectedAdvocate.practicing_status === "Active" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusChange(selectedAdvocate.id, "Active")}
                    className={selectedAdvocate.practicing_status === "Active" ? "bg-green-600 hover:bg-green-700" : ""}
                    data-testid="set-active"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Active
                  </Button>
                  <Button
                    variant={selectedAdvocate.practicing_status === "Suspended" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusChange(selectedAdvocate.id, "Suspended")}
                    className={selectedAdvocate.practicing_status === "Suspended" ? "bg-red-600 hover:bg-red-700" : ""}
                    data-testid="set-suspended"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Suspend
                  </Button>
                  <Button
                    variant={selectedAdvocate.practicing_status === "Retired" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleStatusChange(selectedAdvocate.id, "Retired")}
                    className={selectedAdvocate.practicing_status === "Retired" ? "bg-slate-600 hover:bg-slate-700" : ""}
                    data-testid="set-retired"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Retire
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAdvocate(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminAdvocates;
