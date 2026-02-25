import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import { 
  Settings, Plus, Edit, Trash2, Check, Palette, ArrowLeft,
  QrCode, Save, X, Loader2, Eye, Square, Circle, 
  CheckCircle2, Lock, Unlock, RotateCcw,
  RectangleHorizontal, RectangleVertical, LayoutGrid
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BRAND_COLORS = [
  { id: "emerald", name: "Emerald", color: "#10B981" },
  { id: "blue", name: "Blue", color: "#3B82F6" },
  { id: "purple", name: "Purple", color: "#8B5CF6" },
  { id: "gold", name: "Gold", color: "#F59E0B" },
  { id: "red", name: "Red", color: "#EF4444" },
  { id: "teal", name: "Teal", color: "#14B8A6" },
  { id: "navy", name: "Navy", color: "#1E3A5F" },
  { id: "black", name: "Black", color: "#1F2937" }
];

// TLS uses a single official stamp design - layout options removed for consistency
const RECTANGLE_LAYOUTS = [
  { id: "tls_standard", name: "TLS Standard", icon: RectangleHorizontal, desc: "Official TLS verified stamp design" }
];

// Size presets for the stamp (in PDF points)
const STAMP_SIZE_PRESETS = [
  { id: "small", name: "Small", width: 250, height: 220, desc: "Compact size for dense documents" },
  { id: "medium", name: "Medium", width: 350, height: 310, desc: "Standard recommended size" },
  { id: "large", name: "Large", width: 450, height: 400, desc: "Large size for prominent placement" }
];

const STAMP_SHAPES = [
  { id: "rectangle", name: "Rectangle", desc: "Official TLS verified stamp" }
  // Circle and oval removed - TLS uses standardized rectangular stamp
];

// Stamp Editor Component - Full Page with Split View
// Completion steps for progress bar
const COMPLETION_STEPS = [
  { id: 'name', label: 'Name', check: (data) => data.name && data.name.length > 0 },
  { id: 'color', label: 'Color', check: (data) => data.brand_color },
  { id: 'size', label: 'Size', check: (data) => data.stamp_size_preset }
];

const StampEditor = ({ shape, existingStamp, onSave, onCancel }) => {
  const { user } = useAuth();
  const previewRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: existingStamp?.name || "My TLS Stamp",
    brand_color: existingStamp?.brand_color || "#10B981",
    layout: "tls_standard", // Fixed - TLS uses single standard design
    show_advocate_name: true, // Always show advocate name
    show_tls_logo: true, // TLS logo is always required
    stamp_size_preset: existingStamp?.stamp_size_preset || "medium", // Size preset
    opacity: existingStamp?.opacity || 90
  });

  // Get current size from preset
  const currentSizePreset = STAMP_SIZE_PRESETS.find(s => s.id === formData.stamp_size_preset) || STAMP_SIZE_PRESETS[1];

  // Calculate completion progress
  const completedSteps = COMPLETION_STEPS.filter(step => step.check(formData)).length;
  const completionPercentage = (completedSteps / COMPLETION_STEPS.length) * 100;
  
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ...formData,
        shape: "rectangle", // TLS always uses rectangle
        stamp_width: currentSizePreset.width,
        stamp_height: currentSizePreset.height
      });
    } finally {
      setSaving(false);
    }
  };

  // Get current date for preview
  const previewDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const previewStampId = `TLS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-XXXX`;

  // Render realistic stamp preview - TLS Standard design only
  const renderStampPreview = () => {
    const color = formData.brand_color;
    const opacity = formData.opacity / 100;
    const scale = currentSizePreset.width / 350; // Scale based on size preset
    
    // CIRCLE STAMP - Matches DocumentStampPage: no logo, bigger QR, curved text appearance
    if (shape === "circle") {
      return (
        <div 
          className="relative"
          style={{ 
            width: `${180 * scale}px`, 
            height: `${180 * scale}px`,
            opacity,
            backgroundColor: '#f5f5f5',
            borderRadius: '50%'
          }}
        >
          {/* Outer circle border */}
          <div 
            className="absolute inset-0 rounded-full border-[3px]"
            style={{ borderColor: color }}
          />
          {/* Inner circle border */}
          <div 
            className="absolute rounded-full border-[2px]"
            style={{ 
              borderColor: color,
              top: '6%', left: '6%', right: '6%', bottom: '6%'
            }}
          />
          
          {/* Content container */}
          <div className="absolute inset-0 flex flex-col items-center justify-start pt-[15%]">
            {/* ★ TLS VERIFIED ★ */}
            <span 
              className="text-[11px] font-bold tracking-wider"
              style={{ color }}
            >
              ★ TLS VERIFIED ★
            </span>
            
            {/* Center content - bigger QR, no logo */}
            <div className="flex flex-col items-center gap-1 mt-2">
              {/* QR Code box - BIGGER */}
              <div 
                className="bg-white p-1.5 rounded shadow-sm border-2"
                style={{ borderColor: color }}
              >
                <div className="w-12 h-12 grid grid-cols-4 gap-[1px]">
                  {[1,0,1,1,0,1,0,1,1,1,0,0,0,1,1,0].map((v, i) => (
                    <div 
                      key={i} 
                      className="rounded-sm"
                      style={{ backgroundColor: v ? color : 'white' }} 
                    />
                  ))}
                </div>
              </div>
              
              {/* Stamp ID */}
              <p className="text-[9px] font-bold" style={{ color }}>
                {previewStampId}
              </p>
              
              {/* Date */}
              <p className="text-[8px] text-gray-600">
                {previewDate}
              </p>
              
              {/* Advocate Name */}
              {formData.show_advocate_name && (
                <p className="text-[9px] font-bold" style={{ color }}>
                  {user?.full_name || 'Advocate'}
                </p>
              )}
            </div>
            
            {/* SCAN TO VERIFY at bottom */}
            <span 
              className="absolute bottom-[15%] text-[9px] font-bold"
              style={{ color }}
            >
              SCAN TO VERIFY
            </span>
          </div>
        </div>
      );
    }
    
    // OVAL STAMP - Matches DocumentStampPage: horizontal layout, no logo
    if (shape === "oval") {
      return (
        <div 
          className="relative"
          style={{ 
            width: `${220 * scale}px`, 
            height: `${140 * scale}px`,
            opacity,
            backgroundColor: '#f5f5f5',
            borderRadius: '50%'
          }}
        >
          {/* Outer oval border */}
          <div 
            className="absolute inset-0 rounded-full border-[2px]"
            style={{ borderColor: color }}
          />
          {/* Inner oval border */}
          <div 
            className="absolute rounded-full border-[1px]"
            style={{ 
              borderColor: color,
              top: '5%', left: '3%', right: '3%', bottom: '5%'
            }}
          />
          
          {/* Content - horizontal layout */}
          <div className="absolute inset-0 flex flex-col items-center justify-between py-[8%] px-[5%]">
            {/* ★ TLS VERIFIED ★ at top */}
            <span className="text-[10px] font-bold" style={{ color }}>
              ★ TLS VERIFIED ★
            </span>
            
            {/* Center: QR left, text right */}
            <div className="flex items-center gap-3 w-full justify-center">
              {/* QR Code */}
              <div className="bg-white p-1 rounded border" style={{ borderColor: color }}>
                <div className="w-10 h-10 grid grid-cols-4 gap-[1px]">
                  {[1,0,1,1,0,1,0,1,1,1,0,0,0,1,1,0].map((v, i) => (
                    <div key={i} className="rounded-sm" style={{ backgroundColor: v ? color : 'white' }} />
                  ))}
                </div>
              </div>
              
              {/* Text info */}
              <div className="text-left">
                <p className="text-[9px] font-bold" style={{ color }}>{previewStampId}</p>
                <p className="text-[8px] text-gray-600">{previewDate}</p>
                {formData.show_advocate_name && (
                  <p className="text-[9px] font-bold" style={{ color }}>{user?.full_name || 'Advocate'}</p>
                )}
              </div>
            </div>
            
            {/* SCAN TO VERIFY at bottom */}
            <span className="text-[9px] font-bold" style={{ color }}>
              SCAN TO VERIFY
            </span>
          </div>
        </div>
      );
    }
    
    // Rectangle layouts
    const layout = formData.layout;
    
    if (layout === "vertical") {
      return (
        <div 
          className="bg-white rounded-lg border-4 overflow-hidden flex flex-col"
          style={{ 
            width: `${180 * scale}px`, 
            height: `${320 * scale}px`,
            borderColor: color,
            opacity 
          }}
        >
          {/* Header with TLS Logo */}
          <div className="px-3 py-3 flex items-center justify-center gap-2" style={{ backgroundColor: color }}>
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden">
              <img src="/assets/tls-logo.png" alt="TLS" className="w-6 h-6 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <p className="text-white text-sm font-bold">TLS VERIFIED</p>
          </div>
          
          {/* Body */}
          <div className="flex-1 flex flex-col items-center justify-center p-3 gap-2 relative">
            {/* QR */}
            <div className="w-20 h-20 rounded border-2 grid grid-cols-4 gap-0.5 p-1" style={{ borderColor: color }}>
              {[1,0,1,1,0,1,0,1,1,1,0,0,0,1,1,0].map((v, i) => (
                <div key={i} className={v ? 'rounded-sm' : ''} style={{ backgroundColor: v ? color : 'transparent' }} />
              ))}
            </div>
            <p className="text-[10px] font-mono text-gray-700">{previewStampId}</p>
            <p className="text-[10px] text-gray-500">{previewDate}</p>
            
            {formData.show_advocate_name && (
              <p className="text-xs font-bold text-center" style={{ color }}>{user?.full_name || 'Advocate'}</p>
            )}
          </div>
          
          {/* Footer */}
          <div className="py-2 text-center" style={{ backgroundColor: `${color}15` }}>
            <p className="text-[9px] font-semibold" style={{ color }}>SCAN TO VERIFY</p>
          </div>
        </div>
      );
    }
    
    if (layout === "compact") {
      return (
        <div 
          className="bg-white rounded-lg border-4 overflow-hidden"
          style={{ 
            width: `${200 * scale}px`, 
            height: `${200 * scale}px`,
            borderColor: color,
            opacity 
          }}
        >
          {/* Header with TLS Logo */}
          <div className="px-2 py-2 flex items-center justify-center gap-2" style={{ backgroundColor: color }}>
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center overflow-hidden">
              <img src="/assets/tls-logo.png" alt="TLS" className="w-5 h-5 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <p className="text-white text-sm font-bold">TLS VERIFIED</p>
          </div>
          
          {/* Body */}
          <div className="flex flex-col items-center justify-center p-3 gap-2">
            <div className="w-14 h-14 rounded border-2 grid grid-cols-4 gap-0.5 p-1" style={{ borderColor: color }}>
              {[1,0,1,1,0,1,0,1,1,1,0,0,0,1,1,0].map((v, i) => (
                <div key={i} className={v ? 'rounded-sm' : ''} style={{ backgroundColor: v ? color : 'transparent' }} />
              ))}
            </div>
            <p className="text-[9px] font-mono text-gray-700">{previewStampId}</p>
            {formData.show_advocate_name && (
              <p className="text-[10px] font-bold" style={{ color }}>{user?.full_name?.split(' ')[0]}</p>
            )}
          </div>
          
          {/* Footer */}
          <div className="py-1 text-center" style={{ backgroundColor: `${color}15` }}>
            <p className="text-[8px] font-semibold" style={{ color }}>SCAN TO VERIFY</p>
          </div>
        </div>
      );
    }
    
    if (layout === "logo_left" || layout === "logo_right") {
      const isLeft = layout === "logo_left";
      return (
        <div 
          className="bg-white rounded-lg border-4 overflow-hidden flex"
          style={{ 
            width: `${380 * scale}px`, 
            height: `${180 * scale}px`,
            borderColor: color,
            opacity,
            flexDirection: isLeft ? 'row' : 'row-reverse'
          }}
        >
          {/* Colored Panel with TLS Logo & QR */}
          <div className="w-1/3 flex flex-col items-center justify-center py-3" style={{ backgroundColor: color }}>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden mb-2">
              <img src="/assets/tls-logo.png" alt="TLS" className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="w-12 h-12 bg-white rounded grid grid-cols-4 gap-0.5 p-1">
              {[1,0,1,1,0,1,0,1,1,1,0,0,0,1,1,0].map((v, i) => (
                <div key={i} className={v ? 'bg-gray-800 rounded-sm' : ''} />
              ))}
            </div>
            <p className="text-white text-[10px] font-bold mt-2">TLS VERIFIED</p>
          </div>
          
          {/* Info Panel */}
          <div className="flex-1 p-4 flex flex-col justify-center relative">
            <p className="text-[10px] text-gray-400">STAMP ID</p>
            <p className="text-sm font-bold" style={{ color }}>{previewStampId}</p>
            <p className="text-[10px] text-gray-500 mt-1">Date: {previewDate}</p>
            
            {formData.show_advocate_name && (
              <p className="text-xs font-bold mt-2" style={{ color }}>{user?.full_name || 'Advocate'}</p>
            )}
            
            {/* Footer text */}
            <p className="text-[8px] font-semibold mt-2" style={{ color }}>SCAN TO VERIFY</p>
          </div>
        </div>
      );
    }
    
    // Default horizontal
    return (
      <div 
        className="bg-white rounded-lg border-4 overflow-hidden flex flex-col"
        style={{ 
          width: `${400 * scale}px`, 
          height: `${280 * scale}px`,
          borderColor: color,
          opacity 
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: color }}>
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
            <img 
              src="/assets/tls-logo.png" 
              alt="TLS" 
              className="w-8 h-8 object-contain"
              onError={(e) => { e.target.parentElement.innerHTML = '<span class="text-xs font-bold" style="color: ' + color + '">TLS</span>'; }}
            />
          </div>
          <div>
            <p className="text-white text-lg font-bold">TLS VERIFIED</p>
            <p className="text-white/80 text-xs">Tanganyika Law Society</p>
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 p-4 flex gap-4">
          {/* QR */}
          <div className="w-24 h-24 rounded-lg border-2 grid grid-cols-4 gap-0.5 p-2" style={{ borderColor: color, backgroundColor: `${color}10` }}>
            {[1,0,1,1,0,1,0,1,1,1,0,0,0,1,1,0].map((v, i) => (
              <div key={i} className={v ? 'rounded-sm' : ''} style={{ backgroundColor: v ? color : 'transparent' }} />
            ))}
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <p className="text-xs text-gray-400 font-bold">STAMP ID</p>
            <p className="text-xl font-bold text-gray-800">{previewStampId}</p>
            <p className="text-xs text-gray-400 font-bold mt-3">DATE</p>
            <p className="text-sm text-gray-600">{previewDate}</p>
            {formData.show_advocate_name && (
              <>
                <p className="text-xs text-gray-400 font-bold mt-3">ADVOCATE</p>
                <p className="text-sm font-bold" style={{ color }}>{user?.full_name || 'Advocate Name'}</p>
              </>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="py-2 text-center" style={{ backgroundColor: `${color}15` }}>
          <p className="text-xs font-semibold" style={{ color }}>Scan QR Code to Verify Authenticity</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar with Checkmarks - STICKY */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-[#02040A]/95 backdrop-blur-sm">
        <Card className="glass-card rounded-2xl">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              {COMPLETION_STEPS.map((step, idx) => {
                const isComplete = step.check(formData);
                const isLast = idx === COMPLETION_STEPS.length - 1;
                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isComplete 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-white/10 text-white/40'
                      }`}>
                        {isComplete ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <span className={`text-xs mt-1 ${isComplete ? 'text-emerald-400' : 'text-white/40'}`}>
                        {step.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-0.5 mx-2 transition-all ${
                        isComplete ? 'bg-emerald-500' : 'bg-white/10'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-center">
              <span className={`text-sm font-medium ${completedSteps === COMPLETION_STEPS.length ? 'text-emerald-400' : 'text-white/60'}`}>
                {completedSteps === COMPLETION_STEPS.length ? '✓ Ready to Save!' : `${completedSteps}/${COMPLETION_STEPS.length} Complete`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side - Settings */}
        <div className="space-y-6">
          <Card className="glass-card rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                {shape.charAt(0).toUpperCase() + shape.slice(1)} Stamp Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-white/70">Stamp Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="My Official Stamp"
                />
              </div>


              {/* Layout Options (Rectangle only) */}
              {shape === "rectangle" && (
                <div className="space-y-3">
                  <Label className="text-white/70">Layout Style</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {RECTANGLE_LAYOUTS.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => setFormData(f => ({ ...f, layout: layout.id }))}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          formData.layout === layout.id 
                            ? 'border-emerald-500 bg-emerald-500/20' 
                            : 'border-white/10 hover:border-white/30 bg-white/5'
                        }`}
                      >
                        <layout.icon className={`w-5 h-5 ${formData.layout === layout.id ? 'text-emerald-400' : 'text-white/50'}`} />
                        <span className={`text-[10px] ${formData.layout === layout.id ? 'text-emerald-400' : 'text-white/50'}`}>
                          {layout.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
            )}

            {/* Color Selection */}
            <div className="space-y-3">
              <Label className="text-white/70">Brand Color</Label>
              <div className="flex gap-2 flex-wrap">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setFormData(f => ({ ...f, brand_color: c.color }))}
                    className={`w-10 h-10 rounded-xl transition-all ${
                      formData.brand_color === c.color 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' 
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Address (for circle/oval curved text) */}
            {(shape === "circle" || shape === "oval") && (
              <div className="space-y-2">
                <Label className="text-white/70">Address (appears on outer ring)</Label>
                <Input
                  value={formData.advocate_address}
                  onChange={(e) => setFormData(f => ({ ...f, advocate_address: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Dar es Salaam, Tanzania"
                />
              </div>
            )}

            {/* Stamp size info */}
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <p className="text-white/50 text-xs">
                Stamp has transparent background with white only behind QR code and text for readability
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={onCancel}
            variant="outline"
            className="flex-1 border-white/10 text-white hover:bg-white/5"
          >
            <X className="w-4 h-4 mr-2" /> Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Stamp</>
            )}
          </Button>
        </div>
      </div>

      {/* Right Side - Preview */}
      <div className="space-y-6">
        <Card className="glass-card rounded-2xl sticky top-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-xl p-8 min-h-[400px] flex items-center justify-center">
              {renderStampPreview()}
            </div>
            <p className="text-white/40 text-xs text-center mt-4">
              This is exactly how your stamp will appear on documents
            </p>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

// Main My Stamps Page
const MyStampsPage = () => {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  
  const [stamps, setStamps] = useState({
    rectangle: null,
    circle: null,
    oval: null
  });
  const [loading, setLoading] = useState(true);
  const [editingShape, setEditingShape] = useState(null);

  const completedCount = Object.values(stamps).filter(s => s !== null).length;
  const progressPercentage = (completedCount / 3) * 100;

  useEffect(() => {
    fetchStamps();
  }, []);

  const fetchStamps = async () => {
    try {
      const response = await axios.get(`${API}/stamp-templates`, getAuthHeaders());
      const templates = response.data;
      
      const organized = { rectangle: null, circle: null, oval: null };
      templates.forEach(t => {
        const shape = t.shape || "rectangle";
        if (organized[shape] === null) {
          organized[shape] = t;
        }
      });
      setStamps(organized);
    } catch (error) {
      console.error("Error fetching stamps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data) => {
    const existingStamp = stamps[data.shape];
    const payload = {
      name: data.name,
      shape: data.shape,
      brand_color: data.brand_color,
      layout: data.layout || "horizontal",
      show_advocate_name: data.show_advocate_name,
      show_tls_logo: true, // TLS logo is always required
      include_signature: data.include_signature,
      signature_data: data.signature_data,
      stamp_size: data.stamp_size,
      opacity: data.opacity,
      advocate_address: data.advocate_address,
      document_type: "contract",
      stamp_type: "official"
    };

    try {
      if (existingStamp) {
        await axios.put(`${API}/stamp-templates/${existingStamp.id}`, payload, getAuthHeaders());
        toast.success("Stamp updated!");
      } else {
        await axios.post(`${API}/stamp-templates`, payload, getAuthHeaders());
        toast.success("Stamp created!");
      }
      await fetchStamps();
      setEditingShape(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save");
      throw error;
    }
  };

  const handleDelete = async (shape) => {
    const stamp = stamps[shape];
    if (!stamp || !window.confirm(`Delete your ${shape} stamp?`)) return;
    
    try {
      await axios.delete(`${API}/stamp-templates/${stamp.id}`, getAuthHeaders());
      toast.success("Stamp deleted!");
      await fetchStamps();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // Show editor if editing
  if (editingShape) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <Button 
            onClick={() => setEditingShape(null)}
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Stamps
          </Button>
        </div>
        <StampEditor 
          shape={editingShape}
          existingStamp={stamps[editingShape]}
          onSave={handleSave}
          onCancel={() => setEditingShape(null)}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">My Stamps</h1>
          <p className="text-white/60">Create up to 3 unique stamp designs</p>
        </div>

        {/* Progress */}
        <Card className="glass-card rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${completedCount === 3 ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  {completedCount === 3 ? <CheckCircle2 className="w-6 h-6 text-white" /> : <Settings className="w-6 h-6 text-white/60" />}
                </div>
                <div>
                  <h2 className="text-white font-semibold">Stamp Collection</h2>
                  <p className="text-white/50 text-sm">{completedCount} of 3 stamps created</p>
                </div>
              </div>
              <Badge className={`text-lg px-4 py-2 ${completedCount === 3 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {completedCount}/3
              </Badge>
            </div>
            
            {/* Progress bar */}
            <div className="relative h-3 bg-white/10 rounded-full">
              <div className="absolute top-0 left-0 h-3 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
              <div className="absolute top-0 left-0 w-full h-3 flex justify-between items-center px-1">
                {['rectangle', 'circle', 'oval'].map((s, i) => (
                  <div key={s} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${stamps[s] ? 'bg-emerald-500 border-emerald-400' : i === completedCount ? 'bg-amber-500 border-amber-400 animate-pulse' : 'bg-slate-700 border-slate-600'}`}>
                    {stamps[s] && <Check className="w-3 h-3 text-white" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between mt-3 text-xs">
              <span className={stamps.rectangle ? 'text-emerald-400' : 'text-white/40'}>Rectangle</span>
              <span className={stamps.circle ? 'text-emerald-400' : 'text-white/40'}>Circle</span>
              <span className={stamps.oval ? 'text-emerald-400' : 'text-white/40'}>Oval</span>
            </div>
          </CardContent>
        </Card>

        {/* Stamp Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STAMP_SHAPES.map((shape) => {
            const stamp = stamps[shape.id];
            const isConfigured = stamp !== null;
            const color = stamp?.brand_color || "#10B981";
            
            return (
              <Card 
                key={shape.id} 
                className={`glass-card rounded-2xl overflow-hidden transition-all hover:scale-[1.02] cursor-pointer ${isConfigured ? 'ring-2 ring-emerald-500/50' : ''}`}
                onClick={() => {
                  if (isConfigured) {
                    // Navigate to document stamping page with this shape pre-selected
                    navigate('/documents', { state: { selectedShape: shape.id } });
                  } else {
                    // Open editor to create the stamp first
                    setEditingShape(shape.id);
                  }
                }}
                data-testid={`stamp-card-${shape.id}`}
              >
                <CardContent className="p-6">
                  {/* Shape preview */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-4">
                      <div 
                        className={`border-4 transition-all ${shape.id === 'circle' ? 'w-20 h-20 rounded-full' : shape.id === 'oval' ? 'w-24 h-16 rounded-full' : 'w-24 h-16 rounded-lg'}`}
                        style={{ borderColor: color, backgroundColor: isConfigured ? `${color}20` : 'transparent' }}
                      />
                      {isConfigured && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white">{shape.name}</h3>
                    <p className="text-white/50 text-sm text-center">{shape.desc}</p>
                  </div>
                  
                  {/* Status */}
                  <div className={`text-center py-3 rounded-xl mb-4 ${isConfigured ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                    {isConfigured ? (
                      <div className="flex items-center justify-center gap-2">
                        <Unlock className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Click to Use</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4 text-white/40" />
                        <span className="text-white/40">Click to Set Up</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={(e) => { e.stopPropagation(); setEditingShape(shape.id); }} 
                      className={`flex-1 rounded-xl ${isConfigured ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    >
                      {isConfigured ? <><Edit className="w-4 h-4 mr-2" /> Edit</> : <><Plus className="w-4 h-4 mr-2" /> Create</>}
                    </Button>
                    {isConfigured && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(shape.id); }} 
                        variant="outline" 
                        className="rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Action */}
        <Card className="glass-card rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">Ready to stamp documents?</h3>
                <p className="text-white/50 text-sm">Use your configured stamps on legal documents</p>
              </div>
              <Button onClick={() => navigate('/stamp-document')} className="bg-emerald-500 hover:bg-emerald-600 rounded-xl" disabled={completedCount === 0}>
                <QrCode className="w-4 h-4 mr-2" /> Stamp Document
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MyStampsPage;
