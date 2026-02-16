import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { 
  QrCode, Plus, Copy, Download, Eye, Ban, CheckCircle2, Clock, 
  AlertTriangle, Lock, Shield, FileText, Fingerprint, Share2,
  Calendar, Hash, User, ExternalLink
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAMP_TYPES = [
  { id: "official", name: "Official Stamp", desc: "Standard advocate stamp for general legal documents", icon: FileText },
  { id: "commissioner", name: "Commissioner for Oaths", desc: "For oath administration and affidavits", icon: Shield },
  { id: "notary", name: "Notary Public", desc: "For notarized documents and certifications", icon: Fingerprint }
];

const DigitalStampsPage = () => {
  const { user, getAuthHeaders } = useAuth();
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showStamp, setShowStamp] = useState(null);
  const [selectedType, setSelectedType] = useState("official");
  const [documentRef, setDocumentRef] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    fetchStamps();
  }, []);

  const fetchStamps = async () => {
    try {
      const response = await axios.get(`${API}/digital-stamps`, getAuthHeaders());
      setStamps(response.data);
    } catch (error) {
      toast.error("Failed to load stamps");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStamp = async () => {
    setCreating(true);
    try {
      const response = await axios.post(`${API}/digital-stamps`, {
        stamp_type: selectedType,
        document_reference: documentRef || null
      }, getAuthHeaders());
      setStamps([response.data, ...stamps]);
      setShowCreate(false);
      setDocumentRef("");
      setSelectedType("official");
      toast.success("Digital stamp created!");
      setShowStamp(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create stamp");
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeStamp = async (stampId) => {
    if (!window.confirm("Are you sure you want to revoke this stamp? This action cannot be undone.")) return;
    
    try {
      await axios.post(`${API}/digital-stamps/${stampId}/revoke`, {}, getAuthHeaders());
      setStamps(stamps.map(s => s.stamp_id === stampId ? { ...s, status: "revoked" } : s));
      toast.success("Stamp revoked");
      setShowStamp(null);
    } catch (error) {
      toast.error("Failed to revoke stamp");
    }
  };

  const copyToClipboard = (text, label = "Copied!") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const downloadQR = (stamp) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${stamp.qr_code_data}`;
    link.download = `TLS-Stamp-${stamp.stamp_id}.png`;
    link.click();
    toast.success("QR code downloaded");
  };

  const filteredStamps = stamps.filter(s => {
    if (activeTab === "active") return s.status === "active";
    if (activeTab === "revoked") return s.status === "revoked";
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-tls-verified/20 text-tls-verified border-tls-verified/30";
      case "expired": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "revoked": return "bg-red-500/20 text-red-500 border-red-500/30";
      default: return "bg-white/10 text-white/60";
    }
  };

  return (
    <DashboardLayout title="Digital Stamps" subtitle="Create and manage QR-verified stamps">
      {/* Privacy Banner */}
      <Card className="glass-card rounded-2xl border-tls-blue-electric/20 mb-8">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-tls-blue-electric/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-tls-blue-electric" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Your Privacy is Protected</h3>
              <p className="text-sm text-white/50">
                Digital stamps are <span className="text-tls-blue-electric">standalone verification codes</span> — 
                we never store, access, or process your client documents. Each stamp is a secure proof of 
                your credentials that can be verified independently.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
            <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-tls-blue-electric data-[state=active]:text-white">
              Active ({stamps.filter(s => s.status === "active").length})
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-tls-blue-electric data-[state=active]:text-white">
              All ({stamps.length})
            </TabsTrigger>
            <TabsTrigger value="revoked" className="rounded-lg data-[state=active]:bg-tls-blue-electric data-[state=active]:text-white">
              Revoked
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button onClick={() => setShowCreate(true)} className="bg-tls-blue-electric hover:bg-tls-blue-electric/90 rounded-xl" data-testid="create-stamp-btn">
          <Plus className="w-4 h-4 mr-2" />
          Create New Stamp
        </Button>
      </div>

      {/* Stamps Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-tls-blue-electric"></div>
        </div>
      ) : filteredStamps.length === 0 ? (
        <Card className="glass-card rounded-2xl" data-testid="no-stamps">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <QrCode className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="font-heading text-xl text-white mb-2">No {activeTab !== "all" ? activeTab : ""} stamps</h3>
            <p className="text-white/50 mb-6">Create your first digital stamp to get started</p>
            <Button onClick={() => setShowCreate(true)} className="bg-tls-blue-electric hover:bg-tls-blue-electric/90 rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Create First Stamp
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStamps.map((stamp) => (
            <Card 
              key={stamp.id} 
              className={`glass-card rounded-2xl hover:border-white/20 transition-all cursor-pointer group ${stamp.status === "revoked" ? "opacity-60" : ""}`} 
              onClick={() => setShowStamp(stamp)}
              data-testid={`stamp-${stamp.stamp_id}`}
            >
              <CardContent className="p-6">
                {/* QR Code Preview */}
                <div className="flex justify-center mb-4">
                  <div className={`w-28 h-28 bg-white rounded-2xl p-2 ${stamp.status === "active" ? "shadow-glow" : ""}`}>
                    <img 
                      src={`data:image/png;base64,${stamp.qr_code_data}`} 
                      alt="QR Code" 
                      className={`w-full h-full ${stamp.status === "revoked" ? "opacity-50" : ""}`}
                    />
                  </div>
                </div>

                {/* Stamp Info */}
                <div className="text-center mb-4">
                  <p className="font-mono text-sm font-semibold text-white">{stamp.stamp_id}</p>
                  <Badge className={`mt-2 ${getStatusColor(stamp.status)}`}>
                    {stamp.status === "active" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : 
                     stamp.status === "revoked" ? <Ban className="w-3 h-3 mr-1" /> :
                     <Clock className="w-3 h-3 mr-1" />}
                    {stamp.status}
                  </Badge>
                </div>

                {/* Meta */}
                <div className="space-y-2 text-sm border-t border-white/5 pt-4">
                  <div className="flex justify-between">
                    <span className="text-white/40">Type</span>
                    <span className="text-white/70 capitalize">{stamp.stamp_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Created</span>
                    <span className="text-white/70">{new Date(stamp.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Verifications</span>
                    <span className="text-white/70">{stamp.used_count}</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-white/10 text-white/70 hover:bg-white/10 rounded-lg"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(stamp.stamp_id, "Stamp ID copied!"); }}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-white/10 text-white/70 hover:bg-white/10 rounded-lg"
                    onClick={(e) => { e.stopPropagation(); downloadQR(stamp); }}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    QR
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Stamp Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg bg-[#0B1120] border-white/10" data-testid="create-stamp-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-white">Create Digital Stamp</DialogTitle>
            <DialogDescription className="text-white/50">
              Generate a new QR-verified stamp for your documents
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Stamp Type Selection */}
            <div className="space-y-3">
              <Label className="text-white/70">Stamp Type</Label>
              <div className="grid gap-3">
                {STAMP_TYPES.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedType === type.id 
                        ? "border-tls-blue-electric bg-tls-blue-electric/10" 
                        : "border-white/10 hover:border-white/20 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedType === type.id ? "bg-tls-blue-electric/20" : "bg-white/10"
                      }`}>
                        <type.icon className={`w-5 h-5 ${selectedType === type.id ? "text-tls-blue-electric" : "text-white/50"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{type.name}</p>
                        <p className="text-xs text-white/50">{type.desc}</p>
                      </div>
                      {selectedType === type.id && (
                        <CheckCircle2 className="w-5 h-5 text-tls-blue-electric ml-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Reference (Optional) */}
            <div className="space-y-2">
              <Label className="text-white/70">Document Reference <span className="text-white/30">(Optional)</span></Label>
              <Input
                value={documentRef}
                onChange={(e) => setDocumentRef(e.target.value)}
                placeholder="e.g., Contract #12345, Case No. 2024/001"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                data-testid="document-ref-input"
              />
              <p className="text-xs text-white/40">For your reference only — not visible in verification</p>
            </div>

            {/* What's Included */}
            <div className="p-4 bg-white/5 rounded-xl space-y-3">
              <p className="text-sm font-medium text-white/70">Stamp will include:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-white/50">
                  <User className="w-4 h-4" />
                  <span>{user?.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-white/50">
                  <Hash className="w-4 h-4" />
                  <span className="font-mono">{user?.tls_member_number}</span>
                </div>
                <div className="flex items-center gap-2 text-white/50">
                  <Calendar className="w-4 h-4" />
                  <span>Valid 1 year</span>
                </div>
                <div className="flex items-center gap-2 text-white/50">
                  <Fingerprint className="w-4 h-4" />
                  <span>SHA-256 hash</span>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="flex items-start gap-3 p-3 bg-tls-blue-electric/10 rounded-xl">
              <Lock className="w-4 h-4 text-tls-blue-electric mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/60">
                No document content is stored. The stamp is a standalone cryptographic proof.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-white/60 hover:text-white">
              Cancel
            </Button>
            <Button onClick={handleCreateStamp} disabled={creating} className="bg-tls-blue-electric hover:bg-tls-blue-electric/90 rounded-xl" data-testid="confirm-create-stamp">
              {creating ? "Creating..." : "Generate Stamp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Stamp Dialog */}
      <Dialog open={!!showStamp} onOpenChange={() => setShowStamp(null)}>
        <DialogContent className="sm:max-w-md bg-[#0B1120] border-white/10" data-testid="view-stamp-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white">Stamp Details</DialogTitle>
          </DialogHeader>
          
          {showStamp && (
            <div className="space-y-6">
              {/* Large QR Code */}
              <div className="flex justify-center">
                <div className={`w-48 h-48 bg-white rounded-2xl p-3 ${showStamp.status === "active" ? "shadow-glow-lg ring-4 ring-tls-blue-electric/20" : ""}`}>
                  <img 
                    src={`data:image/png;base64,${showStamp.qr_code_data}`} 
                    alt="QR Code" 
                    className={`w-full h-full ${showStamp.status === "revoked" ? "opacity-50" : ""}`}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="text-center">
                <p className="font-mono text-lg font-bold text-white mb-2">{showStamp.stamp_id}</p>
                <Badge className={getStatusColor(showStamp.status)}>
                  {showStamp.status}
                </Badge>
              </div>

              {/* Details Grid */}
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/50">Advocate</span>
                  <span className="text-white font-medium">{showStamp.advocate_name}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/50">Roll Number</span>
                  <span className="text-white font-mono">{showStamp.advocate_roll_number}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/50">Type</span>
                  <span className="text-white capitalize">{showStamp.stamp_type}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/50">Created</span>
                  <span className="text-white">{new Date(showStamp.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/50">Expires</span>
                  <span className="text-white">{new Date(showStamp.expires_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between p-3 bg-white/5 rounded-xl">
                  <span className="text-white/50">Verifications</span>
                  <span className="text-white">{showStamp.used_count}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl"
                  onClick={() => copyToClipboard(`${window.location.origin}/verify/${showStamp.stamp_id}`, "Verification link copied!")}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Link
                </Button>
                <Button 
                  className="bg-tls-blue-electric hover:bg-tls-blue-electric/90 rounded-xl"
                  onClick={() => downloadQR(showStamp)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR
                </Button>
              </div>

              {showStamp.status === "active" && (
                <Button 
                  variant="ghost" 
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => handleRevokeStamp(showStamp.stamp_id)}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Revoke This Stamp
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DigitalStampsPage;
