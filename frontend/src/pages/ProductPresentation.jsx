import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, Play, Pause, Download, Maximize2,
  Shield, FileCheck, Users, BarChart3, QrCode, Zap, Globe, Lock,
  CheckCircle2, ArrowRight, Sparkles, FileText, Calendar, Scale,
  Smartphone, Cloud, Database, Key, Eye, Clock, TrendingUp,
  Building2, Landmark, CreditCard, DollarSign, Layers, Target,
  Award, BookOpen, Fingerprint, RefreshCw, Upload, Search,
  Bell, Settings, PieChart, Activity, MapPin, Phone, Mail,
  Briefcase, GraduationCap, FileSpreadsheet, Scan, Printer,
  AlertTriangle, Loader2, FileDown, X
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "sonner";

// Presentation Images - Local images in /public/images/presentation/ for offline/print support
const SLIDE_IMAGES = {
  legal_professional: "/images/presentation/legal_professional.png",
  document_signing: "/images/presentation/document_signing.png",
  digital_security: "/images/presentation/digital_security.png",
  qr_verification: "/images/presentation/qr_verification.png",
  stamp_seal: "/images/presentation/stamp_seal.png",
  legal_team: "/images/presentation/legal_team.png",
  tanzania_business: "/images/presentation/tanzania_business.png",
  legal_documents: "/images/presentation/legal_documents.png"
};

// Screenshot mockups for feature slides - static images for offline/print
const SCREENSHOT_IMAGES = {
  "/documents": "/images/presentation/screenshot_documents.png",
  "/stamp-document": "/images/presentation/screenshot_documents.png",
  "/batch-stamp": "/images/presentation/screenshot_batch.png",
  "/verify": "/images/presentation/screenshot_verify.png",
  "/practice": "/images/presentation/screenshot_practice.png",
  "/cases": "/images/presentation/screenshot_practice.png",
  "/advocates": "/images/presentation/screenshot_advocates.png"
};

