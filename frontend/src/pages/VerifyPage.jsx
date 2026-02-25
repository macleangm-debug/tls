import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import jsQR from "jsqr";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { 
  ShieldCheck, ShieldX, Search, AlertTriangle, CheckCircle2, 
  User, Calendar, ArrowLeft, QrCode, Clock, Fingerprint,
  Upload, Loader2, FileText, Hash, Eye, ScanLine, Camera,
  Building, MapPin, Phone, Mail, Award, Shield, X, FileCheck,
  ExternalLink, Copy, Share2, Sparkles, BadgeCheck, Download
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VerifyPage = () => {
  const { stampId: routeStampId } = useParams();
  const [searchParams] = useSearchParams();
  const queryStampId = searchParams.get('id') || searchParams.get('q');
  const mode = searchParams.get('mode'); // scan, upload, or id
  const stampId = routeStampId || queryStampId;
  
  const fileInputRef = useRef(null);
  const validateFileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [activeTab, setActiveTab] = useState("id");
  const [query, setQuery] = useState(stampId || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scanningInterval, setScanningInterval] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [autoStartCamera, setAutoStartCamera] = useState(false);
  
  // Document validation state
  const [validatingDocument, setValidatingDocument] = useState(false);
  const [documentValidation, setDocumentValidation] = useState(null);

  // Handle mode from URL query parameter
  useEffect(() => {
    if (mode === 'scan') {
      setActiveTab('camera');
      setAutoStartCamera(true);
    } else if (mode === 'upload') {
      setActiveTab('upload');
    } else if (mode === 'id') {
      setActiveTab('id');
    }
  }, [mode]);

  // Auto-start camera when scan mode is selected
  useEffect(() => {
    if (autoStartCamera && activeTab === 'camera' && !cameraActive && !searched) {
      startCamera();
      setAutoStartCamera(false);
    }
  }, [autoStartCamera, activeTab, cameraActive, searched]);

  useEffect(() => {
    if (stampId) {
      setQuery(stampId);
      handleVerifyById(stampId);
    }
  }, [stampId]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Show confetti animation on successful verification
  useEffect(() => {
    if (result?.valid) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [result]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraActive(true);
          setScannerReady(true);
          toast.info("Camera ready. Position the QR code within the frame.");
          startScanning();
        };
      }
    } catch (error) {
      toast.error("Camera access denied. Please allow camera permissions.");
      console.error("Camera error:", error);
    }
  };

  const stopCamera = () => {
    if (scanningInterval) {
      clearInterval(scanningInterval);
      setScanningInterval(null);
    }
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScannerReady(false);
  };

  const startScanning = () => {
    if (scanningInterval) {
      clearInterval(scanningInterval);
    }
    const interval = setInterval(() => {
      scanQRCode();
    }, 100);
    setScanningInterval(interval);
  };

  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code && code.data) {
        let extractedStampId = code.data;
        
        if (code.data.includes('?id=')) {
          const match = code.data.match(/[?&]id=([A-Z0-9-]+)/i);
          if (match) extractedStampId = match[1];
        } else if (code.data.includes('/v/') || code.data.includes('/verify/')) {
          const match = code.data.match(/\/v\/([A-Z0-9-]+)|\/verify\/([A-Z0-9-]+)/i);
          if (match) extractedStampId = match[1] || match[2];
        } else if (code.data.startsWith('TLS-')) {
          extractedStampId = code.data;
        }
        
        stopCamera();
        toast.success(`QR Code detected: ${extractedStampId}`);
        setQuery(extractedStampId);
        
        setLoading(true);
        setSearched(true);
        axios.get(`${API}/verify/stamp/${extractedStampId}`)
          .then(response => {
            setResult(response.data);
          })
          .catch(error => {
            setResult({
              valid: false,
              message: error.response?.data?.message || "Verification failed"
            });
          })
          .finally(() => {
            setLoading(false);
          });
      }
    } catch (e) {
      console.debug("Scan error:", e);
    }
  }, [cameraActive]);

  const handleVerifyById = async (eOrStampId) => {
    let idToVerify = query.trim();
    
    if (typeof eOrStampId === 'string') {
      idToVerify = eOrStampId;
    } else if (eOrStampId && eOrStampId.preventDefault) {
      eOrStampId.preventDefault();
    }
    
    if (!idToVerify) {
      toast.error("Please enter a Stamp ID");
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const response = await axios.get(`${API}/verify/stamp/${idToVerify}`);
      setResult(response.data);
    } catch (error) {
      setResult({
        valid: false,
        message: "Verification failed. Please check the ID and try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyByDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setLoading(true);
    setSearched(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/verify/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (error) {
      setResult({
        valid: false,
        message: "No stamp found for this document. The document may have been modified or was never stamped."
      });
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setResult(null);
    setSearched(false);
    setQuery("");
    setUploadedFile(null);
    setDocumentValidation(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (validateFileInputRef.current) {
      validateFileInputRef.current.value = '';
    }
  };

  // Validate document against stamp hash
  const handleValidateDocument = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !result?.stamp_id) return;
    
    setValidatingDocument(true);
    setDocumentValidation(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(
        `${API}/verify/stamp/${result.stamp_id}/validate-document`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      setDocumentValidation(response.data);
      
      if (response.data.hash_match) {
        toast.success("Document verified - authentic and unmodified!");
      } else {
        toast.error("Warning: Document has been modified!");
      }
    } catch (error) {
      setDocumentValidation({
        valid: false,
        hash_match: false,
        message: "Failed to validate document"
      });
      toast.error("Document validation failed");
    } finally {
      setValidatingDocument(false);
      if (validateFileInputRef.current) {
        validateFileInputRef.current.value = '';
      }
    }
  };

  const copyStampId = () => {
    if (result?.stamp_id) {
      navigator.clipboard.writeText(result.stamp_id);
      toast.success("Stamp ID copied!");
    }
  };

  const shareVerification = async () => {
    const url = `${window.location.origin}/verify/${result?.stamp_id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TLS Document Verification',
          text: `Document verified: ${result?.document_name}\nStamp ID: ${result?.stamp_id}`,
          url
        });
      } catch (e) {
        if (e.name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast.success("Verification link copied!");
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Verification link copied!");
    }
  };

  const getDocumentTypeName = (type) => {
    const types = {
      contract: "Contract/Agreement",
      affidavit: "Affidavit",
      power_of_attorney: "Power of Attorney",
      deed: "Deed/Title Document",
      court_filing: "Court Filing",
      legal_opinion: "Legal Opinion",
      witness_statement: "Witness Statement",
      other: "Legal Document"
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-[#02040A] text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-hero-glow pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-30" />
      
      {/* Confetti Animation for Success */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div 
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'][Math.floor(Math.random() * 5)],
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Navigation */}
      <nav className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-heading font-semibold">TLS Verification</p>
              <p className="text-white/40 text-xs">Tanganyika Law Society</p>
            </div>
          </Link>
          
          <Link to="/">
            <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/5 rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mb-4 sm:mb-6 animate-float">
            <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-3">Verify Document</h1>
          <p className="text-white/50 text-base sm:text-lg max-w-md mx-auto">
            Instantly verify any TLS-certified legal document
          </p>
        </div>

        {/* Verification Methods */}
        {!searched ? (
          <Card className="glass-card rounded-2xl sm:rounded-3xl border-white/10" data-testid="verify-card">
            <CardContent className="p-4 sm:p-6 md:p-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                <TabsList className="grid grid-cols-3 bg-white/5 border border-white/10 rounded-xl p-1 w-full">
                  <TabsTrigger value="id" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                    <Search className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Stamp ID</span>
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                    <Camera className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Scan QR</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                    <Upload className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Upload</span>
                  </TabsTrigger>
                </TabsList>

                {/* Stamp ID Tab */}
                <TabsContent value="id" className="space-y-4">
                  <form onSubmit={handleVerifyById} className="space-y-4">
                    <div className="relative">
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                      <Input
                        type="text"
                        placeholder="Enter Stamp ID (e.g., TLS-20250130-ABC123)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value.toUpperCase())}
                        className="pl-12 h-12 sm:h-14 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl font-mono text-sm sm:text-lg focus:border-emerald-500 uppercase"
                        data-testid="verify-input"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 sm:h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-base sm:text-lg font-semibold shadow-lg shadow-emerald-500/25"
                      disabled={loading}
                      data-testid="verify-submit"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5 mr-2" />
                          Verify Document
                        </>
                      )}
                    </Button>
                  </form>
                  <p className="text-center text-white/40 text-xs sm:text-sm">
                    Find the Stamp ID on the QR code label of your document
                  </p>
                </TabsContent>

                {/* Camera QR Scan Tab */}
                <TabsContent value="camera" className="space-y-4">
                  {!cameraActive ? (
                    <div className="text-center py-6 sm:py-8 border-2 border-dashed border-white/20 rounded-2xl">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-4">
                        <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-lg sm:text-xl text-white font-semibold mb-2">Scan QR Code</h3>
                      <p className="text-white/50 text-sm mb-4 sm:mb-6 max-w-sm mx-auto px-4">
                        Use your device camera to scan the QR code on the document
                      </p>
                      <Button 
                        onClick={startCamera}
                        className="bg-emerald-500 hover:bg-emerald-600 rounded-xl h-11 sm:h-12 px-6 sm:px-8"
                      >
                        <Camera className="w-5 h-5 mr-2" />
                        Open Camera
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-emerald-400 rounded-2xl relative">
                            <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                            <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                            <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                            <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                            <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 animate-scan" />
                          </div>
                        </div>
                        
                        <Button
                          onClick={stopCamera}
                          variant="ghost"
                          size="sm"
                          className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 rounded-full"
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                      <p className="text-center text-white/40 text-sm mt-4">
                        Position the QR code within the frame
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Upload Tab */}
                <TabsContent value="upload" className="space-y-4">
                  <label 
                    htmlFor="document-verify-upload"
                    className="flex flex-col items-center justify-center py-8 sm:py-10 border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-lg sm:text-xl text-white font-semibold mb-2">Upload Document</h3>
                    <p className="text-white/50 text-center text-sm mb-4 max-w-sm px-4">
                      We&apos;ll check if this document has a valid TLS verification stamp
                    </p>
                    <p className="text-white/30 text-xs mb-4">PDF, PNG, JPG (max 10MB)</p>
                    <input
                      ref={fileInputRef}
                      id="document-verify-upload"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleVerifyByDocument}
                      className="hidden"
                      data-testid="verify-upload-input"
                    />
                    <Button className="bg-emerald-500 hover:bg-emerald-600 rounded-xl h-11 px-6 sm:px-8">
                      <Upload className="w-4 h-4 mr-2" />
                      Select File
                    </Button>
                  </label>
                </TabsContent>
              </Tabs>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/40 text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Tamper-proof</span>
                </div>
                <div className="flex items-center gap-2 text-white/40 text-xs sm:text-sm">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Instant results</span>
                </div>
                <div className="flex items-center gap-2 text-white/40 text-xs sm:text-sm">
                  <Hash className="w-4 h-4 text-emerald-400" />
                  <span>SHA-256 secured</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Results Card - REDESIGNED */
          <div className="space-y-6">
            {loading ? (
              <Card className="glass-card rounded-2xl sm:rounded-3xl border-white/10">
                <CardContent className="py-16 sm:py-20 text-center">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="relative w-full h-full rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-white/70 text-lg font-medium">Verifying document authenticity...</p>
                  <p className="text-white/40 text-sm mt-2">Checking cryptographic signature</p>
                </CardContent>
              </Card>
            ) : result && (
              <div className="space-y-4 sm:space-y-6 animate-fadeIn">
                {/* Main Result Card */}
                <Card className={`overflow-hidden rounded-2xl sm:rounded-3xl border-2 transition-all duration-500 ${
                  result.valid 
                    ? "border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-600/5" 
                    : result.warning 
                      ? "border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 via-transparent to-yellow-600/5" 
                      : "border-red-500/50 bg-gradient-to-br from-red-500/10 via-transparent to-red-600/5"
                }`} data-testid="verify-result">
                  <CardContent className="p-0">
                    {/* Status Hero Section */}
                    <div className={`relative p-6 sm:p-8 md:p-10 text-center overflow-hidden ${
                      result.valid ? "bg-emerald-500/5" : result.warning ? "bg-yellow-500/5" : "bg-red-500/5"
                    }`}>
                      {/* Animated Background Circles */}
                      <div className="absolute inset-0 overflow-hidden">
                        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30 ${
                          result.valid ? "bg-emerald-500" : result.warning ? "bg-yellow-500" : "bg-red-500"
                        }`} />
                        <div className={`absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-20 ${
                          result.valid ? "bg-emerald-400" : result.warning ? "bg-yellow-400" : "bg-red-400"
                        }`} />
                      </div>
                      
                      {/* Status Icon with Animation */}
                      <div className="relative">
                        <div className={`w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full flex items-center justify-center mb-4 sm:mb-6 transition-all duration-700 ${
                          result.valid 
                            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-2xl shadow-emerald-500/40" 
                            : result.warning 
                              ? "bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-2xl shadow-yellow-500/40" 
                              : "bg-gradient-to-br from-red-500 to-red-600 shadow-2xl shadow-red-500/40"
                        } ${result.valid ? 'animate-success-bounce' : ''}`}>
                          {result.valid ? (
                            <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                          ) : result.warning ? (
                            <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                          ) : (
                            <ShieldX className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                          )}
                        </div>
                        
                        {/* Badge */}
                        {result.valid && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                            <Badge className="bg-emerald-500 text-white border-0 px-3 py-1 text-xs font-bold shadow-lg animate-fadeIn">
                              <BadgeCheck className="w-3 h-3 mr-1" />
                              VERIFIED
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <h2 className={`font-heading text-3xl sm:text-4xl md:text-5xl font-bold mt-4 sm:mt-6 ${
                        result.valid ? "text-emerald-400" : result.warning ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {result.valid ? "AUTHENTIC" : result.warning ? "WARNING" : "NOT VERIFIED"}
                      </h2>
                      
                      {/* Cryptographic Verification Badge */}
                      {result.crypto_verified !== undefined && (
                        <div className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                          result.crypto_verified 
                            ? "bg-blue-500/20 border border-blue-500/30" 
                            : "bg-red-500/20 border border-red-500/30"
                        }`}>
                          {result.crypto_verified ? (
                            <>
                              <Shield className="w-4 h-4 text-blue-400" />
                              <span className="text-blue-400 font-semibold text-sm">Cryptographically Verified</span>
                              <span className="text-blue-400/60 text-xs">({result.crypto_signature_alg})</span>
                            </>
                          ) : (
                            <>
                              <ShieldX className="w-4 h-4 text-red-400" />
                              <span className="text-red-400 font-semibold text-sm">Signature Invalid</span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <p className={`mt-2 sm:mt-3 text-base sm:text-lg ${
                        result.valid ? "text-emerald-300/80" : result.warning ? "text-yellow-300/80" : "text-red-300/80"
                      }`}>
                        {result.message || (result.valid ? "This document is verified and authentic" : "Verification failed")}
                      </p>
                    </div>

                    {/* Details Section */}
                    {result.advocate_name && (
                      <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                        {/* Advocate Info - Redesigned */}
                        <div className="relative p-4 sm:p-6 bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                          
                          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 flex items-center justify-center flex-shrink-0 ring-4 ring-emerald-500/20">
                              {result.advocate_photo ? (
                                <img src={result.advocate_photo} alt="" className="w-full h-full rounded-2xl object-cover" />
                              ) : (
                                <User className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
                              )}
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Certified By</p>
                              <h3 className="font-heading text-xl sm:text-2xl font-bold text-white">{result.advocate_name}</h3>
                              <p className="font-mono text-sm text-emerald-400 mt-1">{result.advocate_roll_number}</p>
                              {result.advocate_tls_number && (
                                <p className="text-sm text-white/50 mt-0.5">TLS Member: {result.advocate_tls_number}</p>
                              )}
                            </div>
                            <Badge className={`text-sm px-3 sm:px-4 py-1.5 ${
                              result.advocate_status === "Active" 
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                            }`}>
                              {result.advocate_status}
                            </Badge>
                          </div>
                        </div>

                        {/* Document Info - Redesigned */}
                        {result.document_name && (
                          <div className="p-4 sm:p-6 bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-xl sm:rounded-2xl border border-white/10">
                            <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3 sm:mb-4 flex items-center gap-2">
                              <FileCheck className="w-4 h-4 text-emerald-400" />
                              Document Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                <FileText className="w-5 h-5 text-emerald-400 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="text-white/40 text-xs">Document Name</p>
                                  <p className="text-white font-medium truncate">{result.document_name}</p>
                                </div>
                              </div>
                              {result.document_type && (
                                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                  <FileCheck className="w-5 h-5 text-blue-400 mt-0.5" />
                                  <div className="min-w-0">
                                    <p className="text-white/40 text-xs">Type</p>
                                    <p className="text-white font-medium truncate">{getDocumentTypeName(result.document_type)}</p>
                                  </div>
                                </div>
                              )}
                              {result.recipient_name && (
                                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                  <User className="w-5 h-5 text-purple-400 mt-0.5" />
                                  <div className="min-w-0">
                                    <p className="text-white/40 text-xs">Recipient</p>
                                    <p className="text-white font-medium truncate">{result.recipient_name}</p>
                                  </div>
                                </div>
                              )}
                              {result.recipient_org && (
                                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                  <Building className="w-5 h-5 text-amber-400 mt-0.5" />
                                  <div className="min-w-0">
                                    <p className="text-white/40 text-xs">Organization</p>
                                    <p className="text-white font-medium truncate">{result.recipient_org}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {result.description && (
                              <div className="mt-4 p-3 bg-white/5 rounded-xl">
                                <p className="text-white/40 text-xs mb-1">Description</p>
                                <p className="text-white/80 text-sm">{result.description}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Stamp Details Grid - Redesigned */}
                        {result.stamp_id && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl border border-emerald-500/20 text-center group hover:border-emerald-500/40 transition-all">
                              <Fingerprint className="w-5 h-5 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                              <p className="text-white/40 text-[10px] sm:text-xs mb-1">Stamp ID</p>
                              <p className="font-mono text-[10px] sm:text-xs font-semibold text-white truncate">{result.stamp_id}</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl border border-blue-500/20 text-center group hover:border-blue-500/40 transition-all">
                              <ShieldCheck className="w-5 h-5 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                              <p className="text-white/40 text-[10px] sm:text-xs mb-1">Status</p>
                              <Badge className={`text-[10px] sm:text-xs ${result.stamp_status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-500"}`}>
                                {result.stamp_status}
                              </Badge>
                            </div>
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl border border-purple-500/20 text-center group hover:border-purple-500/40 transition-all">
                              <Calendar className="w-5 h-5 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                              <p className="text-white/40 text-[10px] sm:text-xs mb-1">Issued</p>
                              <p className="text-white text-[10px] sm:text-xs">{new Date(result.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl border border-amber-500/20 text-center group hover:border-amber-500/40 transition-all">
                              <Clock className="w-5 h-5 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                              <p className="text-white/40 text-[10px] sm:text-xs mb-1">Valid Until</p>
                              <p className="text-white text-[10px] sm:text-xs">{new Date(result.expires_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        )}

                        {/* Document Hash */}
                        {result.document_hash && (
                          <div className="p-4 bg-black/40 rounded-xl border border-white/10">
                            <div className="flex items-center gap-2 text-white/40 text-xs mb-2">
                              <Hash className="w-4 h-4" />
                              Document Fingerprint (SHA-256)
                            </div>
                            <p className="font-mono text-[10px] sm:text-xs text-white/60 break-all select-all">{result.document_hash}</p>
                          </div>
                        )}

                        {/* Document Validation Section */}
                        {result.valid && result.document_hash && (
                          <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                            <div className="flex items-center gap-2 mb-3">
                              <FileCheck className="w-5 h-5 text-blue-400" />
                              <h4 className="text-white font-medium">Verify Document Authenticity</h4>
                            </div>
                            <p className="text-white/50 text-sm mb-4">
                              Upload the document to confirm it hasn&apos;t been modified since stamping.
                            </p>
                            
                            {/* Validation Result */}
                            {documentValidation && (
                              <div className={`p-4 rounded-lg mb-4 ${
                                documentValidation.hash_match 
                                  ? "bg-emerald-500/20 border border-emerald-500/30" 
                                  : "bg-red-500/20 border border-red-500/30"
                              }`}>
                                <div className="flex items-center gap-2 mb-2">
                                  {documentValidation.hash_match ? (
                                    <>
                                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                      <span className="text-emerald-400 font-semibold">Document Verified</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-5 h-5 text-red-400" />
                                      <span className="text-red-400 font-semibold">Document Tampered</span>
                                    </>
                                  )}
                                </div>
                                <p className={`text-sm ${documentValidation.hash_match ? "text-emerald-300/80" : "text-red-300/80"}`}>
                                  {documentValidation.message}
                                </p>
                                {!documentValidation.hash_match && (
                                  <p className="text-red-300/60 text-xs mt-2">
                                    The document has been modified after the TLS stamp was applied. This may indicate tampering.
                                  </p>
                                )}
                              </div>
                            )}
                            
                            <label className="block">
                              <input
                                ref={validateFileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleValidateDocument}
                                className="hidden"
                                disabled={validatingDocument}
                              />
                              <Button 
                                onClick={() => validateFileInputRef.current?.click()}
                                disabled={validatingDocument}
                                className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-xl h-11"
                              >
                                {validatingDocument ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Validating...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Document to Verify
                                  </>
                                )}
                              </Button>
                            </label>
                          </div>
                        )}

                        {/* Verification Count */}
                        {result.verification_count !== undefined && (
                          <div className="flex items-center justify-center gap-2 py-3 sm:py-4">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                            <span className="text-white/60 text-sm">
                              Verified <span className="text-emerald-400 font-bold">{result.verification_count}</span> times
                            </span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <Button 
                            onClick={copyStampId}
                            variant="outline"
                            className="flex-1 h-11 rounded-xl border-white/20 text-white hover:bg-white/10"
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Stamp ID
                          </Button>
                          <Button 
                            onClick={shareVerification}
                            variant="outline"
                            className="flex-1 h-11 rounded-xl border-white/20 text-white hover:bg-white/10"
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Not Found State */}
                    {!result.advocate_name && !result.valid && (
                      <div className="p-6 sm:p-8 text-center">
                        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <ShieldX className="w-12 h-12 text-red-500 mx-auto mb-4" />
                          <p className="text-white text-lg font-semibold mb-2">Document Not Authenticated</p>
                          <p className="text-white/50 max-w-md mx-auto text-sm">
                            This document does not have a valid TLS verification stamp. It may be fraudulent or has been modified after stamping.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Verify Another Button */}
                <Button 
                  onClick={resetSearch}
                  className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl h-12"
                >
                  Verify Another Document
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-10 sm:mt-12 text-center">
          <p className="text-white/40 text-xs sm:text-sm mb-3">Need help verifying a document?</p>
          <div className="flex flex-wrap justify-center gap-4 text-xs sm:text-sm">
            <a href="mailto:verify@tls.or.tz" className="flex items-center gap-2 text-white/60 hover:text-emerald-400 transition-colors">
              <Mail className="w-4 h-4" />
              verify@tls.or.tz
            </a>
            <a href="tel:+255222115995" className="flex items-center gap-2 text-white/60 hover:text-emerald-400 transition-colors">
              <Phone className="w-4 h-4" />
              +255 22 211 5995
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-white/30 text-xs">© 2025 Tanganyika Law Society. All rights reserved.</p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes successBounce {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-success-bounce {
          animation: successBounce 0.6s ease-out;
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default VerifyPage;
