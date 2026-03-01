import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { 
  Upload, FileText, Download, CheckCircle2, AlertTriangle, 
  X, Loader2, Layers, Trash2, Archive, FileCheck,
  Move, Lock, Copy, Settings, FileStack, Stamp
} from "lucide-react";
import { MembershipInlineWarning, useMembershipStatus } from "../components/MembershipStatusBanner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Position anchor options
const POSITION_ANCHORS = [
  { id: "bottom_right", name: "Bottom Right", icon: "↘" },
  { id: "bottom_left", name: "Bottom Left", icon: "↙" },
  { id: "bottom_center", name: "Bottom Center", icon: "↓" },
  { id: "top_right", name: "Top Right", icon: "↗" },
  { id: "top_left", name: "Top Left", icon: "↖" },
  { id: "top_center", name: "Top Center", icon: "↑" },
  { id: "center", name: "Center", icon: "⊕" },
];

// Page mode options
const PAGE_MODES = [
  { id: "first", name: "First Page Only" },
  { id: "all", name: "All Pages" },
];

// Brand colors
const BRAND_COLORS = [
  { id: "emerald", name: "Emerald", color: "#10B981" },
  { id: "blue", name: "Blue", color: "#3B82F6" },
  { id: "purple", name: "Purple", color: "#8B5CF6" },
  { id: "gold", name: "Gold", color: "#F59E0B" },
  { id: "red", name: "Red", color: "#EF4444" },
  { id: "teal", name: "Teal", color: "#14B8A6" }
];

// Document types
const DOCUMENT_TYPES = [
  { id: "contract", name: "Contract/Agreement" },
  { id: "affidavit", name: "Affidavit" },
  { id: "power_of_attorney", name: "Power of Attorney" },
  { id: "deed", name: "Deed/Title Document" },
  { id: "court_filing", name: "Court Filing" },
  { id: "legal_opinion", name: "Legal Opinion" },
  { id: "witness_statement", name: "Witness Statement" },
  { id: "other", name: "Other Legal Document" }
];

// Stamp types
const STAMP_TYPES = [
  { id: "certification", name: "Certification" },
  { id: "notarization", name: "Notarization" },
];

// Limits
const MAX_FILES = 25;
const MAX_FILE_SIZE_MB = 10;

