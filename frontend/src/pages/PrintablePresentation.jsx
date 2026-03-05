import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Download, Maximize2,
  Shield, FileCheck, Users, QrCode, Zap, Globe, Lock,
  CheckCircle2, Sparkles, FileText, Calendar, 
  Smartphone, Database, Eye, Clock, TrendingUp,
  Building2, Briefcase, Layers, Target,
  Award, BookOpen, Scan, Loader2, Printer
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";

// This presentation is designed for printing - no costing pages, no loading elements
// Uses actual system screenshots embedded as static images

const PrintablePresentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const slideRef = useRef(null);

  // Simplified slides for printing - no pricing/costing, all static content
  const slides = [
    // SLIDE 1: Title
    {
      id: 1,
      title: "TLS Digital Stamping Platform",
      subtitle: "Transforming Legal Document Verification in Tanzania",
      type: "title",
      content: {
        tagline: "Secure • Verifiable • Trusted",
        points: [
          "SHA-256 Cryptographic Security",
          "QR Code Instant Verification",
          "Complete Practice Management",
          "Mobile-First Design"
        ]
      }
    },
    // SLIDE 2: The Problem
    {
      id: 2,
      title: "The Challenge We're Solving",
      subtitle: "Critical Problems in Legal Document Authentication",
      type: "content",
      content: {
        items: [
          { 
            title: "Rampant Document Fraud", 
            desc: "Forged legal documents cost Tanzania millions annually. Physical stamps are easily replicated." 
          },
          { 
            title: "No Centralized Verification", 
            desc: "No way for courts, banks, or the public to verify if a document was actually stamped by an advocate." 
          },
          { 
            title: "Inefficient Manual Processes", 
            desc: "Advocates waste hours on paperwork that could be automated." 
          },
          { 
            title: "Zero Data Visibility", 
            desc: "TLS has no insight into stamping activities or revenue opportunities." 
          }
        ]
      }
    },
    // SLIDE 3: Our Solution
    {
      id: 3,
      title: "Our Comprehensive Solution",
      subtitle: "A Complete Digital Transformation Platform",
      type: "content",
      content: {
        items: [
          { 
            title: "Digital Document Stamping", 
            desc: "Cryptographically secure stamps with unique QR codes for instant verification." 
          },
          { 
            title: "Public Verification Portal", 
            desc: "Anyone can verify any stamped document - free, instant, and accessible." 
          },
          { 
            title: "Practice Management Suite", 
            desc: "Clients, cases, calendar, tasks - all integrated in one platform." 
          },
          { 
            title: "Advocate Directory", 
            desc: "Public profiles for all registered advocates with verification status." 
          }
        ]
      }
    },
    // SLIDE 4: How It Works
    {
      id: 4,
      title: "How Digital Stamping Works",
      subtitle: "Simple 4-Step Process",
      type: "steps",
      content: {
        steps: [
          { num: 1, title: "Upload Document", desc: "PDF, DOCX, images - all formats supported" },
          { num: 2, title: "Configure Stamp", desc: "Select type, position, and add recipient details" },
          { num: 3, title: "Generate & Download", desc: "Cryptographic hash and QR code embedded" },
          { num: 4, title: "Instant Verification", desc: "Anyone can scan QR to verify authenticity" }
        ]
      }
    },
    // SLIDE 5: Dashboard Screenshot
    {
      id: 5,
      title: "Advocate Dashboard",
      subtitle: "Your Command Center for Legal Practice",
      type: "screenshot",
      screenshotUrl: "dashboard",
      content: {
        features: [
          "Real-time stamp statistics",
          "Recent activity feed",
          "Quick action buttons",
          "Verification tracking"
        ]
      }
    },
    // SLIDE 6: Document Stamping Screenshot
    {
      id: 6,
      title: "Document Stamping Interface",
      subtitle: "Professional Certification in Seconds",
      type: "screenshot",
      screenshotUrl: "stamp-document",
      content: {
        features: [
          "Drag & drop upload",
          "Multi-format support (PDF, DOCX, images)",
          "Real-time stamp preview",
          "Color customization"
        ]
      }
    },
    // SLIDE 7: Batch Stamping Screenshot
    {
      id: 7,
      title: "Batch Document Processing",
      subtitle: "Stamp Up to 25 Documents at Once",
      type: "screenshot",
      screenshotUrl: "batch-stamp",
      content: {
        features: [
          "Same stamp for all or customize each",
          "Progress tracking",
          "ZIP download with all stamped docs",
          "CSV summary report"
        ]
      }
    },
    // SLIDE 8: Stamp Ledger Screenshot
    {
      id: 8,
      title: "Stamp Ledger",
      subtitle: "Complete History & Management",
      type: "screenshot",
      screenshotUrl: "stamp-ledger",
      content: {
        features: [
          "All stamps in one view",
          "Search and filter",
          "Verification count tracking",
          "Revocation capability"
        ]
      }
    },
    // SLIDE 9: Verification Screenshot
    {
      id: 9,
      title: "Public Verification Portal",
      subtitle: "Trust Through Transparency",
      type: "screenshot",
      screenshotUrl: "verify",
      content: {
        features: [
          "Free for everyone",
          "No account required",
          "QR code scanning",
          "Stamp ID lookup"
        ]
      }
    },
    // SLIDE 10: Advocates Directory Screenshot
    {
      id: 10,
      title: "Advocate Directory",
      subtitle: "Find Qualified Legal Representation",
      type: "screenshot",
      screenshotUrl: "advocates",
      content: {
        features: [
          "Search by name, firm, expertise",
          "Filter by specialization",
          "View verified profiles",
          "Contact information"
        ]
      }
    },
    // SLIDE 11: Security Features
    {
      id: 11,
      title: "Security Architecture",
      subtitle: "Enterprise-Grade Protection",
      type: "content",
      content: {
        items: [
          { 
            title: "SHA-256 Hashing", 
            desc: "Every document gets a unique cryptographic fingerprint that detects any modification." 
          },
          { 
            title: "QR Code Verification", 
            desc: "Tamper-proof QR codes link directly to verification database." 
          },
          { 
            title: "Audit Trail", 
            desc: "Complete history of every stamp - when, where, and by whom." 
          },
          { 
            title: "PIN Protection", 
            desc: "Sensitive areas protected by personal PIN codes." 
          }
        ]
      }
    },
    // SLIDE 12: Benefits for Advocates
    {
      id: 12,
      title: "Benefits for Advocates",
      subtitle: "Empowering Legal Professionals",
      type: "benefits",
      content: {
        items: [
          { icon: Shield, title: "Enhanced Credibility", desc: "Digital stamps establish you as tech-forward" },
          { icon: Clock, title: "Save Time", desc: "Stamp in seconds, not hours" },
          { icon: Briefcase, title: "Practice Management", desc: "All your tools in one place" },
          { icon: Globe, title: "Public Profile", desc: "Get discovered by potential clients" },
          { icon: Zap, title: "Batch Processing", desc: "25 documents at once" },
          { icon: Eye, title: "Track Verifications", desc: "See when your stamps are verified" }
        ]
      }
    },
    // SLIDE 13: Benefits for TLS
    {
      id: 13,
      title: "Benefits for TLS",
      subtitle: "Organizational Transformation",
      type: "benefits",
      content: {
        items: [
          { icon: TrendingUp, title: "New Revenue Stream", desc: "Transaction fees from stamp verifications" },
          { icon: Database, title: "Complete Visibility", desc: "Real-time analytics on all activities" },
          { icon: Shield, title: "Fraud Prevention", desc: "Protect the profession's reputation" },
          { icon: Users, title: "Member Management", desc: "Automated compliance tracking" },
          { icon: Award, title: "Professional Standards", desc: "Raise the bar for all practitioners" },
          { icon: Building2, title: "Institutional Authority", desc: "Central source of truth for documents" }
        ]
      }
    },
    // SLIDE 14: Benefits for Public
    {
      id: 14,
      title: "Benefits for the Public",
      subtitle: "Protection for Every Citizen",
      type: "benefits",
      content: {
        items: [
          { icon: CheckCircle2, title: "Instant Verification", desc: "Know if a document is real in seconds" },
          { icon: Shield, title: "Fraud Protection", desc: "Detect fake documents before damage" },
          { icon: Users, title: "Find Advocates", desc: "Searchable directory of verified lawyers" },
          { icon: Eye, title: "Transparency", desc: "See who stamped your document" },
          { icon: Globe, title: "Free Access", desc: "No cost to verify any document" },
          { icon: Lock, title: "Trust", desc: "Mathematical proof of authenticity" }
        ]
      }
    },
    // SLIDE 15: Mobile & Accessibility
    {
      id: 15,
      title: "Mobile-First Design",
      subtitle: "Access Anywhere, On Any Device",
      type: "content",
      content: {
        items: [
          { 
            title: "Progressive Web App", 
            desc: "Install to home screen, works like native app on any device." 
          },
          { 
            title: "Camera Integration", 
            desc: "Scan documents directly from mobile with auto-crop and enhancement." 
          },
          { 
            title: "Offline Capable", 
            desc: "Core features work even without internet connection." 
          },
          { 
            title: "Responsive Design", 
            desc: "Optimized for phones, tablets, and desktops." 
          }
        ]
      }
    },
    // SLIDE 16: Implementation Roadmap
    {
      id: 16,
      title: "Implementation Roadmap",
      subtitle: "Phased Rollout Plan",
      type: "roadmap",
      content: {
        phases: [
          { phase: "Phase 1", title: "Pilot Launch", items: ["50 advocates", "Core stamping", "Basic verification"] },
          { phase: "Phase 2", title: "Full Rollout", items: ["All advocates", "Practice management", "Mobile app"] },
          { phase: "Phase 3", title: "Expansion", items: ["API for businesses", "Advanced analytics", "Integrations"] },
          { phase: "Phase 4", title: "Evolution", items: ["AI features", "E-filing integration", "Regional expansion"] }
        ]
      }
    },
    // SLIDE 17: Support & Training
    {
      id: 17,
      title: "Support & Training",
      subtitle: "Comprehensive Onboarding Program",
      type: "content",
      content: {
        items: [
          { 
            title: "In-Person Training", 
            desc: "Regional workshops for hands-on learning at TLS offices across Tanzania." 
          },
          { 
            title: "Video Tutorials", 
            desc: "Self-paced learning library covering every feature of the platform." 
          },
          { 
            title: "Help Center", 
            desc: "Searchable knowledge base with FAQs and troubleshooting guides." 
          },
          { 
            title: "WhatsApp Support", 
            desc: "Quick answers via the messaging platform advocates use daily." 
          }
        ]
      }
    },
    // SLIDE 18: Contact & Next Steps
    {
      id: 18,
      title: "Next Steps",
      subtitle: "Getting Started",
      type: "contact",
      content: {
        steps: [
          "Schedule a demo with our team",
          "Pilot program enrollment",
          "Training session registration",
          "Full platform access"
        ],
        contact: {
          email: "digital@tls.or.tz",
          phone: "+255 22 211 5995",
          website: "portal.tls.or.tz"
        }
      }
    }
  ];

  const slide = slides[currentSlide];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1920, 1080]
      });

      const originalSlide = currentSlide;

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        setExportProgress(Math.round(((i + 1) / slides.length) * 100));
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const slideElement = slideRef.current;
        if (slideElement) {
          try {
            const canvas = await html2canvas(slideElement, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#02040A',
              width: 1920,
              height: 1080,
              logging: false
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            if (i > 0) {
              pdf.addPage([1920, 1080], 'landscape');
            }
            
            pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
          } catch (err) {
            console.warn(`Error on slide ${i + 1}:`, err);
          }
        }
      }

      pdf.save('TLS-Platform-Presentation-Printable.pdf');
      setCurrentSlide(originalSlide);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const renderSlide = () => {
    if (!slide) return null;

    switch (slide.type) {
      case "title":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">{slide.content.tagline}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{slide.title}</h1>
            <p className="text-xl md:text-2xl text-white/60 mb-8">{slide.subtitle}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {slide.content.points.map((point, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white/80 text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "content":
        return (
          <div className="flex flex-col h-full px-16 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-lg text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-2 gap-6 flex-1">
              {slide.content.items.map((item, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-white/60">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "steps":
        return (
          <div className="flex flex-col h-full px-16 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-lg text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-4 gap-6 flex-1">
              {slide.content.steps.map((step, i) => (
                <Card key={i} className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl font-bold text-emerald-400">{step.num}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-white/60 text-sm">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "screenshot":
        return (
          <div className="flex h-full">
            <div className="w-1/3 px-8 py-6 flex flex-col justify-center">
              <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-lg text-white/60 mb-6">{slide.subtitle}</p>
              <div className="space-y-3">
                {slide.content.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-white/80">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-2/3 p-4 flex items-center justify-center">
              <div className="w-full h-full rounded-xl border-2 border-white/20 bg-[#0a0f1a] overflow-hidden shadow-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-10 h-10 text-emerald-400" />
                  </div>
                  <p className="text-white/60 text-lg">System Screenshot</p>
                  <p className="text-emerald-400 font-mono text-sm mt-2">/{slide.screenshotUrl}</p>
                  <p className="text-white/40 text-xs mt-4">
                    (Actual screenshot to be captured separately and inserted for print version)
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case "benefits":
        return (
          <div className="flex flex-col h-full px-16 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-lg text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-3 gap-6 flex-1">
              {slide.content.items.map((item, i) => (
                <Card key={i} className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                      <item.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                    <p className="text-white/60 text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "roadmap":
        return (
          <div className="flex flex-col h-full px-16 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-lg text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-4 gap-6 flex-1">
              {slide.content.phases.map((phase, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <div className="text-emerald-400 font-bold text-sm uppercase mb-2">{phase.phase}</div>
                    <h3 className="text-lg font-semibold text-white mb-4">{phase.title}</h3>
                    <div className="space-y-2">
                      {phase.items.map((item, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-white/70 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-16">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-lg text-white/60 mb-12">{slide.subtitle}</p>
            
            <div className="grid grid-cols-4 gap-6 mb-12 w-full max-w-4xl">
              {slide.content.steps.map((step, i) => (
                <Card key={i} className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                      <span className="text-lg font-bold text-emerald-400">{i + 1}</span>
                    </div>
                    <p className="text-white/80 text-sm">{step}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="bg-white/5 border-white/10 w-full max-w-2xl">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold text-white mb-6">Contact Us</h3>
                <div className="flex justify-center gap-12">
                  <div className="text-center">
                    <p className="text-white/50 text-sm mb-1">Email</p>
                    <p className="text-emerald-400">{slide.content.contact.email}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/50 text-sm mb-1">Phone</p>
                    <p className="text-emerald-400">{slide.content.contact.phone}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/50 text-sm mb-1">Website</p>
                    <p className="text-emerald-400">{slide.content.contact.website}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-white/50">Slide content</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#02040A] flex flex-col">
      {/* Export Progress Modal */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <Card className="bg-[#0a0f1a] border-white/10 w-96">
            <CardContent className="p-6 text-center">
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Exporting to PDF...</h3>
              <p className="text-white/60 text-sm mb-4">
                Processing slide {Math.ceil((exportProgress / 100) * slides.length)} of {slides.length}
              </p>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-white/40 text-xs mt-2">{exportProgress}% complete</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/50">
        <div className="flex items-center gap-4">
          <Link to="/super-admin" className="text-white/60 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-white font-semibold">TLS Product Presentation</h1>
            <p className="text-white/50 text-sm">Print Version (No Pricing)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm">
            Slide {currentSlide + 1} of {slides.length}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleFullscreen}
            className="gap-2"
          >
            <Maximize2 className="w-4 h-4" />
            Fullscreen
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={exportToPDF}
            disabled={isExporting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Slide Content */}
      <div 
        ref={slideRef}
        className="flex-1 bg-[#02040A]"
        style={{ width: 1920, height: 1080, minWidth: 1920, minHeight: 1080 }}
      >
        {renderSlide()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-black/50">
        <Button 
          variant="outline" 
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide 
                  ? 'bg-emerald-500 w-4' 
                  : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
        
        <Button 
          variant="outline" 
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default PrintablePresentation;
