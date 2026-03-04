import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Play, Pause, Download, Maximize2,
  Shield, FileCheck, Users, BarChart3, QrCode, Zap, Globe, Lock,
  CheckCircle2, ArrowRight, Sparkles, FileText, Calendar, Scale,
  Smartphone, Cloud, Database, Key, Eye, Clock, TrendingUp,
  Building2, Landmark, CreditCard, DollarSign, Layers, Target,
  Award, BookOpen, Fingerprint, RefreshCw, Upload, Search,
  Bell, Settings, PieChart, Activity, MapPin, Phone, Mail,
  Briefcase, GraduationCap, FileSpreadsheet, Scan, Printer
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const ProductPresentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slides = [
    // SLIDE 1: Title
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
      }
    },
    // SLIDE 2: Executive Summary
    {
      id: 2,
      title: "Executive Summary",
      subtitle: "Platform at a Glance",
      type: "summary",
      content: {
        mission: "To modernize legal document authentication in Tanzania through secure digital stamps, protecting the integrity of legal practice while generating sustainable revenue for TLS.",
        keyPoints: [
          { label: "Target Users", value: "5,000+ Registered Advocates" },
          { label: "Document Types", value: "Contracts, Affidavits, Court Filings" },
          { label: "Verification Method", value: "QR Code + SHA-256 Hash" },
          { label: "Revenue Model", value: "Verification Fees + Subscriptions" }
        ],
        timeline: "Phase 1 Complete • Ready for Pilot Deployment"
      }
    },
    // SLIDE 3: The Challenge
    {
      id: 3,
      title: "The Challenge",
      subtitle: "Why Digital Transformation is Essential",
      type: "problem",
      content: {
        problems: [
          { icon: FileText, title: "Document Fraud", desc: "Paper stamps are easily forged, undermining legal document integrity and public trust", color: "red" },
          { icon: Globe, title: "No Central Verification", desc: "No way for banks, courts, or public to verify document authenticity instantly", color: "red" },
          { icon: Users, title: "Manual Processes", desc: "Time-consuming paper-based workflows slow down legal practice efficiency", color: "red" },
          { icon: BarChart3, title: "No Analytics", desc: "Limited visibility into stamp usage, verification patterns, and member activity", color: "red" }
        ],
        impact: "These challenges cost the legal industry millions in fraud, delays, and lost trust annually."
      }
    },
    // SLIDE 4: Our Solution Overview
    {
      id: 4,
      title: "Our Solution",
      subtitle: "Digital Certification Platform",
      type: "solution",
      content: {
        features: [
          { icon: Shield, title: "Tamper-Proof Stamps", desc: "Each stamp contains SHA-256 hash binding the document content permanently" },
          { icon: QrCode, title: "Instant Verification", desc: "QR code scanning or Stamp ID lookup for real-time verification anywhere" },
          { icon: Lock, title: "Cryptographic Security", desc: "Digital signatures ensure authenticity and non-repudiation" },
          { icon: Zap, title: "Batch Processing", desc: "Stamp up to 25 documents simultaneously for high-volume practices" }
        ]
      }
    },
    // SLIDE 5: How It Works - Technical Flow
    {
      id: 5,
      title: "How It Works",
      subtitle: "Document Stamping Technical Flow",
      type: "flow",
      content: {
        steps: [
          { num: 1, title: "Upload Document", desc: "Advocate uploads PDF, DOCX, or image file", icon: Upload },
          { num: 2, title: "Generate Hash", desc: "SHA-256 hash computed from document content", icon: Key },
          { num: 3, title: "Create Stamp", desc: "Unique stamp ID, QR code, and metadata generated", icon: QrCode },
          { num: 4, title: "Bind to Document", desc: "Stamp embedded in PDF with verification URL", icon: FileCheck },
          { num: 5, title: "Store Record", desc: "Hash and stamp metadata stored in database", icon: Database },
          { num: 6, title: "Ready to Verify", desc: "Anyone can verify via QR scan or stamp ID", icon: CheckCircle2 }
        ],
        note: "Document content is NEVER stored on servers - only the cryptographic hash"
      }
    },
    // SLIDE 6: Document Stamping Demo
    {
      id: 6,
      title: "Document Stamping",
      subtitle: "Secure Digital Certification Process",
      type: "feature",
      screenshot: "/documents",
      content: {
        steps: [
          "Upload document (PDF, DOCX, XLSX, PPTX, Images)",
          "Enter document details and recipient information",
          "Choose stamp color, type, and position",
          "Add digital signature (optional)",
          "Generate tamper-proof digital stamp",
          "Download stamped PDF with embedded QR"
        ],
        benefits: [
          "Documents never stored on servers",
          "Unique Stamp ID for each document",
          "QR code embedded in PDF",
          "Instant verification capability"
        ]
      }
    },
    // SLIDE 7: Stamp Types & Customization
    {
      id: 7,
      title: "Stamp Types & Customization",
      subtitle: "Professional Certification Options",
      type: "stamps",
      content: {
        types: [
          { name: "Certification", desc: "Standard document authentication", color: "#10B981", price: "5,000 TZS" },
          { name: "Commissioner", desc: "Commissioner for Oaths certification", color: "#3B82F6", price: "7,500 TZS" },
          { name: "Notary", desc: "Notary Public certification", color: "#8B5CF6", price: "10,000 TZS" }
        ],
        customization: [
          { feature: "Color Selection", desc: "9 professional border colors" },
          { feature: "Position Control", desc: "6 placement options on page" },
          { feature: "Page Selection", desc: "First page, last page, or all pages" },
          { feature: "Digital Signature", desc: "Hand-drawn signature integration" },
          { feature: "Recipient Details", desc: "Name and organization on stamp" }
        ]
      }
    },
    // SLIDE 8: Batch Stamping
    {
      id: 8,
      title: "Batch Document Processing",
      subtitle: "Efficiency for High-Volume Practices",
      type: "feature",
      screenshot: "/batch-stamp",
      content: {
        capabilities: [
          "Process up to 25 documents at once",
          "Apply same stamp to all or different stamps per doc",
          "Download as ZIP with summary report",
          "Each document gets unique stamp ID",
          "Bulk verification capability"
        ],
        useCases: [
          "Law firms with multiple client documents",
          "Court filing batches",
          "Contract packages",
          "Corporate documentation"
        ]
      }
    },
    // SLIDE 9: Public Verification Portal
    {
      id: 9,
      title: "Public Verification",
      subtitle: "Trust Through Transparency",
      type: "feature",
      screenshot: "/verify",
      content: {
        methods: [
          { title: "Stamp ID Lookup", desc: "Enter the unique stamp identifier directly", icon: Search },
          { title: "QR Code Scan", desc: "Use device camera to scan document QR code", icon: Scan },
          { title: "Document Upload", desc: "Upload document to verify hash integrity", icon: Upload }
        ],
        verification: [
          "Advocate name, credentials, and photo",
          "TLS membership verification",
          "Document issue date and expiry",
          "Tampering detection via hash comparison",
          "Verification count and history"
        ]
      }
    },
    // SLIDE 10: Verification Result Details
    {
      id: 10,
      title: "Verification Results",
      subtitle: "Comprehensive Document Authentication",
      type: "verification-detail",
      content: {
        validResult: [
          { field: "Stamp Status", value: "VALID ✓", color: "green" },
          { field: "Advocate Name", value: "Full name and credentials" },
          { field: "Roll Number", value: "Advocate registration number" },
          { field: "TLS Member #", value: "Membership verification" },
          { field: "Practicing Status", value: "Active/Suspended indicator" },
          { field: "Document Hash", value: "SHA-256 integrity check" },
          { field: "Issue Date", value: "When stamp was created" },
          { field: "Expiry Date", value: "Stamp validity period" }
        ],
        tamperDetection: "If document is modified after stamping, hash mismatch is detected and verification FAILS - proving document tampering."
      }
    },
    // SLIDE 11: Practice Management Suite
    {
      id: 11,
      title: "Practice Management",
      subtitle: "Complete Legal Practice Suite",
      type: "feature",
      screenshot: "/practice",
      content: {
        modules: [
          { icon: Users, title: "Client Management", desc: "Track clients, contacts, and relationships" },
          { icon: Briefcase, title: "Case Management", desc: "Manage cases, parties, and case files" },
          { icon: Calendar, title: "Calendar & Hearings", desc: "Schedule hearings, deadlines, and tasks" },
          { icon: FileText, title: "Document Library", desc: "Organize case documents and templates" },
          { icon: DollarSign, title: "Financial Tracking", desc: "Invoices, payments, and revenue" },
          { icon: Bell, title: "Reminders", desc: "Automated deadline notifications" }
        ]
      }
    },
    // SLIDE 12: Case Management Details
    {
      id: 12,
      title: "Case Management",
      subtitle: "Organize Your Legal Practice",
      type: "case-management",
      content: {
        features: [
          { title: "Case Tracking", items: ["Case number and title", "Court and jurisdiction", "Judge assignment", "Case status workflow"] },
          { title: "Hearings", items: ["Date and time scheduling", "Court room assignment", "Calendar integration", "Reminder notifications"] },
          { title: "Tasks & To-Do", items: ["Task assignment", "Due date tracking", "Priority levels", "Completion status"] },
          { title: "Documents", items: ["File attachments", "Version control", "Quick access", "Stamp integration"] }
        ]
      }
    },
    // SLIDE 13: Advocate Directory
    {
      id: 13,
      title: "Advocate Directory",
      subtitle: "Public-Facing Professional Profiles",
      type: "feature",
      screenshot: "/advocates",
      content: {
        features: [
          "Searchable advocate directory",
          "Verified TLS member badges",
          "Practice areas and expertise",
          "Professional photo and bio",
          "Education and experience",
          "Contact information (opt-in)",
          "Achievement badges",
          "Profile completion tracking"
        ]
      }
    },
    // SLIDE 14: Advocate Profile Features
    {
      id: 14,
      title: "Professional Profiles",
      subtitle: "Showcase Advocate Credentials",
      type: "profile-features",
      content: {
        sections: [
          { title: "Basic Info", icon: Users, items: ["Full name and title", "Roll number", "TLS member number", "Region and court"] },
          { title: "Professional", icon: Briefcase, items: ["Practice areas", "Languages", "Experience years", "Firm affiliation"] },
          { title: "Education", icon: GraduationCap, items: ["Law degree", "Institution", "Graduation year", "Certifications"] },
          { title: "Achievements", icon: Award, items: ["Awards received", "Publications", "Memberships", "Bar admissions"] }
        ],
        privacy: "Advocates control what information is publicly visible"
      }
    },
    // SLIDE 15: Institutional Portal
    {
      id: 15,
      title: "Institutional Portal",
      subtitle: "For Banks, Courts & Organizations",
      type: "enterprise",
      content: {
        features: [
          { title: "Bulk Verification API", desc: "Verify multiple documents programmatically via REST API" },
          { title: "Webhook Notifications", desc: "Real-time alerts when documents are verified" },
          { title: "Usage Analytics", desc: "Comprehensive reporting dashboard and export" },
          { title: "Custom Integration", desc: "Full API documentation with sandbox testing" }
        ],
        pricing: [
          { tier: "Basic", credits: 10, price: "250,000 TZS", perUnit: "25,000/verification" },
          { tier: "Standard", credits: 50, price: "1,000,000 TZS", perUnit: "20,000/verification" },
          { tier: "Professional", credits: 200, price: "3,500,000 TZS", perUnit: "17,500/verification" },
          { tier: "Enterprise", credits: 500, price: "7,500,000 TZS", perUnit: "15,000/verification" }
        ]
      }
    },
    // SLIDE 16: API & Integration
    {
      id: 16,
      title: "API & Integration",
      subtitle: "Developer-Friendly Platform",
      type: "api",
      content: {
        endpoints: [
          { method: "POST", path: "/api/verify/{stamp_id}", desc: "Verify a stamp by ID" },
          { method: "POST", path: "/api/verify/document", desc: "Verify by document hash" },
          { method: "GET", path: "/api/verify/bulk", desc: "Bulk verification" },
          { method: "POST", path: "/api/webhooks", desc: "Configure webhooks" }
        ],
        features: [
          "RESTful JSON API",
          "API key authentication",
          "Rate limiting protection",
          "Sandbox testing environment",
          "Comprehensive documentation",
          "Code samples (Python, JS, PHP)"
        ]
      }
    },
    // SLIDE 17: Security Architecture
    {
      id: 17,
      title: "Security Architecture",
      subtitle: "Enterprise-Grade Protection",
      type: "security",
      content: {
        layers: [
          { icon: Lock, title: "Data Encryption", desc: "AES-256 encryption at rest, TLS 1.3 in transit" },
          { icon: Key, title: "SHA-256 Hashing", desc: "Cryptographic document binding - tamper-proof" },
          { icon: Fingerprint, title: "Digital Signatures", desc: "Non-repudiation through cryptographic signing" },
          { icon: Shield, title: "Access Control", desc: "Role-based permissions and audit logging" }
        ],
        compliance: [
          "Tanzanian legal requirements",
          "Data protection standards",
          "Audit trail for all actions",
          "Secure password policies"
        ]
      }
    },
    // SLIDE 18: Audit & Compliance
    {
      id: 18,
      title: "Audit & Compliance",
      subtitle: "Complete Transparency",
      type: "audit",
      content: {
        features: [
          { title: "Verification Logs", desc: "Every verification attempt is logged with timestamp, IP, and result" },
          { title: "Stamp Events", desc: "Complete lifecycle tracking: issued, verified, revoked, expired" },
          { title: "Login History", desc: "Track all login attempts with device and location info" },
          { title: "Admin Actions", desc: "Full audit trail of administrative changes" }
        ],
        reports: [
          "Monthly verification reports",
          "Revenue analytics",
          "User activity summaries",
          "Security incident logs"
        ]
      }
    },
    // SLIDE 19: Revenue Model
    {
      id: 19,
      title: "Revenue Model",
      subtitle: "Sustainable Growth Strategy",
      type: "revenue",
      content: {
        streams: [
          { source: "Verification Fees", desc: "50,000 TZS per public verification", icon: Eye },
          { source: "Institutional Packages", desc: "Bulk verification credits at tiered pricing", icon: Building2 },
          { source: "Advocate Subscriptions", desc: "Monthly/annual practice management access", icon: CreditCard },
          { source: "Physical Stamp Orders", desc: "Official TLS physical stamp sales", icon: Printer }
        ],
        sharing: {
          advocate: "30%",
          platform: "70%",
          description: "Advocates earn 30% of verification fees for their stamps"
        }
      }
    },
    // SLIDE 20: Benefits - Advocates
    {
      id: 20,
      title: "Benefits for Advocates",
      subtitle: "Empowering Legal Professionals",
      type: "benefits-advocates",
      content: {
        benefits: [
          { icon: Shield, title: "Professional Credibility", desc: "Verified digital stamps enhance trust in your documents" },
          { icon: DollarSign, title: "Passive Revenue", desc: "Earn 30% of verification fees on your stamps" },
          { icon: Briefcase, title: "Practice Tools", desc: "Complete case and client management suite" },
          { icon: Globe, title: "Public Profile", desc: "Showcase your expertise to potential clients" },
          { icon: Zap, title: "Efficiency", desc: "Batch stamping and digital workflows save time" },
          { icon: Bell, title: "Smart Notifications", desc: "Never miss deadlines with automated reminders" }
        ]
      }
    },
    // SLIDE 21: Benefits - TLS
    {
      id: 21,
      title: "Benefits for TLS",
      subtitle: "Organizational Transformation",
      type: "benefits-tls",
      content: {
        benefits: [
          { icon: BarChart3, title: "Revenue Generation", desc: "New sustainable income stream from verifications" },
          { icon: Users, title: "Member Engagement", desc: "Increased value proposition for membership" },
          { icon: Eye, title: "Oversight & Control", desc: "Centralized monitoring of stamp issuance" },
          { icon: TrendingUp, title: "Digital Leadership", desc: "Position TLS as innovation leader in Africa" },
          { icon: Shield, title: "Fraud Prevention", desc: "Protect the profession's integrity" },
          { icon: Database, title: "Data Insights", desc: "Analytics on member activity and trends" }
        ]
      }
    },
    // SLIDE 22: Benefits - Public
    {
      id: 22,
      title: "Benefits for Public",
      subtitle: "Trust & Transparency",
      type: "benefits-public",
      content: {
        benefits: [
          { icon: CheckCircle2, title: "Instant Verification", desc: "Verify any document in seconds via QR scan" },
          { icon: Shield, title: "Fraud Protection", desc: "Detect forged or tampered legal documents" },
          { icon: Users, title: "Find Advocates", desc: "Search verified advocate directory" },
          { icon: Eye, title: "Transparency", desc: "View advocate credentials and status" },
          { icon: Globe, title: "Free Access", desc: "Public verification portal at no cost" },
          { icon: Lock, title: "Trust", desc: "Confidence in legal document authenticity" }
        ]
      }
    },
    // SLIDE 23: Mobile & PWA
    {
      id: 23,
      title: "Mobile Experience",
      subtitle: "Access Anywhere, Anytime",
      type: "mobile",
      content: {
        features: [
          { icon: Smartphone, title: "Progressive Web App", desc: "Install on any device like a native app" },
          { icon: Scan, title: "QR Scanner", desc: "Use phone camera to verify documents" },
          { icon: Cloud, title: "Offline Support", desc: "Access cached data without internet" },
          { icon: Bell, title: "Push Notifications", desc: "Real-time alerts for verifications and deadlines" },
          { icon: RefreshCw, title: "Auto Sync", desc: "Data syncs when connection restored" },
          { icon: Zap, title: "Fast Loading", desc: "Optimized for slow network conditions" }
        ],
        stats: {
          installable: "Works on iOS, Android, Desktop",
          offline: "Core features work offline",
          fast: "< 3 second load time"
        }
      }
    },
    // SLIDE 24: Technology Stack
    {
      id: 24,
      title: "Technology Stack",
      subtitle: "Modern, Scalable Architecture",
      type: "tech",
      content: {
        stack: [
          { layer: "Frontend", tech: "React.js, TailwindCSS, PWA", icon: Layers },
          { layer: "Backend", tech: "FastAPI (Python), async/await", icon: Database },
          { layer: "Database", tech: "MongoDB (NoSQL, scalable)", icon: Database },
          { layer: "Security", tech: "JWT, CSRF, SHA-256, bcrypt", icon: Lock },
          { layer: "File Processing", tech: "LibreOffice, PyPDF2, Pillow", icon: FileText },
          { layer: "Infrastructure", tech: "Docker, Nginx, SSL/TLS", icon: Cloud }
        ],
        highlights: [
          "Horizontally scalable",
          "99.9% uptime target",
          "Auto-backup enabled",
          "CDN for fast delivery"
        ]
      }
    },
    // SLIDE 25: Implementation Roadmap
    {
      id: 25,
      title: "Implementation Roadmap",
      subtitle: "Phased Deployment Strategy",
      type: "roadmap",
      content: {
        phases: [
          { 
            phase: "Phase 1", 
            status: "Complete ✓", 
            title: "Core Platform",
            items: ["Document stamping", "Public verification", "Advocate profiles", "Basic analytics"]
          },
          { 
            phase: "Phase 2", 
            status: "In Progress", 
            title: "Practice Management",
            items: ["Case management", "Calendar integration", "Client portal", "Mobile PWA"]
          },
          { 
            phase: "Phase 3", 
            status: "Planned", 
            title: "Enterprise Features",
            items: ["Institutional API", "Bulk operations", "Advanced reporting", "Google Calendar sync"]
          },
          { 
            phase: "Phase 4", 
            status: "Future", 
            title: "Expansion",
            items: ["Payment integration", "E-filing integration", "AI document analysis", "Regional expansion"]
          }
        ]
      }
    },
    // SLIDE 26: Success Metrics
    {
      id: 26,
      title: "Success Metrics",
      subtitle: "Measuring Impact",
      type: "metrics",
      content: {
        kpis: [
          { metric: "Advocate Adoption", target: "50% of members in Year 1", icon: Users },
          { metric: "Documents Stamped", target: "100,000+ in Year 1", icon: FileText },
          { metric: "Verifications", target: "500,000+ in Year 1", icon: CheckCircle2 },
          { metric: "Revenue", target: "500M TZS in Year 1", icon: DollarSign },
          { metric: "Fraud Reduction", target: "90% decrease in forgeries", icon: Shield },
          { metric: "User Satisfaction", target: "90%+ positive feedback", icon: Award }
        ]
      }
    },
    // SLIDE 27: Support & Training
    {
      id: 27,
      title: "Support & Training",
      subtitle: "Ensuring Success",
      type: "support",
      content: {
        offerings: [
          { title: "Help Center", desc: "Comprehensive searchable documentation and FAQs" },
          { title: "Video Tutorials", desc: "Step-by-step guides for all features" },
          { title: "Live Training", desc: "Webinars and in-person training sessions" },
          { title: "Email Support", desc: "Dedicated support team for member queries" },
          { title: "Admin Dashboard", desc: "TLS admins can manage and monitor platform" },
          { title: "Regular Updates", desc: "Continuous improvement based on feedback" }
        ]
      }
    },
    // SLIDE 28: Thank You
    {
      id: 28,
      title: "Thank You",
      subtitle: "Questions & Discussion",
      type: "closing",
      content: {
        contact: {
          website: "stamp-and-manage.preview.emergentagent.com",
          email: "support@tls.or.tz",
          phone: "+255 22 211 5995"
        },
        cta: "Ready to Transform Legal Document Verification in Tanzania",
        nextSteps: [
          "Pilot program with select advocates",
          "Gather feedback and iterate",
          "Full rollout to membership",
          "Public launch of verification portal"
        ]
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

  // Auto-play functionality
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

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

      case "summary":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 mb-8">
              <h3 className="text-emerald-400 font-semibold mb-2">Mission</h3>
              <p className="text-white/80">{slide.content.mission}</p>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-8">
              {slide.content.keyPoints.map((kp, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-white/50 text-sm mb-1">{kp.label}</p>
                    <p className="text-white font-semibold">{kp.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="mt-auto text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-medium">{slide.content.timeline}</span>
              </span>
            </div>
          </div>
        );

      case "problem":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-2 gap-6 flex-1">
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
            <p className="text-center text-red-400/80 mt-6 italic">{slide.content.impact}</p>
          </div>
        );

      case "solution":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-2 gap-6 flex-1">
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

      case "flow":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            <div className="flex items-center justify-between gap-2 flex-1">
              {slide.content.steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center text-center flex-1">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-3">
                    <step.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center mb-2">
                    {step.num}
                  </div>
                  <h4 className="text-white font-semibold text-sm mb-1">{step.title}</h4>
                  <p className="text-white/50 text-xs">{step.desc}</p>
                  {i < slide.content.steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-emerald-500/50 absolute right-0 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              ))}
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-6">
              <p className="text-blue-400 text-center text-sm">
                <Lock className="w-4 h-4 inline mr-2" />
                {slide.content.note}
              </p>
            </div>
          </div>
        );

      case "feature":
        return (
          <div className="flex h-full">
            <div className="w-1/3 px-6 py-6 flex flex-col overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-base text-white/60 mb-6">{slide.subtitle}</p>
              
              {slide.content.steps && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase mb-2">Process</h4>
                  <div className="space-y-2">
                    {slide.content.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-white/70 text-xs">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {slide.content.methods && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase mb-2">Methods</h4>
                  <div className="space-y-2">
                    {slide.content.methods.map((m, i) => (
                      <div key={i} className="p-2 bg-white/5 rounded-lg flex items-start gap-2">
                        <m.icon className="w-4 h-4 text-emerald-400 mt-0.5" />
                        <div>
                          <h5 className="text-white font-medium text-xs">{m.title}</h5>
                          <p className="text-white/50 text-[10px]">{m.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {slide.content.modules && (
                <div className="space-y-2">
                  {slide.content.modules.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                      <m.icon className="w-4 h-4 text-emerald-400" />
                      <div>
                        <h5 className="text-white font-medium text-xs">{m.title}</h5>
                        <p className="text-white/50 text-[10px]">{m.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {slide.content.capabilities && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase mb-2">Capabilities</h4>
                  <div className="space-y-1">
                    {slide.content.capabilities.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-white/70 text-xs">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {slide.content.features && Array.isArray(slide.content.features) && typeof slide.content.features[0] === 'string' && (
                <div className="space-y-1">
                  {slide.content.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span className="text-white/70 text-xs">{f}</span>
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

      case "stamps":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
              {slide.content.types.map((t, i) => (
                <Card key={i} className="bg-white/5 border-white/10 overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: t.color }} />
                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">{t.name}</h3>
                    <p className="text-white/60 text-sm mb-4">{t.desc}</p>
                    <p className="text-2xl font-bold" style={{ color: t.color }}>{t.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <h4 className="text-lg font-semibold text-emerald-400 mb-4">Customization Options</h4>
            <div className="grid grid-cols-5 gap-4">
              {slide.content.customization.map((c, i) => (
                <div key={i} className="p-3 bg-white/5 rounded-lg text-center">
                  <h5 className="text-white font-medium text-sm">{c.feature}</h5>
                  <p className="text-white/50 text-xs">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "verification-detail":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-2 gap-8">
              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-6">
                  <h3 className="text-emerald-400 font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Valid Stamp Result
                  </h3>
                  <div className="space-y-3">
                    {slide.content.validResult.map((r, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                        <span className="text-white/60 text-sm">{r.field}</span>
                        <span className={`font-medium text-sm ${r.color === 'green' ? 'text-emerald-400' : 'text-white'}`}>
                          {r.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="p-6">
                  <h3 className="text-red-400 font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Tamper Detection
                  </h3>
                  <p className="text-white/80 mb-4">{slide.content.tamperDetection}</p>
                  <div className="bg-red-500/10 rounded-lg p-4">
                    <p className="text-red-400 text-sm font-medium">If hash doesn't match:</p>
                    <p className="text-white/60 text-sm mt-2">
                      "WARNING: Document may have been modified after stamping. Original document hash does not match uploaded document."
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "case-management":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-4 gap-6 flex-1">
              {slide.content.features.map((f, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-5">
                    <h3 className="text-emerald-400 font-semibold mb-4">{f.title}</h3>
                    <div className="space-y-2">
                      {f.items.map((item, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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

      case "profile-features":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-4 gap-6 flex-1">
              {slide.content.sections.map((s, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                      <s.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-3">{s.title}</h3>
                    <div className="space-y-2">
                      {s.items.map((item, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-white/70 text-xs">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-white/50 mt-6 italic">{slide.content.privacy}</p>
          </div>
        );

      case "enterprise":
        return (
          <div className="flex flex-col h-full px-12 py-6">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-6">{slide.subtitle}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              {slide.content.features.map((f, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-1">{f.title}</h4>
                  <p className="text-white/60 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
            
            <h4 className="text-lg font-semibold text-emerald-400 mb-3">Verification Credit Packages</h4>
            <div className="grid grid-cols-4 gap-4">
              {slide.content.pricing.map((p, i) => (
                <Card key={i} className={`${i === 1 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                  <CardContent className="p-4 text-center">
                    {i === 1 && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full">POPULAR</span>}
                    <h5 className="text-white font-semibold mt-2">{p.tier}</h5>
                    <p className="text-3xl font-bold text-emerald-400 my-2">{p.credits}</p>
                    <p className="text-white/50 text-xs">credits</p>
                    <p className="text-white/80 text-sm mt-2">{p.price}</p>
                    <p className="text-white/40 text-xs">{p.perUnit}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "api":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-emerald-400 mb-4">API Endpoints</h4>
                <div className="space-y-3">
                  {slide.content.endpoints.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg font-mono text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        e.method === 'POST' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {e.method}
                      </span>
                      <span className="text-white">{e.path}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-emerald-400 mb-4">Features</h4>
                <div className="space-y-2">
                  {slide.content.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-white/80">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              {slide.content.layers.map((s, i) => (
                <Card key={i} className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <s.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{s.title}</h3>
                      <p className="text-white/60 text-sm">{s.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <h4 className="text-lg font-semibold text-blue-400 mb-3">Compliance</h4>
            <div className="flex gap-4">
              {slide.content.compliance.map((c, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-white/80 text-sm">{c}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "audit":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              {slide.content.features.map((f, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-5">
                    <h3 className="text-emerald-400 font-semibold mb-2">{f.title}</h3>
                    <p className="text-white/60">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <h4 className="text-lg font-semibold text-emerald-400 mb-3">Available Reports</h4>
            <div className="flex gap-4">
              {slide.content.reports.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  <span className="text-white/80 text-sm">{r}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "revenue":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-4 gap-4 mb-8">
              {slide.content.streams.map((s, i) => (
                <Card key={i} className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-5 text-center">
                    <s.icon className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-white font-semibold mb-2">{s.source}</h3>
                    <p className="text-white/60 text-sm">{s.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20">
              <CardContent className="p-6">
                <h4 className="text-lg font-semibold text-white mb-4">Revenue Sharing Model</h4>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-emerald-400">{slide.content.sharing.advocate}</p>
                    <p className="text-white/60">Advocate Share</p>
                  </div>
                  <div className="w-px h-16 bg-white/20" />
                  <div className="text-center">
                    <p className="text-4xl font-bold text-blue-400">{slide.content.sharing.platform}</p>
                    <p className="text-white/60">TLS Platform</p>
                  </div>
                </div>
                <p className="text-center text-white/50 mt-4">{slide.content.sharing.description}</p>
              </CardContent>
            </Card>
          </div>
        );

      case "benefits-advocates":
      case "benefits-tls":
      case "benefits-public":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            <div className="grid grid-cols-3 gap-6 flex-1">
              {slide.content.benefits.map((b, i) => (
                <Card key={i} className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3">
                      <b.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">{b.title}</h3>
                    <p className="text-white/60 text-sm">{b.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "mobile":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
              {slide.content.features.map((f, i) => (
                <Card key={i} className="bg-purple-500/5 border-purple-500/20">
                  <CardContent className="p-5">
                    <f.icon className="w-8 h-8 text-purple-400 mb-3" />
                    <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                    <p className="text-white/60 text-sm">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-center gap-8">
              {Object.entries(slide.content.stats).map(([key, value], i) => (
                <div key={i} className="text-center px-6 py-3 bg-white/5 rounded-lg">
                  <p className="text-white/50 text-sm capitalize">{key}</p>
                  <p className="text-white font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case "tech":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              {slide.content.stack.map((s, i) => (
                <Card key={i} className="bg-cyan-500/5 border-cyan-500/20">
                  <CardContent className="p-4 flex items-center gap-3">
                    <s.icon className="w-8 h-8 text-cyan-400" />
                    <div>
                      <p className="text-white/50 text-xs">{s.layer}</p>
                      <p className="text-white font-medium text-sm">{s.tech}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-center gap-4">
              {slide.content.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span className="text-white/80 text-sm">{h}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case "roadmap":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-4 gap-4 flex-1">
              {slide.content.phases.map((p, i) => (
                <Card key={i} className={`${
                  p.status.includes('Complete') ? 'bg-emerald-500/5 border-emerald-500/20' :
                  p.status.includes('Progress') ? 'bg-blue-500/5 border-blue-500/20' :
                  'bg-white/5 border-white/10'
                }`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/50 text-sm">{p.phase}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        p.status.includes('Complete') ? 'bg-emerald-500/20 text-emerald-400' :
                        p.status.includes('Progress') ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/10 text-white/50'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold mb-3">{p.title}</h3>
                    <div className="space-y-2">
                      {p.items.map((item, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            p.status.includes('Complete') ? 'bg-emerald-400' :
                            p.status.includes('Progress') ? 'bg-blue-400' :
                            'bg-white/30'
                          }`} />
                          <span className="text-white/70 text-xs">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "metrics":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-3 gap-6 flex-1">
              {slide.content.kpis.map((kpi, i) => (
                <Card key={i} className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
                  <CardContent className="p-6 text-center">
                    <kpi.icon className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-white font-semibold mb-2">{kpi.metric}</h3>
                    <p className="text-emerald-400 font-bold text-lg">{kpi.target}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "support":
        return (
          <div className="flex flex-col h-full px-12 py-8">
            <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="grid grid-cols-3 gap-6 flex-1">
              {slide.content.offerings.map((o, i) => (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-5">
                    <h3 className="text-emerald-400 font-semibold mb-2">{o.title}</h3>
                    <p className="text-white/60 text-sm">{o.desc}</p>
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
            <p className="text-2xl text-white/60 mb-8">{slide.subtitle}</p>
            
            <div className="flex gap-8 mb-8">
              <div className="text-center">
                <Globe className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white/80 text-sm">{slide.content.contact.website}</p>
              </div>
              <div className="text-center">
                <Mail className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white/80 text-sm">{slide.content.contact.email}</p>
              </div>
              <div className="text-center">
                <Phone className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white/80 text-sm">{slide.content.contact.phone}</p>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 rounded-full border border-emerald-500/30 mb-8">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">{slide.content.cta}</span>
            </div>
            
            <div className="mt-4">
              <h4 className="text-white/50 text-sm mb-3">Next Steps</h4>
              <div className="flex gap-4">
                {slide.content.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="text-white/70 text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/50">Slide content not found</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#02040A] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/50">
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPlaying(!isPlaying)}
            className="gap-2"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlaying ? 'Pause' : 'Auto Play'}
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="w-4 h-4 mr-2" />
            Fullscreen
          </Button>
        </div>
      </div>
      
      {/* Slide Content */}
      <div className="flex-1 relative overflow-hidden">
        {renderSlideContent()}
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-black/50">
        <Button variant="outline" onClick={prevSlide} disabled={currentSlide === 0}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center gap-1.5 max-w-2xl overflow-x-auto">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`w-2 h-2 rounded-full transition-all flex-shrink-0 ${
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
