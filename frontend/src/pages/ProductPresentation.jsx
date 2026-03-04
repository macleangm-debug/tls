import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Play, Pause, Download, Maximize2,
  Shield, FileCheck, Users, BarChart3, QrCode, Zap, Globe, Lock,
  CheckCircle2, ArrowRight, Sparkles, FileText, Calendar, Scale
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const ProductPresentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slides = [
    {
      id: 1,
      title: "TLS Digital Stamping Platform",
      subtitle: "Transforming Legal Document Verification in Tanzania",
      type: "title",
      content: {
        tagline: "Secure • Verifiable • Trusted",
        description: "A comprehensive digital solution for the Tanganyika Law Society to issue, manage, and verify tamper-proof legal document stamps.",
        highlights: [
          "SHA-256 Cryptographic Security",
          "QR Code Instant Verification",
          "Full Practice Management Suite"
        ]
      },
      background: "gradient-tls"
    },
    {
      id: 2,
      title: "The Challenge",
      subtitle: "Why Digital Transformation is Essential",
      type: "problem",
      content: {
        problems: [
          { icon: FileText, title: "Document Fraud", desc: "Paper stamps are easily forged, undermining legal document integrity" },
          { icon: Globe, title: "No Central Verification", desc: "No way for third parties to verify document authenticity" },
          { icon: Users, title: "Manual Processes", desc: "Time-consuming paper-based workflows slow down legal practice" },
          { icon: BarChart3, title: "No Analytics", desc: "Limited visibility into stamp usage and verification patterns" }
        ]
      }
    },
    {
      id: 3,
      title: "Our Solution",
      subtitle: "Digital Certification Platform",
      type: "solution",
      content: {
        features: [
          { icon: Shield, title: "Tamper-Proof Stamps", desc: "Each stamp contains SHA-256 hash binding the document content" },
          { icon: QrCode, title: "Instant Verification", desc: "QR code scanning or Stamp ID lookup for real-time verification" },
          { icon: Lock, title: "Cryptographic Security", desc: "Digital signatures ensure authenticity and non-repudiation" },
          { icon: Zap, title: "Batch Processing", desc: "Stamp up to 25 documents simultaneously" }
        ]
      }
    },
    {
      id: 4,
      title: "Document Stamping",
      subtitle: "Secure Digital Certification Process",
      type: "feature",
      screenshot: "/documents",
      content: {
        steps: [
          "Upload document (PDF, DOCX, Images)",
          "Enter document details and recipient",
          "Choose stamp color and position",
          "Generate tamper-proof digital stamp"
        ],
        benefits: [
          "Documents never stored on servers",
          "Unique Stamp ID for each document",
          "QR code embedded in PDF"
        ]
      }
    },
    {
      id: 5,
      title: "Public Verification",
      subtitle: "Trust Through Transparency",
      type: "feature",
      screenshot: "/verify",
      content: {
        methods: [
          { title: "Stamp ID", desc: "Enter the unique stamp identifier" },
          { title: "QR Code Scan", desc: "Use camera to scan document QR" },
          { title: "Document Upload", desc: "Upload to verify hash integrity" }
        ],
        verification: [
          "Advocate name and credentials",
          "Document issue date and expiry",
          "Tampering detection via hash"
        ]
      }
    },
    {
      id: 6,
      title: "Practice Management",
      subtitle: "Complete Legal Practice Suite",
      type: "feature",
      screenshot: "/practice",
      content: {
        modules: [
          { icon: Users, title: "Client Management", desc: "Track clients and relationships" },
          { icon: FileText, title: "Case Management", desc: "Manage cases, hearings, tasks" },
          { icon: Calendar, title: "Calendar & Tasks", desc: "Schedule and track deadlines" },
          { icon: BarChart3, title: "Financial Tracking", desc: "Invoices and revenue analytics" }
        ]
      }
    },
    {
      id: 7,
      title: "Advocate Directory",
      subtitle: "Public-Facing Professional Profiles",
      type: "feature",
      screenshot: "/advocates",
      content: {
        features: [
          "Searchable advocate directory",
          "Verified TLS member badges",
          "Practice areas and expertise",
          "Contact information (opt-in)",
          "Profile completion tracking"
        ]
      }
    },
    {
      id: 8,
      title: "Institutional Portal",
      subtitle: "For Banks, Courts & Organizations",
      type: "enterprise",
      content: {
        features: [
          { title: "Bulk Verification API", desc: "Verify multiple documents programmatically" },
          { title: "Webhook Notifications", desc: "Real-time verification alerts" },
          { title: "Usage Analytics", desc: "Comprehensive reporting dashboard" },
          { title: "Custom Integration", desc: "REST API with full documentation" }
        ],
        pricing: [
          { tier: "Basic", credits: 10, price: "250,000 TZS" },
          { tier: "Standard", credits: 50, price: "1,000,000 TZS" },
          { tier: "Professional", credits: 200, price: "3,500,000 TZS" },
          { tier: "Enterprise", credits: 500, price: "7,500,000 TZS" }
        ]
      }
    },
    {
      id: 9,
      title: "Security & Compliance",
      subtitle: "Built for Trust",
      type: "security",
      content: {
        security: [
          { icon: Lock, title: "End-to-End Encryption", desc: "All data encrypted in transit and at rest" },
          { icon: Shield, title: "SHA-256 Hashing", desc: "Cryptographic document binding" },
          { icon: CheckCircle2, title: "Audit Logging", desc: "Complete verification trail" },
          { icon: Scale, title: "Legal Compliance", desc: "Meets Tanzanian legal requirements" }
        ]
      }
    },
    {
      id: 10,
      title: "Key Benefits",
      subtitle: "Value for All Stakeholders",
      type: "benefits",
      content: {
        stakeholders: [
          {
            title: "For Advocates",
            benefits: ["Professional digital stamps", "Practice management tools", "Revenue from verifications", "Public profile & visibility"]
          },
          {
            title: "For TLS",
            benefits: ["Centralized oversight", "Revenue generation", "Member engagement", "Digital transformation"]
          },
          {
            title: "For Public",
            benefits: ["Instant verification", "Fraud prevention", "Trust in legal docs", "Find qualified advocates"]
          }
        ]
      }
    },
    {
      id: 11,
      title: "Thank You",
      subtitle: "Questions & Discussion",
      type: "closing",
      content: {
        contact: {
          website: "stamp-and-manage.preview.emergentagent.com",
          email: "support@tls.or.tz",
          phone: "+255 22 211 5995"
        },
        cta: "Ready to Transform Legal Document Verification"
      }
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const slide = slides[currentSlide];

  const renderSlideContent = () => {
    switch (slide.type) {
      case "title":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-8">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">{slide.content.tagline}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 font-heading">{slide.title}</h1>
            <p className="text-xl md:text-2xl text-white/60 mb-8 max-w-3xl">{slide.subtitle}</p>
            <p className="text-lg text-white/50 mb-12 max-w-2xl">{slide.content.description}</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {slide.content.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white/80">{h}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "problem":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-12">{slide.subtitle}</p>
            <div className="grid grid-cols-2 gap-8 flex-1">
              {slide.content.problems.map((p, i) => (
                <Card key={i} className="bg-red-500/5 border-red-500/20">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
                      <p.icon className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{p.title}</h3>
                    <p className="text-white/60">{p.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "solution":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-12">{slide.subtitle}</p>
            <div className="grid grid-cols-2 gap-8 flex-1">
              {slide.content.features.map((f, i) => (
                <Card key={i} className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                      <f.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{f.title}</h3>
                    <p className="text-white/60">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "feature":
        return (
          <div className="flex h-full">
            <div className="w-1/3 px-8 py-8 flex flex-col">
              <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-lg text-white/60 mb-8">{slide.subtitle}</p>
              
              {slide.content.steps && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-emerald-400 uppercase mb-3">Process</h4>
                  <div className="space-y-3">
                    {slide.content.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-white/70 text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {slide.content.methods && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-emerald-400 uppercase mb-3">Verification Methods</h4>
                  <div className="space-y-3">
                    {slide.content.methods.map((m, i) => (
                      <div key={i} className="p-3 bg-white/5 rounded-lg">
                        <h5 className="text-white font-medium text-sm">{m.title}</h5>
                        <p className="text-white/50 text-xs">{m.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {slide.content.modules && (
                <div className="space-y-3">
                  {slide.content.modules.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <m.icon className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h5 className="text-white font-medium text-sm">{m.title}</h5>
                        <p className="text-white/50 text-xs">{m.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {slide.content.features && Array.isArray(slide.content.features) && typeof slide.content.features[0] === 'string' && (
                <div className="space-y-2">
                  {slide.content.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-white/70 text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="w-2/3 p-4 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
              <div className="w-full h-full rounded-xl border border-white/10 bg-[#02040A] overflow-hidden shadow-2xl">
                <iframe 
                  src={`https://stamp-and-manage.preview.emergentagent.com${slide.screenshot}`}
                  className="w-full h-full"
                  title={slide.title}
                />
              </div>
            </div>
          </div>
        );

      case "enterprise":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-2 gap-8 mb-8">
              {slide.content.features.map((f, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-1">{f.title}</h4>
                  <p className="text-white/60 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
            
            <h4 className="text-lg font-semibold text-emerald-400 mb-4">Verification Credit Packages</h4>
            <div className="grid grid-cols-4 gap-4">
              {slide.content.pricing.map((p, i) => (
                <Card key={i} className={`${i === 1 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                  <CardContent className="p-4 text-center">
                    <h5 className="text-white font-semibold">{p.tier}</h5>
                    <p className="text-2xl font-bold text-emerald-400 my-2">{p.credits}</p>
                    <p className="text-white/50 text-xs">credits</p>
                    <p className="text-white/80 text-sm mt-2">{p.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "security":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-12">{slide.subtitle}</p>
            <div className="grid grid-cols-2 gap-8">
              {slide.content.security.map((s, i) => (
                <Card key={i} className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <s.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{s.title}</h3>
                      <p className="text-white/60">{s.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "benefits":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-3 gap-8 flex-1">
              {slide.content.stakeholders.map((s, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-emerald-400 mb-4">{s.title}</h3>
                    <div className="space-y-3">
                      {s.benefits.map((b, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-white/80">{b}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "closing":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">{slide.title}</h1>
            <p className="text-2xl text-white/60 mb-12">{slide.subtitle}</p>
            
            <div className="flex gap-8 mb-12">
              <div className="text-center">
                <Globe className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white/80">{slide.content.contact.website}</p>
              </div>
              <div className="text-center">
                <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white/80">{slide.content.contact.email}</p>
              </div>
              <div className="text-center">
                <Users className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white/80">{slide.content.contact.phone}</p>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 rounded-full border border-emerald-500/30">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">{slide.content.cta}</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#02040A] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link to="/super-admin" className="text-white/60 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-white font-semibold">Product Presentation</h1>
            <p className="text-white/50 text-sm">TLS Digital Stamping Platform</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-sm">
            Slide {currentSlide + 1} of {slides.length}
          </span>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="w-4 h-4 mr-2" />
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>
      </div>
      
      {/* Slide Content */}
      <div className="flex-1 relative overflow-hidden">
        {renderSlideContent()}
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/20">
        <Button variant="outline" onClick={prevSlide} disabled={currentSlide === 0}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide ? 'w-6 bg-emerald-500' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
        
        <Button onClick={nextSlide} disabled={currentSlide === slides.length - 1}>
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ProductPresentation;