const BatchStampPage = () => {
  const { user, getAuthHeaders } = useAuth();
  const fileInputRef = useRef(null);
  
  // Membership status check
  const { status: membershipStatus } = useMembershipStatus();
  const isStampingBlocked = membershipStatus?.billing_enabled && 
    membershipStatus?.is_blocked && 
    membershipStatus?.enforcement === 'block_stamping';
  
  // Stamp mode: "single" = same stamp for all, "individual" = different per document
  const [stampMode, setStampMode] = useState("single");
  
  // Files state with individual settings
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedFileIndex, setExpandedFileIndex] = useState(null);
  
  // Global configuration (used when stampMode = "single")
  const [globalSettings, setGlobalSettings] = useState({
    anchor: "bottom_right",
    offsetX: 12,
    offsetY: 12,
    pageMode: "first",
    documentType: "contract",
    stampType: "certification",
    recipientName: "",
    recipientOrg: "",
    description: "",
    borderColor: "#10B981"
  });
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  
  // Batch history
  const [batchHistory, setBatchHistory] = useState([]);

  // File validation
  const validateFile = (file) => {
    if (file.type !== "application/pdf") {
      return { valid: false, error: "Only PDF files are allowed" };
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return { valid: false, error: `File exceeds ${MAX_FILE_SIZE_MB}MB limit` };
    }
    return { valid: true };
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
  };

  // Add files to selection with individual settings
  const addFiles = (files) => {
    const newFiles = [];
    const errors = [];
    
    for (const file of files) {
      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        break;
      }
      
      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name} already added`);
        continue;
      }
      
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        continue;
      }
      
      newFiles.push({
        file,
        name: file.name,
        size: file.size,
        status: "pending",
        // Individual settings (copy from global)
        settings: { ...globalSettings }
      });
    }
    
    if (errors.length > 0) {
      toast.error(errors.slice(0, 3).join("\n"));
    }
    
    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
      toast.success(`Added ${newFiles.length} file(s)`);
    }
  };

  // Update individual file settings
  const updateFileSettings = (index, key, value) => {
    setSelectedFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, settings: { ...f.settings, [key]: value } } : f
    ));
  };

  // Apply global settings to all files
  const applyGlobalToAll = () => {
    setSelectedFiles(prev => prev.map(f => ({ ...f, settings: { ...globalSettings } })));
    toast.success("Applied settings to all files");
  };

  // Remove file
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    if (expandedFileIndex === index) setExpandedFileIndex(null);
  };

  // Clear all files
  const clearFiles = () => {
    setSelectedFiles([]);
    setResults(null);
    setExpandedFileIndex(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  // Process batch
  const handleBatchStamp = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to stamp");
      return;
    }
    
    // Validate recipient name for all files
    const missingRecipient = stampMode === "single" 
      ? !globalSettings.recipientName.trim()
      : selectedFiles.some(f => !f.settings.recipientName.trim());
    
    if (missingRecipient) {
      toast.error("Recipient name is required for all documents");
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    
    try {
      const formData = new FormData();
      
      // Add files
      selectedFiles.forEach((f, idx) => {
        formData.append("files", f.file);
      });
      
      // Add settings based on stamp mode
      if (stampMode === "single") {
        // Single stamp config for all
        formData.append("stamp_config", JSON.stringify({
          mode: "single",
          settings: globalSettings
        }));
      } else {
        // Individual settings per file
        formData.append("stamp_config", JSON.stringify({
          mode: "individual",
          file_settings: selectedFiles.map(f => f.settings)
        }));
      }
      
      // Legacy fields for backwards compatibility
      formData.append("document_type", globalSettings.documentType);
      formData.append("recipient_name", globalSettings.recipientName);
      formData.append("recipient_org", globalSettings.recipientOrg || "");
      formData.append("description", globalSettings.description || "");
      formData.append("stamp_type", globalSettings.stampType);
      formData.append("border_color", globalSettings.borderColor);
      formData.append("position_anchor", globalSettings.anchor);
      formData.append("position_offset_x", globalSettings.offsetX.toString());
      formData.append("position_offset_y", globalSettings.offsetY.toString());
      formData.append("page_mode", globalSettings.pageMode);

      const response = await axios.post(
        `${API}/documents/batch-stamp`,
        formData,
        {
          ...getAuthHeaders(),
          responseType: 'blob',
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(Math.min(percentCompleted, 30));
          }
        }
      );

      // Simulate processing progress
      for (let i = 30; i <= 90; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProgress(i);
      }

      // Get batch info from headers
      const batchId = response.headers['x-batch-id'] || `batch-${Date.now()}`;
      const totalFiles = parseInt(response.headers['x-total-files'] || selectedFiles.length);
      const successCount = parseInt(response.headers['x-success-count'] || selectedFiles.length);
      const failedCount = parseInt(response.headers['x-failed-count'] || 0);

      setProgress(100);

      // Create download
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stamped_documents_${batchId}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setResults({
        batchId,
        totalFiles,
        successCount,
        failedCount,
        zipBlob: response.data
      });

      toast.success(`Batch complete! ${successCount}/${totalFiles} documents stamped`);
      
      // Clear files after success
      setSelectedFiles([]);
      
    } catch (error) {
      console.error("Batch stamp error:", error);
      toast.error(error.response?.data?.detail || "Failed to process batch");
    } finally {
      setProcessing(false);
    }
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  // Load batch history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await axios.get(`${API}/documents/batch-stamps`, getAuthHeaders());
        setBatchHistory(res.data || []);
      } catch (error) {
        console.error("Failed to load batch history:", error);
      }
    };
    loadHistory();
  }, [getAuthHeaders]);

  // Total size
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  // Settings component (reusable for global and individual)
  const SettingsPanel = ({ settings, onChange, compact = false }) => (
    <div className={`space-y-${compact ? '3' : '4'}`}>
      {/* Stamp Type */}
      <div>
        <Label className="text-sm text-white/70">Stamp Type</Label>
        <Select value={settings.stampType} onValueChange={(v) => onChange("stampType", v)}>
          <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0f1a] border-white/10">
            {STAMP_TYPES.map(t => (
              <SelectItem key={t.id} value={t.id} className="text-white hover:bg-white/10">{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Document Type */}
      <div>
        <Label className="text-sm text-white/70">Document Type</Label>
        <Select value={settings.documentType} onValueChange={(v) => onChange("documentType", v)}>
          <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0f1a] border-white/10">
            {DOCUMENT_TYPES.map(t => (
              <SelectItem key={t.id} value={t.id} className="text-white hover:bg-white/10">{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recipient */}
      <div>
        <Label className="text-sm text-white/70">Recipient Name *</Label>
        <Input
          value={settings.recipientName}
          onChange={(e) => onChange("recipientName", e.target.value)}
          placeholder="Enter recipient name"
          className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>

      <div>
        <Label className="text-sm text-white/70">Organization</Label>
        <Input
          value={settings.recipientOrg}
          onChange={(e) => onChange("recipientOrg", e.target.value)}
          placeholder="Organization (optional)"
          className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>

      {!compact && (
        <div>
          <Label className="text-sm text-white/70">Description</Label>
          <Textarea
            value={settings.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Description (optional)"
            className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            rows={2}
          />
        </div>
      )}

      {/* Position */}
      <div>
        <Label className="text-sm text-white/70">Position</Label>
        <div className="grid grid-cols-4 gap-1 mt-2">
          {POSITION_ANCHORS.slice(0, 7).map(pos => (
            <Button
              key={pos.id}
              variant={settings.anchor === pos.id ? "default" : "outline"}
              size="sm"
              onClick={() => onChange("anchor", pos.id)}
              className={`text-xs ${settings.anchor === pos.id 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
              }`}
            >
              {pos.icon}
            </Button>
          ))}
        </div>
      </div>

      {/* Page Mode */}
      <div>
        <Label className="text-sm text-white/70">Page Mode</Label>
        <Select value={settings.pageMode} onValueChange={(v) => onChange("pageMode", v)}>
          <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0f1a] border-white/10">
            {PAGE_MODES.map(m => (
              <SelectItem key={m.id} value={m.id} className="text-white hover:bg-white/10">{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Border Color */}
      <div>
        <Label className="text-sm text-white/70">Border Color</Label>
        <div className="flex gap-2 mt-2">
          {BRAND_COLORS.map(color => (
            <button
              key={color.id}
              onClick={() => onChange("borderColor", color.color)}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                settings.borderColor === color.color 
                  ? 'border-white scale-110' 
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color.color }}
              title={color.name}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      {/* Membership warning */}
      {isStampingBlocked && (
        <div className="p-4 md:p-6">
          <MembershipInlineWarning />
        </div>
      )}
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
              <Layers className="w-6 h-6" />
              Batch Stamp Documents
            </h1>
            <p className="text-white/50 mt-1">
              Stamp multiple documents at once with unique verification for each
            </p>
          </div>
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 self-start">
            Max {MAX_FILES} files
          </Badge>
        </div>

        {/* Stamp Mode Selection */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <Label className="text-sm font-medium text-white mb-3 block">Stamp Configuration Mode</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setStampMode("single")}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                stampMode === "single"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-white/10 hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  stampMode === "single" ? "bg-emerald-500/20" : "bg-white/10"
                }`}>
                  <Copy className={`w-5 h-5 ${stampMode === "single" ? "text-emerald-400" : "text-white/50"}`} />
                </div>
                <div>
                  <p className={`font-medium ${stampMode === "single" ? "text-emerald-400" : "text-white"}`}>
                    Same Stamp for All
                  </p>
                  <p className="text-xs text-white/50">Apply identical settings to all documents</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setStampMode("individual")}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                stampMode === "individual"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-white/10 hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  stampMode === "individual" ? "bg-emerald-500/20" : "bg-white/10"
                }`}>
                  <FileStack className={`w-5 h-5 ${stampMode === "individual" ? "text-emerald-400" : "text-white/50"}`} />
                </div>
                <div>
                  <p className={`font-medium ${stampMode === "individual" ? "text-emerald-400" : "text-white"}`}>
                    Different Stamp per Document
                  </p>
                  <p className="text-xs text-white/50">Customize settings for each document</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload & Files */}
          <div className="lg:col-span-2 space-y-4">
            {/* Upload Area */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-medium text-white">Upload Documents</h3>
                </div>
                {selectedFiles.length > 0 && (
                  <span className="text-sm text-white/50">{selectedFiles.length} file(s) • {formatSize(totalSize)}</span>
                )}
              </div>
              <div className="p-4">
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-500/10' 
                      : 'border-white/20 hover:border-emerald-400/50 hover:bg-white/5'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-white/70 font-medium">Drop PDF files here</p>
                  <p className="text-white/40 text-sm">or click to browse (max {MAX_FILE_SIZE_MB}MB each)</p>
                </div>
              </div>
            </div>

            {/* File List */}
            {selectedFiles.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-medium text-white">Selected Files ({selectedFiles.length}/{MAX_FILES})</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFiles}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                </div>
                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                  {selectedFiles.map((f, index) => (
                    <div key={index} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{f.name}</p>
                            <p className="text-xs text-white/50">{formatSize(f.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {stampMode === "individual" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedFileIndex(expandedFileIndex === index ? null : index)}
                              className="text-white/50 hover:text-white hover:bg-white/10"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-white/50 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Individual file settings (expandable) */}
                      {stampMode === "individual" && expandedFileIndex === index && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <SettingsPanel 
                            settings={f.settings} 
                            onChange={(key, value) => updateFileSettings(index, key, value)}
                            compact={true}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-medium text-emerald-400">Batch Complete</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <p className="text-2xl font-bold text-white">{results.totalFiles}</p>
                    <p className="text-sm text-white/50">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{results.successCount}</p>
                    <p className="text-sm text-white/50">Stamped</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{results.failedCount}</p>
                    <p className="text-sm text-white/50">Failed</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const url = URL.createObjectURL(results.zipBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `stamped_documents_${results.batchId}.zip`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Download ZIP Again
                </Button>
              </div>
            )}
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-4">
            {/* Global Settings Panel */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stamp className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-medium text-white">
                    {stampMode === "single" ? "Stamp Settings" : "Default Settings"}
                  </h3>
                </div>
                {stampMode === "individual" && selectedFiles.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={applyGlobalToAll}
                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs"
                  >
                    Apply to All
                  </Button>
                )}
              </div>
              <div className="p-4">
                <SettingsPanel 
                  settings={globalSettings} 
                  onChange={(key, value) => setGlobalSettings(prev => ({ ...prev, [key]: value }))}
                />
              </div>
            </div>

            {/* Process Button */}
            <Button
              onClick={handleBatchStamp}
              disabled={selectedFiles.length === 0 || processing || isStampingBlocked}
              className={`w-full h-12 text-lg text-white ${
                isStampingBlocked 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isStampingBlocked ? (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Membership Required
                </>
              ) : processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Layers className="w-5 h-5 mr-2" />
                  Stamp {selectedFiles.length} Document{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>

            {/* Progress */}
            {processing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2 bg-white/10" />
                <p className="text-sm text-center text-white/50">
                  {progress < 30 ? "Uploading files..." : 
                   progress < 80 ? "Stamping documents..." : 
                   "Generating ZIP..."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Batch History */}
        {batchHistory.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-medium text-white">Recent Batches</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/60">Batch ID</th>
                    <th className="text-left py-3 px-4 text-white/60">Date</th>
                    <th className="text-center py-3 px-4 text-white/60">Files</th>
                    <th className="text-center py-3 px-4 text-white/60">Success</th>
                    <th className="text-center py-3 px-4 text-white/60">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {batchHistory.slice(0, 10).map((batch, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 font-mono text-xs text-cyan-400">{batch.batch_id}</td>
                      <td className="py-3 px-4 text-white/70">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center text-white">{batch.file_count}</td>
                      <td className="py-3 px-4 text-center text-emerald-400">{batch.success_count}</td>
                      <td className="py-3 px-4 text-center text-red-400">{batch.failed_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BatchStampPage;
