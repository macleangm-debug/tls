import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Slider } from "../components/ui/slider";
import { ConfirmationModal } from "../components/ui/confirmation-modal";
import { toast } from "sonner";
import { Rnd } from "react-rnd";
import { 
  Settings, Plus, Edit, Trash2, Star, Check, Palette,
  FileText, QrCode, User, Building, Save, X, Loader2,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Minimize2, AlignLeft, AlignRight, Move, Eye, Grid3X3,
  PenTool, Upload, Image as ImageIcon, Maximize2, Minimize, ArrowLeft,
  AlertTriangle
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

const STAMP_TYPES = [
  { id: "official", name: "Official Stamp", color: "#10B981" },
  { id: "commissioner", name: "Commissioner for Oaths", color: "#3B82F6" },
  { id: "notary", name: "Notary Public", color: "#8B5CF6" }
];

const BRAND_COLORS = [
  { id: "emerald", name: "Emerald", color: "#10B981" },
  { id: "blue", name: "Blue", color: "#3B82F6" },
  { id: "purple", name: "Purple", color: "#8B5CF6" },
  { id: "gold", name: "Gold", color: "#F59E0B" },
  { id: "red", name: "Red", color: "#EF4444" },
  { id: "teal", name: "Teal", color: "#14B8A6" }
];

const STAMP_LAYOUTS = [
  { id: "horizontal", name: "Horizontal", desc: "Logo above text, wide format", icon: AlignHorizontalDistributeCenter },
  { id: "vertical", name: "Vertical", desc: "Stacked layout, compact", icon: AlignVerticalDistributeCenter },
  { id: "compact", name: "Compact", desc: "Minimal, text only", icon: Minimize2 },
  { id: "logo_left", name: "Logo Left", desc: "Logo on the left side", icon: AlignLeft },
  { id: "logo_right", name: "Logo Right", desc: "Logo on the right side", icon: AlignRight }
];

const POSITION_PRESETS = [
  { id: "top-left", name: "Top Left", x: 35, y: 35 },
  { id: "top-right", name: "Top Right", x: -1, y: 35 },
  { id: "bottom-left", name: "Bottom Left", x: 35, y: -1 },
  { id: "bottom-right", name: "Bottom Right", x: -1, y: -1 },
  { id: "center", name: "Center", x: -2, y: -2 }
];

const PAGE_OPTIONS = [
  { id: "first", name: "First Page Only" },
  { id: "last", name: "Last Page Only" },
  { id: "all", name: "All Pages" }
];

const STAMP_SHAPES = [
  { id: "rectangle", name: "Rectangle", icon: "▭", desc: "Standard rectangular stamp" },
  { id: "circle", name: "Circle", icon: "○", desc: "Round circular stamp" },
  { id: "oval", name: "Oval", icon: "⬭", desc: "Elliptical oval stamp" }
];

const MAX_TEMPLATES = 3;

const StampSettingsPage = () => {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if returning from stamp-document
  const returnTo = searchParams.get('returnTo');
  const createNew = searchParams.get('createNew') === 'true';
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(createNew ? "create" : "templates");
  
  // Preview state for the settings editor
  const previewRef = useRef(null);
  const signatureInputRef = useRef(null);
  const signatureCanvasRef = useRef(null);
  const [previewStampPos, setPreviewStampPos] = useState({ x: 280, y: 350 });
  
  // Signature state
  const [savedSignature, setSavedSignature] = useState(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureCanvasSize, setSignatureCanvasSize] = useState("medium"); // small, medium, large
  
  // Confirmation modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [signatureDeleteConfirmOpen, setSignatureDeleteConfirmOpen] = useState(false);
  
  // Canvas size options
  const CANVAS_SIZES = {
    small: { width: 300, height: 100 },
    medium: { width: 400, height: 150 },
    large: { width: 500, height: 200 }
  };
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    document_type: "contract",
    stamp_type: "official",
    shape: "rectangle",
    brand_color: "#10B981",
    layout: "horizontal",
    show_advocate_name: true,
    show_tls_logo: true,
    include_signature: false,
    position_preset: "bottom-right",
    apply_to_pages: "first",
    stamp_size: 100,
    logo_size: 100,
    opacity: 90,
    margin_from_edge: 35,
    default_position: { x: 400, y: 50, width: 150, height: 150 },
    default_recipient_name: "",
    default_recipient_org: "",
    is_default: false
  });

  useEffect(() => {
    fetchTemplates();
    fetchSavedSignature();
  }, []);

  // Initialize canvas when tab changes
  useEffect(() => {
    if (activeTab === "create" && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [activeTab]);

  // Signature drawing functions
  const getCanvasCoordinates = (e) => {
    const canvas = signatureCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e);
    
    setIsDrawing(true);
    setHasDrawn(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = signatureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const coords = getCanvasCoordinates(e);
    
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    startDrawing(e);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    draw(e);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const saveDrawnSignature = async () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !hasDrawn) {
      toast.error("Please draw your signature first");
      return;
    }

    try {
      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const formData = new FormData();
      formData.append('file', blob, 'signature.png');
      
      const response = await axios.post(`${API}/advocate/signature`, formData, {
        ...getAuthHeaders(),
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      
      setSavedSignature(response.data.signature_data);
      toast.success("Signature saved successfully!");
      clearSignature();
    } catch (error) {
      toast.error("Failed to save signature");
    }
  };

  // Fetch saved signature
  const fetchSavedSignature = async () => {
    try {
      const response = await axios.get(`${API}/advocate/signature`, getAuthHeaders());
      if (response.data.signature_data) {
        setSavedSignature(response.data.signature_data);
      }
    } catch (error) {
      console.error("Failed to load signature:", error);
    }
  };

  // Upload signature
  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 500000) {
      toast.error("Image too large (max 500KB)");
      return;
    }

    setUploadingSignature(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/advocate/signature`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSavedSignature(response.data.signature_data);
      toast.success("Signature uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload signature");
    } finally {
      setUploadingSignature(false);
    }
  };

  // Delete signature
  const handleDeleteSignature = () => {
    setSignatureDeleteConfirmOpen(true);
  };

  const confirmDeleteSignature = async () => {
    try {
      await axios.delete(`${API}/advocate/signature`, getAuthHeaders());
      setSavedSignature(null);
      toast.success("Signature deleted successfully");
    } catch (error) {
      toast.error("Failed to delete signature");
    }
  };

  // Update preview stamp position when settings change
  useEffect(() => {
    updatePreviewPosition();
  }, [formData.position_preset, formData.margin_from_edge, formData.stamp_size]);

  const updatePreviewPosition = () => {
    const previewWidth = 360;
    const previewHeight = 480;
    const stampBaseSize = 80;
    const scale = formData.stamp_size / 100;
    const stampSize = stampBaseSize * scale;
    const margin = formData.margin_from_edge;
    
    const preset = POSITION_PRESETS.find(p => p.id === formData.position_preset);
    if (preset) {
      let x, y;
      if (preset.x === -1) x = previewWidth - stampSize - margin;
      else if (preset.x === -2) x = (previewWidth - stampSize) / 2;
      else x = preset.x;
      
      if (preset.y === -1) y = previewHeight - stampSize - margin;
      else if (preset.y === -2) y = (previewHeight - stampSize) / 2;
      else y = preset.y;
      
      setPreviewStampPos({ x, y });
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/stamp-templates`, getAuthHeaders());
      setTemplates(response.data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      document_type: "contract",
      stamp_type: "official",
      brand_color: "#10B981",
      layout: "horizontal",
      show_advocate_name: true,
      show_tls_logo: true,
      position_preset: "bottom-right",
      apply_to_pages: "first",
      stamp_size: 100,
      logo_size: 100,
      opacity: 90,
      margin_from_edge: 35,
      default_position: { x: 400, y: 50, width: 150, height: 150 },
      default_recipient_name: "",
      default_recipient_org: "",
      is_default: false
    });
    setEditingTemplate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      document_type: template.document_type,
      stamp_type: template.stamp_type,
      brand_color: template.brand_color,
      layout: template.layout || "horizontal",
      show_advocate_name: template.show_advocate_name,
      show_tls_logo: template.show_tls_logo,
      position_preset: template.position_preset || "bottom-right",
      apply_to_pages: template.apply_to_pages || "first",
      stamp_size: template.stamp_size || 100,
      logo_size: template.logo_size || 100,
      opacity: template.opacity || 90,
      margin_from_edge: template.margin_from_edge || 35,
      default_position: template.default_position || { x: 400, y: 50, width: 150, height: 150 },
      default_recipient_name: template.default_recipient_name || "",
      default_recipient_org: template.default_recipient_org || "",
      is_default: template.is_default
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setSaving(true);
    try {
      // Calculate position based on preset and settings
      const scale = formData.stamp_size / 100;
      const baseSize = 150;
      const width = Math.round(baseSize * scale);
      const height = Math.round(baseSize * scale);
      
      const dataToSend = {
        ...formData,
        default_position: {
          ...formData.default_position,
          width,
          height
        }
      };

      if (editingTemplate) {
        await axios.put(`${API}/stamp-templates/${editingTemplate.id}`, dataToSend, getAuthHeaders());
        toast.success("Template updated successfully");
      } else {
        await axios.post(`${API}/stamp-templates`, dataToSend, getAuthHeaders());
        toast.success("Template created successfully");
        
        // If coming from stamp-document, navigate back
        if (returnTo === 'stamp-document') {
          navigate('/stamp-document');
          return;
        }
      }
      setShowDialog(false);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId) => {
    setTemplateToDelete(templateId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await axios.delete(`${API}/stamp-templates/${templateToDelete}`, getAuthHeaders());
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
    }
    setTemplateToDelete(null);
  };

  const handleSetDefault = async (templateId) => {
    try {
      await axios.post(`${API}/stamp-templates/${templateId}/set-default`, {}, getAuthHeaders());
      toast.success("Default template updated");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to set default");
    }
  };

  const getDocTypeName = (id) => DOCUMENT_TYPES.find(t => t.id === id)?.name || id;
  const getStampTypeName = (id) => STAMP_TYPES.find(t => t.id === id)?.name || id;
  const getLayoutName = (id) => STAMP_LAYOUTS.find(l => l.id === id)?.name || id;

  // Calculate stamp preview size
  const stampPreviewSize = Math.round(80 * (formData.stamp_size / 100));

  return (
    <DashboardLayout title="Stamp Settings" subtitle="Manage your stamp templates and preferences">
      {/* Back to Document Banner */}
      {returnTo === 'stamp-document' && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <p className="text-yellow-400 text-sm">
              Create a template to continue with your document
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/stamp-document')}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Document
          </Button>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
          <TabsTrigger 
            value="templates" 
            className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            My Templates
          </TabsTrigger>
          <TabsTrigger 
            value="create" 
            className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New
          </TabsTrigger>
          <TabsTrigger 
            value="signature" 
            className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
          >
            <PenTool className="w-4 h-4 mr-2" />
            My Signature
          </TabsTrigger>
        </TabsList>

        {/* SIGNATURE TAB */}
        <TabsContent value="signature" className="space-y-6">
          <Card className="glass-card rounded-2xl max-w-2xl">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <PenTool className="w-6 h-6 text-emerald-400" />
                Digital Signature
              </CardTitle>
              <p className="text-white/50 text-sm">Upload your signature to be included on stamped documents</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Signature */}
              {savedSignature ? (
                <div className="space-y-4">
                  <Label className="text-white/70">Current Signature</Label>
                  <div className="p-6 bg-white rounded-xl flex items-center justify-center">
                    <img 
                      src={`data:image/png;base64,${savedSignature}`} 
                      alt="Your signature" 
                      className="max-h-24 object-contain"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => signatureInputRef.current?.click()}
                      disabled={uploadingSignature}
                      className="flex-1 border-white/10 text-white hover:bg-white/5 rounded-xl"
                    >
                      {uploadingSignature ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Replace Signature</>
                      )}
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={handleDeleteSignature}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div 
                    onClick={() => signatureInputRef.current?.click()}
                    className="p-12 border-2 border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors"
                  >
                    {uploadingSignature ? (
                      <Loader2 className="w-12 h-12 mx-auto text-emerald-400 animate-spin mb-4" />
                    ) : (
                      <ImageIcon className="w-12 h-12 mx-auto text-white/30 mb-4" />
                    )}
                    <p className="text-white font-medium">Click to upload your signature</p>
                    <p className="text-white/40 text-sm mt-1">PNG, JPG or JPEG (max 500KB)</p>
                  </div>
                </div>
              )}

              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleSignatureUpload}
                className="hidden"
              />

              {/* Info Box */}
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <p className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
                  <span>💡</span> How it works
                </p>
                <ul className="space-y-1 text-sm text-white/60">
                  <li>• Upload a clear image of your signature on white background</li>
                  <li>• Your signature will appear on stamped documents when "Add My Signature" is enabled</li>
                  <li>• You can toggle signature on/off during each stamp creation</li>
                  <li>• If no signature is uploaded, a blank signature box will appear for print & sign</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEMPLATES LIST TAB */}
        <TabsContent value="templates" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50">
                Save your frequently used stamp configurations for quick access during document stamping
              </p>
              <p className="text-xs text-amber-400/70 mt-1">
                {templates.length}/{MAX_TEMPLATES} templates used
              </p>
            </div>
            <Button 
              onClick={() => setActiveTab("create")} 
              className={`rounded-xl ${templates.length >= MAX_TEMPLATES ? 'bg-gray-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600'}`}
              disabled={templates.length >= MAX_TEMPLATES}
              data-testid="new-template-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              {templates.length >= MAX_TEMPLATES ? 'Max Templates Reached' : 'New Template'}
            </Button>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
          ) : templates.length === 0 ? (
            <Card className="glass-card rounded-2xl">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                  <Settings className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="font-heading text-xl text-white mb-2">No templates yet</h3>
                <p className="text-white/50 mb-6">Create your first stamp template to speed up your workflow</p>
                <Button 
                  onClick={() => setActiveTab("create")} 
                  className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`glass-card rounded-2xl transition-all hover:border-white/20 ${
                    template.is_default ? "border-emerald-500/50" : ""
                  }`}
                  data-testid={`template-card-${template.id}`}
                >
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-12 h-12 flex items-center justify-center ${
                            template.shape === 'circle' ? 'rounded-full' : 
                            template.shape === 'oval' ? 'rounded-full' : 'rounded-xl'
                          }`}
                          style={{ 
                            backgroundColor: `${template.brand_color}20`,
                            aspectRatio: template.shape === 'oval' ? '1.5' : '1'
                          }}
                        >
                          <QrCode className="w-6 h-6" style={{ color: template.brand_color }} />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{template.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {template.is_default && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                            <Badge className="bg-white/10 text-white/60 text-xs capitalize">
                              {template.shape || 'rectangle'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-white/40" />
                        <span className="text-white/60">{getDocTypeName(template.document_type)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <QrCode className="w-4 h-4 text-white/40" />
                        <span className="text-white/60">{getStampTypeName(template.stamp_type)}</span>
                      </div>
                      {template.layout && (
                        <div className="flex items-center gap-2 text-sm">
                          <Move className="w-4 h-4 text-white/40" />
                          <span className="text-white/60">Layout: {getLayoutName(template.layout)}</span>
                        </div>
                      )}
                      {template.default_recipient_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-white/40" />
                          <span className="text-white/60">{template.default_recipient_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Color & Size Preview */}
                    <div className="flex items-center justify-between gap-2 mb-4 p-3 bg-white/5 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-xs">Color:</span>
                        <div 
                          className="w-6 h-6 rounded-md border border-white/20"
                          style={{ backgroundColor: template.brand_color }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-xs">Size:</span>
                        <span className="text-white/70 text-xs">{template.stamp_size || 100}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40 text-xs">Opacity:</span>
                        <span className="text-white/70 text-xs">{template.opacity || 90}%</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {!template.is_default && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSetDefault(template.id)}
                          className="flex-1 text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                        >
                          <Star className="w-4 h-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openEditDialog(template)}
                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        className="text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Tips */}
          <Card className="glass-card rounded-2xl border-white/5">
            <CardContent className="p-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-lg">💡</span> Quick Tips
              </h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li>• Set a <span className="text-emerald-400">default template</span> to auto-fill settings when stamping new documents</li>
                <li>• Create different templates for different document types (contracts, affidavits, etc.)</li>
                <li>• You can <span className="text-emerald-400">override</span> any template settings during the stamping process</li>
                <li>• Save recipient details for recurring clients to speed up your workflow</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREATE/EDIT TEMPLATE TAB - REDESIGNED WITH STICKY PREVIEW */}
        <TabsContent value="create">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN - SCROLLABLE SETTINGS */}
            <div className="space-y-6">
              {/* Template Details */}
              <Card className="glass-card rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Template Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Template Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g., Contract Stamp - Client A"
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                      data-testid="template-name-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-white/70">Document Type</Label>
                      <Select value={formData.document_type} onValueChange={(v) => setFormData(f => ({ ...f, document_type: v }))}>
                        <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1120] border-white/10">
                          {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.id} value={type.id} className="text-white hover:bg-white/10">{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70">Stamp Type</Label>
                      <Select value={formData.stamp_type} onValueChange={(v) => setFormData(f => ({ ...f, stamp_type: v }))}>
                        <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1120] border-white/10">
                          {STAMP_TYPES.map((type) => (
                            <SelectItem key={type.id} value={type.id} className="text-white hover:bg-white/10">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                                {type.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stamp Shape Selection */}
              <Card className="glass-card rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Grid3X3 className="w-5 h-5 text-cyan-400" />
                    Stamp Shape
                    <Badge className="ml-auto bg-amber-500/20 text-amber-400 text-xs">Max 3 Templates</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {STAMP_SHAPES.map((shape) => (
                      <button
                        key={shape.id}
                        onClick={() => setFormData(f => ({ ...f, shape: shape.id }))}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${
                          formData.shape === shape.id 
                            ? "border-emerald-500 bg-emerald-500/20" 
                            : "border-white/10 hover:border-white/30 bg-white/5"
                        }`}
                      >
                        <div className={`text-4xl mb-2 ${formData.shape === shape.id ? "text-emerald-400" : "text-white/50"}`}>
                          {shape.id === "rectangle" && (
                            <div className="w-16 h-10 mx-auto border-2 rounded-sm" style={{ borderColor: formData.shape === shape.id ? '#10B981' : 'rgba(255,255,255,0.3)' }} />
                          )}
                          {shape.id === "circle" && (
                            <div className="w-12 h-12 mx-auto border-2 rounded-full" style={{ borderColor: formData.shape === shape.id ? '#10B981' : 'rgba(255,255,255,0.3)' }} />
                          )}
                          {shape.id === "oval" && (
                            <div className="w-16 h-10 mx-auto border-2 rounded-full" style={{ borderColor: formData.shape === shape.id ? '#10B981' : 'rgba(255,255,255,0.3)' }} />
                          )}
                        </div>
                        <p className={`text-sm font-medium ${formData.shape === shape.id ? "text-emerald-400" : "text-white"}`}>{shape.name}</p>
                        <p className="text-xs text-white/50 mt-1">{shape.desc}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-white/40 mt-3 text-center">
                    Each advocate can create up to 3 stamp templates with different shapes
                  </p>
                </CardContent>
              </Card>

              {/* Stamp Layout */}
              <Card className="glass-card rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Move className="w-5 h-5 text-purple-400" />
                    Stamp Layout
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-2">
                    {STAMP_LAYOUTS.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => setFormData(f => ({ ...f, layout: layout.id }))}
                        className={`p-3 rounded-xl border transition-all text-center ${
                          formData.layout === layout.id 
                            ? "border-emerald-500 bg-emerald-500/20" 
                            : "border-white/10 hover:border-white/20 bg-white/5"
                        }`}
                      >
                        <layout.icon className={`w-5 h-5 mx-auto mb-1 ${formData.layout === layout.id ? "text-emerald-400" : "text-white/50"}`} />
                        <p className="text-xs text-white">{layout.name}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Color Selection with Inline Color Picker */}
              <Card className="glass-card rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Palette className="w-5 h-5 text-pink-400" />
                    Stamp Color
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Preset Colors */}
                    {BRAND_COLORS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => setFormData(f => ({ ...f, brand_color: color.color }))}
                        className={`w-10 h-10 rounded-xl transition-all ${
                          formData.brand_color === color.color ? "ring-2 ring-white ring-offset-2 ring-offset-[#0B1120]" : ""
                        }`}
                        style={{ backgroundColor: color.color }}
                        title={color.name}
                      >
                        {formData.brand_color === color.color && <Check className="w-5 h-5 text-white mx-auto" />}
                      </button>
                    ))}
                    {/* Divider */}
                    <div className="w-px h-8 bg-white/20 mx-1" />
                    {/* Color Picker Inline */}
                    <div className="relative">
                      <input
                        type="color"
                        value={formData.brand_color}
                        onChange={(e) => setFormData(f => ({ ...f, brand_color: e.target.value }))}
                        className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white/20 bg-transparent"
                        title="Custom color"
                      />
                      <Palette className="w-4 h-4 text-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    {/* Hex Input */}
                    <Input
                      value={formData.brand_color}
                      onChange={(e) => setFormData(f => ({ ...f, brand_color: e.target.value }))}
                      className="w-24 h-10 bg-white/5 border-white/10 text-white font-mono text-sm rounded-xl"
                      placeholder="#000000"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Size & Appearance */}
              <Card className="glass-card rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-400" />
                    Size & Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/70">Stamp Size</Label>
                      <span className="text-emerald-400 font-mono text-sm font-bold">{formData.stamp_size}%</span>
                    </div>
                    <Slider value={[formData.stamp_size]} onValueChange={([v]) => setFormData(f => ({ ...f, stamp_size: v }))} min={50} max={150} step={5} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/70">Opacity</Label>
                      <span className="text-emerald-400 font-mono text-sm font-bold">{formData.opacity}%</span>
                    </div>
                    <Slider value={[formData.opacity]} onValueChange={([v]) => setFormData(f => ({ ...f, opacity: v }))} min={30} max={100} step={5} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Position</Label>
                      <Select value={formData.position_preset} onValueChange={(v) => setFormData(f => ({ ...f, position_preset: v }))}>
                        <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1120] border-white/10">
                          {POSITION_PRESETS.map((pos) => (
                            <SelectItem key={pos.id} value={pos.id} className="text-white hover:bg-white/10">{pos.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">Apply to</Label>
                      <Select value={formData.apply_to_pages} onValueChange={(v) => setFormData(f => ({ ...f, apply_to_pages: v }))}>
                        <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1120] border-white/10">
                          {PAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id} className="text-white hover:bg-white/10">{opt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Signature Settings with Drawing Pad */}
              <Card className="glass-card rounded-2xl border-emerald-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-emerald-400" />
                    Signature Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div>
                      <span className="text-white text-sm font-medium">Include Signature on Stamp</span>
                      <p className="text-white/40 text-xs">{savedSignature ? "Your signature will appear" : "Draw or upload your signature"}</p>
                    </div>
                    <Switch
                      checked={formData.include_signature}
                      onCheckedChange={(v) => setFormData(f => ({ ...f, include_signature: v }))}
                    />
                  </div>

                  {/* Signature Drawing Pad */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-white/70">Draw Your Signature</Label>
                      {/* Size Controls */}
                      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                        {Object.keys(CANVAS_SIZES).map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              setSignatureCanvasSize(size);
                              clearSignature();
                            }}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              signatureCanvasSize === size 
                                ? "bg-emerald-500 text-white" 
                                : "text-white/50 hover:text-white"
                            }`}
                          >
                            {size === "small" && <Minimize className="w-3 h-3" />}
                            {size === "medium" && "M"}
                            {size === "large" && <Maximize2 className="w-3 h-3" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-1 relative">
                      <canvas
                        ref={signatureCanvasRef}
                        width={CANVAS_SIZES[signatureCanvasSize].width}
                        height={CANVAS_SIZES[signatureCanvasSize].height}
                        className="w-full rounded-lg cursor-crosshair touch-none"
                        style={{ touchAction: 'none' }}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={stopDrawing}
                      />
                      {!hasDrawn && !savedSignature && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <p className="text-gray-400 text-sm">Sign here with mouse, touch, or stylus</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSignature}
                        className="flex-1 border-white/10 text-white hover:bg-white/5 rounded-lg"
                      >
                        <X className="w-4 h-4 mr-1" /> Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveDrawnSignature}
                        disabled={!hasDrawn}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 rounded-lg disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-1" /> Save Signature
                      </Button>
                    </div>
                  </div>

                  {/* Or Upload */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-[#0B1120] px-3 text-white/40 text-xs">or upload image</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => signatureInputRef.current?.click()}
                    className="p-4 border border-dashed border-white/20 rounded-xl text-center cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors"
                  >
                    <Upload className="w-6 h-6 mx-auto text-white/30 mb-1" />
                    <p className="text-white/50 text-sm">Upload signature image</p>
                    <p className="text-white/30 text-xs">PNG, JPG (max 500KB)</p>
                  </div>
                  <input ref={signatureInputRef} type="file" accept="image/png,image/jpeg" onChange={handleSignatureUpload} className="hidden" />

                  {/* Current Signature Preview */}
                  {savedSignature && (
                    <div className="p-3 bg-white rounded-xl">
                      <p className="text-gray-500 text-xs mb-2">Saved Signature:</p>
                      <img src={`data:image/png;base64,${savedSignature}`} alt="Signature" className="max-h-12 mx-auto" />
                      <Button variant="ghost" size="sm" onClick={handleDeleteSignature} className="w-full mt-2 text-red-500 hover:text-red-400 text-xs">
                        <Trash2 className="w-3 h-3 mr-1" /> Remove Signature
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Display Options */}
              <Card className="glass-card rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-cyan-400" />
                    Display Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-white/70 text-sm">Show my name on stamp</span>
                    <Switch checked={formData.show_advocate_name} onCheckedChange={(v) => setFormData(f => ({ ...f, show_advocate_name: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-white/70 text-sm">Include TLS logo</span>
                    <Switch checked={formData.show_tls_logo} onCheckedChange={(v) => setFormData(f => ({ ...f, show_tls_logo: v }))} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <div>
                      <span className="text-white font-medium text-sm">Set as default template</span>
                      <p className="text-white/50 text-xs">Auto-apply when stamping</p>
                    </div>
                    <Switch checked={formData.is_default} onCheckedChange={(v) => setFormData(f => ({ ...f, is_default: v }))} />
                  </div>
                </CardContent>
              </Card>

              {/* Save Buttons */}
              <div className="space-y-3 pb-6">
                <Button 
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim()}
                  className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl text-lg font-semibold shadow-lg shadow-emerald-500/25"
                  data-testid="save-template-btn"
                >
                  {saving ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</> : <><Save className="w-5 h-5 mr-2" /> {editingTemplate ? "Update Template" : "Save Template"}</>}
                </Button>
                <Button variant="ghost" onClick={() => { resetForm(); setActiveTab("templates"); }} className="w-full text-white/50 hover:text-white">
                  Cancel
                </Button>
              </div>
            </div>

            {/* RIGHT COLUMN - STICKY LIVE PREVIEW */}
            <div className="lg:block">
              <div className="sticky top-4 space-y-4">
                <Card className="glass-card rounded-2xl border-emerald-500/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Eye className="w-5 h-5 text-emerald-400" />
                        Live Preview
                      </CardTitle>
                      <div className="text-right text-xs">
                        <p className="text-emerald-400 font-mono">{formData.stamp_size}% size</p>
                        <p className="text-white/40">{formData.opacity}% opacity</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-xl p-6 flex justify-center min-h-[400px] items-center">
                      <div 
                        className="transition-all duration-300"
                        style={{ transform: `scale(${formData.stamp_size / 100})`, opacity: formData.opacity / 100 }}
                      >
                        {/* HORIZONTAL LAYOUT */}
                        {formData.layout === "horizontal" && (
                          <div className="rounded-xl overflow-hidden shadow-2xl" style={{ width: '280px', border: `3px solid ${formData.brand_color}`, boxShadow: `0 8px 32px ${formData.brand_color}40` }}>
                            <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: formData.brand_color }}>
                              {formData.show_tls_logo && <div className="bg-white rounded px-1.5 py-0.5"><img src="/assets/tls-logo.png" alt="TLS" className="h-5 object-contain" /></div>}
                              <div className="text-right">
                                <p className="text-white text-xs font-bold">VERIFIED</p>
                                <p className="text-white/80 text-[10px]">Tanganyika Law Society</p>
                              </div>
                            </div>
                            <div className="p-4 bg-white">
                              <div className="flex gap-3">
                                <div className="w-16 h-16 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${formData.brand_color}10`, border: `2px solid ${formData.brand_color}30` }}>
                                  <QrCode className="w-12 h-12" style={{ color: formData.brand_color }} />
                                </div>
                                <div className="flex-1 text-xs">
                                  <p className="text-gray-500 uppercase text-[10px]">Stamp ID</p>
                                  <p className="text-gray-800 font-mono font-bold">VS-XXXXXX</p>
                                  <p className="text-gray-500 uppercase text-[10px] mt-1">Date</p>
                                  <p className="text-gray-700">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                              </div>
                              {formData.include_signature && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-gray-500 text-[10px] uppercase mb-1">Signature</p>
                                  <div className="h-10 rounded border-2 border-dashed flex items-center justify-center" style={{ borderColor: `${formData.brand_color}40` }}>
                                    {savedSignature ? <img src={`data:image/png;base64,${savedSignature}`} alt="Sig" className="max-h-8" /> : <span className="text-gray-400 text-xs">Sign here</span>}
                                  </div>
                                </div>
                              )}
                              {formData.show_advocate_name && (
                                <div className="mt-3 text-center">
                                  <p className="text-gray-500 text-[10px] uppercase">Stamped By</p>
                                  <p className="font-bold text-sm" style={{ color: formData.brand_color }}>{user?.full_name || 'Advocate'}</p>
                                  <p className="text-gray-500 text-[10px]">Licensed Advocate - TLS</p>
                                </div>
                              )}
                            </div>
                            <div className="px-3 py-1.5 text-center" style={{ backgroundColor: `${formData.brand_color}15` }}>
                              <p className="text-xs font-semibold flex items-center justify-center gap-1" style={{ color: formData.brand_color }}>
                                <QrCode className="w-3 h-3" /> Scan to Verify
                              </p>
                            </div>
                          </div>
                        )}

                        {/* VERTICAL LAYOUT */}
                        {formData.layout === "vertical" && (
                          <div className="rounded-xl overflow-hidden shadow-2xl text-center" style={{ width: '180px', border: `3px solid ${formData.brand_color}`, boxShadow: `0 8px 32px ${formData.brand_color}40` }}>
                            <div className="p-3" style={{ backgroundColor: formData.brand_color }}>
                              {formData.show_tls_logo && <div className="bg-white rounded px-2 py-0.5 inline-block mb-1"><img src="/assets/tls-logo.png" alt="TLS" className="h-4" /></div>}
                              <p className="text-white font-bold text-sm">VERIFIED</p>
                            </div>
                            <div className="p-3 bg-white">
                              <div className="w-14 h-14 mx-auto rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${formData.brand_color}10`, border: `2px solid ${formData.brand_color}30` }}>
                                <QrCode className="w-10 h-10" style={{ color: formData.brand_color }} />
                              </div>
                              <p className="text-gray-500 text-[10px]">VS-XXXXXX</p>
                              <p className="text-gray-500 text-[10px]">{new Date().toLocaleDateString()}</p>
                              {formData.include_signature && (
                                <div className="mt-2 h-8 rounded border border-dashed flex items-center justify-center" style={{ borderColor: `${formData.brand_color}40` }}>
                                  {savedSignature ? <img src={`data:image/png;base64,${savedSignature}`} alt="Sig" className="max-h-6" /> : <span className="text-gray-400 text-[10px]">Sign</span>}
                                </div>
                              )}
                              {formData.show_advocate_name && <p className="font-bold text-xs mt-1" style={{ color: formData.brand_color }}>{user?.full_name?.split(' ')[0]}</p>}
                            </div>
                            <div className="py-1 text-[10px]" style={{ backgroundColor: `${formData.brand_color}15`, color: formData.brand_color }}>Scan to Verify</div>
                          </div>
                        )}

                        {/* COMPACT LAYOUT */}
                        {formData.layout === "compact" && (
                          <div className="rounded-xl overflow-hidden shadow-2xl flex" style={{ border: `3px solid ${formData.brand_color}`, boxShadow: `0 8px 32px ${formData.brand_color}40` }}>
                            <div className="p-2" style={{ backgroundColor: formData.brand_color }}>
                              <QrCode className="w-12 h-12 text-white" />
                            </div>
                            <div className="p-2 bg-white">
                              <p className="font-bold text-xs" style={{ color: formData.brand_color }}>TLS VERIFIED</p>
                              <p className="text-gray-500 text-[10px]">VS-XXXXXX</p>
                              {formData.show_advocate_name && <p className="text-gray-600 text-[10px]">{user?.full_name?.split(' ')[0]}</p>}
                              {formData.include_signature && savedSignature && <img src={`data:image/png;base64,${savedSignature}`} alt="Sig" className="h-4 mt-1" />}
                            </div>
                          </div>
                        )}

                        {/* LOGO LEFT LAYOUT */}
                        {formData.layout === "logo_left" && (
                          <div className="rounded-xl overflow-hidden shadow-2xl flex" style={{ width: '300px', border: `3px solid ${formData.brand_color}`, boxShadow: `0 8px 32px ${formData.brand_color}40` }}>
                            <div className="p-3 flex flex-col items-center justify-center" style={{ backgroundColor: formData.brand_color, width: '90px' }}>
                              {formData.show_tls_logo && <div className="bg-white rounded p-0.5 mb-1"><img src="/assets/tls-logo.png" alt="TLS" className="h-5" /></div>}
                              <QrCode className="w-12 h-12 text-white" />
                              <p className="text-white text-[10px] mt-1 font-bold">VERIFIED</p>
                            </div>
                            <div className="p-3 bg-white flex-1">
                              <p className="text-gray-500 text-[10px] uppercase">Stamp ID</p>
                              <p className="font-mono font-bold text-xs" style={{ color: formData.brand_color }}>VS-XXXXXX</p>
                              <p className="text-gray-500 text-[10px] mt-1">Date: {new Date().toLocaleDateString()}</p>
                              {formData.include_signature && (
                                <div className="mt-1 h-8 rounded border border-dashed flex items-center justify-center" style={{ borderColor: `${formData.brand_color}40` }}>
                                  {savedSignature ? <img src={`data:image/png;base64,${savedSignature}`} alt="Sig" className="max-h-6" /> : <span className="text-gray-400 text-[10px]">Sign</span>}
                                </div>
                              )}
                              {formData.show_advocate_name && (
                                <div className="mt-1 pt-1 border-t border-gray-200">
                                  <p className="text-gray-500 text-[10px]">By:</p>
                                  <p className="font-bold text-xs" style={{ color: formData.brand_color }}>{user?.full_name}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* LOGO RIGHT LAYOUT */}
                        {formData.layout === "logo_right" && (
                          <div className="rounded-xl overflow-hidden shadow-2xl flex" style={{ width: '300px', border: `3px solid ${formData.brand_color}`, boxShadow: `0 8px 32px ${formData.brand_color}40` }}>
                            <div className="p-3 bg-white flex-1">
                              <p className="font-bold text-sm" style={{ color: formData.brand_color }}>TLS VERIFIED</p>
                              <p className="text-gray-500 text-[10px] uppercase mt-1">Stamp ID</p>
                              <p className="font-mono font-bold text-xs">VS-XXXXXX</p>
                              <p className="text-gray-500 text-[10px] mt-1">Date: {new Date().toLocaleDateString()}</p>
                              {formData.show_advocate_name && <p className="text-[10px] mt-1">By: <span className="font-semibold" style={{ color: formData.brand_color }}>{user?.full_name}</span></p>}
                              {formData.include_signature && (
                                <div className="mt-1 h-8 rounded border border-dashed flex items-center justify-center" style={{ borderColor: `${formData.brand_color}40` }}>
                                  {savedSignature ? <img src={`data:image/png;base64,${savedSignature}`} alt="Sig" className="max-h-6" /> : <span className="text-gray-400 text-[10px]">Sign</span>}
                                </div>
                              )}
                            </div>
                            <div className="p-3 flex flex-col items-center justify-center" style={{ backgroundColor: formData.brand_color, width: '90px' }}>
                              {formData.show_tls_logo && <div className="bg-white rounded p-0.5 mb-1"><img src="/assets/tls-logo.png" alt="TLS" className="h-5" /></div>}
                              <QrCode className="w-12 h-12 text-white" />
                              <p className="text-white text-[10px] mt-1">Scan</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Settings Summary */}
                    <div className="mt-4 p-3 bg-white/5 rounded-xl text-xs">
                      <div className="grid grid-cols-3 gap-2">
                        <div><span className="text-white/40">Layout:</span> <span className="text-white">{getLayoutName(formData.layout)}</span></div>
                        <div><span className="text-white/40">Position:</span> <span className="text-white">{POSITION_PRESETS.find(p => p.id === formData.position_preset)?.name}</span></div>
                        <div><span className="text-white/40">Pages:</span> <span className="text-white">{PAGE_OPTIONS.find(p => p.id === formData.apply_to_pages)?.name.split(' ')[0]}</span></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog (for editing from templates list) */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg bg-[#0B1120] border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">
              Edit Template: {editingTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Quick edit form */}
            <div className="space-y-2">
              <Label className="text-white/70">Template Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/70">Document Type</Label>
                <Select 
                  value={formData.document_type} 
                  onValueChange={(v) => setFormData(f => ({ ...f, document_type: v }))}
                >
                  <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-white/10">
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id} className="text-white hover:bg-white/10">
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70">Stamp Type</Label>
                <Select 
                  value={formData.stamp_type} 
                  onValueChange={(v) => setFormData(f => ({ ...f, stamp_type: v }))}
                >
                  <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1120] border-white/10">
                    {STAMP_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id} className="text-white hover:bg-white/10">
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Brand Color */}
            <div className="space-y-2">
              <Label className="text-white/70">Stamp Color</Label>
              <div className="flex gap-2">
                {BRAND_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setFormData(f => ({ ...f, brand_color: color.color }))}
                    className={`w-8 h-8 rounded-lg transition-all ${
                      formData.brand_color === color.color ? "ring-2 ring-white ring-offset-2 ring-offset-[#0B1120]" : ""
                    }`}
                    style={{ backgroundColor: color.color }}
                  >
                    {formData.brand_color === color.color && (
                      <Check className="w-4 h-4 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Set as Default */}
            <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <div>
                <span className="text-white font-medium text-sm">Set as default</span>
              </div>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(v) => setFormData(f => ({ ...f, is_default: v }))}
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="ghost" 
              onClick={() => setShowDialog(false)}
              className="text-white/60 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation Modal */}
      <ConfirmationModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="Delete Template?"
        description="This template will be permanently deleted. This action cannot be undone."
        confirmText="Delete Template"
        variant="danger"
      />

      {/* Delete Signature Confirmation Modal */}
      <ConfirmationModal
        open={signatureDeleteConfirmOpen}
        onOpenChange={setSignatureDeleteConfirmOpen}
        onConfirm={confirmDeleteSignature}
        title="Delete Signature?"
        description="Your saved signature will be removed. You can upload a new one anytime."
        confirmText="Delete Signature"
        variant="warning"
      />
    </DashboardLayout>
  );
};

export default StampSettingsPage;
