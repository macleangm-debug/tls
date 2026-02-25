import { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SignatureCanvas from "react-signature-canvas";
import { DashboardLayout } from "./AdvocateDashboard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import { toast } from "sonner";
import { Rnd } from "react-rnd";
import * as pdfjsLib from "pdfjs-dist";
import { 
  Upload, FileText, QrCode, Download, Eye, CheckCircle2, Check,
  AlertTriangle, Lock, Shield, Fingerprint, Move, ZoomIn, ZoomOut,
  X, File, Image as ImageIcon, Loader2, Copy, Share2,
  DollarSign, TrendingUp, Calendar, Hash, Palette, User,
  FileCheck, Briefcase, Building, Globe, ChevronLeft, ChevronRight,
  RotateCcw, Maximize2, Minimize2, PenTool, Camera, Layers, 
  FileImage, Settings2, SlidersHorizontal, Trash2, WifiOff, Cloud
} from "lucide-react";
import { storeDocument, queueStampOperation, cacheStamp } from "../lib/offlineDB";
import { isOnline, syncAll } from "../lib/offlineSync";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// QR Code Pattern Preview Component (extracted to avoid unstable nested component)
const QRPatternPreview = ({ size = "w-10 h-10", onColoredBg = false }) => (
  <div className={`${size} relative`}>
    <div className={`absolute top-0 left-0 w-2 h-2 border-2 ${onColoredBg ? 'border-white bg-transparent' : 'border-gray-800 bg-white'}`}>
      <div className={`absolute top-0.5 left-0.5 w-0.5 h-0.5 ${onColoredBg ? 'bg-white' : 'bg-gray-800'}`} />
    </div>
    <div className={`absolute top-0 right-0 w-2 h-2 border-2 ${onColoredBg ? 'border-white bg-transparent' : 'border-gray-800 bg-white'}`}>
      <div className={`absolute top-0.5 right-0.5 w-0.5 h-0.5 ${onColoredBg ? 'bg-white' : 'bg-gray-800'}`} />
    </div>
    <div className={`absolute bottom-0 left-0 w-2 h-2 border-2 ${onColoredBg ? 'border-white bg-transparent' : 'border-gray-800 bg-white'}`}>
      <div className={`absolute bottom-0.5 left-0.5 w-0.5 h-0.5 ${onColoredBg ? 'bg-white' : 'bg-gray-800'}`} />
    </div>
    <div className="absolute inset-2.5 grid grid-cols-4 gap-px">
      {[1,0,1,1,0,1,0,1,1,1,0,0,0,1,1,0].map((v, i) => (
        <div key={i} className={v ? (onColoredBg ? 'bg-white' : 'bg-gray-800') : 'bg-transparent'} />
      ))}
    </div>
  </div>
);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DOCUMENT_TYPES = [
  { id: "contract", name: "Contract/Agreement", icon: FileCheck },
  { id: "affidavit", name: "Affidavit", icon: FileText },
  { id: "power_of_attorney", name: "Power of Attorney", icon: Briefcase },
  { id: "deed", name: "Deed/Title Document", icon: Building },
  { id: "court_filing", name: "Court Filing", icon: Globe },
  { id: "legal_opinion", name: "Legal Opinion", icon: FileText },
  { id: "witness_statement", name: "Witness Statement", icon: User },
  { id: "other", name: "Other Legal Document", icon: File }
];

const BRAND_COLORS = [
  { id: "emerald", name: "Emerald", color: "#10B981" },
  { id: "blue", name: "Blue", color: "#3B82F6" },
  { id: "purple", name: "Purple", color: "#8B5CF6" },
  { id: "gold", name: "Gold", color: "#F59E0B" },
  { id: "red", name: "Red", color: "#EF4444" },
  { id: "teal", name: "Teal", color: "#14B8A6" }
];

const STAMP_TYPES = [
  { id: "certification", name: "Certification", desc: "Requires signature - for certifying documents", color: "#10B981", requiresSignature: true },
  { id: "notarization", name: "Notarization", desc: "No signature required - for notarized documents", color: "#3B82F6", requiresSignature: false }
];

const DocumentStampPage = () => {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const previewContainerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Upload state
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // PDF state
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pageCanvasUrl, setPageCanvasUrl] = useState(null);
  const [pageDimensions, setPageDimensions] = useState({ width: 612, height: 792 });
  
  // Document metadata
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState("contract");
  
  // Stamp configuration
  const [selectedType, setSelectedType] = useState("certification");
  const [brandColor, setBrandColor] = useState("#10B981");
  const showAdvocateName = true; // Always show advocate name on stamp
  
  // Stamp positioning (using react-rnd) - Per-page positions
  const [stampSize, setStampSize] = useState({ width: 350, height: 310 }); // Large TLS stamp size
  const [stampPositions, setStampPositions] = useState({}); // {1: {x, y}, 2: {x, y}, ...} per page
  const [currentPage, setCurrentPage] = useState(1);
  const [previewScale, setPreviewScale] = useState(1);
  const [stampShape, setStampShape] = useState("rectangle"); // rectangle, circle, oval
  const [stampSizePercent, setStampSizePercent] = useState(100); // Size as percentage
  const [stampMargin, setStampMargin] = useState(20); // Margin from edge in preview pixels
  const [stampPositionPreset, setStampPositionPreset] = useState("bottom-right"); // Position preset
  
  // PDF.js render scale - stored when page is rendered
  // This is the actual scale used to convert PDF points to preview pixels
  const [pdfRenderScale, setPdfRenderScale] = useState(1.5);
  
  // FIXED stamp dimensions in PDF POINTS (not pixels)
  // These are constant - the stamp is always this size on the final PDF
  const STAMP_WIDTH_PT = 350;
  const STAMP_HEIGHT_PT = 310;
  
  // System edge margin in PDF points (prevents clipping, not user-controlled)
  const EDGE_MARGIN_PT = 12;
  
  // Result state
  const [stampResult, setStampResult] = useState(null);
  const [stamping, setStamping] = useState(false);
  
  // History state
  const [stamps, setStamps] = useState([]);
  const [loadingStamps, setLoadingStamps] = useState(true);
  const [activeTab, setActiveTab] = useState("stamp");
  const [selectedStamp, setSelectedStamp] = useState(null);

  // Template state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  // Stamp prices (from Super Admin settings)
  const [stampPrices, setStampPrices] = useState({
    certification: 5000,
    notarization: 7500,
    currency: "TZS"
  });

  // Signature state - for Certification stamps (Global Signature Storage)
  const [signatureMode, setSignatureMode] = useState("placeholder"); // "digital", "upload", or "placeholder"
  const [savedSignature, setSavedSignature] = useState(null); // Global saved signature from profile
  const [signatureSource, setSignatureSource] = useState(null); // "drawn" or "uploaded"
  const [stampLayout, setStampLayout] = useState("horizontal");
  const [stampOpacity, setStampOpacity] = useState(90);
  const [transparentBackground, setTransparentBackground] = useState(false); // Transparent stamp background

  // Signature canvas state
  const signatureCanvasRef = useRef(null);
  const [showSignatureDrawer, setShowSignatureDrawer] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);

  // Page selection state
  const [pageSelection, setPageSelection] = useState("first"); // first, all, last, custom
  const [customPages, setCustomPages] = useState("");
  
  // Camera capture state
  const cameraInputRef = useRef(null);
  const signatureUploadRef = useRef(null);
  
  // Local input state for responsive typing (used directly in input fields)
  const [localDescription, setLocalDescription] = useState("");
  const [localRecipientName, setLocalRecipientName] = useState("");
  const [localRecipientOrg, setLocalRecipientOrg] = useState("");

  // Stamp customization expanded state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Recipient type state
  const [recipientType, setRecipientType] = useState("individual"); // individual or organization

  // Backend-generated stamp preview (SINGLE SOURCE OF TRUTH)
  const [stampPreviewImage, setStampPreviewImage] = useState(null);
  const [loadingStampPreview, setLoadingStampPreview] = useState(false);

  // Fetch stamp preview from backend when stamp settings change
  const fetchStampPreview = useCallback(async () => {
    if (!user) return;
    
    setLoadingStampPreview(true);
    try {
      const stampTypeConfig = STAMP_TYPES.find(t => t.id === selectedType);
      // Show placeholder when:
      // 1. Stamp requires signature AND user hasn't selected digital mode, OR
      // 2. Stamp requires signature AND user selected digital mode but has no saved signature
      const hasDigitalSignature = signatureMode === 'digital' && savedSignature;
      const showPlaceholder = stampTypeConfig?.requiresSignature && !hasDigitalSignature;
      
      const response = await axios.post(`${API}/documents/stamp-preview`, {
        stamp_type: selectedType,
        brand_color: brandColor,
        advocate_name: user?.full_name || 'Advocate',
        show_advocate_name: showAdvocateName,
        layout: stampLayout,
        shape: stampShape,
        include_signature: hasDigitalSignature,
        show_signature_placeholder: showPlaceholder,
        width: stampSize.width,
        height: stampSize.height
      }, getAuthHeaders());
      
      setStampPreviewImage(response.data.preview_image);
    } catch (error) {
      console.error("Failed to fetch stamp preview:", error);
      setStampPreviewImage(null);
    } finally {
      setLoadingStampPreview(false);
    }
  }, [user, selectedType, brandColor, showAdvocateName, stampLayout, stampShape, signatureMode, savedSignature, stampSize.width, stampSize.height, getAuthHeaders]);

  // Debounced stamp preview fetch to avoid excessive API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStampPreview();
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [fetchStampPreview]);

  // Helper to get stamp position for current page (CENTER by default)
  const getStampPosition = (pageNum = currentPage) => {
    if (stampPositions[pageNum]) {
      return stampPositions[pageNum];
    }
    // Default to CENTER of page (positions are relative to page, not scaled container)
    const centerX = Math.max(10, (pageDimensions.width - stampSize.width) / 2);
    const centerY = Math.max(10, (pageDimensions.height - stampSize.height) / 2);
    return { x: centerX, y: centerY };
  };

  // Helper to set stamp position for current page
  const setStampPosition = (position, pageNum = currentPage) => {
    setStampPositions(prev => ({
      ...prev,
      [pageNum]: position
    }));
  };

  // Initialize stamp positions when pages change or file loads
  useEffect(() => {
    if (fileData?.pages && pageDimensions.width > 100) {
      const newPositions = {};
      const centerX = Math.max(10, (pageDimensions.width - stampSize.width) / 2);
      const centerY = Math.max(10, (pageDimensions.height - stampSize.height) / 2);
      
      for (let i = 1; i <= fileData.pages; i++) {
        // Keep existing position or use center
        newPositions[i] = stampPositions[i] || { x: centerX, y: centerY };
      }
      setStampPositions(newPositions);
    }
  }, [fileData?.pages, pageDimensions.width, pageDimensions.height, stampSize.width, stampSize.height]);

  // Set fixed stamp size based on shape (optimized for QR scanning)
  useEffect(() => {
    // These sizes should match the aspect ratios of backend-generated stamps
    // LARGE stamp sizes for professional documents - readable fonts when embedded in PDF
    // Backend generates at base width 500px * scale 2.0 = 1000px
    // Frontend preview at 1.5x scale, then converted back to PDF points
    const fixedSizes = {
      rectangle: { width: 350, height: 310 },   // Large TLS stamp matching template proportions
      circle: { width: 200, height: 200 },      // Large circle
      oval: { width: 280, height: 175 }         // Large oval
    };
    const size = fixedSizes[stampShape] || fixedSizes.rectangle;
    setStampSize(size);
  }, [stampShape]);

  useEffect(() => {
    fetchStamps();
    fetchTemplates();
    fetchStampPrices();
    fetchSavedSignature();
  }, []);

  // Fetch stamp prices from Super Admin settings
  const fetchStampPrices = async () => {
    try {
      const response = await axios.get(`${API}/settings/stamp-prices`);
      setStampPrices(response.data);
    } catch (error) {
      console.error("Failed to load stamp prices:", error);
    }
  };

  // Fetch advocate's saved signature
  const fetchSavedSignature = async () => {
    try {
      const response = await axios.get(`${API}/advocate/signature`, getAuthHeaders());
      if (response.data.signature_data) {
        setSavedSignature(response.data.signature_data);
        setSignatureSource(response.data.source || "unknown");
      }
    } catch (error) {
      console.error("Failed to load signature:", error);
    }
  };

  // Handle signature image upload
  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file (PNG or JPG)");
      return;
    }
    
    if (file.size > 500000) {
      toast.error("Signature image must be less than 500KB");
      return;
    }
    
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
      setSignatureSource("uploaded");
      setSignatureMode("digital");
      toast.success("Signature uploaded successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload signature");
    }
    
    // Reset file input
    if (signatureUploadRef.current) {
      signatureUploadRef.current.value = '';
    }
  };

  // Handle camera capture on mobile
  const handleCameraCapture = async (e) => {
    const capturedFile = e.target.files?.[0];
    if (!capturedFile) return;
    
    if (capturedFile.size > 10 * 1024 * 1024) {
      toast.error("Photo size must be less than 10MB");
      return;
    }
    
    // Create a new file with proper naming
    const photoFile = new File([capturedFile], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    
    setFile(photoFile);
    setDocumentName(`Document Photo ${new Date().toLocaleDateString()}`);
    setUploading(true);
    setCurrentPage(1);
    setPdfDoc(null);
    setPageCanvasUrl(null);
    
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      
      const response = await axios.post(`${API}/documents/upload`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFileData(response.data);
      
      // Load the returned PDF with PDF.js
      try {
        const pdfData = atob(response.data.document_data);
        const pdfArray = new Uint8Array(pdfData.length);
        for (let i = 0; i < pdfData.length; i++) {
          pdfArray[i] = pdfData.charCodeAt(i);
        }
        
        const pdf = await pdfjsLib.getDocument({ data: pdfArray }).promise;
        setPdfDoc(pdf);
        toast.success(`Photo captured and converted to PDF!`);
      } catch (pdfError) {
        console.error("PDF.js error:", pdfError);
        toast.error("Failed to load PDF preview");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to process photo");
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  // Parse custom page selection
  const parseCustomPages = useCallback((input, totalPages) => {
    if (!input || !totalPages) return [1];
    
    const pages = new Set();
    const parts = input.split(',');
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
        for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
          pages.add(i);
        }
      } else {
        const num = parseInt(trimmed);
        if (num >= 1 && num <= totalPages) {
          pages.add(num);
        }
      }
    }
    
    return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : [1];
  }, []);

  // Get pages to stamp based on selection
  const getPagesToStamp = useCallback(() => {
    if (!fileData?.pages) return [1];
    
    switch (pageSelection) {
      case "first":
        return [1];
      case "last":
        return [fileData.pages];
      case "all":
        return Array.from({ length: fileData.pages }, (_, i) => i + 1);
      case "custom":
        return parseCustomPages(customPages, fileData.pages);
      default:
        return [1];
    }
  }, [pageSelection, customPages, fileData?.pages, parseCustomPages]);

  // Fetch saved templates
  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/stamp-templates`, getAuthHeaders());
      setTemplates(response.data);
      
      if (response.data.length === 0) {
        // No templates - save current document state and redirect to create
        if (fileData) {
          sessionStorage.setItem('pendingDocument', JSON.stringify({
            fileName: file?.name,
            documentName: documentName
          }));
        }
        toast.info("Please create a stamp template first");
        navigate('/stamp-settings?returnTo=stamp-document&createNew=true');
        return;
      }
      
      // Auto-apply default template or first template
      const defaultTemplate = response.data.find(t => t.is_default) || response.data[0];
      if (defaultTemplate) {
        applyTemplate(defaultTemplate, true); // silent = true, no toast
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Apply template settings - Load ALL template properties accurately
  const applyTemplate = (template, silent = false) => {
    setSelectedTemplate(template);
    // Set the stamp shape from template
    if (template.shape) {
      setStampShape(template.shape);
    }
    setDocumentType(template.document_type || documentType);
    
    // Normalize stamp_type: map 'official'/'commissioner'/'notary' to 'certification'/'notarization'
    // Default to 'certification' for most stamp types (requires signature)
    const templateStampType = template.stamp_type || selectedType;
    const normalizedType = (templateStampType === 'notarization' || templateStampType === 'notary') 
      ? 'notarization' 
      : 'certification';
    setSelectedType(normalizedType);
    
    setBrandColor(template.brand_color || "#10B981");
    // showAdvocateName is always true (not configurable) - TLS requirement
    // TLS logo is always shown - no toggle needed
    
    // Signature settings
    if (template.signature_mode) {
      setSignatureMode(template.signature_mode);
    }
    if (template.signature_data) {
      setSavedSignature(template.signature_data);
    }
    
    // Layout settings (important for rectangle stamps)
    if (template.layout) {
      setStampLayout(template.layout);
    }
    
    // Opacity settings
    if (template.opacity !== undefined) {
      setStampOpacity(template.opacity);
    }
    
    // Transparent background setting
    if (template.transparent_background !== undefined) {
      setTransparentBackground(template.transparent_background);
    }
    
    // Recipient defaults - only set local state now
    if (template.default_recipient_name) {
      setLocalRecipientName(template.default_recipient_name);
    }
    if (template.default_recipient_org) {
      setLocalRecipientOrg(template.default_recipient_org);
    }
    
    // Stamp size is now fixed based on shape - ignore template stamp_size
    // The sizes are optimized for professional document stamps with readable fonts
    // Backend generates at base width 500px * scale 2.0 = 1000px
    const fixedSizes = {
      rectangle: { width: 350, height: 310 },
      circle: { width: 200, height: 200 },
      oval: { width: 280, height: 175 }
    };
    const currentShape = template.shape || stampShape;
    setStampSize(fixedSizes[currentShape] || fixedSizes.rectangle);
    
    // Apply default position from template
    if (template.default_position) {
      setStampPosition({ x: template.default_position.x || 50, y: template.default_position.y || 50 });
    }
    
    if (!silent) {
      toast.success(`Template "${template.name}" applied`);
    }
  };

  // Signature Management Functions
  const clearSignatureCanvas = () => {
    if (signatureCanvasRef.current) {
      signatureCanvasRef.current.clear();
    }
  };

  const saveDrawnSignature = async () => {
    if (!signatureCanvasRef.current || signatureCanvasRef.current.isEmpty()) {
      toast.error("Please draw your signature first");
      return;
    }
    
    setSavingSignature(true);
    try {
      // Get signature as data URL
      const dataUrl = signatureCanvasRef.current.toDataURL('image/png');
      
      // Save to backend
      const blob = await fetch(dataUrl).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', blob, 'signature.png');
      
      const response = await axios.post(`${API}/advocate/signature`, formData, {
        headers: { ...getAuthHeaders().headers, 'Content-Type': 'multipart/form-data' }
      });
      
      setSavedSignature(response.data.signature_data);
      setSignatureSource("drawn");
      setSignatureMode("digital");
      setShowSignatureDrawer(false);
      clearSignatureCanvas();
      toast.success("Signature saved successfully!");
    } catch (error) {
      toast.error("Failed to save signature");
    } finally {
      setSavingSignature(false);
    }
  };

  const deleteSignature = async () => {
    try {
      await axios.delete(`${API}/advocate/signature`, getAuthHeaders());
      setSavedSignature(null);
      setSignatureSource(null);
      setSignatureMode("placeholder");
      toast.success("Signature deleted");
    } catch (error) {
      toast.error("Failed to delete signature");
    }
  };

  // Page cache for fast navigation
  const [pageCache, setPageCache] = useState({});
  const [pageChanging, setPageChanging] = useState(false);
  
  // Render PDF page when page changes or PDF loads
  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPdfPage(currentPage);
    }
  }, [pdfDoc, currentPage]);

  const renderPdfPage = async (pageNum) => {
    if (!pdfDoc) return;
    
    // Check cache first
    if (pageCache[pageNum]) {
      setPageCanvasUrl(pageCache[pageNum].imageUrl);
      setPageDimensions(pageCache[pageNum].dimensions);
      
      // Initialize stamp position at CENTER if not already set for this page
      if (!stampPositions[pageNum]) {
        const { width, height } = pageCache[pageNum].dimensions;
        const centerX = (width - stampSize.width) / 2;
        const centerY = (height - stampSize.height) / 2;
        setStampPosition({ x: centerX, y: centerY }, pageNum);
      }
      return;
    }
    
    setPdfRendering(true);
    try {
      const page = await pdfDoc.getPage(pageNum);
      const scale = 1.5; // Render at higher resolution for clarity
      const viewport = page.getViewport({ scale });
      
      // Create off-screen canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert to image URL
      const imageUrl = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG for faster processing
      const dimensions = { width: viewport.width, height: viewport.height };
      
      // Cache this page
      setPageCache(prev => ({
        ...prev,
        [pageNum]: { imageUrl, dimensions }
      }));
      
      setPageCanvasUrl(imageUrl);
      setPageDimensions(dimensions);
      
      // Initialize stamp position at CENTER if not already set for this page
      if (!stampPositions[pageNum]) {
        const centerX = (viewport.width - stampSize.width) / 2;
        const centerY = (viewport.height - stampSize.height) / 2;
        setStampPosition({ x: centerX, y: centerY }, pageNum);
      }
      
      // Pre-cache adjacent pages in background
      if (pageNum > 1 && !pageCache[pageNum - 1]) {
        setTimeout(() => preCachePage(pageNum - 1), 100);
      }
      if (pageNum < fileData?.pages && !pageCache[pageNum + 1]) {
        setTimeout(() => preCachePage(pageNum + 1), 100);
      }
    } catch (error) {
      console.error("Error rendering PDF page:", error);
      toast.error("Failed to render PDF page");
    } finally {
      setPdfRendering(false);
    }
  };
  
  // Pre-cache a page in the background
  const preCachePage = async (pageNum) => {
    if (!pdfDoc || pageCache[pageNum]) return;
    
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      
      const imageUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPageCache(prev => ({
        ...prev,
        [pageNum]: { imageUrl, dimensions: { width: viewport.width, height: viewport.height } }
      }));
    } catch (error) {
      // Silent fail for pre-cache
    }
  };
  
  // Fast page navigation handlers
  const handlePrevPage = () => {
    if (currentPage > 1 && !pageChanging) {
      setPageChanging(true);
      setCurrentPage(p => p - 1);
      setTimeout(() => setPageChanging(false), 50);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < fileData?.pages && !pageChanging) {
      setPageChanging(true);
      setCurrentPage(p => p + 1);
      setTimeout(() => setPageChanging(false), 50);
    }
  };

  const fetchStamps = async () => {
    try {
      const response = await axios.get(`${API}/documents/stamps`, getAuthHeaders());
      setStamps(response.data);
    } catch (error) {
      console.error("Failed to load stamps:", error);
    } finally {
      setLoadingStamps(false);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = [
      'application/pdf', 
      'image/png', 
      'image/jpeg', 
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // DOCX
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Unsupported file type. Please upload PDF, DOCX, PNG, or JPG.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setDocumentName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    setUploading(true);
    setCurrentPage(1);
    setPdfDoc(null);
    setPageCanvasUrl(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API}/documents/upload`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      setFileData(response.data);
      
      // All files are now converted to PDF on the server
      // Load the returned PDF with PDF.js
      try {
        const pdfData = atob(response.data.document_data);
        const pdfArray = new Uint8Array(pdfData.length);
        for (let i = 0; i < pdfData.length; i++) {
          pdfArray[i] = pdfData.charCodeAt(i);
        }
        
        const pdf = await pdfjsLib.getDocument({ data: pdfArray }).promise;
        setPdfDoc(pdf);
        
        const message = response.data.converted 
          ? `Converted to PDF! ${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''} ready.`
          : `PDF loaded! ${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''} detected.`;
        toast.success(message);
      } catch (pdfError) {
        console.error("PDF.js error:", pdfError);
        toast.error("Failed to load PDF preview");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload document");
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleStampDocument = async () => {
    // Comprehensive validation with clear feedback
    const missingFields = [];
    
    if (!file || !fileData) {
      missingFields.push("Document (please upload a document first)");
    }
    
    if (!documentName.trim()) {
      missingFields.push("Document Name");
    }
    
    if (!localRecipientName.trim()) {
      missingFields.push("Recipient Name");
    }
    
    // Check if signature is required but not provided
    const stampType = STAMP_TYPES.find(t => t.id === selectedType);
    if (stampType?.requiresSignature && signatureMode === 'digital' && !savedSignature) {
      missingFields.push("Digital Signature (please upload or draw your signature in My Profile)");
    }
    
    if (missingFields.length > 0) {
      toast.error(
        <div>
          <strong>Please fill in the following required fields:</strong>
          <ul className="mt-2 list-disc list-inside">
            {missingFields.map((field, i) => (
              <li key={i}>{field}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    setStamping(true);

    // Check if online
    const online = isOnline();
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('stamp_type', selectedType);
      
      // Handle page selection for multi-page stamping with per-page positions
      const pagesToStamp = getPagesToStamp();
      
      // PDF rendering scale used in renderPage function
      const pdfRenderScale = 1.5;
      
      // Convert stampMargin from preview pixels to PDF points
      const marginPt = Math.round(stampMargin / pdfRenderScale);
      
      // Get page dimensions in PDF points
      const pageWidthPt = Math.round(pageDimensions.width / pdfRenderScale);
      const pageHeightPt = Math.round(pageDimensions.height / pdfRenderScale);
      
      // Build positions per page - convert from preview pixels to PDF points
      // Apply margin clamping to ensure stamp stays in safe area
      const pagePositions = {};
      pagesToStamp.forEach(pageNum => {
        const pos = getStampPosition(pageNum);
        // Convert from scaled pixels to PDF points
        let pdfX = Math.round(pos.x / pdfRenderScale);
        let pdfY = Math.round(pos.y / pdfRenderScale);
        
        // Apply margin clamping - ensure stamp stays within safe area
        // Safe area = margin from each edge
        const maxX = pageWidthPt - marginPt - stampSize.width;
        const maxY = pageHeightPt - marginPt - stampSize.height;
        
        pdfX = Math.max(marginPt, Math.min(pdfX, maxX));
        pdfY = Math.max(marginPt, Math.min(pdfY, maxY));
        
        console.log(`=== DEBUG POSITION START ===`);
        console.log(`Page ${pageNum}`);
        console.log(`  - Page size (pt): ${pageWidthPt}x${pageHeightPt}`);
        console.log(`  - Stamp size (pt): ${stampSize.width}x${stampSize.height}`);
        console.log(`  - Margin (pt): ${marginPt}`);
        console.log(`  - Safe area: x=[${marginPt}, ${maxX}], y=[${marginPt}, ${maxY}]`);
        console.log(`  - Raw position (pt): (${Math.round(pos.x / pdfRenderScale)}, ${Math.round(pos.y / pdfRenderScale)})`);
        console.log(`  - Clamped position (pt): (${pdfX}, ${pdfY})`);
        console.log(`=== DEBUG POSITION END ===`);
        pagePositions[pageNum] = { x: pdfX, y: pdfY };
      });
      
      const stampPosition = {
        page: pagesToStamp[0], // Primary page
        pages: pagesToStamp, // All pages to stamp
        positions: pagePositions, // Per-page positions in PDF points (already clamped)
        width: stampSize.width,
        height: stampSize.height,
        margin: marginPt, // Send margin to backend for verification
        frontendPageWidth: pageWidthPt,
        frontendPageHeight: pageHeightPt
      };
      
      formData.append('stamp_position', JSON.stringify(stampPosition));
      formData.append('document_name', documentName || file.name);
      formData.append('document_type', documentType);
      formData.append('description', localDescription);
      formData.append('recipient_name', localRecipientName);
      formData.append('recipient_org', localRecipientOrg);
      formData.append('brand_color', brandColor);
      formData.append('show_advocate_name', showAdvocateName.toString());
      formData.append('show_tls_logo', 'true'); // Always show TLS logo
      formData.append('layout', stampLayout);
      formData.append('shape', stampShape);
      
      // For Certification stamps, include signature based on signatureMode
      // For Notarization stamps, never include signature
      const stampTypeConfig = STAMP_TYPES.find(t => t.id === selectedType);
      const includeSignature = stampTypeConfig?.requiresSignature && signatureMode === 'digital' && savedSignature;
      // Show placeholder when: stamp requires signature AND (user chose placeholder mode OR no digital signature to include)
      const showSignaturePlaceholder = stampTypeConfig?.requiresSignature && !includeSignature;
      
      // DEBUG: Log signature settings
      console.log(`DEBUG SIGNATURE: selectedType=${selectedType}, signatureMode=${signatureMode}`);
      console.log(`DEBUG SIGNATURE: requiresSignature=${stampTypeConfig?.requiresSignature}, includeSignature=${includeSignature}, showPlaceholder=${showSignaturePlaceholder}`);
      
      formData.append('include_signature', includeSignature.toString());
      formData.append('show_signature_placeholder', showSignaturePlaceholder.toString());
      
      // Include the saved signature data if digital signature is selected
      if (includeSignature && savedSignature) {
        formData.append('signature_data', savedSignature);
      }
      
      formData.append('stamp_size', '100'); // Fixed size - optimized for QR scanning
      formData.append('opacity', '100'); // Always full opacity
      formData.append('transparent_background', 'true'); // Always transparent with white behind content

      // If offline, queue the operation for later sync
      if (!online) {
        // Store the document in IndexedDB
        const storedDoc = await storeDocument(file, {
          document_name: documentName || file.name,
          document_type: documentType
        });
        
        // Queue the stamp operation
        await queueStampOperation({
          document_id: storedDoc.id,
          document_name: documentName || file.name,
          document_type: documentType,
          description: localDescription,
          recipient_name: localRecipientName,
          recipient_org: localRecipientOrg,
          stamp_shape: stampShape,
          stamp_type: selectedType,
          stamp_layout: stampLayout,
          brand_color: brandColor,
          include_signature: includeSignature.toString(),
          show_signature_placeholder: showSignaturePlaceholder.toString(),
          signature_data: includeSignature ? savedSignature : null,
          pages_to_stamp: pagesToStamp.join(','),
          positions: pagePositions,
          page_dimensions: {
            width: Math.round(pageDimensions.width / pdfRenderScale),
            height: Math.round(pageDimensions.height / pdfRenderScale)
          }
        });
        
        toast.info(
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Document queued for stamping when online</span>
          </div>,
          { duration: 4000 }
        );
        
        setStamping(false);
        return;
      }

      const response = await axios.post(`${API}/documents/stamp`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data'
        }
      });

      setStampResult(response.data);
      fetchStamps();
      
      // Cache the stamp for offline verification
      if (response.data.stamp_id) {
        await cacheStamp({
          stamp_id: response.data.stamp_id,
          document_name: documentName || file.name,
          document_type: documentType,
          valid: true,
          advocate_name: user?.full_name,
          created_at: new Date().toISOString()
        });
      }
      
      const pageMsg = pagesToStamp.length > 1 ? ` on ${pagesToStamp.length} pages` : '';
      toast.success(`Document stamped successfully${pageMsg}!`);
      
      // Auto-download on desktop
      if (!isMobile()) {
        setTimeout(() => {
          autoDownloadStampedDocument(response.data);
        }, 500);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to stamp document");
    } finally {
      setStamping(false);
    }
  };

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const autoDownloadStampedDocument = (result) => {
    if (!result || !result.stamped_document) return;

    try {
      // Convert base64 to blob for better browser compatibility with large files
      const byteCharacters = atob(result.stamped_document);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const contentType = result.content_type || 'application/pdf';
      const blob = new Blob([byteArray], { type: contentType });
      
      // Create blob URL and download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `TLS_Verified_${result.document_name || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL after download
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const downloadStampedDocument = () => {
    if (!stampResult || !stampResult.stamped_document) {
      toast.error("No document available to download");
      return;
    }

    try {
      // Convert base64 to blob for better browser compatibility
      const byteCharacters = atob(stampResult.stamped_document);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const contentType = stampResult.content_type || 'application/pdf';
      const blob = new Blob([byteArray], { type: contentType });
      
      // Create blob URL and download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `TLS_Verified_${stampResult.document_name || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast.success("Stamped document downloaded");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const shareDocument = async () => {
    if (!stampResult) return;

    // Convert base64 to blob
    const byteCharacters = atob(stampResult.stamped_document);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const file = new File([blob], `TLS_Verified_${stampResult.document_name || 'document'}.pdf`, { type: 'application/pdf' });

    // Check if Web Share API is available
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'TLS Verified Document',
          text: `Verified document: ${stampResult.document_name}\nStamp ID: ${stampResult.stamp_id}\nVerify at: ${window.location.origin}/verify/${stampResult.stamp_id}`,
          files: [file]
        });
        toast.success("Document shared successfully!");
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          // Fallback to download
          downloadStampedDocument();
        }
      }
    } else if (navigator.share) {
      // Share without file (text only)
      try {
        await navigator.share({
          title: 'TLS Verified Document',
          text: `Verified document: ${stampResult.document_name}\nStamp ID: ${stampResult.stamp_id}`,
          url: `${window.location.origin}/verify/${stampResult.stamp_id}`
        });
        toast.success("Link shared! Don't forget to attach the downloaded document.");
        downloadStampedDocument();
      } catch (error) {
        if (error.name !== 'AbortError') {
          downloadStampedDocument();
        }
      }
    } else {
      // Fallback for desktop - just download
      downloadStampedDocument();
    }
  };

  const downloadQRCode = (stamp = stampResult) => {
    if (!stamp) return;

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${stamp.qr_code_data}`;
    link.download = `TLS-QR-${stamp.stamp_id}.png`;
    link.click();
    toast.success("QR code downloaded");
  };

  const copyVerificationLink = (stampId) => {
    const url = `${window.location.origin}/verify/${stampId}`;
    navigator.clipboard.writeText(url);
    toast.success("Verification link copied!");
  };

  const resetForm = () => {
    setFile(null);
    setFileData(null);
    setStampResult(null);
    setDocumentName("");
    setDocumentType("contract");
    setLocalDescription("");
    setLocalRecipientName("");
    setLocalRecipientOrg("");
    setStampPosition({ x: 50, y: 50 });
    // Reset to default large stamp size for professional documents
    setStampSize({ width: 350, height: 310 });
    setCurrentPage(1);
    setPdfDoc(null);
    setPageCanvasUrl(null);
    setPageDimensions({ width: 612, height: 792 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "expired": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "revoked": return "bg-red-500/20 text-red-500 border-red-500/30";
      default: return "bg-white/10 text-white/60";
    }
  };

  const selectedStampType = STAMP_TYPES.find(t => t.id === selectedType);

  return (
    <DashboardLayout title="Document Verification" subtitle="Upload, stamp, and secure your legal documents">
      {/* STAMP DOCUMENT - Single view, no tabs */}
      <div className="space-y-6">
        {/* STICKY SECTION: Stamp Preview + Color Picker - sticks below the dashboard header */}
        <div className="sticky top-16 z-40 -mx-6 lg:-mx-8 px-6 lg:px-8 pt-4 pb-4 bg-[#0a0f1a] border-b border-white/10">
          {/* Stamp Style - Simplified to show only the TLS Verified stamp */}
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {/* Stamp Preview - Uses backend-generated image for pixel-perfect accuracy */}
            <div className="flex flex-col items-center gap-2">
              <div 
                className="w-24 h-16 md:w-28 md:h-[72px] rounded-lg border-2 overflow-hidden shadow-lg flex items-center justify-center"
                style={{ borderColor: brandColor, backgroundColor: '#fff' }}
              >
                {loadingStampPreview ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: brandColor }} />
                ) : stampPreviewImage ? (
                  <img 
                    src={stampPreviewImage} 
                    alt="TLS Verified Stamp"
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <span className="text-[7px] md:text-[8px] font-bold" style={{ color: brandColor }}>TLS VERIFIED</span>
                )}
              </div>
              <span className="text-xs text-emerald-400 font-medium">TLS Verified Stamp</span>
            </div>
            
            {/* Divider */}
            <div className="h-16 w-px bg-white/10" />
            
            {/* Customization Options */}
            <div className="flex flex-col gap-3">
              {/* Color Picker */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/60">Color:</label>
                <div className="flex gap-2">
                  {["#10B981", "#3B82F6", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setBrandColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        brandColor === color ? "border-white scale-110" : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      data-testid={`color-${color}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer"
                    title="Custom color"
                  />
                </div>
              </div>
              
              {/* Margin Control - Safe area from page edges */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-white/60" title="Minimum distance from page edges">
                  Safe Margin:
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={stampMargin}
                  onChange={(e) => setStampMargin(parseInt(e.target.value))}
                  className="w-24 accent-emerald-500"
                />
                <span className="text-xs text-white/40">{Math.round(stampMargin / 1.5)}pt</span>
              </div>
            </div>
          </div>

            {/* Progress Bar - STICKY with shape selector */}
            <div className="pt-4">
              <div className="flex items-center justify-center gap-3 max-w-2xl mx-auto">
                {[
                  { step: 1, label: "Document", complete: !!file },
                  { step: 2, label: "Position", complete: !!file && Object.keys(stampPositions).length > 0 },
                  { step: 3, label: "Details", complete: !!localRecipientName || !!localRecipientOrg },
                  { step: 4, label: "Generate", complete: !!stampResult }
                ].map((item, idx) => (
                  <div key={item.step} className="flex items-center">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      item.complete 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-white/5 text-white/40"
                    }`}>
                      {item.complete ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                          {item.step}
                        </span>
                      )}
                      {item.label}
                    </div>
                    {idx < 3 && (
                      <div className={`w-8 h-0.5 mx-1 ${item.complete ? "bg-emerald-500/50" : "bg-white/10"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security Banner */}
          <Card className="glass-card rounded-2xl border-emerald-500/20">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">Tamper-Proof Digital Stamps</h3>
                  <p className="text-sm text-white/50">
                    Each stamp contains a <span className="text-emerald-400 font-medium">SHA-256 cryptographic hash</span> and 
                    unique QR code. Any modification to the document will invalidate the verification. 
                    <span className="text-white/30 ml-1">Documents are never stored on our servers.</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Document Preview (3 cols) - Order 2 on desktop to appear on right */}
            <div className="lg:col-span-3 lg:order-2">
              <div className="lg:sticky lg:top-[200px] space-y-4">
              {!fileData ? (
                <Card 
                  className="glass-card rounded-2xl border-dashed border-2 border-white/20 hover:border-emerald-500/50 transition-colors cursor-pointer"
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  <CardContent className="p-8">
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mb-6 hover:scale-105 transition-transform">
                        <Upload className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="font-heading text-xl text-white mb-2">
                        {uploading ? "Processing document..." : "Click to upload document"}
                      </h3>
                      <p className="text-white/50 text-center mb-5">
                        {uploading ? "Converting to PDF for preview" : "Or drag and drop your file here"}
                      </p>
                      
                      {uploading && (
                        <div className="mb-5">
                          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                          <p className="text-emerald-400 text-sm mt-2">Please wait...</p>
                        </div>
                      )}
                      
                      {!uploading && (
                        <>
                          {/* Accepted file types */}
                          <div className="flex flex-wrap justify-center gap-2 mb-5">
                            <span className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                              PDF
                            </span>
                            <span className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30">
                              DOCX
                            </span>
                            <span className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/30">
                              PNG
                            </span>
                            <span className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium border border-yellow-500/30">
                              JPG
                            </span>
                          </div>
                          
                          <p className="text-white/30 text-xs mb-5">Max file size: 10MB • All files converted to PDF</p>
                        </>
                      )}
                      
                      {/* Hidden file inputs */}
                      <input
                        ref={fileInputRef}
                        id="document-upload"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="document-upload-input"
                      />
                      <input
                        ref={cameraInputRef}
                        id="camera-capture"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleCameraCapture}
                        className="hidden"
                        data-testid="camera-capture-input"
                      />
                      
                      {!uploading && (
                        <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-emerald-500 hover:bg-emerald-600 rounded-xl h-11 px-6" 
                            data-testid="upload-btn"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Browse Files
                          </Button>
                          
                          {/* Camera button */}
                          <Button 
                            onClick={() => cameraInputRef.current?.click()}
                            variant="outline"
                            className="rounded-xl h-11 px-6 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                            data-testid="camera-btn"
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Take Photo</span>
                            <span className="sm:hidden">Camera</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass-card rounded-2xl overflow-hidden">
                  {/* Horizontal Progress Checklist - Fixed at top */}
                  <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 px-4 py-3 border-b border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      {/* Step 1: Document */}
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          file ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'
                        }`}>
                          {file ? '✓' : '1'}
                        </div>
                        <span className={`text-xs font-medium ${file ? 'text-emerald-400' : 'text-white/40'}`}>
                          Document
                        </span>
                      </div>
                      
                      <div className={`h-0.5 flex-1 max-w-[40px] ${file ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      
                      {/* Step 2: Position */}
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          file && Object.keys(stampPositions).length > 0 ? 'bg-emerald-500 text-white' : file ? 'bg-amber-500 text-white animate-pulse' : 'bg-white/10 text-white/40'
                        }`}>
                          {file && Object.keys(stampPositions).length > 0 ? '✓' : '2'}
                        </div>
                        <span className={`text-xs font-medium ${
                          file && Object.keys(stampPositions).length > 0 ? 'text-emerald-400' : file ? 'text-amber-400' : 'text-white/40'
                        }`}>
                          Position
                        </span>
                      </div>
                      
                      <div className={`h-0.5 flex-1 max-w-[40px] ${Object.keys(stampPositions).length > 0 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      
                      {/* Step 3: Details */}
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          localRecipientName ? 'bg-emerald-500 text-white' : Object.keys(stampPositions).length > 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-white/10 text-white/40'
                        }`}>
                          {localRecipientName ? '✓' : '3'}
                        </div>
                        <span className={`text-xs font-medium ${
                          localRecipientName ? 'text-emerald-400' : Object.keys(stampPositions).length > 0 ? 'text-amber-400' : 'text-white/40'
                        }`}>
                          Details
                        </span>
                      </div>
                      
                      <div className={`h-0.5 flex-1 max-w-[40px] ${localRecipientName ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      
                      {/* Step 4: Generate */}
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          stampResult ? 'bg-emerald-500 text-white' : localRecipientName ? 'bg-amber-500 text-white animate-pulse' : 'bg-white/10 text-white/40'
                        }`}>
                          {stampResult ? '✓' : '4'}
                        </div>
                        <span className={`text-xs font-medium ${
                          stampResult ? 'text-emerald-400' : localRecipientName ? 'text-amber-400' : 'text-white/40'
                        }`}>
                          Generate
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <CardHeader className="border-b border-white/10 pb-4 sticky top-0 z-20 bg-[#0f1729]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium truncate max-w-[250px]">{file?.name}</p>
                          <p className="text-white/40 text-xs">
                            {fileData?.pages} page{fileData?.pages > 1 ? 's' : ''} • PDF Preview
                            {fileData?.converted && <span className="text-emerald-400 ml-2">• Converted</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {fileData?.pages > 1 && (
                          <div className="flex items-center gap-1 mr-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handlePrevPage}
                              disabled={currentPage === 1 || pageChanging}
                              className="text-white/50 hover:text-white"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-white/60 text-sm px-2">
                              {pageChanging ? '...' : currentPage} / {fileData.pages}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleNextPage}
                              disabled={currentPage === fileData.pages || pageChanging}
                              className="text-white/50 hover:text-white"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setPreviewScale(s => Math.min(1.5, s + 0.1))}
                          className="text-white/50 hover:text-white"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setPreviewScale(s => Math.max(0.5, s - 0.1))}
                          className="text-white/50 hover:text-white"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={resetForm}
                          className="text-white/50 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Document Preview with Draggable Stamp */}
                    <div 
                      ref={previewContainerRef}
                      className="relative bg-gray-800 flex items-center justify-center overflow-auto"
                      style={{ 
                        // Dynamic height based on PDF dimensions (scaled), clamped between 400-600px
                        height: pageCanvasUrl 
                          ? `${Math.min(600, Math.max(400, pageDimensions.height * previewScale))}px`
                          : '500px',
                        minHeight: '400px',
                        maxHeight: '600px'
                      }}
                    >
                      <div 
                        className="relative"
                        style={{ 
                          transform: `scale(${previewScale})`, 
                          transformOrigin: 'center center',
                          maxWidth: '100%'
                        }}
                      >
                        {/* PDF Preview - Now all documents are converted to PDF */}
                        {pageCanvasUrl ? (
                          <div 
                            className="bg-white relative shadow-2xl mx-auto"
                            style={{ 
                              width: pageDimensions.width,
                              height: pageDimensions.height,
                              maxWidth: '100%'
                            }}
                          >
                            <img 
                              src={pageCanvasUrl}
                              alt={`Page ${currentPage}`}
                              className="w-full h-full object-contain"
                            />
                            {/* Draggable & Resizable Stamp - INSIDE document */}
                            {(() => {
                              // Calculate if signature should be shown below stamp
                              const stampTypeConfig = STAMP_TYPES.find(t => t.id === selectedType);
                              const showSignatureBelow = stampTypeConfig?.requiresSignature;
                              const signatureAreaHeight = showSignatureBelow ? 30 : 0; // Height for signature preview below
                              
                              // Calculate margin bounds in preview pixels (scaled)
                              // The pdfRenderScale is 1.5, so margin in preview = margin * pdfRenderScale / previewScale
                              // But since we're already in the scaled coordinate space, just use stampMargin directly
                              const marginPx = stampMargin; // Margin is already in preview pixels
                              const maxX = pageDimensions.width - stampSize.width - marginPx;
                              const maxY = pageDimensions.height - (stampSize.height + signatureAreaHeight) - marginPx;
                              
                              return (
                                <Rnd
                                  size={{ 
                                    width: stampSize.width, 
                                    height: stampSize.height + signatureAreaHeight 
                                  }}
                                  position={getStampPosition()}
                                  onDragStop={(e, d) => {
                                    // Clamp position to margin bounds
                                    const clampedX = Math.max(marginPx, Math.min(d.x, maxX));
                                    const clampedY = Math.max(marginPx, Math.min(d.y, maxY));
                                    setStampPosition({ x: clampedX, y: clampedY });
                                  }}
                                  onResizeStop={(e, direction, ref, delta, position) => {
                                    setStampSize({
                                      width: parseInt(ref.style.width),
                                      height: parseInt(ref.style.height) - signatureAreaHeight
                                    });
                                    // Clamp after resize
                                    const newMaxX = pageDimensions.width - parseInt(ref.style.width) - marginPx;
                                    const newMaxY = pageDimensions.height - parseInt(ref.style.height) - marginPx;
                                    const clampedX = Math.max(marginPx, Math.min(position.x, newMaxX));
                                    const clampedY = Math.max(marginPx, Math.min(position.y, newMaxY));
                                    setStampPosition({ x: clampedX, y: clampedY });
                                  }}
                                  minWidth={80}
                                  minHeight={60}
                                  maxWidth={400}
                                  maxHeight={400}
                                  bounds="parent"
                                  enableResizing={false}
                                  className="z-10"
                                  dragHandleClassName="stamp-drag-handle"
                                >
                                  <div className="flex flex-col cursor-move stamp-drag-handle" style={{ touchAction: 'none' }}>
                                    {/* Backend-Generated Stamp Preview - SINGLE SOURCE OF TRUTH */}
                                    {/* This image is generated by the same engine that creates the final PDF stamp */}
                                    <div 
                                      className="cursor-move overflow-visible stamp-drag-handle"
                                      style={{ 
                                        width: stampSize.width,
                                        height: stampSize.height,
                                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                                        willChange: 'transform'
                                      }}
                                      data-testid="stamp-preview"
                                    >
                                      {loadingStampPreview ? (
                                        <div 
                                          className="w-full h-full flex items-center justify-center rounded-lg"
                                          style={{ backgroundColor: `${brandColor}20`, border: `2px dashed ${brandColor}` }}
                                        >
                                          <Loader2 className="w-6 h-6 animate-spin" style={{ color: brandColor }} />
                                        </div>
                                      ) : stampPreviewImage ? (
                                        <img 
                                          src={stampPreviewImage} 
                                          alt="TLS Verified Stamp Preview"
                                          className="w-full h-full object-contain"
                                          style={{ imageRendering: 'crisp-edges' }}
                                          draggable={false}
                                        />
                                      ) : (
                                        /* Fallback if preview fails to load */
                                        <div 
                                          className="w-full h-full flex flex-col items-center justify-center rounded-lg text-center p-2"
                                          style={{ backgroundColor: `${brandColor}10`, border: `2px solid ${brandColor}` }}
                                        >
                                          <span className="text-xs font-bold" style={{ color: brandColor }}>TLS VERIFIED</span>
                                          <span className="text-[10px] mt-1" style={{ color: brandColor }}>Stamp Preview</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Signature Preview Below Stamp - Only for Certification */}
                                    {showSignatureBelow && (
                                      <div 
                                        className="bg-white rounded-sm mt-1 flex items-center justify-center shadow-sm"
                                        style={{ 
                                          width: stampSize.width, 
                                          height: signatureAreaHeight - 4,
                                          border: `1.5px dashed ${brandColor}`,
                                          backgroundColor: 'white'
                                        }}
                                      >
                                        {signatureMode === 'digital' && savedSignature ? (
                                          <img 
                                            src={`data:image/png;base64,${savedSignature}`} 
                                            alt="Signature" 
                                            className="max-h-full max-w-full object-contain"
                                            style={{ maxHeight: signatureAreaHeight - 8 }}
                                          />
                                        ) : (
                                          <span className="text-[9px] font-medium" style={{ color: brandColor }}>Sign Here</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </Rnd>
                              );
                            })()}
                          </div>
                        ) : pdfRendering ? (
                          <div 
                            className="bg-white flex items-center justify-center"
                            style={{ width: 612, height: 792 }}
                          >
                            <div className="text-center">
                              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
                              <p className="text-gray-500">Rendering page {currentPage}...</p>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="bg-white flex items-center justify-center"
                            style={{ width: 612, height: 792 }}
                          >
                            <div className="text-center text-gray-400">
                              <FileText className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                              <p className="text-lg font-medium">Loading document...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Position Info & Page Selection */}
                    <div className="p-4 border-t border-white/10 bg-white/[0.02]">
                      {/* Page Selection - Quick Access */}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-white/50 text-sm">Apply stamp to:</span>
                        <div className="flex gap-1.5 flex-wrap">
                          {[
                            { id: "first", label: "First Page" },
                            { id: "last", label: "Last Page" },
                            { id: "all", label: `All Pages (${fileData?.pages || 1})` }
                          ].map(opt => (
                            <Button
                              key={opt.id}
                              variant="ghost"
                              size="sm"
                              onClick={() => setPageSelection(opt.id)}
                              className={`rounded-lg text-xs h-7 px-3 ${
                                pageSelection === opt.id 
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                  : "text-white/60 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                        {pageSelection === "all" && fileData?.pages > 1 && (
                          <span className="text-emerald-400 text-xs">
                            ✓ Position saved per page - navigate to adjust each
                          </span>
                        )}
                      </div>
                      
                      {/* Page navigation for multi-page - showing position is per page */}
                      {fileData?.pages > 1 && pageSelection === "all" && (
                        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <span className="text-blue-300 text-xs">Page {currentPage} position:</span>
                          <div className="flex gap-1">
                            {Array.from({ length: Math.min(fileData.pages, 5) }, (_, i) => i + 1).map(pageNum => (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-6 h-6 rounded text-xs font-medium transition-all ${
                                  currentPage === pageNum
                                    ? "bg-blue-500 text-white"
                                    : stampPositions[pageNum] 
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : "bg-white/5 text-white/50 hover:bg-white/10"
                                }`}
                              >
                                {pageNum}
                              </button>
                            ))}
                            {fileData.pages > 5 && (
                              <span className="text-white/40 text-xs px-1">+{fileData.pages - 5}</span>
                            )}
                          </div>
                          <span className="text-white/40 text-xs ml-auto">
                            {stampPositions[currentPage] ? "✓ Set" : "Default center"}
                          </span>
                        </div>
                      )}
                      
                      {/* Drag instruction */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-emerald-400/70">
                          <Move className="w-4 h-4" />
                          <span className="text-xs">Drag the stamp to reposition</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setStampPosition({ x: pageDimensions.width - 200, y: pageDimensions.height - 200 });
                          }}
                          className="text-white/40 hover:text-white text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset Position
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>
            </div>

            {/* Configuration (2 cols) - Order 1 on desktop to appear on left */}
            <div className="lg:col-span-2 lg:order-1">
              <div className="space-y-4">
              {/* Document Details */}
              <Card className="glass-card rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    Document Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Document Name *</Label>
                    <Input
                      value={documentName}
                      onChange={(e) => setDocumentName(e.target.value)}
                      placeholder="e.g., Sale Agreement - Plot 123"
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                      data-testid="document-name-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70">Document Type *</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B1120] border-white/10">
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id} className="text-white hover:bg-white/10">
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4 text-white/50" />
                              {type.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/70">Description</Label>
                    <Textarea
                      value={localDescription}
                      onChange={(e) => setLocalDescription(e.target.value)}
                      placeholder="Brief description of the document contents..."
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl resize-none"
                      rows={2}
                    />
                  </div>

                  {/* Recipient Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-white/70">Recipient Type *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setRecipientType("individual")}
                        className={`h-10 rounded-xl border transition-all ${
                          recipientType === "individual"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-white/10 text-white/60 hover:border-white/20"
                        }`}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Individual
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setRecipientType("organization")}
                        className={`h-10 rounded-xl border transition-all ${
                          recipientType === "organization"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-white/10 text-white/60 hover:border-white/20"
                        }`}
                      >
                        <Building className="w-4 h-4 mr-2" />
                        Organization
                      </Button>
                    </div>
                  </div>

                  {recipientType === "individual" ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-white/70">Full Name *</Label>
                        <Input
                          value={localRecipientName}
                          onChange={(e) => setLocalRecipientName(e.target.value)}
                          placeholder="John Doe"
                          className="h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/70">ID/Passport Number</Label>
                        <Input
                          value={localRecipientOrg}
                          onChange={(e) => setLocalRecipientOrg(e.target.value)}
                          placeholder="Optional - for identification"
                          className="h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-white/70">Organization Name *</Label>
                        <Input
                          value={localRecipientOrg}
                          onChange={(e) => setLocalRecipientOrg(e.target.value)}
                          placeholder="ABC Company Ltd"
                          className="h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white/70">Contact Person</Label>
                        <Input
                          value={localRecipientName}
                          onChange={(e) => setLocalRecipientName(e.target.value)}
                          placeholder="Representative name"
                          className="h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stamp Customization */}
              <Card className="glass-card rounded-2xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Palette className="w-5 h-5 text-purple-400" />
                      Stamp Options
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stamp Type Selection */}
                  <div className="space-y-2">
                    <Label className="text-white/70">Stamp Type *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {STAMP_TYPES.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => setSelectedType(type.id)}
                          className={`p-3 rounded-xl border-2 transition-all text-left ${
                            selectedType === type.id
                              ? "border-emerald-500 bg-emerald-500/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <span className="text-white font-medium text-sm">{type.name}</span>
                          </div>
                          <p className="text-white/40 text-xs">{type.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Signature Options - Only for Certification */}
                  {selectedType === "certification" && (
                    <div className="space-y-3">
                      <Label className="text-white/70">Signature Option *</Label>
                      <div className="space-y-2">
                        {/* Digital Signature - Use saved signature */}
                        <button
                          onClick={() => setSignatureMode("digital")}
                          disabled={!savedSignature}
                          className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                            signatureMode === "digital"
                              ? "border-emerald-500 bg-emerald-500/10"
                              : savedSignature 
                                ? "border-white/10 bg-white/5 hover:border-white/20"
                                : "border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <PenTool className="w-5 h-5 text-emerald-400" />
                              <div>
                                <span className="text-white font-medium text-sm">Use Digital Signature</span>
                                <p className="text-white/40 text-xs">
                                  {savedSignature ? `${signatureSource === "drawn" ? "Drawn" : "Uploaded"} signature will be embedded` : "No signature saved yet"}
                                </p>
                              </div>
                            </div>
                            {savedSignature && (
                              <div className="w-20 h-10 bg-white rounded flex items-center justify-center p-1">
                                <img 
                                  src={`data:image/png;base64,${savedSignature}`} 
                                  alt="Signature" 
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            )}
                          </div>
                        </button>
                        
                        {/* Signature Placeholder - Sign after printing */}
                        <button
                          onClick={() => setSignatureMode("placeholder")}
                          className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                            signatureMode === "placeholder"
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FileCheck className="w-5 h-5 text-blue-400" />
                            <div>
                              <span className="text-white font-medium text-sm">Sign After Printing</span>
                              <p className="text-white/40 text-xs">Empty signature box for physical signature</p>
                            </div>
                          </div>
                        </button>
                      </div>
                      
                      {/* Signature Management - Draw or Upload */}
                      {!savedSignature ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                            <div>
                              <p className="text-amber-300 text-sm font-medium">No Signature Saved</p>
                              <p className="text-amber-300/70 text-xs">Add your signature to use digital signing</p>
                            </div>
                          </div>
                          
                          {/* Inline signature drawing area */}
                          {showSignatureDrawer ? (
                            <div className="space-y-3">
                              <div className="bg-white rounded-lg overflow-hidden">
                                <SignatureCanvas
                                  ref={signatureCanvasRef}
                                  penColor="#1a1a1a"
                                  canvasProps={{
                                    width: 280,
                                    height: 100,
                                    className: "w-full cursor-crosshair"
                                  }}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={clearSignatureCanvas}
                                  className="flex-1 border-white/20 text-white/70 hover:bg-white/10"
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Clear
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={saveDrawnSignature}
                                  disabled={savingSignature}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  {savingSignature ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3 mr-1" />
                                  )}
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowSignatureDrawer(false)}
                                  className="text-white/50 hover:text-white"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowSignatureDrawer(true)}
                                className="flex-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                              >
                                <PenTool className="w-4 h-4 mr-1" />
                                Draw Signature
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => signatureUploadRef.current?.click()}
                                className="flex-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                Upload Image
                              </Button>
                              <input
                                ref={signatureUploadRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                className="hidden"
                                onChange={handleSignatureUpload}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Show signature preview with delete option */
                        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-12 bg-white rounded flex items-center justify-center p-1">
                              <img 
                                src={`data:image/png;base64,${savedSignature}`} 
                                alt="Signature" 
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div>
                              <span className="text-emerald-400 text-sm font-medium">Signature Saved</span>
                              <p className="text-white/40 text-xs">{signatureSource === "drawn" ? "Drawn" : "Uploaded"}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={deleteSignature}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Current Template Info */}
                  {selectedTemplate ? (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: selectedTemplate.brand_color }}
                          />
                          <span className="text-white font-medium text-sm">{selectedTemplate.name}</span>
                          <Badge className="bg-white/10 text-white/60 text-[10px]">{stampShape}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                          className="text-white/50 hover:text-white text-xs h-7"
                        >
                          {showAdvancedOptions ? "Hide Options" : "Customize"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                      <p className="text-amber-400 text-sm">Select a stamp shape from the banner above</p>
                    </div>
                  )}

                  {/* Advanced Options - Collapsible */}
                  {showAdvancedOptions && (
                    <>
                      {/* Opacity */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-white/70">Opacity</Label>
                          <span className="text-white/50 text-xs">{stampOpacity}%</span>
                        </div>
                        <Slider
                          value={[stampOpacity]}
                          onValueChange={(value) => setStampOpacity(value[0])}
                          min={30}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      {/* Stamp Size - Fixed notice */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-white/50 text-xs">
                          Stamp size is optimized for QR code scanning and readability
                        </p>
                      </div>
                    </>
                  )}

                  {/* Branding Options */}
                  {/* Transparency Info */}
                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-emerald-400/80 text-xs">
                      Stamps have transparent background with white only behind QR code and text for optimal readability
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Stamp Button */}
              <Button 
                onClick={handleStampDocument}
                disabled={!fileData || stamping || !localRecipientName.trim()}
                className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl text-lg font-semibold shadow-lg shadow-emerald-500/25"
                data-testid="stamp-document-btn"
              >
                {stamping ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Secure Stamp...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5 mr-2" />
                    Generate Verified Stamp
                  </>
                )}
              </Button>
              </div>
            </div>
          </div>
        </div>

      {/* Success Dialog */}
      <Dialog open={!!stampResult} onOpenChange={() => setStampResult(null)}>
        <DialogContent className="sm:max-w-lg bg-[#0B1120] border-white/10" data-testid="stamp-success-dialog">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
            <DialogTitle className="font-heading text-2xl text-white text-center">Document Secured!</DialogTitle>
            <DialogDescription className="text-white/50 text-center">
              Your document now has a tamper-proof verification stamp
            </DialogDescription>
          </DialogHeader>
          
          {stampResult && (
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <div 
                  className="w-48 h-48 bg-white rounded-2xl p-4 shadow-2xl"
                  style={{ boxShadow: `0 0 60px ${brandColor}30` }}
                >
                  <img 
                    src={`data:image/png;base64,${stampResult.qr_code_data}`} 
                    alt="QR Code" 
                    className="w-full h-full"
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="text-white/50 text-sm mb-1">Verification ID</p>
                <p className="font-mono text-xl font-bold text-emerald-400">{stampResult.stamp_id}</p>
              </div>

              <div className="space-y-2 p-4 bg-white/5 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Document</span>
                  <span className="text-white">{stampResult.document_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Recipient</span>
                  <span className="text-white">{localRecipientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Security Hash</span>
                  <span className="font-mono text-xs text-white/70">{stampResult.hash_value?.slice(0, 24)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Valid Until</span>
                  <span className="text-white">{new Date(stampResult.expires_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={isMobile() ? shareDocument : downloadStampedDocument}
                  className="bg-emerald-500 hover:bg-emerald-600 rounded-xl h-12"
                  data-testid="download-stamped-doc"
                >
                  {isMobile() ? (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Document
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Document
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => downloadQRCode()}
                  variant="outline"
                  className="border-white/10 text-white hover:bg-white/10 rounded-xl h-12"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Download QR
                </Button>
              </div>

              {/* Auto-download note for desktop */}
              {!isMobile() && (
                <p className="text-center text-white/40 text-xs">
                  ✓ Document auto-downloaded to your device
                </p>
              )}

              <Button 
                onClick={() => copyVerificationLink(stampResult.stamp_id)}
                variant="ghost"
                className="w-full text-white/60 hover:text-white h-10"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Verification Link
              </Button>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => { setStampResult(null); resetForm(); }}
              className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl"
            >
              Stamp Another Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stamp Detail Dialog */}
      <Dialog open={!!selectedStamp} onOpenChange={() => setSelectedStamp(null)}>
        <DialogContent className="sm:max-w-lg bg-[#0B1120] border-white/10">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white">Stamp Details</DialogTitle>
          </DialogHeader>
          
          {selectedStamp && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-40 h-40 bg-white rounded-2xl p-3 shadow-glow">
                  <img 
                    src={`data:image/png;base64,${selectedStamp.qr_code_data}`} 
                    alt="QR Code" 
                    className="w-full h-full"
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="font-mono text-lg font-bold text-emerald-400">{selectedStamp.stamp_id}</p>
                <Badge className={`mt-2 ${getStatusColor(selectedStamp.status)}`}>
                  {selectedStamp.status}
                </Badge>
              </div>

              <div className="space-y-2 p-4 bg-white/5 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Document</span>
                  <span className="text-white">{selectedStamp.document_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Type</span>
                  <span className="text-white capitalize">{selectedStamp.document_type?.replace(/_/g, ' ') || selectedStamp.stamp_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Recipient</span>
                  <span className="text-white">{selectedStamp.recipient_name || '-'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Created</span>
                  <span className="text-white">{new Date(selectedStamp.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Expires</span>
                  <span className="text-white">{new Date(selectedStamp.expires_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-emerald-500/10 to-tls-gold/10 rounded-xl">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-400">{selectedStamp.verification_count || 0}</p>
                  <p className="text-xs text-white/50">Total Verifications</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-tls-gold">{(selectedStamp.total_earnings || 0).toLocaleString()}</p>
                  <p className="text-xs text-white/50">Earnings (TZS)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => copyVerificationLink(selectedStamp.stamp_id)}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Link
                </Button>
                <Button 
                  onClick={() => downloadQRCode(selectedStamp)}
                  className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// Earnings Dashboard Component
const EarningsDashboard = ({ user, getAuthHeaders }) => {
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const response = await axios.get(`${API}/earnings/summary`, getAuthHeaders());
      setEarnings(response.data);
    } catch (error) {
      console.error("Failed to load earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="glass-card rounded-2xl border-tls-gold/20">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-tls-gold/20 flex items-center justify-center mb-4">
              <DollarSign className="w-7 h-7 text-tls-gold" />
            </div>
            <p className="text-3xl font-bold text-tls-gold">{(earnings?.total_earnings || 0).toLocaleString()}</p>
            <p className="text-sm text-white/50 mt-1">Total Earnings (TZS)</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-emerald-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-400">{(earnings?.monthly_earnings || 0).toLocaleString()}</p>
            <p className="text-sm text-white/50 mt-1">This Month (TZS)</p>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-blue-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Eye className="w-7 h-7 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-blue-400">{earnings?.total_verifications || 0}</p>
            <p className="text-sm text-white/50 mt-1">Total Verifications</p>
          </CardContent>
        </Card>
      </div>

      {/* How it Works */}
      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg text-white">How You Earn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3">
                <span className="text-emerald-400 font-bold">1</span>
              </div>
              <p className="text-white font-medium mb-1">Stamp Documents</p>
              <p className="text-white/50 text-sm">Add verification QR codes to your legal documents</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center mb-3">
                <span className="text-blue-400 font-bold">2</span>
              </div>
              <p className="text-white font-medium mb-1">Share with Recipients</p>
              <p className="text-white/50 text-sm">Recipients can verify the document authenticity</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-tls-gold/20 flex items-center justify-center mb-3">
                <span className="text-tls-gold font-bold">3</span>
              </div>
              <p className="text-white font-medium mb-1">Earn Per Verification</p>
              <p className="text-white/50 text-sm">Get 30% of each verification fee automatically</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {earnings?.recent_transactions?.length > 0 && (
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white">Recent Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {earnings.recent_transactions.map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white font-mono text-sm">{tx.stamp_id}</p>
                      <p className="text-white/40 text-xs">{new Date(tx.verified_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="text-tls-gold font-semibold">+{tx.advocate_share?.toLocaleString()} TZS</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentStampPage;
