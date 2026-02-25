import { useState, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { toast } from "sonner";
import { 
  Upload, FileText, Download, CheckCircle2, AlertTriangle, 
  X, File, Loader2, Layers, Trash2, Archive, FileCheck,
  Grid3X3, CornerRightDown, Move
} from "lucide-react";

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
  { id: "first", name: "First Page Only", desc: "Stamp appears on first page" },
  { id: "all", name: "All Pages", desc: "Stamp appears on every page" },
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

// Limits
const MAX_FILES = 25;
const MAX_FILE_SIZE_MB = 10;

const BatchStampPage = () => {
  const { user, getAuthHeaders } = useAuth();
  const fileInputRef = useRef(null);
  
  // Files state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Configuration state
  const [anchor, setAnchor] = useState("bottom_right");
  const [offsetX, setOffsetX] = useState(12);
  const [offsetY, setOffsetY] = useState(12);
  const [pageMode, setPageMode] = useState("first");
  const [documentType, setDocumentType] = useState("contract");
  const [recipientName, setRecipientName] = useState("");
  const [recipientOrg, setRecipientOrg] = useState("");
  const [description, setDescription] = useState("");
  const [borderColor, setBorderColor] = useState("#10B981");
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  
  // Batch history
  const [batchHistory, setBatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

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

  // Add files to selection
  const addFiles = (files) => {
    const newFiles = [];
    const errors = [];
    
    for (const file of files) {
      // Check total limit
      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        break;
      }
      
      // Check for duplicates
      if (selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name} already added`);
        continue;
      }
      
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        continue;
      }
      
      newFiles.push({
        file,
        name: file.name,
        size: file.size,
        status: "pending"
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

  // Remove file from selection
  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all files
  const clearFiles = () => {
    setSelectedFiles([]);
    setResults(null);
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
    
    if (!recipientName.trim()) {
      toast.error("Recipient name is required");
      return;
    }
    
    setProcessing(true);
    setProgress(10);
    
    try {
      const formData = new FormData();
      
      // Add files
      selectedFiles.forEach(f => {
        formData.append('files', f.file);
      });
      
      // Add configuration
      formData.append('anchor', anchor);
      formData.append('offset_x_pt', offsetX.toString());
      formData.append('offset_y_pt', offsetY.toString());
      formData.append('page_mode', pageMode);
      formData.append('document_type', documentType);
      formData.append('recipient_name', recipientName);
      formData.append('recipient_org', recipientOrg);
      formData.append('description', description);
      formData.append('border_color', borderColor);
      formData.append('stamp_type', 'certification');
      
      setProgress(30);
      
      const response = await axios.post(`${API}/documents/batch-stamp`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          const uploadProgress = Math.round((progressEvent.loaded * 30) / progressEvent.total);
          setProgress(30 + uploadProgress);
        }
      });
      
      setProgress(80);
      
      // Extract batch info from headers
      const batchId = response.headers['x-batch-id'] || 'BATCH';
      const totalFiles = parseInt(response.headers['x-total-files'] || '0');
      const successCount = parseInt(response.headers['x-success-count'] || '0');
      const failedCount = parseInt(response.headers['x-failed-count'] || '0');
      
      setResults({
        batchId,
        totalFiles,
        successCount,
        failedCount,
        zipBlob: response.data
      });
      
      setProgress(100);
      
      // Auto-download ZIP
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stamped_documents_${batchId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Batch complete! ${successCount}/${totalFiles} documents stamped successfully`);
      
      // Refresh history
      fetchBatchHistory();
      
    } catch (error) {
      console.error("Batch stamping error:", error);
      toast.error(error.response?.data?.detail || "Batch stamping failed");
    } finally {
      setProcessing(false);
    }
  };

  // Fetch batch history
  const fetchBatchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/documents/batch-stamps`, getAuthHeaders());
      setBatchHistory(response.data);
    } catch (error) {
      console.error("Failed to load batch history:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [getAuthHeaders]);

  // Load history on mount
  useState(() => {
    fetchBatchHistory();
  }, []);

  // Format file size
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Calculate total size
  const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-6 h-6 text-emerald-600" />
              Batch Stamp Documents
            </h1>
            <p className="text-gray-500 mt-1">
              Stamp multiple documents at once with unique verification for each
            </p>
          </div>
          <Badge variant="outline" className="text-emerald-600 border-emerald-200">
            Max {MAX_FILES} files
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - File Upload */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dropzone */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Documents
                </CardTitle>
                <CardDescription>
                  Drag & drop PDF files or click to browse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="batch-dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="batch-file-input"
                  />
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">
                    Drop PDF files here
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    or click to browse (max {MAX_FILE_SIZE_MB}MB each)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* File List */}
            {selectedFiles.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Selected Files ({selectedFiles.length}/{MAX_FILES})
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearFiles}
                      className="text-red-500 hover:text-red-700"
                      data-testid="clear-files-btn"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Total size: {formatSize(totalSize)}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedFiles.map((f, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        data-testid={`file-item-${index}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {f.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatSize(f.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="flex-shrink-0"
                          data-testid={`remove-file-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {results && (
              <Card className="border-emerald-200 bg-emerald-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                    Batch Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{results.totalFiles}</p>
                      <p className="text-sm text-gray-500">Total Files</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{results.successCount}</p>
                      <p className="text-sm text-gray-500">Stamped</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-500">{results.failedCount}</p>
                      <p className="text-sm text-gray-500">Failed</p>
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
                    data-testid="download-zip-btn"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Download ZIP Again
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Configuration */}
          <div className="space-y-4">
            {/* Position Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Move className="w-5 h-5" />
                  Stamp Position
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Anchor Point</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {POSITION_ANCHORS.map(pos => (
                      <Button
                        key={pos.id}
                        variant={anchor === pos.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAnchor(pos.id)}
                        className={anchor === pos.id ? "bg-emerald-600" : ""}
                        data-testid={`anchor-${pos.id}`}
                      >
                        <span className="mr-1">{pos.icon}</span>
                        <span className="text-xs hidden sm:inline">{pos.name.split(" ")[0]}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Offset X (pt)</Label>
                    <Input
                      type="number"
                      value={offsetX}
                      onChange={(e) => setOffsetX(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="mt-1"
                      data-testid="offset-x-input"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Offset Y (pt)</Label>
                    <Input
                      type="number"
                      value={offsetY}
                      onChange={(e) => setOffsetY(Number(e.target.value))}
                      min={0}
                      max={100}
                      className="mt-1"
                      data-testid="offset-y-input"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Page Mode</Label>
                  <Select value={pageMode} onValueChange={setPageMode}>
                    <SelectTrigger className="mt-1" data-testid="page-mode-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_MODES.map(mode => (
                        <SelectItem key={mode.id} value={mode.id}>
                          {mode.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Document Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  Document Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Document Type</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="mt-1" data-testid="document-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Recipient Name *</Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Enter recipient name"
                    className="mt-1"
                    data-testid="recipient-name-input"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Organization</Label>
                  <Input
                    value={recipientOrg}
                    onChange={(e) => setRecipientOrg(e.target.value)}
                    placeholder="Enter organization (optional)"
                    className="mt-1"
                    data-testid="recipient-org-input"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Batch description (optional)"
                    className="mt-1"
                    rows={2}
                    data-testid="description-input"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Border Color</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {BRAND_COLORS.map(color => (
                      <button
                        key={color.id}
                        onClick={() => setBorderColor(color.color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          borderColor === color.color 
                            ? 'border-gray-900 scale-110' 
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.color }}
                        title={color.name}
                        data-testid={`color-${color.id}`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Process Button */}
            <Button
              onClick={handleBatchStamp}
              disabled={selectedFiles.length === 0 || processing || !recipientName.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
              data-testid="process-batch-btn"
            >
              {processing ? (
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
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-gray-500">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Batches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Batch ID</th>
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-center py-2 px-3">Files</th>
                      <th className="text-center py-2 px-3">Success</th>
                      <th className="text-center py-2 px-3">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchHistory.slice(0, 10).map((batch, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-mono text-xs">{batch.batch_id}</td>
                        <td className="py-2 px-3">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 text-center">{batch.file_count}</td>
                        <td className="py-2 px-3 text-center text-emerald-600">{batch.success_count}</td>
                        <td className="py-2 px-3 text-center text-red-500">{batch.failed_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BatchStampPage;