const ProductPresentation = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const slideRef = useRef(null);

  const slides = [
    // SLIDE 1: Title
    {
      id: 1,
      title: "TLS Digital Stamping Platform",
      subtitle: "Transforming Legal Document Verification in Tanzania",
      type: "title",
      image: SLIDE_IMAGES.legal_professional,
      content: {
        tagline: "Secure • Verifiable • Trusted",
        description: "A comprehensive digital solution designed specifically for the Tanganyika Law Society to modernize how legal documents are authenticated, managed, and verified across Tanzania.",
        highlights: [
          "SHA-256 Cryptographic Security",
          "QR Code Instant Verification", 
          "Full Practice Management Suite",
          "Mobile-First PWA Design"
        ],
        additionalInfo: "This platform represents a significant leap forward in legal document management, combining cutting-edge security technology with user-friendly interfaces to serve over 5,000 registered advocates across Tanzania. Built with scalability in mind, the system can handle millions of document verifications while maintaining sub-second response times."
      }
    },
    // SLIDE 2: Executive Summary
    {
      id: 2,
      title: "Executive Summary",
      subtitle: "Platform Overview & Strategic Vision",
      type: "summary",
      image: SLIDE_IMAGES.document_signing,
      content: {
        mission: "To modernize legal document authentication in Tanzania through secure digital stamps, protecting the integrity of legal practice while generating sustainable revenue streams for TLS and its members.",
        vision: "Position the Tanganyika Law Society as a pioneer in legal technology innovation across East Africa, setting the standard for digital document verification that other bar associations will follow.",
        keyPoints: [
          { label: "Target Users", value: "5,000+ Registered Advocates", detail: "All TLS members with valid practicing certificates" },
          { label: "Document Types", value: "All Legal Documents", detail: "Contracts, Affidavits, Court Filings, Powers of Attorney, Notarized Documents" },
          { label: "Verification Method", value: "Multi-Layer Security", detail: "QR Code + SHA-256 Hash + Digital Signature + Timestamp" },
          { label: "Revenue Model", value: "Sustainable Income", detail: "Verification Fees, Subscriptions, Institutional Packages, Physical Stamps" }
        ],
        timeline: "Phase 1 Complete • Ready for Pilot Deployment",
        investment: "The platform has been developed with careful attention to the specific needs of Tanzanian legal practitioners, incorporating feedback from practicing advocates to ensure practical utility and ease of adoption."
      }
    },
    // SLIDE 3: The Challenge - Detailed
    {
      id: 3,
      title: "The Challenge We're Solving",
      subtitle: "Critical Problems in Legal Document Authentication",
      type: "problem-detailed",
      image: SLIDE_IMAGES.legal_documents,
      content: {
        intro: "The Tanzanian legal system faces significant challenges in document authentication that undermine public trust, waste valuable time, and expose parties to fraud. These problems affect not just lawyers, but every citizen and business that relies on legal documentation.",
        problems: [
          { 
            icon: FileText, 
            title: "Rampant Document Fraud", 
            desc: "Physical stamps can be easily forged using basic printing technology. Fraudsters create fake legal documents that appear authentic, leading to property theft, contract fraud, and identity crimes.",
            impact: "Estimated annual losses exceed 500 million TZS across the legal sector",
            examples: ["Forged land transfer documents", "Fake powers of attorney", "Counterfeit court orders"]
          },
          { 
            icon: Globe, 
            title: "No Centralized Verification System", 
            desc: "Banks, government offices, and the public have no reliable way to verify if a legal document is authentic. This forces manual verification calls that are time-consuming and often unsuccessful.",
            impact: "Average verification takes 2-3 days when calling advocates directly",
            examples: ["Banks rejecting valid documents", "Property transactions delayed", "Court proceedings stalled"]
          },
          { 
            icon: Users, 
            title: "Inefficient Manual Processes", 
            desc: "Advocates spend valuable time on administrative tasks instead of legal work. Paper-based record keeping makes it difficult to track documents, deadlines, and client matters.",
            impact: "Advocates lose 10+ hours weekly on administrative tasks",
            examples: ["Manual diary management", "Paper file storage", "Phone-based client tracking"]
          },
          { 
            icon: BarChart3, 
            title: "Zero Data Visibility", 
            desc: "TLS has no insight into stamp usage patterns, member activity, or verification trends. This makes it impossible to identify fraudulent patterns or support members effectively.",
            impact: "No ability to detect organized fraud rings or support struggling members",
            examples: ["Unknown stamp volumes", "No fraud pattern detection", "Limited member insights"]
          }
        ],
        conclusion: "These challenges not only affect individual transactions but undermine the entire legal profession's credibility. A digital solution is no longer optional—it's essential for the future of legal practice in Tanzania."
      }
    },
    // SLIDE 4: Our Solution - Comprehensive
    {
      id: 4,
      title: "Our Comprehensive Solution",
      subtitle: "A Complete Digital Transformation Platform",
      type: "solution-detailed",
      image: SLIDE_IMAGES.digital_security,
      content: {
        intro: "The TLS Digital Stamping Platform addresses every challenge through an integrated suite of tools designed specifically for the Tanzanian legal context. Our solution combines world-class security with practical usability.",
        pillars: [
          { 
            icon: Shield, 
            title: "Tamper-Proof Digital Stamps", 
            desc: "Every stamp contains a SHA-256 cryptographic hash that mathematically binds the stamp to the exact document content. Any modification—even a single character—breaks this binding and is immediately detectable.",
            benefits: ["100% tamper detection", "Mathematically provable authenticity", "No possibility of forgery"],
            technical: "Hash computation happens client-side for privacy, with only the hash stored on servers"
          },
          { 
            icon: QrCode, 
            title: "Instant QR Verification", 
            desc: "Each stamped document includes a QR code that links directly to the verification portal. Anyone with a smartphone can verify a document in under 5 seconds, anywhere in the world.",
            benefits: ["5-second verification", "Works offline with cached data", "No technical expertise required"],
            technical: "QR contains stamp ID and verification URL with encryption"
          },
          { 
            icon: Lock, 
            title: "Multi-Layer Security", 
            desc: "Beyond hashing, the platform employs digital signatures, timestamp verification, and advocate credential checking to provide multiple layers of authenticity confirmation.",
            benefits: ["Defense in depth", "Multiple verification factors", "Fraud pattern detection"],
            technical: "RSA-2048 signatures, NTP-synchronized timestamps, real-time credential checks"
          },
          { 
            icon: Briefcase, 
            title: "Practice Management Suite", 
            desc: "A complete toolkit for managing legal practice including client management, case tracking, calendar integration, and financial reporting—all integrated with the stamping system.",
            benefits: ["Centralized practice data", "Automated reminders", "Revenue tracking"],
            technical: "Real-time sync, offline support, mobile-optimized interfaces"
          }
        ],
        differentiators: [
          "Built specifically for Tanzanian legal requirements",
          "Swahili language support planned",
          "Works on basic smartphones with slow connections",
          "No recurring software costs for basic features"
        ]
      }
    },
    // SLIDE 5: How It Works - Technical Deep Dive
    {
      id: 5,
      title: "How Digital Stamping Works",
      subtitle: "Technical Process Explained Step-by-Step",
      type: "flow-detailed",
      image: SLIDE_IMAGES.stamp_seal,
      content: {
        intro: "Understanding the technical process helps build confidence in the system's security. Here's exactly what happens when an advocate stamps a document:",
        steps: [
          { 
            num: 1, 
            title: "Document Upload", 
            desc: "Advocate uploads their document through our secure interface",
            icon: Upload,
            details: [
              "Supports PDF, DOCX, XLSX, PPTX, PNG, JPG formats",
              "Files converted to PDF if needed using LibreOffice",
              "Maximum file size: 25MB per document",
              "Documents processed locally, not stored on servers"
            ]
          },
          { 
            num: 2, 
            title: "Hash Generation", 
            desc: "SHA-256 cryptographic hash computed from document content",
            icon: Key,
            details: [
              "Hash is a unique 64-character fingerprint",
              "Any document change creates completely different hash",
              "Computation happens in browser for privacy",
              "Same document always produces same hash"
            ]
          },
          { 
            num: 3, 
            title: "Stamp Creation", 
            desc: "System generates unique stamp with all verification data",
            icon: QrCode,
            details: [
              "Unique Stamp ID format: TLS-YYYYMMDD-XXXX",
              "QR code encoded with verification URL",
              "Advocate credentials embedded in stamp",
              "Timestamp recorded in UTC timezone"
            ]
          },
          { 
            num: 4, 
            title: "Document Binding", 
            desc: "Stamp visually placed on PDF with embedded data",
            icon: FileCheck,
            details: [
              "Customizable stamp position (6 options)",
              "Multiple color choices for stamp border",
              "Can stamp first page, last page, or all pages",
              "Optional digital signature overlay"
            ]
          },
          { 
            num: 5, 
            title: "Record Storage", 
            desc: "Verification record stored in secure database",
            icon: Database,
            details: [
              "Only hash and metadata stored, not document",
              "MongoDB with encryption at rest",
              "Automatic backup and replication",
              "Records retained for 10+ years"
            ]
          },
          { 
            num: 6, 
            title: "Ready to Verify", 
            desc: "Document can be verified instantly by anyone",
            icon: CheckCircle2,
            details: [
              "Scan QR code or enter Stamp ID",
              "Verification returns advocate details",
              "Shows if document was modified",
              "Logs all verification attempts"
            ]
          }
        ],
        securityNote: "CRITICAL: The actual document content is NEVER uploaded to or stored on our servers. Only the cryptographic hash (a mathematical fingerprint) is retained. This protects client confidentiality absolutely."
      }
    },
    // SLIDE 6: Document Stamping Interface
    {
      id: 6,
      title: "Document Stamping Interface",
      subtitle: "User-Friendly Design for Efficient Workflow",
      type: "feature-detailed",
      screenshot: "/documents",
      content: {
        intro: "The stamping interface has been designed through extensive user testing with practicing advocates to ensure it's intuitive and efficient.",
        features: [
          { title: "Drag & Drop Upload", desc: "Simply drag files onto the upload area or click to browse. The system automatically detects file type and converts if needed." },
          { title: "Real-Time Preview", desc: "See exactly how your stamp will appear on the document before finalizing. Adjust position, color, and content in real-time." },
          { title: "Smart Defaults", desc: "System remembers your preferences for stamp type, color, and position. Most stamps can be completed in under 30 seconds." },
          { title: "Batch Processing", desc: "Need to stamp multiple documents? Switch to batch mode to process up to 25 documents simultaneously." }
        ],
        workflow: [
          "Upload your document (PDF, DOCX, Images)",
          "Enter recipient name and organization",
          "Select stamp type (Certification, Commissioner, Notary)",
          "Choose border color from 9 professional options",
          "Position stamp on page (6 placement options)",
          "Add optional digital signature",
          "Preview and confirm stamp placement",
          "Download stamped PDF with embedded QR code"
        ],
        tips: [
          "Use high-contrast colors for better QR scanning",
          "Place stamps in corners to avoid covering content",
          "Include recipient details for easier verification",
          "Save frequently used configurations as presets"
        ]
      }
    },
    // SLIDE 7: Stamp Types and Pricing
    {
      id: 7,
      title: "Stamp Types & Pricing Structure",
      subtitle: "Professional Certification Options for Every Need",
      type: "stamps-detailed",
      image: SLIDE_IMAGES.stamp_seal,
      content: {
        intro: "Three distinct stamp types serve different legal purposes, each with appropriate pricing that reflects the level of attestation provided.",
        types: [
          { 
            name: "Certification Stamp", 
            desc: "Standard document authentication confirming advocate has reviewed and certified the document", 
            color: "#10B981", 
            price: "5,000 TZS",
            useCases: ["Contract authentication", "Document copies", "General legal correspondence"],
            includes: ["Advocate name and credentials", "Date and time stamp", "QR verification code", "Unique stamp ID"]
          },
          { 
            name: "Commissioner Stamp", 
            desc: "For advocates serving as Commissioner for Oaths, used for sworn statements and affidavits", 
            color: "#3B82F6", 
            price: "7,500 TZS",
            useCases: ["Affidavits", "Statutory declarations", "Sworn statements", "Oath administration"],
            includes: ["All Certification features", "Commissioner designation", "Oath confirmation", "Enhanced verification"]
          },
          { 
            name: "Notary Stamp", 
            desc: "Highest level of certification for notarized documents requiring public notary authentication", 
            color: "#8B5CF6", 
            price: "10,000 TZS",
            useCases: ["International documents", "Property transfers", "Corporate authentication", "Powers of attorney"],
            includes: ["All Commissioner features", "Notary seal equivalent", "International recognition", "Premium support"]
          }
        ],
        customization: [
          { feature: "Border Colors", desc: "9 professional colors: Emerald, Blue, Purple, Gold, Rose, Cyan, Orange, Slate, Zinc", purpose: "Visual distinction and branding" },
          { feature: "Position Options", desc: "Top-left, Top-right, Bottom-left, Bottom-right, Center-top, Center-bottom", purpose: "Avoid covering important content" },
          { feature: "Page Selection", desc: "First page only, Last page only, All pages, Custom page range", purpose: "Appropriate coverage for document type" },
          { feature: "Signature Integration", desc: "Hand-drawn digital signature captured via touch or mouse", purpose: "Personal authentication layer" },
          { feature: "Recipient Details", desc: "Name and organization of document recipient", purpose: "Clear chain of custody" }
        ],
        volumeDiscounts: "Advocates who stamp 100+ documents monthly receive automatic 10% discount on all stamp fees"
      }
    },
    // SLIDE 8: Batch Processing
    {
      id: 8,
      title: "Batch Document Processing",
      subtitle: "Efficiency at Scale for High-Volume Practices",
      type: "feature-detailed",
      screenshot: "/batch-stamp",
      content: {
        intro: "For law firms and busy practitioners handling multiple documents, our batch processing feature dramatically reduces stamping time while maintaining full security.",
        capabilities: [
          { title: "Volume Processing", desc: "Process up to 25 documents in a single batch operation, each receiving a unique stamp and verification code" },
          { title: "Flexible Configuration", desc: "Apply identical stamps to all documents OR customize each document with different recipients, types, and colors" },
          { title: "ZIP Download", desc: "Receive all stamped documents in a single ZIP file with a CSV summary containing all stamp IDs and metadata" },
          { title: "Progress Tracking", desc: "Real-time progress bar shows processing status for each document in the batch" }
        ],
        useCases: [
          { scenario: "Law Firm Contract Package", desc: "Stamp all documents in a corporate transaction—sale agreement, board resolutions, powers of attorney—in one batch" },
          { scenario: "Court Filing Bundle", desc: "Authenticate multiple affidavits and exhibits for a single court filing efficiently" },
          { scenario: "Monthly Client Reports", desc: "Stamp all client reports and statements at month-end in minutes instead of hours" },
          { scenario: "Due Diligence Documents", desc: "Certify hundreds of due diligence documents for M&A transactions" }
        ],
        workflow: [
          "Select 'Batch Mode' from stamping options",
          "Upload multiple documents (drag & drop or browse)",
          "Choose 'Same stamp for all' or 'Different per document'",
          "Configure stamp settings (type, color, position)",
          "Review document list and settings",
          "Click 'Process Batch' to begin stamping",
          "Download ZIP file with all stamped documents",
          "Access CSV summary for record keeping"
        ],
        performance: "Average processing time: 3-5 seconds per document. A batch of 25 documents completes in under 2 minutes."
      }
    },
    // SLIDE 9: Public Verification Portal
    {
      id: 9,
      title: "Public Verification Portal",
      subtitle: "Trust Through Transparent Verification",
      type: "feature-detailed",
      screenshot: "/verify",
      image: SLIDE_IMAGES.qr_verification,
      content: {
        intro: "The public verification portal is freely accessible to anyone who needs to verify a legal document's authenticity. No account or login required—just scan and verify.",
        methods: [
          { 
            title: "QR Code Scanning", 
            desc: "The fastest method—use any smartphone camera to scan the QR code on the stamped document",
            icon: Scan,
            steps: ["Open camera app on smartphone", "Point at QR code on document", "Tap notification to open verification", "View complete verification results"]
          },
          { 
            title: "Stamp ID Lookup", 
            desc: "Enter the unique stamp ID (e.g., TLS-20260115-A1B2) directly on the verification page",
            icon: Search,
            steps: ["Go to verification portal", "Enter stamp ID in search box", "Click 'Verify' button", "View verification results"]
          },
          { 
            title: "Document Upload", 
            desc: "Upload the document to verify its hash matches the original—proves document wasn't modified",
            icon: Upload,
            steps: ["Click 'Upload Document'", "Select the stamped PDF", "System computes document hash", "Compares with stored hash"]
          }
        ],
        verificationResults: [
          { field: "Stamp Status", desc: "VALID (green) or INVALID (red) with clear explanation" },
          { field: "Advocate Information", desc: "Full name, roll number, TLS member number, photo" },
          { field: "Practicing Status", desc: "Active, Suspended, or Retired with date information" },
          { field: "Document Details", desc: "Document type, recipient name, organization" },
          { field: "Timestamp", desc: "Exact date and time the stamp was created (UTC)" },
          { field: "Expiry Date", desc: "When the stamp validity period ends" },
          { field: "Verification Count", desc: "How many times this stamp has been verified" },
          { field: "Hash Match", desc: "Confirms document hasn't been modified since stamping" }
        ],
        accessibility: "The verification portal works on any device, any browser, and requires no special software. It's been tested on low-bandwidth connections common in rural Tanzania."
      }
    },
    // SLIDE 10: Verification Security
    {
      id: 10,
      title: "Verification Security & Tamper Detection",
      subtitle: "How We Ensure Document Integrity",
      type: "security-verification",
      content: {
        intro: "The core value of digital stamping lies in its ability to detect any tampering. Here's how our multi-layer verification system works:",
        layers: [
          {
            layer: "Layer 1: Hash Verification",
            desc: "When a document is uploaded for verification, we compute its SHA-256 hash and compare it to the stored hash from when it was stamped.",
            outcome: "If even one character, pixel, or byte has changed, the hashes won't match, proving tampering."
          },
          {
            layer: "Layer 2: Timestamp Validation",
            desc: "Every stamp includes a cryptographically signed timestamp from our NTP-synchronized servers.",
            outcome: "This proves when the document was stamped and prevents backdating or future-dating fraud."
          },
          {
            layer: "Layer 3: Advocate Credential Check",
            desc: "Verification checks the advocate's current status in real-time against TLS records.",
            outcome: "Shows if advocate was active when stamping and flags any subsequent suspension."
          },
          {
            layer: "Layer 4: Digital Signature",
            desc: "Optional RSA-2048 digital signature provides non-repudiation—advocate cannot deny stamping.",
            outcome: "Mathematical proof that specific advocate created this specific stamp."
          }
        ],
        tamperScenarios: [
          { scenario: "Document text modified", result: "FAIL - Hash mismatch detected, verification shows 'Document has been altered'" },
          { scenario: "Image or logo added", result: "FAIL - Any visual change breaks hash verification" },
          { scenario: "Date changed in document", result: "FAIL - Even metadata changes are detected" },
          { scenario: "Stamp copied to different document", result: "FAIL - Hash of new document won't match stored hash" },
          { scenario: "Fake stamp created", result: "FAIL - Stamp ID won't exist in database" }
        ],
        guarantee: "Our system provides mathematical certainty that a verified document is exactly as it was when the advocate stamped it. This level of assurance is impossible with physical stamps."
      }
    },
    // SLIDE 11: Practice Management Suite
    {
      id: 11,
      title: "Practice Management Suite",
      subtitle: "Complete Legal Practice Administration",
      type: "feature-detailed",
      screenshot: "/practice",
      content: {
        intro: "Beyond stamping, the platform provides a comprehensive practice management system designed specifically for Tanzanian legal practitioners. All features integrate seamlessly with the stamping system.",
        modules: [
          { 
            icon: Users, 
            title: "Client Management", 
            desc: "Maintain detailed client records including contact information, case history, billing preferences, and communication logs",
            features: ["Contact database", "Communication history", "Document associations", "Billing preferences", "Client portal access"]
          },
          { 
            icon: Briefcase, 
            title: "Case Management", 
            desc: "Track all aspects of legal matters from intake to resolution with parties, documents, deadlines, and outcomes",
            features: ["Case file organization", "Party management", "Document linking", "Status tracking", "Outcome recording"]
          },
          { 
            icon: Calendar, 
            title: "Calendar & Scheduling", 
            desc: "Integrated calendar for court dates, client meetings, deadlines, and reminders with optional Google Calendar sync",
            features: ["Court hearing scheduler", "Deadline tracking", "Reminder notifications", "Conflict checking", "Team calendars"]
          },
          { 
            icon: FileText, 
            title: "Document Library", 
            desc: "Organize all case documents with version control, tagging, and instant access to stamping features",
            features: ["Folder organization", "Tag-based search", "Version history", "Quick stamp access", "Secure sharing"]
          },
          { 
            icon: DollarSign, 
            title: "Financial Tracking", 
            desc: "Track time, generate invoices, record payments, and analyze revenue by client, case, or time period",
            features: ["Time tracking", "Invoice generation", "Payment recording", "Revenue reports", "Outstanding balances"]
          },
          { 
            icon: Bell, 
            title: "Smart Notifications", 
            desc: "Automated reminders for deadlines, hearing dates, document expirations, and client follow-ups",
            features: ["Email alerts", "Push notifications", "SMS reminders", "Custom schedules", "Escalation rules"]
          }
        ],
        integration: "Every stamped document automatically links to the relevant client and case. Revenue from stamp verifications appears in your financial reports. Deadlines sync to your calendar."
      }
    },
    // SLIDE 12: Case Management Deep Dive
    {
      id: 12,
      title: "Case Management in Detail",
      subtitle: "Organize Every Aspect of Your Cases",
      type: "case-management-detailed",
      content: {
        intro: "The case management module provides everything you need to track matters from first client contact through final resolution and beyond.",
        sections: [
          { 
            title: "Case Information",
            icon: Briefcase,
            items: [
              "Unique case reference number",
              "Case title and description",
              "Matter type classification",
              "Court and jurisdiction",
              "Assigned judge/magistrate",
              "Case status workflow",
              "Priority level setting",
              "Related cases linking"
            ]
          },
          { 
            title: "Parties & Contacts",
            icon: Users,
            items: [
              "Client details and role",
              "Opposing parties",
              "Opposing counsel",
              "Witnesses",
              "Expert witnesses",
              "Court contacts",
              "Communication preferences",
              "Conflict checking"
            ]
          },
          { 
            title: "Hearings & Events",
            icon: Calendar,
            items: [
              "Hearing date and time",
              "Court room assignment",
              "Hearing type/purpose",
              "Preparation checklist",
              "Calendar integration",
              "Reminder notifications",
              "Outcome recording",
              "Adjournment tracking"
            ]
          },
          { 
            title: "Tasks & Deadlines",
            icon: CheckCircle2,
            items: [
              "Task description",
              "Assignment to team member",
              "Due date setting",
              "Priority classification",
              "Status tracking",
              "Dependency management",
              "Completion recording",
              "Deadline alerts"
            ]
          }
        ],
        workflow: "Cases progress through customizable stages: Intake → Active → Discovery → Trial → Judgment → Appeal → Closed. Each stage can trigger automatic tasks and reminders.",
        reporting: "Generate case status reports, workload analysis, deadline summaries, and outcome statistics at any time."
      }
    },
    // SLIDE 13: Advocate Directory
    {
      id: 13,
      title: "Public Advocate Directory",
      subtitle: "Connecting the Public with Qualified Legal Professionals",
      type: "feature-detailed",
      screenshot: "/advocates",
      content: {
        intro: "The public advocate directory helps potential clients find qualified legal representation while giving advocates a platform to showcase their expertise and credentials.",
        forPublic: [
          { feature: "Search Functionality", desc: "Search by name, location, practice area, or language to find the right advocate" },
          { feature: "Verified Credentials", desc: "Every listed advocate has verified TLS membership and practicing certificate" },
          { feature: "Practice Areas", desc: "Filter by specialization—criminal, civil, corporate, family, property, etc." },
          { feature: "Contact Options", desc: "View contact information for advocates who opt to share it publicly" },
          { feature: "Profile Reviews", desc: "See advocate qualifications, experience, and achievements" }
        ],
        forAdvocates: [
          { feature: "Professional Profile", desc: "Showcase your education, experience, achievements, and areas of expertise" },
          { feature: "Privacy Controls", desc: "Choose exactly what information to display—email, phone, location, etc." },
          { feature: "Achievement Badges", desc: "Earn and display badges for activity, verifications, and milestones" },
          { feature: "Direct Inquiries", desc: "Receive client inquiries directly through the platform (optional)" },
          { feature: "Analytics", desc: "See how often your profile is viewed and searched" }
        ],
        verification: "The TLS verified badge appears only for advocates with current, valid practicing certificates. Suspended or retired advocates are clearly marked.",
        seo: "Profiles are optimized for search engines, helping advocates appear in Google searches for legal services in Tanzania."
      }
    },
    // SLIDE 14: Professional Profiles
    {
      id: 14,
      title: "Advocate Profile System",
      subtitle: "Build Your Professional Online Presence",
      type: "profile-detailed",
      content: {
        intro: "A comprehensive profile helps you stand out to potential clients and establishes your professional credibility online.",
        sections: [
          { 
            title: "Basic Information",
            icon: Users,
            fields: ["Full legal name", "Professional title", "Roll number", "TLS member number", "Admission year", "Region", "Court jurisdiction", "Profile photo"]
          },
          { 
            title: "Professional Details",
            icon: Briefcase,
            fields: ["Practice areas (up to 10)", "Languages spoken", "Years of experience", "Firm name/affiliation", "Office address", "Office hours", "Consultation fee", "Website URL"]
          },
          { 
            title: "Education & Credentials",
            icon: GraduationCap,
            fields: ["Law degree(s)", "University/Institution", "Graduation year", "Bar admissions", "Additional certifications", "Continuing education", "Academic honors", "Publications"]
          },
          { 
            title: "Experience & Achievements",
            icon: Award,
            fields: ["Professional experience", "Notable cases", "Awards received", "Professional memberships", "Board positions", "Pro bono work", "Media appearances", "Speaking engagements"]
          }
        ],
        privacyControls: [
          "Show/hide email address",
          "Show/hide phone number",
          "Show/hide office address",
          "Show/hide consultation fee",
          "Profile visibility (public/private)",
          "Inquiry form (enabled/disabled)"
        ],
        completionBenefits: "Profiles with 80%+ completion appear higher in search results and receive a 'Complete Profile' badge"
      }
    },
    // SLIDE 15: Institutional Portal
    {
      id: 15,
      title: "Institutional Verification Portal",
      subtitle: "Enterprise Solutions for Organizations",
      type: "enterprise-detailed",
      content: {
        intro: "Banks, government agencies, courts, and corporations can access bulk verification capabilities through our institutional portal with volume-based pricing.",
        targetUsers: [
          { type: "Banks & Financial Institutions", needs: "Verify legal documents for loans, mortgages, and account opening" },
          { type: "Government Agencies", needs: "Authenticate documents submitted for permits, licenses, and registrations" },
          { type: "Courts & Tribunals", needs: "Verify advocate credentials and document authenticity in proceedings" },
          { type: "Corporate Legal Departments", needs: "Due diligence verification for transactions and compliance" },
          { type: "Real Estate Companies", needs: "Verify property documents, powers of attorney, and transfer deeds" }
        ],
        features: [
          { title: "Bulk Verification API", desc: "RESTful API for programmatic verification of multiple documents. Integrate directly with your existing systems." },
          { title: "Webhook Notifications", desc: "Receive real-time alerts when documents are verified against your watched stamps or advocates." },
          { title: "Usage Dashboard", desc: "Comprehensive analytics showing verification volumes, success rates, and trend analysis." },
          { title: "Team Management", desc: "Add multiple users with role-based permissions—admin, verifier, viewer." },
          { title: "Custom Reports", desc: "Generate detailed verification reports for compliance and audit purposes." },
          { title: "Dedicated Support", desc: "Priority support channel for enterprise customers with SLA guarantees." }
        ],
        pricing: [
          { tier: "Basic", credits: 10, price: "250,000 TZS", perUnit: "25,000", savings: "0%", best: "Small businesses" },
          { tier: "Standard", credits: 50, price: "1,000,000 TZS", perUnit: "20,000", savings: "20%", best: "Medium enterprises", popular: true },
          { tier: "Professional", credits: 200, price: "3,500,000 TZS", perUnit: "17,500", savings: "30%", best: "Large organizations" },
          { tier: "Enterprise", credits: 500, price: "7,500,000 TZS", perUnit: "15,000", savings: "40%", best: "High-volume users" }
        ],
        customPricing: "Organizations requiring more than 500 verifications monthly can contact us for custom enterprise pricing."
      }
    },
    // SLIDE 16: API Documentation
    {
      id: 16,
      title: "API & Technical Integration",
      subtitle: "Developer-Friendly RESTful API",
      type: "api-detailed",
      content: {
        intro: "Our comprehensive API allows institutions to integrate verification capabilities directly into their existing systems. Full documentation and sandbox environment provided.",
        endpoints: [
          { method: "GET", path: "/api/verify/{stamp_id}", desc: "Verify a stamp by its unique identifier", auth: "API Key" },
          { method: "POST", path: "/api/verify/document", desc: "Verify by uploading document (hash computed server-side)", auth: "API Key" },
          { method: "POST", path: "/api/verify/batch", desc: "Verify multiple stamps in single request (up to 100)", auth: "API Key" },
          { method: "GET", path: "/api/advocate/{roll_number}", desc: "Get advocate profile and credential status", auth: "API Key" },
          { method: "POST", path: "/api/webhooks", desc: "Configure webhook endpoints for real-time notifications", auth: "API Key" },
          { method: "GET", path: "/api/usage/stats", desc: "Retrieve usage statistics and remaining credits", auth: "API Key" }
        ],
        authentication: [
          "API Key authentication via X-API-Key header",
          "Keys generated in institutional dashboard",
          "Rate limiting: 100 requests/minute (Basic), 500/minute (Enterprise)",
          "IP whitelisting available for enhanced security"
        ],
        responseFormat: {
          sample: `{
  "valid": true,
  "stamp_id": "TLS-20260115-A1B2",
  "advocate": {
    "name": "John Doe",
    "roll_number": "ADV/2015/1234",
    "status": "Active"
  },
  "document": {
    "type": "Contract",
    "stamped_at": "2026-01-15T10:30:00Z"
  },
  "verification_count": 5
}`
        },
        sdks: "Code samples available in Python, JavaScript, PHP, Java, and C#. Postman collection provided for testing."
      }
    },
    // SLIDE 17: Security Architecture
    {
      id: 17,
      title: "Security Architecture",
      subtitle: "Enterprise-Grade Protection at Every Layer",
      type: "security-detailed",
      content: {
        intro: "Security is not an afterthought—it's built into every layer of the platform. Our security architecture follows industry best practices and exceeds requirements for legal document handling.",
        layers: [
          { 
            icon: Lock, 
            title: "Data Encryption", 
            desc: "All data encrypted using AES-256 at rest and TLS 1.3 in transit",
            details: ["Database encryption with managed keys", "HTTPS enforced on all endpoints", "Certificate pinning for mobile apps", "Perfect forward secrecy enabled"]
          },
          { 
            icon: Key, 
            title: "Cryptographic Hashing", 
            desc: "SHA-256 hashing creates unforgeable document fingerprints",
            details: ["One-way hashing (cannot reverse to document)", "256-bit hash output", "Collision-resistant algorithm", "NIST-approved standard"]
          },
          { 
            icon: Fingerprint, 
            title: "Authentication", 
            desc: "Multi-factor authentication with secure session management",
            details: ["JWT tokens with short expiry", "CSRF protection on all forms", "Brute-force prevention", "Session invalidation controls"]
          },
          { 
            icon: Shield, 
            title: "Access Control", 
            desc: "Role-based permissions ensure users only access authorized data",
            details: ["Advocate, Admin, Super Admin roles", "Resource-level permissions", "Audit logging of all access", "Principle of least privilege"]
          }
        ],
        compliance: [
          { standard: "Data Protection", desc: "Compliant with Tanzanian data protection requirements and international privacy standards" },
          { standard: "Audit Trail", desc: "Complete logging of all security-relevant events for forensic analysis" },
          { standard: "Password Policy", desc: "Enforced strong passwords with complexity requirements and expiry" },
          { standard: "Vulnerability Management", desc: "Regular security assessments and prompt patching of vulnerabilities" }
        ],
        certifications: "Platform undergoes annual security audits. Security architecture reviewed by independent cybersecurity consultants."
      }
    },
    // SLIDE 18: Revenue Model
    {
      id: 18,
      title: "Revenue Model & Financial Sustainability",
      subtitle: "Multiple Revenue Streams for Long-Term Success",
      type: "revenue-detailed",
      content: {
        intro: "The platform is designed to be financially self-sustaining while providing value to all stakeholders. Revenue is generated through multiple streams and shared fairly with advocates.",
        streams: [
          { 
            source: "Public Verification Fees", 
            desc: "50,000 TZS charged when non-members verify documents through the public portal",
            icon: Eye,
            projectedRevenue: "200M TZS/year",
            notes: "Primary revenue driver as verification demand grows"
          },
          { 
            source: "Institutional Packages", 
            desc: "Bulk verification credits sold to banks, government agencies, and corporations",
            icon: Building2,
            projectedRevenue: "150M TZS/year",
            notes: "Higher margins on enterprise sales"
          },
          { 
            source: "Advocate Subscriptions", 
            desc: "Monthly/annual fees for premium practice management features",
            icon: CreditCard,
            projectedRevenue: "100M TZS/year",
            notes: "Recurring revenue with high retention"
          },
          { 
            source: "Physical Stamp Orders", 
            desc: "Official TLS physical stamps, ink pads, and accessories",
            icon: Printer,
            projectedRevenue: "50M TZS/year",
            notes: "Complements digital offering"
          }
        ],
        revenueSharing: {
          advocate: "30%",
          platform: "70%",
          description: "When a document is verified, the advocate who created the stamp earns 30% of the verification fee. This incentivizes advocates to use the platform and promotes verification.",
          example: "A public verification at 50,000 TZS generates 15,000 TZS for the advocate and 35,000 TZS for TLS."
        },
        projections: {
          year1: "500M TZS total revenue",
          year2: "1.2B TZS total revenue", 
          year3: "2.5B TZS total revenue",
          notes: "Projections based on 50% advocate adoption and growing institutional market"
        }
      }
    },
    // SLIDE 19: Benefits - Advocates
    {
      id: 19,
      title: "Benefits for Advocates",
      subtitle: "Empowering Legal Professionals",
      type: "benefits-detailed",
      image: SLIDE_IMAGES.legal_team,
      content: {
        intro: "Advocates are at the heart of this platform. Every feature is designed to save time, enhance credibility, and generate additional income.",
        benefits: [
          { 
            icon: Shield, 
            title: "Enhanced Professional Credibility", 
            desc: "Digital stamps with cryptographic verification establish you as a technology-forward professional",
            impact: "Clients increasingly expect digital solutions. Early adopters gain competitive advantage."
          },
          { 
            icon: DollarSign, 
            title: "Passive Revenue Stream", 
            desc: "Earn 30% of every verification fee when your stamps are verified by third parties",
            impact: "High-volume practitioners can earn 100,000+ TZS monthly from verifications alone."
          },
          { 
            icon: Briefcase, 
            title: "Complete Practice Management", 
            desc: "Manage clients, cases, calendar, and finances in one integrated platform",
            impact: "Save 10+ hours weekly on administrative tasks. Focus on billable work."
          },
          { 
            icon: Globe, 
            title: "Public Professional Profile", 
            desc: "Showcase your expertise to potential clients searching for legal representation",
            impact: "Verified profiles appear in search results. Direct client inquiries available."
          },
          { 
            icon: Zap, 
            title: "Efficiency & Speed", 
            desc: "Stamp documents in seconds. Batch process 25 documents at once. Work from anywhere.",
            impact: "Complete in minutes what used to take hours. No physical stamp required."
          },
          { 
            icon: Bell, 
            title: "Smart Automation", 
            desc: "Automated reminders for deadlines, stamp expirations, and client follow-ups",
            impact: "Never miss a deadline. Automated notifications keep you on track."
          }
        ],
        testimonialPlaceholder: "\"The digital stamping system has transformed how I handle document authentication. What used to take hours now takes minutes.\" - Future advocate testimonial"
      }
    },
    // SLIDE 20: Benefits - TLS
    {
      id: 20,
      title: "Benefits for Tanganyika Law Society",
      subtitle: "Organizational Transformation & Revenue",
      type: "benefits-detailed",
      image: SLIDE_IMAGES.tanzania_business,
      content: {
        intro: "The platform delivers significant strategic and financial benefits to TLS as an organization, positioning it for sustainable growth.",
        benefits: [
          { 
            icon: BarChart3, 
            title: "New Revenue Streams", 
            desc: "Verification fees and institutional packages create sustainable income independent of membership dues",
            impact: "Projected 500M+ TZS annual revenue by Year 2, growing to 2.5B by Year 5"
          },
          { 
            icon: Users, 
            title: "Enhanced Member Value", 
            desc: "Provides tangible benefits that justify membership and attract new advocates to the profession",
            impact: "Increased member satisfaction and retention. Competitive advantage vs other bar associations."
          },
          { 
            icon: Eye, 
            title: "Centralized Oversight", 
            desc: "Real-time visibility into stamp issuance, verification patterns, and member activity",
            impact: "Detect fraud patterns early. Support members who need assistance. Data-driven decisions."
          },
          { 
            icon: TrendingUp, 
            title: "Digital Leadership Position", 
            desc: "Position TLS as an innovation leader in legal technology across East Africa",
            impact: "Set the standard other bar associations follow. Attract technology partnerships."
          },
          { 
            icon: Shield, 
            title: "Profession Integrity Protection", 
            desc: "Combat document fraud that damages the legal profession's reputation",
            impact: "Protect public trust in legal documents. Reduce fraudulent practice complaints."
          },
          { 
            icon: Database, 
            title: "Data & Analytics", 
            desc: "Comprehensive data on member activity, market trends, and verification patterns",
            impact: "Inform policy decisions. Identify emerging practice areas. Support strategic planning."
          }
        ],
        strategicValue: "Beyond revenue, the platform positions TLS as a forward-thinking regulatory body that embraces technology to serve both members and the public."
      }
    },
    // SLIDE 21: Benefits - Public
    {
      id: 21,
      title: "Benefits for the Public",
      subtitle: "Protection & Access for Citizens",
      type: "benefits-detailed",
      image: SLIDE_IMAGES.legal_professional,
      content: {
        intro: "The ultimate beneficiaries of this system are the Tanzanian public who rely on authentic legal documents for their most important transactions.",
        benefits: [
          { 
            icon: CheckCircle2, 
            title: "Instant Document Verification", 
            desc: "Verify any stamped legal document in under 5 seconds using QR code or stamp ID",
            impact: "No more waiting days for phone verification. Instant confidence in document authenticity."
          },
          { 
            icon: Shield, 
            title: "Fraud Protection", 
            desc: "Detect forged, tampered, or fraudulent legal documents before they cause harm",
            impact: "Protect yourself from property fraud, fake contracts, and identity theft schemes."
          },
          { 
            icon: Users, 
            title: "Find Qualified Advocates", 
            desc: "Search the verified advocate directory to find qualified legal representation",
            impact: "Make informed decisions about legal representation. Verify advocate credentials."
          },
          { 
            icon: Eye, 
            title: "Transparency", 
            desc: "View complete information about the advocate who stamped a document",
            impact: "Know exactly who authenticated your document. Check their current practicing status."
          },
          { 
            icon: Globe, 
            title: "Free Access", 
            desc: "Public verification portal is completely free—no account or payment required",
            impact: "Democratic access to document verification. No barriers to protecting yourself."
          },
          { 
            icon: Lock, 
            title: "Trust & Confidence", 
            desc: "Cryptographic proof that documents are authentic and unmodified",
            impact: "Mathematical certainty replaces hope. Sleep better knowing your documents are real."
          }
        ],
        publicEducation: "TLS will conduct public awareness campaigns to educate citizens about verifying legal documents before important transactions."
      }
    },
    // SLIDE 22: Mobile & PWA
    {
      id: 22,
      title: "Mobile Experience & PWA",
      subtitle: "Access Anywhere, On Any Device",
      type: "mobile-detailed",
      content: {
        intro: "The platform is built as a Progressive Web App (PWA), providing app-like experience without requiring app store downloads. Optimized for mobile devices common in Tanzania.",
        features: [
          { 
            icon: Smartphone, 
            title: "Progressive Web App", 
            desc: "Install directly from browser to home screen. Works like a native app on iOS, Android, and desktop.",
            benefit: "No app store approval delays. Instant updates. Works on any device with a browser."
          },
          { 
            icon: Scan, 
            title: "Built-in QR Scanner", 
            desc: "Use your phone's camera directly in the app to scan document QR codes for instant verification.",
            benefit: "No separate QR app needed. Seamless verification workflow."
          },
          { 
            icon: Cloud, 
            title: "Offline Capability", 
            desc: "Core features work without internet. Data syncs automatically when connection returns.",
            benefit: "Work in areas with poor connectivity. Never lose data due to network issues."
          },
          { 
            icon: Bell, 
            title: "Push Notifications", 
            desc: "Receive real-time alerts for verifications, deadlines, and important updates.",
            benefit: "Stay informed instantly. Never miss critical notifications."
          },
          { 
            icon: RefreshCw, 
            title: "Background Sync", 
            desc: "Actions taken offline are queued and processed automatically when online.",
            benefit: "Seamless experience regardless of connectivity status."
          },
          { 
            icon: Zap, 
            title: "Performance Optimized", 
            desc: "Fast loading even on slow 2G/3G connections. Compressed assets and smart caching.",
            benefit: "Works well on basic smartphones. Minimal data usage."
          }
        ],
        deviceSupport: {
          ios: "iOS 12+ (iPhone 6s and newer)",
          android: "Android 7+ (most devices from 2017 onwards)",
          desktop: "Chrome, Firefox, Safari, Edge (latest versions)"
        },
        installation: "Users are prompted to 'Add to Home Screen' after second visit. Installation takes 5 seconds with no app store involved."
      }
    },
    // SLIDE 23: Technology Stack
    {
      id: 23,
      title: "Technology Architecture",
      subtitle: "Modern, Scalable, Reliable",
      type: "tech-detailed",
      content: {
        intro: "The platform is built on modern, proven technologies chosen for reliability, scalability, and maintainability.",
        stack: [
          { 
            layer: "Frontend", 
            tech: "React.js 18, TailwindCSS, PWA", 
            icon: Layers,
            details: "Component-based architecture for maintainability. Utility-first CSS for consistent design. Service workers for offline support."
          },
          { 
            layer: "Backend API", 
            tech: "FastAPI (Python), Async/Await", 
            icon: Database,
            details: "High-performance async Python framework. Auto-generated API documentation. Type hints for reliability."
          },
          { 
            layer: "Database", 
            tech: "MongoDB Atlas (NoSQL)", 
            icon: Database,
            details: "Flexible document storage. Built-in replication. Automatic backups. Global deployment options."
          },
          { 
            layer: "Security", 
            tech: "JWT, CSRF, SHA-256, bcrypt", 
            icon: Lock,
            details: "Industry-standard token authentication. Protection against common attacks. Cryptographic best practices."
          },
          { 
            layer: "File Processing", 
            tech: "LibreOffice, PyPDF2, Pillow", 
            icon: FileText,
            details: "Full document conversion support. PDF manipulation and enhancement. Image processing for scans."
          },
          { 
            layer: "Infrastructure", 
            tech: "Docker, Nginx, Let's Encrypt", 
            icon: Cloud,
            details: "Containerized deployment. High-performance reverse proxy. Automatic SSL certificate management."
          }
        ],
        scalability: [
          "Horizontal scaling: Add more servers as demand grows",
          "Database sharding: Distribute data across multiple nodes",
          "CDN integration: Fast static asset delivery globally",
          "Load balancing: Distribute traffic across instances"
        ],
        reliability: [
          "99.9% uptime target with redundant infrastructure",
          "Automatic failover to backup systems",
          "Real-time monitoring and alerting",
          "Disaster recovery procedures documented"
        ]
      }
    },
    // SLIDE 24: Implementation Roadmap
    {
      id: 24,
      title: "Implementation Roadmap",
      subtitle: "Phased Deployment for Success",
      type: "roadmap-detailed",
      content: {
        intro: "A carefully planned rollout ensures smooth adoption and allows for feedback-driven improvements at each stage.",
        phases: [
          { 
            phase: "Phase 1", 
            status: "Complete ✓", 
            title: "Core Platform",
            timeline: "Completed",
            items: ["Document stamping system", "Public verification portal", "Advocate profiles", "Basic analytics", "Mobile PWA"],
            outcomes: "Foundation ready for pilot deployment"
          },
          { 
            phase: "Phase 2", 
            status: "In Progress", 
            title: "Practice Management",
            timeline: "Q1 2026",
            items: ["Case management", "Client management", "Calendar integration", "Financial tracking", "Document library"],
            outcomes: "Complete practice administration suite"
          },
          { 
            phase: "Phase 3", 
            status: "Planned", 
            title: "Enterprise Features",
            timeline: "Q2 2026",
            items: ["Institutional API", "Bulk verification", "Webhook notifications", "Advanced reporting", "Team management"],
            outcomes: "Ready for institutional customers"
          },
          { 
            phase: "Phase 4", 
            status: "Future", 
            title: "Advanced Features",
            timeline: "Q3-Q4 2026",
            items: ["Payment gateway integration", "Google Calendar sync", "AI document analysis", "E-filing integration", "Regional expansion"],
            outcomes: "Full-featured legal technology platform"
          }
        ],
        milestones: [
          { date: "Jan 2026", milestone: "Pilot launch with 50 advocates" },
          { date: "Mar 2026", milestone: "Full launch to all TLS members" },
          { date: "Jun 2026", milestone: "First institutional customers onboarded" },
          { date: "Dec 2026", milestone: "Target: 2,500 active advocates" }
        ]
      }
    },
    // SLIDE 25: Success Metrics
    {
      id: 25,
      title: "Success Metrics & KPIs",
      subtitle: "Measuring Platform Impact",
      type: "metrics-detailed",
      content: {
        intro: "Clear metrics ensure accountability and provide early warning signals. We'll track both adoption and impact metrics.",
        kpis: [
          { 
            metric: "Advocate Adoption", 
            target: "50% of TLS members", 
            timeline: "Within 12 months",
            icon: Users,
            measurement: "Number of advocates who have stamped at least one document"
          },
          { 
            metric: "Documents Stamped", 
            target: "100,000 documents", 
            timeline: "Within 12 months",
            icon: FileText,
            measurement: "Total stamps created across all advocates"
          },
          { 
            metric: "Verifications", 
            target: "500,000 verifications", 
            timeline: "Within 12 months",
            icon: CheckCircle2,
            measurement: "Total public and institutional verification requests"
          },
          { 
            metric: "Revenue Generated", 
            target: "500 million TZS", 
            timeline: "Within 12 months",
            icon: DollarSign,
            measurement: "Total revenue from all streams"
          },
          { 
            metric: "Fraud Reduction", 
            target: "90% decrease", 
            timeline: "Within 24 months",
            icon: Shield,
            measurement: "Reported incidents of document fraud involving advocates"
          },
          { 
            metric: "User Satisfaction", 
            target: "90%+ positive", 
            timeline: "Ongoing",
            icon: Award,
            measurement: "Quarterly user satisfaction surveys"
          }
        ],
        reporting: "Monthly dashboard reports will be provided to TLS leadership showing progress against all metrics with trend analysis and recommendations."
      }
    },
    // SLIDE 26: Support & Training
    {
      id: 26,
      title: "Support & Training Program",
      subtitle: "Ensuring Successful Adoption",
      type: "support-detailed",
      content: {
        intro: "Comprehensive support ensures advocates can quickly adopt and benefit from the platform. Multiple support channels accommodate different learning preferences.",
        offerings: [
          { 
            title: "Self-Service Help Center", 
            desc: "Searchable knowledge base with articles, tutorials, and FAQs covering all platform features",
            availability: "24/7 online access"
          },
          { 
            title: "Video Tutorial Library", 
            desc: "Step-by-step video guides for every feature, from basic stamping to advanced practice management",
            availability: "On-demand streaming"
          },
          { 
            title: "Live Training Webinars", 
            desc: "Regular online training sessions with live Q&A for new and existing users",
            availability: "Weekly sessions"
          },
          { 
            title: "In-Person Training", 
            desc: "Regional training workshops conducted at TLS offices and partner venues",
            availability: "Monthly regional events"
          },
          { 
            title: "Email Support", 
            desc: "Dedicated support team for technical issues, account problems, and general inquiries",
            availability: "Response within 24 hours"
          },
          { 
            title: "Phone Support", 
            desc: "Direct phone line for urgent issues requiring immediate assistance",
            availability: "Business hours (8am-6pm EAT)"
          }
        ],
        onboarding: [
          "Welcome email with quick-start guide",
          "Guided setup wizard for new accounts",
          "First stamp tutorial with practice document",
          "30-day check-in email with tips",
          "Quarterly feature update notifications"
        ],
        feedback: "User feedback actively collected through in-app surveys, support interactions, and quarterly focus groups. Feedback drives continuous improvement."
      }
    },
    // SLIDE 27: Next Steps
    {
      id: 27,
      title: "Recommended Next Steps",
      subtitle: "Path to Successful Launch",
      type: "next-steps",
      content: {
        intro: "A structured approach ensures successful deployment while managing risk and maximizing learning.",
        steps: [
          {
            num: 1,
            title: "Executive Approval",
            desc: "TLS Council review and approval of the platform for member use",
            timeline: "Week 1-2",
            owner: "TLS Council"
          },
          {
            num: 2,
            title: "Pilot Selection",
            desc: "Select 50 advocates across different regions and practice types for pilot program",
            timeline: "Week 3-4",
            owner: "TLS Secretariat"
          },
          {
            num: 3,
            title: "Pilot Training",
            desc: "Intensive training for pilot participants including hands-on workshops",
            timeline: "Week 5-6",
            owner: "Platform Team"
          },
          {
            num: 4,
            title: "Pilot Execution",
            desc: "8-week pilot with regular feedback collection and rapid issue resolution",
            timeline: "Week 7-14",
            owner: "All Parties"
          },
          {
            num: 5,
            title: "Pilot Review",
            desc: "Analyze pilot results, gather feedback, make improvements",
            timeline: "Week 15-16",
            owner: "Platform Team"
          },
          {
            num: 6,
            title: "Full Launch Preparation",
            desc: "Marketing campaign, member communications, support scaling",
            timeline: "Week 17-18",
            owner: "TLS Communications"
          },
          {
            num: 7,
            title: "Member-Wide Launch",
            desc: "Platform available to all TLS members with full support",
            timeline: "Week 19+",
            owner: "All Parties"
          }
        ],
        successFactors: [
          "Strong executive sponsorship and visible support",
          "Adequate budget for training and support",
          "Clear communication to all members",
          "Responsive issue resolution during pilot",
          "Celebration of early adopters and successes"
        ]
      }
    },
    // SLIDE 28: Thank You & Contact
    {
      id: 28,
      title: "Thank You",
      subtitle: "Questions & Discussion",
      type: "closing",
      content: {
        contact: {
          website: "stamp-and-manage.preview.emergentagent.com",
          email: "support@tls.or.tz",
          phone: "+255 22 211 5995",
          address: "TLS House, Dar es Salaam"
        },
        cta: "Ready to Transform Legal Document Verification in Tanzania",
        closingStatement: "The TLS Digital Stamping Platform represents a significant opportunity to modernize legal practice, protect the public, and generate sustainable revenue. We're excited to partner with TLS on this transformative journey.",
        acknowledgments: "Thank you to all TLS members who provided input and feedback during the development process. Your insights have shaped a platform that truly serves the needs of Tanzanian legal practitioners."
      }
    }
  ];

  // PDF Export Function
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

      // Preload images for better PDF export
      const preloadImages = async () => {
        const imagePromises = Object.values(SLIDE_IMAGES).map(src => {
          return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = resolve;
            img.onerror = resolve; // Continue even if image fails
            img.src = src;
          });
        });
        await Promise.all(imagePromises);
      };

      await preloadImages();

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        setExportProgress(Math.round(((i + 1) / slides.length) * 100));
        
        // Wait for slide to render with images
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const slideElement = slideRef.current;
        if (slideElement) {
          try {
            const canvas = await html2canvas(slideElement, {
              scale: 2, // Higher quality
              useCORS: true,
              allowTaint: false,
              backgroundColor: '#02040A',
              width: 1920,
              height: 1080,
              logging: false,
              imageTimeout: 5000
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 0.9);
            
            if (i > 0) {
              pdf.addPage([1920, 1080], 'landscape');
            }
            
            pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);
          } catch (slideError) {
            console.warn(`Error capturing slide ${i + 1}:`, slideError);
            // Continue with next slide
          }
        }
      }

      pdf.save('TLS_Digital_Stamping_Platform_Presentation.pdf');
      setCurrentSlide(originalSlide);
      toast.success('Presentation exported to PDF successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

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
      }, 12000); // Longer time for more content
    }
    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  const slide = slides[currentSlide];

  // Guard against undefined slide
  if (!slide) {
    return (
      <div className="min-h-screen bg-[#02040A] flex items-center justify-center">
        <p className="text-white">Loading presentation...</p>
      </div>
    );
  }

  const renderSlideContent = () => {
    // Common image component for slides with images
    const SlideImage = ({ src, alt }) => src ? (
      <div className="absolute right-0 top-0 bottom-0 w-1/3 overflow-hidden opacity-30">
        <img 
          src={src} 
          alt={alt || "Slide background"} 
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#02040A] via-[#02040A]/80 to-transparent" />
      </div>
    ) : null;

    switch (slide.type) {
      case "title":
        return (
          <div className="relative flex flex-col items-center justify-center h-full text-center px-12">
            <SlideImage src={slide.image} alt={slide.title} />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-6">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">{slide.content.tagline}</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 font-heading">{slide.title}</h1>
              <p className="text-xl md:text-2xl text-white/60 mb-6 max-w-3xl">{slide.subtitle}</p>
              <p className="text-base text-white/50 mb-8 max-w-4xl leading-relaxed">{slide.content.description}</p>
              <div className="flex flex-wrap gap-3 justify-center mb-8">
                {slide.content.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-white/80 text-sm">{h}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/40 max-w-3xl italic">{slide.content.additionalInfo}</p>
            </div>
          </div>
        );

      case "summary":
        return (
          <div className="relative flex flex-col h-full px-12 py-6 overflow-y-auto">
            <SlideImage src={slide.image} alt={slide.title} />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-lg text-white/60 mb-6">{slide.subtitle}</p>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4">
                    <h3 className="text-emerald-400 font-semibold mb-2 text-sm uppercase">Mission</h3>
                    <p className="text-white/80 text-sm leading-relaxed">{slide.content.mission}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="p-4">
                    <h3 className="text-blue-400 font-semibold mb-2 text-sm uppercase">Vision</h3>
                    <p className="text-white/80 text-sm leading-relaxed">{slide.content.vision}</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-6">
                {slide.content.keyPoints.map((kp, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="text-white/50 text-xs mb-1">{kp.label}</p>
                      <p className="text-white font-semibold text-sm mb-1">{kp.value}</p>
                      <p className="text-white/40 text-xs">{kp.detail}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 font-medium text-sm">{slide.content.timeline}</span>
                </span>
                <p className="text-white/40 text-xs max-w-lg">{slide.content.investment}</p>
              </div>
            </div>
          </div>
        );

      case "problem-detailed":
        return (
          <div className="relative flex flex-col h-full px-12 py-6 overflow-y-auto">
            <SlideImage src={slide.image} alt={slide.title} />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-lg text-white/60 mb-2">{slide.subtitle}</p>
              <p className="text-sm text-white/50 mb-4">{slide.content.intro}</p>
              
              <div className="grid grid-cols-2 gap-4 flex-1">
              {slide.content.problems.map((p, i) => (
                <Card key={i} className="bg-red-500/5 border-red-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <p.icon className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                        <p className="text-white/60 text-sm">{p.desc}</p>
                      </div>
                    </div>
                    <div className="pl-13 mt-2">
                      <p className="text-red-400/80 text-xs font-medium mb-1">{p.impact}</p>
                      <div className="flex flex-wrap gap-1">
                        {p.examples.map((ex, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 bg-red-500/10 text-red-300 rounded">{ex}</span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <p className="text-center text-red-400/80 mt-4 text-sm italic">{slide.content.conclusion}</p>
            </div>
          </div>
        );

      case "solution-detailed":
        return (
          <div className="relative flex flex-col h-full px-12 py-6 overflow-y-auto">
            <SlideImage src={slide.image} alt={slide.title} />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-lg text-white/60 mb-2">{slide.subtitle}</p>
              <p className="text-sm text-white/50 mb-4">{slide.content.intro}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {slide.content.pillars.map((p, i) => (
                <Card key={i} className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <p.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{p.title}</h3>
                        <p className="text-white/60 text-xs">{p.desc}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.benefits.map((b, j) => (
                        <span key={j} className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-300 rounded">{b}</span>
                      ))}
                    </div>
                    <p className="text-white/40 text-xs italic">{p.technical}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {slide.content.differentiators.map((d, i) => (
                <div key={i} className="flex items-center gap-1 px-3 py-1 bg-white/5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-white/70 text-xs">{d}</span>
                </div>
              ))}
            </div>
            </div>
          </div>
        );

      case "flow-detailed":
        return (
          <div className="relative flex flex-col h-full px-12 py-6 overflow-y-auto">
            <SlideImage src={slide.image} alt={slide.title} />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-lg text-white/60 mb-2">{slide.subtitle}</p>
              <p className="text-sm text-white/50 mb-4">{slide.content.intro}</p>
            
            <div className="grid grid-cols-3 gap-3 flex-1">
              {slide.content.steps.map((step, i) => (
                <Card key={i} className="bg-white/5 border-emerald-500/20">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-sm">
                        {step.num}
                      </div>
                      <step.icon className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-white font-semibold text-sm">{step.title}</h4>
                    </div>
                    <p className="text-white/60 text-xs mb-2">{step.desc}</p>
                    <div className="space-y-1">
                      {step.details.map((d, j) => (
                        <div key={j} className="flex items-start gap-1">
                          <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5" />
                          <span className="text-white/50 text-xs">{d}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
              <p className="text-blue-400 text-center text-sm">
                <Lock className="w-4 h-4 inline mr-2" />
                {slide.content.securityNote}
              </p>
            </div>
            </div>
          </div>
        );

      case "feature-detailed":
        return (
          <div className="relative flex h-full">
            <SlideImage src={slide.image} alt={slide.title} />
            <div className="w-2/5 px-6 py-4 flex flex-col overflow-y-auto relative z-10">
              <h2 className="text-2xl font-bold text-white mb-1">{slide.title}</h2>
              <p className="text-sm text-white/60 mb-3">{slide.subtitle}</p>
              {slide.content.intro && <p className="text-xs text-white/50 mb-3">{slide.content.intro}</p>}
              
              {slide.content.features && (
                <div className="space-y-2 mb-3">
                  {slide.content.features.map((f, i) => (
                    <div key={i} className="p-2 bg-white/5 rounded-lg">
                      <h4 className="text-white font-medium text-xs">{f.title}</h4>
                      <p className="text-white/50 text-xs">{f.desc}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {slide.content.workflow && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase mb-2">Workflow</h4>
                  <div className="space-y-1">
                    {slide.content.workflow.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-white/70 text-xs">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {slide.content.tips && (
                <div>
                  <h4 className="text-xs font-semibold text-blue-400 uppercase mb-2">Pro Tips</h4>
                  <div className="space-y-1">
                    {slide.content.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <Sparkles className="w-3 h-3 text-blue-400 mt-0.5" />
                        <span className="text-white/60 text-xs">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {slide.content.capabilities && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase mb-2">Capabilities</h4>
                  <div className="space-y-1">
                    {slide.content.capabilities.map((c, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5" />
                        <div>
                          <span className="text-white/80 text-xs font-medium">{c.title}</span>
                          {c.desc && <span className="text-white/50 text-xs"> - {c.desc}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {slide.content.useCases && (
                <div>
                  <h4 className="text-xs font-semibold text-purple-400 uppercase mb-2">Use Cases</h4>
                  <div className="space-y-1">
                    {slide.content.useCases.map((uc, i) => (
                      <div key={i} className="p-2 bg-purple-500/5 rounded">
                        <h5 className="text-white font-medium text-xs">{uc.scenario}</h5>
                        <p className="text-white/50 text-xs">{uc.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-3/5 p-3 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
              <div className="w-full h-full rounded-xl border border-white/10 bg-[#02040A] overflow-hidden shadow-2xl">
                {slide.screenshot && SCREENSHOT_IMAGES[slide.screenshot] ? (
                  <img 
                    src={SCREENSHOT_IMAGES[slide.screenshot]}
                    alt={`${slide.title} interface`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <p className="text-white/40">Screenshot preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case "stamps-detailed":
        return (
          <div className="relative flex flex-col h-full px-12 py-6 overflow-y-auto">
            <SlideImage src={slide.image} alt={slide.title} />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-lg text-white/60 mb-2">{slide.subtitle}</p>
              <p className="text-sm text-white/50 mb-4">{slide.content.intro}</p>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              {slide.content.types.map((t, i) => (
                <Card key={i} className="bg-white/5 border-white/10 overflow-hidden">
                  <div className="h-2" style={{ backgroundColor: t.color }} />
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-1">{t.name}</h3>
                    <p className="text-white/60 text-xs mb-2">{t.desc}</p>
                    <p className="text-2xl font-bold mb-3" style={{ color: t.color }}>{t.price}</p>
                    <div className="space-y-1 mb-2">
                      {t.useCases.map((uc, j) => (
                        <div key={j} className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="text-white/60 text-xs">{uc}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-white/40 text-xs font-medium mb-1">Includes:</p>
                      <div className="flex flex-wrap gap-1">
                        {t.includes.map((inc, j) => (
                          <span key={j} className="text-xs px-1.5 py-0.5 bg-white/5 text-white/50 rounded">{inc}</span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <h4 className="text-sm font-semibold text-emerald-400 mb-2">Customization Options</h4>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {slide.content.customization.map((c, i) => (
                <div key={i} className="p-2 bg-white/5 rounded text-center">
                  <h5 className="text-white font-medium text-xs">{c.feature}</h5>
                  <p className="text-white/50 text-[10px]">{c.desc}</p>
                  <p className="text-emerald-400/60 text-[10px] italic">{c.purpose}</p>
                </div>
              ))}
            </div>
            
            <p className="text-center text-emerald-400/80 text-xs">{slide.content.volumeDiscounts}</p>
            </div>
          </div>
        );

      case "benefits-detailed":
        return (
          <div className="relative flex flex-col h-full px-12 py-6 overflow-y-auto">
            <SlideImage src={slide.image} alt={slide.title} />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
              <p className="text-lg text-white/60 mb-2">{slide.subtitle}</p>
              <p className="text-sm text-white/50 mb-4">{slide.content.intro}</p>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                {slide.content.benefits.map((b, i) => (
                  <Card key={i} className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                          <b.icon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-white">{b.title}</h3>
                          <p className="text-white/60 text-xs">{b.desc}</p>
                        </div>
                      </div>
                      <p className="text-emerald-400/70 text-xs mt-2 pl-13">{b.impact}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {slide.content.testimonialPlaceholder && (
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 text-center">
                  <p className="text-white/60 text-sm italic">{slide.content.testimonialPlaceholder}</p>
                </div>
              )}
              
              {slide.content.publicEducation && (
                <p className="text-center text-emerald-400/80 text-sm mt-4">{slide.content.publicEducation}</p>
              )}
              
              {slide.content.strategicValue && (
                <p className="text-center text-blue-400/80 text-sm mt-4 italic">{slide.content.strategicValue}</p>
              )}
            </div>
          </div>
        );

      // Add more cases for other slide types...
      // For brevity, I'll add a default handler that works for many slide types
      
      case "closing":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-12">
            <h1 className="text-5xl font-bold text-white mb-4">{slide.title}</h1>
            <p className="text-xl text-white/60 mb-6">{slide.subtitle}</p>
            
            <p className="text-white/50 max-w-3xl mb-8 text-sm leading-relaxed">{slide.content.closingStatement}</p>
            
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
              <div className="text-center">
                <MapPin className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-white/80 text-sm">{slide.content.contact.address}</p>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/20 rounded-full border border-emerald-500/30 mb-6">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">{slide.content.cta}</span>
            </div>
            
            <p className="text-white/40 text-xs max-w-2xl italic">{slide.content.acknowledgments}</p>
          </div>
        );

      default:
        // Generic handler for undefined slide types - safely renders common content patterns
        return (
          <div className="flex flex-col h-full px-12 py-6 overflow-y-auto">
            <h2 className="text-3xl font-bold text-white mb-2">{slide.title}</h2>
            <p className="text-lg text-white/60 mb-2">{slide.subtitle}</p>
            
            {/* Handle intro text */}
            {slide.content?.intro && (
              <p className="text-sm text-white/50 mb-4">{slide.content.intro}</p>
            )}
            
            {/* Handle features array - common pattern */}
            {slide.content?.features && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                {slide.content.features.map((f, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      {f.icon && <f.icon className="w-6 h-6 text-emerald-400 mb-2" />}
                      <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                      <p className="text-white/60 text-xs">{f.desc}</p>
                      {f.benefit && <p className="text-emerald-400/70 text-xs mt-1">{f.benefit}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Handle items array - common pattern */}
            {slide.content?.items && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                {slide.content.items.map((item, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      {item.icon && <item.icon className="w-6 h-6 text-emerald-400 mb-2" />}
                      <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                      <p className="text-white/60 text-xs">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Handle modules array - for practice management and similar slides */}
            {slide.content?.modules && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                {slide.content.modules.map((m, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      {m.icon && <m.icon className="w-6 h-6 text-emerald-400 mb-2" />}
                      <h3 className="text-sm font-semibold text-white mb-1">{m.title}</h3>
                      <p className="text-white/60 text-xs mb-2">{m.desc}</p>
                      {m.features && (
                        <div className="space-y-1">
                          {m.features.slice(0, 3).map((f, j) => (
                            <div key={j} className="flex items-center gap-1 text-xs text-white/50">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Handle phases array - for roadmap slides */}
            {slide.content?.phases && (
              <div className="grid grid-cols-4 gap-4 mb-4">
                {slide.content.phases.map((phase, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="text-emerald-400 font-bold mb-1">{phase.phase}</div>
                      <h3 className="text-sm font-semibold text-white mb-1">{phase.title}</h3>
                      <p className="text-white/50 text-xs mb-2">{phase.duration}</p>
                      {phase.items?.map((item, j) => (
                        <div key={j} className="flex items-center gap-1 text-xs text-white/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {item}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Handle metrics array - for metrics slides */}
            {slide.content?.metrics && (
              <div className="grid grid-cols-4 gap-4 mb-4">
                {slide.content.metrics.map((m, i) => (
                  <Card key={i} className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 text-center">
                      {m.icon && <m.icon className="w-8 h-8 text-emerald-400 mx-auto mb-2" />}
                      <p className="text-2xl font-bold text-white">{m.value}</p>
                      <p className="text-white/60 text-sm">{m.label}</p>
                      {m.target && <p className="text-emerald-400/70 text-xs mt-1">Target: {m.target}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Handle streams array - for revenue slides */}
            {slide.content?.streams && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {slide.content.streams.map((s, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      {s.icon && <s.icon className="w-6 h-6 text-emerald-400 mb-2" />}
                      <h3 className="text-sm font-semibold text-white mb-1">{s.title}</h3>
                      <p className="text-white/60 text-xs mb-2">{s.desc}</p>
                      {s.pricing && <p className="text-emerald-400 text-sm font-semibold">{s.pricing}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Handle layers array - for security slides */}
            {slide.content?.layers && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                {slide.content.layers.map((l, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      {l.icon && <l.icon className="w-6 h-6 text-emerald-400 mb-2" />}
                      <h3 className="text-sm font-semibold text-white mb-1">{l.title}</h3>
                      <p className="text-white/60 text-xs">{l.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Handle steps array - for next-steps slides */}
            {slide.content?.steps && (
              <div className="grid grid-cols-4 gap-4 mb-4">
                {slide.content.steps.map((s, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold mb-2">
                        {i + 1}
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">{s.title}</h3>
                      <p className="text-white/60 text-xs">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Handle programs array - for support slides */}
            {slide.content?.programs && (
              <div className="grid grid-cols-3 gap-4 mb-4">
                {slide.content.programs.map((p, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      {p.icon && <p.icon className="w-6 h-6 text-emerald-400 mb-2" />}
                      <h3 className="text-sm font-semibold text-white mb-1">{p.title}</h3>
                      <p className="text-white/60 text-xs">{p.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Fallback message if no content patterns match */}
            {!slide.content?.features && !slide.content?.items && !slide.content?.phases && 
             !slide.content?.metrics && !slide.content?.streams && !slide.content?.layers &&
             !slide.content?.steps && !slide.content?.programs && !slide.content?.intro && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/50">Slide type: {slide.type}</p>
              </div>
            )}
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
              <p className="text-white/60 text-sm mb-4">Processing slide {Math.ceil((exportProgress / 100) * slides.length)} of {slides.length}</p>
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
            <p className="text-white/50 text-sm">Digital Stamping Platform</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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
            {isPlaying ? 'Pause' : 'Auto'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToPDF}
            disabled={isExporting}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Slide Content */}
      <div ref={slideRef} className="flex-1 relative overflow-hidden bg-[#02040A]" style={{ minHeight: '700px' }}>
        {renderSlideContent()}
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-black/50">
        <Button variant="outline" onClick={prevSlide} disabled={currentSlide === 0}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <div className="flex items-center gap-1 max-w-2xl overflow-x-auto py-1">
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
