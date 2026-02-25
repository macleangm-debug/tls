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
  const { user, getAuthHeaders } = useAuth();
  const [advocates, setAdvocates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  
  // Bulk revoke state
  const [showBulkRevokeModal, setShowBulkRevokeModal] = useState(false);
  const [bulkRevokeAdvocate, setBulkRevokeAdvocate] = useState(null);
  const [stampSummary, setStampSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [revokeResult, setRevokeResult] = useState(null);
  
  const isSuperAdmin = user?.role === "super_admin";

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

  // Bulk revoke functions
  const openBulkRevokeModal = async (advocate) => {
    setBulkRevokeAdvocate(advocate);
    setShowBulkRevokeModal(true);
    setRevokeReason("");
    setConfirmationText("");
    setRevokeResult(null);
    setLoadingSummary(true);
    
    try {
      const response = await axios.get(
        `${API}/admin/advocates/${advocate.id}/stamp-summary`,
        getAuthHeaders()
      );
      setStampSummary(response.data.stamp_summary);
    } catch (error) {
      toast.error("Failed to load stamp summary");
      setStampSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const closeBulkRevokeModal = () => {
    setShowBulkRevokeModal(false);
    setBulkRevokeAdvocate(null);
    setStampSummary(null);
    setRevokeReason("");
    setConfirmationText("");
    setRevokeResult(null);
  };

  const handleBulkRevoke = async () => {
    if (!bulkRevokeAdvocate) return;
    
    // Validation
    if (revokeReason.length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }
    
    const validConfirmations = ["REVOKE", bulkRevokeAdvocate.full_name?.toUpperCase(), bulkRevokeAdvocate.full_name];
    if (!validConfirmations.includes(confirmationText)) {
      toast.error("Please type 'REVOKE' or the advocate's name to confirm");
      return;
    }
    
    setRevoking(true);
    try {
      const response = await axios.post(
        `${API}/admin/advocates/${bulkRevokeAdvocate.id}/bulk-revoke`,
        {
          reason: revokeReason,
          include_expired: false,
          confirmation_text: confirmationText
        },
        getAuthHeaders()
      );
      
      setRevokeResult(response.data);
      toast.success(`Successfully revoked ${response.data.revoked_count} stamps`);
    } catch (error) {
      const message = error.response?.data?.detail || "Bulk revoke failed";
      toast.error(message);
    } finally {
      setRevoking(false);
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
              
              {/* Bulk Revoke Section - Super Admin Only */}
              {isSuperAdmin && (
                <div className="space-y-3 pt-4 border-t border-red-200 bg-red-50 -mx-6 px-6 pb-4 -mb-6 rounded-b-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <Shield className="w-4 h-4" />
                    <p className="text-sm font-medium">Super Admin Actions</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => {
                      setSelectedAdvocate(null);
                      openBulkRevokeModal(selectedAdvocate);
                    }}
                    data-testid="bulk-revoke-btn"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke All Active Stamps
                  </Button>
                  <p className="text-xs text-red-600">
                    This will permanently invalidate all active stamps issued by this advocate.
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAdvocate(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Revoke Modal - Regulatory Grade */}
      <Dialog open={showBulkRevokeModal} onOpenChange={closeBulkRevokeModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Bulk Revoke Stamps
            </DialogTitle>
            <DialogDescription>
              This action will permanently revoke all active stamps issued by this advocate.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {bulkRevokeAdvocate && (
            <div className="space-y-4 py-4">
              {/* Advocate Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{bulkRevokeAdvocate.full_name}</h3>
                  <p className="text-sm text-slate-500">{bulkRevokeAdvocate.roll_number}</p>
                  <Badge className={getStatusColor(bulkRevokeAdvocate.practicing_status)}>
                    {bulkRevokeAdvocate.practicing_status}
                  </Badge>
                </div>
              </div>
              
              {/* Stamp Summary */}
              {loadingSummary ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : stampSummary && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{stampSummary.active}</p>
                    <p className="text-xs text-amber-700">Active Stamps</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-500">{stampSummary.expired}</p>
                    <p className="text-xs text-slate-600">Expired</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{stampSummary.revoked}</p>
                    <p className="text-xs text-red-600">Already Revoked</p>
                  </div>
                </div>
              )}
              
              {/* Result */}
              {revokeResult ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Bulk Revoke Complete</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-green-600">Revoked:</span>
                      <span className="font-bold ml-1">{revokeResult.revoked_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Already Expired:</span>
                      <span className="ml-1">{revokeResult.already_expired}</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    Batch ID: {revokeResult.batch_revoke_id}
                  </p>
                </div>
              ) : (
                <>
                  {/* Reason Input */}
                  <div>
                    <Label htmlFor="revoke-reason" className="text-sm font-medium">
                      Reason for Revocation <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="revoke-reason"
                      value={revokeReason}
                      onChange={(e) => setRevokeReason(e.target.value)}
                      placeholder="Enter detailed reason (min 10 characters)..."
                      className="mt-1"
                      rows={3}
                      data-testid="bulk-revoke-reason"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      This will be logged for audit compliance.
                    </p>
                  </div>
                  
                  {/* Confirmation Input */}
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <Label htmlFor="confirmation" className="text-sm font-medium text-red-700">
                      Type "REVOKE" or "{bulkRevokeAdvocate.full_name}" to confirm
                    </Label>
                    <Input
                      id="confirmation"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Type to confirm..."
                      className="mt-2 border-red-300"
                      data-testid="bulk-revoke-confirmation"
                    />
                  </div>
                </>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkRevokeModal}>
              {revokeResult ? "Close" : "Cancel"}
            </Button>
            {!revokeResult && (
              <Button
                onClick={handleBulkRevoke}
                disabled={revoking || revokeReason.length < 10 || !confirmationText}
                className="bg-red-600 hover:bg-red-700"
                data-testid="confirm-bulk-revoke"
              >
                {revoking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke {stampSummary?.active || 0} Stamps
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminAdvocates;
