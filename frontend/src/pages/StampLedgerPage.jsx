import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { 
  FileText, Download, Search, Copy, ExternalLink,
  CheckCircle2, XCircle, Clock, AlertTriangle, Eye, Trash2,
  Calendar, Hash, User, Building, Shield, RefreshCw,
  ChevronLeft, ChevronRight, Loader2, BookOpen, BarChart3
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status badge component - dark theme
const StatusBadge = ({ status }) => {
  const config = {
    active: { label: "Valid", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    revoked: { label: "Revoked", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
    expired: { label: "Expired", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock }
  };
  const { label, color, icon: Icon } = config[status] || config.active;
  
  return (
    <Badge variant="outline" className={`${color} flex items-center gap-1 px-3 py-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

// Truncate hash with copy button - dark theme
const HashDisplay = ({ hash, length = 12 }) => {
  const truncated = hash ? `${hash.slice(0, length)}...` : "-";
  
  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    toast.success("Hash copied to clipboard");
  };
  
  return (
    <div className="flex items-center gap-1 font-mono text-xs">
      <span className="text-white/60">{truncated}</span>
      {hash && (
        <button onClick={copyHash} className="p-1 hover:bg-white/10 rounded" title="Copy full hash">
          <Copy className="w-3 h-3 text-white/40 hover:text-white/60" />
        </button>
      )}
    </div>
  );
};

// Circular stat icon component
const CircularStatIcon = ({ Icon, color }) => {
  const colorClasses = {
    gray: "text-white/40 border-white/20",
    green: "text-emerald-400 border-emerald-400/50",
    red: "text-red-400 border-red-400/50",
    yellow: "text-amber-400 border-amber-400/50"
  };
  
  return (
    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${colorClasses[color]}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
};

const StampLedgerPage = () => {
  const { user, getAuthHeaders } = useAuth();
  
  // Data state
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ valid: 0, revoked: 0, expired: 0 });
  
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
      
      // Calculate stats from response or use separate endpoint
      if (response.data.stats) {
        setStats(response.data.stats);
      } else {
        // Fallback: calculate from current page data (not accurate for total)
        const valid = response.data.items.filter(s => s.status === 'active').length;
        const revoked = response.data.items.filter(s => s.status === 'revoked').length;
        const expired = response.data.items.filter(s => s.status === 'expired').length;
        setStats({ valid, revoked, expired });
      }
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

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Stamp Ledger
            </h1>
            <p className="text-white/50 mt-1">
              View and manage all your issued stamps
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={fetchStamps} 
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={handleExportCSV} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white" 
              data-testid="export-csv-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards - Dark Theme */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Total Stamps</p>
                <p className="text-3xl font-bold text-white mt-1">{total}</p>
              </div>
              <CircularStatIcon Icon={BarChart3} color="gray" />
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Valid</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.valid}</p>
              </div>
              <CircularStatIcon Icon={CheckCircle2} color="green" />
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Revoked</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{stats.revoked}</p>
              </div>
              <CircularStatIcon Icon={XCircle} color="red" />
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">Expired</p>
                <p className="text-3xl font-bold text-amber-400 mt-1">{stats.expired}</p>
              </div>
              <CircularStatIcon Icon={Clock} color="yellow" />
            </div>
          </div>
        </div>

        {/* Filters - Dark Theme */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  placeholder="Search stamp ID or document hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-emerald-500/50"
                  data-testid="search-input"
                />
              </div>
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger 
                className="bg-white/5 border-white/10 text-white"
                data-testid="status-filter"
              >
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0f1a] border-white/10">
                <SelectItem value="all" className="text-white hover:bg-white/10">All Status</SelectItem>
                <SelectItem value="active" className="text-white hover:bg-white/10">Valid</SelectItem>
                <SelectItem value="revoked" className="text-white hover:bg-white/10">Revoked</SelectItem>
                <SelectItem value="expired" className="text-white hover:bg-white/10">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From date"
              className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
              data-testid="from-date"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To date"
              className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
              data-testid="to-date"
            />
          </div>
        </div>

        {/* Table - Dark Theme */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : stamps.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No stamps found</p>
              <p className="text-white/30 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="stamps-table">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="text-left py-4 px-4 text-sm font-medium text-white/60">Stamp ID</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-white/60">Issued</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-white/60">Status</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-white/60">Document</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-white/60">Recipient</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-white/60">Doc Hash</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-white/60">Verifications</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-white/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stamps.map((stamp) => (
                    <tr 
                      key={stamp.stamp_id} 
                      className="hover:bg-white/5 transition-colors" 
                      data-testid={`stamp-row-${stamp.stamp_id}`}
                    >
                      <td className="py-4 px-4">
                        <button 
                          onClick={() => openDetail(stamp)}
                          className="font-mono text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          {stamp.stamp_id}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-sm text-white/70">
                        {formatDate(stamp.issued_at)}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={stamp.status} />
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-cyan-400 truncate max-w-[150px]" title={stamp.doc_filename}>
                          {stamp.doc_filename || "-"}
                        </div>
                        <div className="text-xs text-white/40">{stamp.document_type}</div>
                      </td>
                      <td className="py-4 px-4 text-sm text-white/70 truncate max-w-[120px]" title={stamp.recipient_name}>
                        {stamp.recipient_name || "-"}
                      </td>
                      <td className="py-4 px-4">
                        <HashDisplay hash={stamp.doc_hash} />
                      </td>
                      <td className="py-4 px-4 text-sm text-center">
                        <span className="inline-flex items-center gap-1 text-white/60">
                          <Eye className="w-3 h-3" />
                          {stamp.verification_count || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openDetail(stamp)} 
                            title="View details"
                            className="text-white/60 hover:text-white hover:bg-white/10"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {stamp.status === 'active' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => { setSelectedStamp(stamp); setShowRevokeModal(true); }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
        </div>

        {/* Pagination - Dark Theme */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/50">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} stamps
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-white/60">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Detail Modal - Dark Theme */}
        <Dialog open={!!selectedStamp && !showRevokeModal} onOpenChange={(open) => !open && setSelectedStamp(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0f1a] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-400">
                <Shield className="w-5 h-5" />
                Stamp Details
              </DialogTitle>
            </DialogHeader>
            
            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              </div>
            ) : stampDetail && (
              <div className="space-y-6">
                {/* Status & ID */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <p className="text-sm text-white/50">Stamp ID</p>
                    <p className="font-mono text-lg font-bold text-cyan-400">{stampDetail.stamp_id}</p>
                  </div>
                  <StatusBadge status={stampDetail.status} />
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-white/50 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Issued At
                    </p>
                    <p className="font-medium text-white">{formatDate(stampDetail.issued_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/50 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expires At
                    </p>
                    <p className="font-medium text-white">{formatDate(stampDetail.expires_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/50 flex items-center gap-1">
                      <User className="w-3 h-3" /> Advocate
                    </p>
                    <p className="font-medium text-white">{stampDetail.advocate_name}</p>
                    <p className="text-xs text-white/40">{stampDetail.advocate_roll_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-white/50 flex items-center gap-1">
                      <Building className="w-3 h-3" /> Recipient
                    </p>
                    <p className="font-medium text-white">{stampDetail.recipient_name || "-"}</p>
                    <p className="text-xs text-white/40">{stampDetail.recipient_org}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-white/50 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Document
                    </p>
                    <p className="font-medium text-cyan-400">{stampDetail.doc_filename || "-"}</p>
                    <p className="text-xs text-white/40">{stampDetail.document_type}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-white/50 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Document Hash
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white/5 border border-white/10 p-2 rounded flex-1 overflow-x-auto text-white/70">
                        {stampDetail.doc_hash}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(stampDetail.doc_hash);
                          toast.success("Hash copied");
                        }}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-white/50 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Verification URL
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-white/5 border border-white/10 p-2 rounded flex-1 overflow-x-auto text-white/70">
                        {stampDetail.verification_url}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(stampDetail.verification_url);
                          toast.success("URL copied");
                        }}
                        className="text-white/60 hover:text-white hover:bg-white/10"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Revoke reason if revoked */}
                {stampDetail.status === 'revoked' && (
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                    <p className="text-sm font-medium text-red-400">Revoked</p>
                    <p className="text-sm text-red-300">{stampDetail.revoke_reason}</p>
                    <p className="text-xs text-red-400/70 mt-1">At: {formatDate(stampDetail.revoked_at)}</p>
                  </div>
                )}
                
                {/* Audit Events */}
                {stampEvents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white/70 mb-2">Audit Trail</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {stampEvents.map((event, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm p-2 bg-white/5 rounded-lg border border-white/5">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            event.event_type === 'STAMP_ISSUED' ? 'bg-emerald-500' :
                            event.event_type === 'STAMP_VERIFIED' ? 'bg-blue-500' :
                            event.event_type === 'STAMP_REVOKED' ? 'bg-red-500' : 'bg-white/40'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white">{event.event_type.replace('STAMP_', '')}</p>
                            <p className="text-xs text-white/50">
                              {formatDate(event.created_at)} - {event.actor_type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                  {stampDetail.status === 'active' && (
                    <Button 
                      variant="outline" 
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => setShowRevokeModal(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Revoke Stamp
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => window.open(stampDetail.verification_url, '_blank')}
                    className="border-white/10 text-white hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Revoke Modal - Dark Theme */}
        <Dialog open={showRevokeModal} onOpenChange={setShowRevokeModal}>
          <DialogContent className="bg-[#0a0f1a] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Revoke Stamp
              </DialogTitle>
              <DialogDescription className="text-white/50">
                This action cannot be undone. The stamp will be marked as revoked and any future verification attempts will show a warning.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/50">Stamp ID</p>
                <p className="font-mono font-medium text-cyan-400">{selectedStamp?.stamp_id}</p>
              </div>
              
              <div>
                <Label htmlFor="revoke-reason" className="text-white/70">Reason for Revocation *</Label>
                <Textarea
                  id="revoke-reason"
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Enter reason for revoking this stamp..."
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  rows={3}
                  data-testid="revoke-reason-input"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => { setShowRevokeModal(false); setRevokeReason(""); }}
                className="border-white/10 text-white hover:bg-white/10"
              >
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
