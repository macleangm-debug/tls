import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { 
  FileText, Download, Search, Filter, Copy, ExternalLink,
  CheckCircle2, XCircle, Clock, AlertTriangle, Eye, Trash2,
  Calendar, Hash, User, Building, QrCode, Shield, RefreshCw,
  ChevronLeft, ChevronRight, Loader2, BookOpen, BarChart3
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status badge component
const StatusBadge = ({ status }) => {
  const config = {
    active: { label: "Valid", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
    revoked: { label: "Revoked", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
    expired: { label: "Expired", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock }
  };
  const { label, color, icon: Icon } = config[status] || config.active;
  
  return (
    <Badge variant="outline" className={`${color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

// Truncate hash with copy button
const HashDisplay = ({ hash, length = 12 }) => {
  const truncated = hash ? `${hash.slice(0, length)}...` : "-";
  
  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    toast.success("Hash copied to clipboard");
  };
  
  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      <span className="text-gray-600">{truncated}</span>
      {hash && (
        <button onClick={copyHash} className="p-1 hover:bg-gray-100 rounded" title="Copy full hash">
          <Copy className="w-3 h-3 text-gray-400" />
        </button>
      )}
    </div>
  );
};

const StampLedgerPage = () => {
  const { user, getAuthHeaders } = useAuth();
  
  // Data state
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Detail modal
  const [selectedStamp, setSelectedStamp] = useState(null);
  const [stampDetail, setStampDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [stampEvents, setStampEvents] = useState([]);
  
  // Revoke modal
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);

  // Fetch stamps
  const fetchStamps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('q', searchQuery);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      
      const response = await axios.get(`${API}/stamps?${params.toString()}`, getAuthHeaders());
      setStamps(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      console.error("Failed to load stamps:", error);
      toast.error("Failed to load stamp ledger");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, searchQuery, fromDate, toDate, getAuthHeaders]);

  // Fetch stamp detail
  const fetchStampDetail = async (stampId) => {
    setLoadingDetail(true);
    try {
      const [detailRes, eventsRes] = await Promise.all([
        axios.get(`${API}/stamps/${stampId}`, getAuthHeaders()),
        axios.get(`${API}/stamps/${stampId}/events`, getAuthHeaders())
      ]);
      setStampDetail(detailRes.data);
      setStampEvents(eventsRes.data);
    } catch (error) {
      console.error("Failed to load stamp detail:", error);
      toast.error("Failed to load stamp details");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Revoke stamp
  const handleRevoke = async () => {
    if (!selectedStamp || !revokeReason.trim()) {
      toast.error("Please provide a reason for revocation");
      return;
    }
    
    setRevoking(true);
    try {
      await axios.post(
        `${API}/stamps/${selectedStamp.stamp_id}/revoke`,
        { reason: revokeReason },
        getAuthHeaders()
      );
      toast.success("Stamp revoked successfully");
      setShowRevokeModal(false);
      setRevokeReason("");
      setSelectedStamp(null);
      setStampDetail(null);
      fetchStamps();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to revoke stamp");
    } finally {
      setRevoking(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('q', searchQuery);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      
      const response = await axios.get(`${API}/stamps/export.csv?${params.toString()}`, {
        ...getAuthHeaders(),
        responseType: 'blob'
      });
      
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stamps_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (error) {
      toast.error("Failed to export stamps");
    }
  };

  // Load stamps on mount and filter change
  useEffect(() => {
    fetchStamps();
  }, [fetchStamps]);

  // Open detail modal
  const openDetail = (stamp) => {
    setSelectedStamp(stamp);
    fetchStampDetail(stamp.stamp_id);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Total pages
  const totalPages = Math.ceil(total / pageSize);

  // Stats
  const activeCount = stamps.filter(s => s.status === 'active').length;
  const revokedCount = stamps.filter(s => s.status === 'revoked').length;
  const expiredCount = stamps.filter(s => s.status === 'expired').length;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-600" />
              Stamp Ledger
            </h1>
            <p className="text-gray-500 mt-1">
              View and manage all your issued stamps
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchStamps} data-testid="refresh-btn">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700" data-testid="export-csv-btn">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Stamps</p>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-gray-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Valid</p>
                  <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Revoked</p>
                  <p className="text-2xl font-bold text-red-600">{revokedCount}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Expired</p>
                  <p className="text-2xl font-bold text-amber-600">{expiredCount}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search stamp ID or document hash..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>
              <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger data-testid="status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Valid</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From date"
                data-testid="from-date"
              />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To date"
                data-testid="to-date"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : stamps.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No stamps found</p>
                <p className="text-gray-400 text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="stamps-table">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Stamp ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Issued</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Document</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Recipient</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Doc Hash</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Verifications</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stamps.map((stamp) => (
                      <tr key={stamp.stamp_id} className="hover:bg-gray-50" data-testid={`stamp-row-${stamp.stamp_id}`}>
                        <td className="py-3 px-4">
                          <button 
                            onClick={() => openDetail(stamp)}
                            className="font-mono text-sm text-emerald-600 hover:underline"
                          >
                            {stamp.stamp_id}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(stamp.issued_at)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={stamp.status} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-900 truncate max-w-[150px]" title={stamp.doc_filename}>
                            {stamp.doc_filename || "-"}
                          </div>
                          <div className="text-xs text-gray-500">{stamp.document_type}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 truncate max-w-[120px]" title={stamp.recipient_name}>
                          {stamp.recipient_name || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <HashDisplay hash={stamp.doc_hash} />
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-3 h-3 text-gray-400" />
                            {stamp.verification_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDetail(stamp)} title="View details">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {stamp.status === 'active' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSelectedStamp(stamp); setShowRevokeModal(true); }}
                                className="text-red-500 hover:text-red-700"
                                title="Revoke stamp"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} stamps
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={!!selectedStamp && !showRevokeModal} onOpenChange={(open) => !open && setSelectedStamp(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                Stamp Details
              </DialogTitle>
            </DialogHeader>
            
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : stampDetail && (
              <div className="space-y-6">
                {/* Status & ID */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Stamp ID</p>
                    <p className="font-mono text-lg font-bold">{stampDetail.stamp_id}</p>
                  </div>
                  <StatusBadge status={stampDetail.status} />
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Issued At
                    </p>
                    <p className="font-medium">{formatDate(stampDetail.issued_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expires At
                    </p>
                    <p className="font-medium">{formatDate(stampDetail.expires_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" /> Advocate
                    </p>
                    <p className="font-medium">{stampDetail.advocate_name}</p>
                    <p className="text-xs text-gray-500">{stampDetail.advocate_roll_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Building className="w-3 h-3" /> Recipient
                    </p>
                    <p className="font-medium">{stampDetail.recipient_name || "-"}</p>
                    <p className="text-xs text-gray-500">{stampDetail.recipient_org}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Document
                    </p>
                    <p className="font-medium">{stampDetail.doc_filename || "-"}</p>
                    <p className="text-xs text-gray-500">{stampDetail.document_type}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Document Hash
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 p-2 rounded flex-1 overflow-x-auto">
                        {stampDetail.doc_hash}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText(stampDetail.doc_hash);
                        toast.success("Hash copied");
                      }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Verification URL
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 p-2 rounded flex-1 overflow-x-auto">
                        {stampDetail.verification_url}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText(stampDetail.verification_url);
                        toast.success("URL copied");
                      }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Revoke reason if revoked */}
                {stampDetail.status === 'revoked' && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-700">Revoked</p>
                    <p className="text-sm text-red-600">{stampDetail.revoke_reason}</p>
                    <p className="text-xs text-red-500 mt-1">At: {formatDate(stampDetail.revoked_at)}</p>
                  </div>
                )}
                
                {/* Audit Events */}
                {stampEvents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Audit Trail</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {stampEvents.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm p-2 bg-gray-50 rounded">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            event.event_type === 'STAMP_ISSUED' ? 'bg-emerald-500' :
                            event.event_type === 'STAMP_VERIFIED' ? 'bg-blue-500' :
                            event.event_type === 'STAMP_REVOKED' ? 'bg-red-500' : 'bg-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{event.event_type.replace('STAMP_', '')}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(event.created_at)} • {event.actor_type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  {stampDetail.status === 'active' && (
                    <Button 
                      variant="outline" 
                      className="text-red-500 border-red-200"
                      onClick={() => setShowRevokeModal(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Revoke Stamp
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => window.open(stampDetail.verification_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Revoke Modal */}
        <Dialog open={showRevokeModal} onOpenChange={setShowRevokeModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Revoke Stamp
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. The stamp will be marked as revoked and any future verification attempts will show a warning.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Stamp ID</p>
                <p className="font-mono font-medium">{selectedStamp?.stamp_id}</p>
              </div>
              
              <div>
                <Label htmlFor="revoke-reason">Reason for Revocation *</Label>
                <Textarea
                  id="revoke-reason"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Enter reason for revoking this stamp..."
                  className="mt-1"
                  rows={3}
                  data-testid="revoke-reason-input"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowRevokeModal(false); setRevokeReason(""); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleRevoke}
                disabled={!revokeReason.trim() || revoking}
                className="bg-red-600 hover:bg-red-700"
                data-testid="confirm-revoke-btn"
              >
                {revoking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Revoking...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke Stamp
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StampLedgerPage;
