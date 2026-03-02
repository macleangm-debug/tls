import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import axios from "axios";
import { 
  ShieldCheck, QrCode, Scale, Search, ArrowRight, CheckCircle2, 
  Users, FileCheck, Building2, Fingerprint, Zap, Globe, Lock,
  ChevronRight, ExternalLink, Menu, X, Play, Sparkles, Calendar,
  MapPin, Phone, Mail, Clock, BookOpen, Award, Gavel, FileText,
  Landmark, GraduationCap, Heart, Newspaper, ArrowUpRight, User,
  FileSpreadsheet, Presentation, Image, ScanLine
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Sample news data
const NEWS_ITEMS = [
  {
    id: 1,
    title: "TLS Annual General Meeting 2026",
    excerpt: "All members are invited to attend the upcoming AGM scheduled for March 15, 2026 in Dar es Salaam.",
    date: "Jan 28, 2026",
    category: "Announcement",
    urgent: true
  },
  {
    id: 2,
    title: "New Digital Stamp Verification System Launched",
    excerpt: "TLS introduces tamper-proof digital stamps with QR verification for all legal documents.",
    date: "Jan 25, 2026",
    category: "Technology"
  },
  {
    id: 3,
    title: "CLE Requirements Update for 2026",
    excerpt: "Minimum 20 CLE points required for license renewal. New approved courses available.",
    date: "Jan 20, 2026",
    category: "Education"
  },
  {
    id: 4,
    title: "Pro Bono Legal Aid Week",
    excerpt: "Join fellow advocates in providing free legal services to underserved communities.",
    date: "Jan 15, 2026",
    category: "Community"
  }
];

// Sample events data
const EVENTS = [
  {
    id: 1,
    title: "Legal Tech Conference 2026",
    date: "Feb 15, 2026",
    time: "9:00 AM",
    location: "Hyatt Regency, Dar es Salaam",
    type: "Conference"
  },
  {
    id: 2,
    title: "Ethics in Modern Practice",
    date: "Feb 22, 2026",
    time: "2:00 PM",
    location: "Virtual (Zoom)",
    type: "CLE Course",
    cle_points: 5
  },
  {
    id: 3,
    title: "Young Lawyers Networking",
    date: "Mar 1, 2026",
    time: "6:00 PM",
    location: "TLS Headquarters",
    type: "Networking"
  }
];

// Regional offices
const REGIONAL_OFFICES = [
  { name: "Dar es Salaam", address: "TLS Tower, Ohio Street", phone: "+255 22 211 5995", isHQ: true },
  { name: "Arusha", address: "Sokoine Road, Block 5", phone: "+255 27 250 3456" },
  { name: "Mwanza", address: "Kenyatta Road", phone: "+255 28 250 1234" },
  { name: "Dodoma", address: "Capital City Center", phone: "+255 26 232 5678" },
  { name: "Mbeya", address: "Market Street", phone: "+255 25 250 9012" },
  { name: "Zanzibar", address: "Stone Town", phone: "+255 24 223 3456" }
];

const LandingPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [advocateSearch, setAdvocateSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({ advocates: 0, stamps: 0, verifications: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        await axios.get(`${API}/health`);
        setStats({ advocates: 5247, stamps: 52891, verifications: 147823 });
      } catch (e) {
        setStats({ advocates: 5000, stamps: 50000, verifications: 100000 });
      }
    };
    fetchStats();
  }, []);

  const handleVerify = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/verify?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleAdvocateSearch = (e) => {
    e.preventDefault();
    if (advocateSearch.trim()) {
      navigate(`/verify?q=${encodeURIComponent(advocateSearch.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#02040A] text-white overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-hero-glow pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-30" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group" data-testid="logo-link">
            <div className="w-12 h-12 rounded-xl bg-white p-1.5 group-hover:shadow-glow transition-all duration-300">
              <img src="/assets/tls-logo.png" alt="TLS" className="w-full h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-heading font-semibold text-lg leading-none tracking-tight">Tanganyika Law Society</p>
              <p className="text-white/50 text-xs mt-0.5">Est. 1954</p>
            </div>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            <a href="#news" className="text-white/70 hover:text-white transition-colors text-sm font-medium">News</a>
            <a href="#events" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Events</a>
            <Link to="/directory" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Find Advocate</Link>
            <Link to="/verify" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Verify</Link>
            <Link to="/business" className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium flex items-center gap-1">
              For Business
              <Building2 className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/5 rounded-full px-6" data-testid="nav-login">
                Member Login
              </Button>
            </Link>
            <Link to="/register">
              <Button className="bg-tls-gold hover:bg-tls-gold/90 text-black rounded-full px-6 font-semibold" data-testid="nav-register">
                Join TLS
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden text-white p-2" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden glass border-t border-white/5 px-6 py-6 space-y-4 animate-slide-down">
            <a href="#news" className="block text-white/80 hover:text-white py-2">News</a>
            <Link to="/verify" className="block text-white/80 hover:text-white py-2">Verify Stamp</Link>
            <Link to="/directory" className="block text-white/80 hover:text-white py-2">Find Advocate</Link>
            <Link to="/business" className="block text-emerald-400 hover:text-emerald-300 py-2 font-medium">For Business</Link>
            <Link to="/login" className="block text-white/80 hover:text-white py-2">Member Login</Link>
            <Link to="/register">
              <Button className="w-full bg-tls-gold text-black rounded-full font-semibold">Join TLS</Button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-32">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8 animate-slide-up">
              <Badge className="bg-tls-gold/20 text-tls-gold border-tls-gold/30 rounded-full px-4 py-1.5">
                <Scale className="w-3.5 h-3.5 mr-2" />
                Serving Tanzania Since 1954
              </Badge>
              
              <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9]">
                Upholding
                <br />
                <span className="text-gradient-gold">Justice</span> &
                <br />
                <span className="text-tls-blue-electric">Rule of Law</span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/60 max-w-xl leading-relaxed">
                The Tanganyika Law Society is the premier bar association in Tanzania, 
                dedicated to advancing the legal profession and ensuring access to justice for all.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/register">
                  <Button size="lg" className="bg-tls-gold hover:bg-tls-gold/90 text-black rounded-full px-8 py-6 text-lg font-semibold shadow-glow-gold hover:shadow-glow-lg transition-all hover:scale-105" data-testid="hero-join-btn">
                    Become a Member
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#services">
                  <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-full px-8 py-6 text-lg font-medium">
                    Our Services
                  </Button>
                </a>
              </div>
            </div>
            
            {/* Right - Quick Actions Card */}
            <div className="lg:col-span-5 space-y-4">
              {/* Verify Stamp Card */}
              <Card className="glass-card rounded-3xl overflow-hidden" data-testid="verification-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-tls-blue-electric/20 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-tls-blue-electric" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-semibold text-white">Verify Stamp</h3>
                      <p className="text-xs text-white/50">Check document authenticity</p>
                    </div>
                  </div>
                  
                  {/* Three verification methods */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <Link to="/verify?mode=scan" className="group">
                      <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-tls-blue-electric/40 hover:bg-tls-blue-electric/5 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-tls-blue-electric/20 flex items-center justify-center mb-2 group-hover:shadow-glow-sm transition-all">
                          <QrCode className="w-5 h-5 text-tls-blue-electric" />
                        </div>
                        <span className="text-xs font-medium text-white/80 group-hover:text-white">Scan QR</span>
                      </div>
                    </Link>
                    <Link to="/verify?mode=upload" className="group">
                      <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2 group-hover:shadow-glow-sm transition-all">
                          <FileCheck className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-xs font-medium text-white/80 group-hover:text-white">Upload</span>
                      </div>
                    </Link>
                    <Link to="/verify?mode=id" className="group">
                      <div className="flex flex-col items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:border-tls-gold/40 hover:bg-tls-gold/5 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-tls-gold/20 flex items-center justify-center mb-2 group-hover:shadow-glow-gold transition-all">
                          <Fingerprint className="w-5 h-5 text-tls-gold" />
                        </div>
                        <span className="text-xs font-medium text-white/80 group-hover:text-white">Stamp ID</span>
                      </div>
                    </Link>
                  </div>
                  
                  {/* Quick search input */}
                  <form onSubmit={handleVerify} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter Stamp ID (e.g., TLS-20260216-ABC123)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl font-mono text-sm focus:border-tls-blue-electric"
                      data-testid="verification-input"
                    />
                    <Button type="submit" className="h-11 px-5 bg-tls-blue-electric hover:bg-tls-blue-electric/90 rounded-xl" data-testid="verification-submit">
                      <Search className="w-4 h-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-4">
                <Link to="/login">
                  <Card className="glass-card rounded-2xl hover:border-tls-blue-electric/30 transition-all group cursor-pointer h-full">
                    <CardContent className="p-5 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-tls-blue-electric/20 flex items-center justify-center mb-3 group-hover:shadow-glow transition-all">
                        <User className="w-6 h-6 text-tls-blue-electric" />
                      </div>
                      <p className="font-semibold text-white text-sm">Member Portal</p>
                      <p className="text-xs text-white/40 mt-1">Login to dashboard</p>
                    </CardContent>
                  </Card>
                </Link>
                
                <a href="#directory">
                  <Card className="glass-card rounded-2xl hover:border-tls-gold/30 transition-all group cursor-pointer h-full">
                    <CardContent className="p-5 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-xl bg-tls-gold/20 flex items-center justify-center mb-3 group-hover:shadow-glow-gold transition-all">
                        <Users className="w-6 h-6 text-tls-gold" />
                      </div>
                      <p className="font-semibold text-white text-sm">Find Advocate</p>
                      <p className="text-xs text-white/40 mt-1">Search directory</p>
                    </CardContent>
                  </Card>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Bar */}
      <section className="relative py-8 border-y border-white/5 glass">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: stats.advocates.toLocaleString() + "+", label: "Registered Advocates", icon: Users },
              { value: "70+", label: "Years of Service", icon: Award },
              { value: stats.stamps.toLocaleString() + "+", label: "Stamps Verified", icon: ShieldCheck },
              { value: "26", label: "Regional Offices", icon: MapPin }
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center" data-testid={`live-stat-${i}`}>
                <stat.icon className="w-5 h-5 text-tls-gold mb-2" />
                <p className="text-2xl md:text-3xl font-heading font-bold text-white">{stat.value}</p>
                <p className="text-xs md:text-sm text-white/50 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Digital Certification Platform - NEW HIGHLIGHT SECTION */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-tls-blue-electric/5 via-transparent to-tls-gold/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-tls-blue-electric/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          {/* Section Header */}
          <div className="text-center mb-12">
            <Badge className="bg-gradient-to-r from-tls-blue-electric/20 to-emerald-500/20 text-white border-0 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="w-3 h-3 mr-1 inline" />
              Tanzania&apos;s First Cryptographically Signed Legal Certification
            </Badge>
            <h2 className="font-heading text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Digital Certification
              <span className="text-gradient-gold"> Platform</span>
            </h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              The most advanced legal document verification system in East Africa, 
              built for courts, banks, and international institutions.
            </p>
          </div>
          
          {/* Feature Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Cryptographic Signing */}
            <Card className="glass-card rounded-2xl border-blue-500/20 hover:border-blue-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center mb-4 group-hover:shadow-glow transition-all">
                  <Lock className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  Cryptographic Signing
                </h3>
                <p className="text-sm text-white/50 mb-4">
                  ECDSA P-256 + SHA-256 digital signatures. Non-forgeable, independently verifiable by any institution.
                </p>
                <div className="flex items-center gap-2 text-blue-400 text-xs font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Public key available at /.well-known/tls-stamp-keys
                </div>
              </CardContent>
            </Card>

            {/* Tamper Detection */}
            <Card className="glass-card rounded-2xl border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mb-4 group-hover:shadow-glow transition-all">
                  <FileCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  Tamper Detection
                </h3>
                <p className="text-sm text-white/50 mb-4">
                  SHA-256 document fingerprinting. Upload any document to verify it hasn&apos;t been modified.
                </p>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <Fingerprint className="w-3.5 h-3.5" />
                  Instant hash validation
                </div>
              </CardContent>
            </Card>

            {/* Batch Stamping */}
            <Card className="glass-card rounded-2xl border-purple-500/20 hover:border-purple-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/10 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center mb-4 group-hover:shadow-glow transition-all">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  Batch Stamping
                </h3>
                <p className="text-sm text-white/50 mb-4">
                  Stamp up to 25 documents at once. Each gets unique ID, QR code, and hash binding.
                </p>
                <div className="flex items-center gap-2 text-purple-400 text-xs font-medium">
                  <Zap className="w-3.5 h-3.5" />
                  Perfect for high-volume practices
                </div>
              </CardContent>
            </Card>

            {/* Universal Format Support */}
            <Card className="glass-card rounded-2xl border-teal-500/20 hover:border-teal-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-500/10 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 flex items-center justify-center mb-4 group-hover:shadow-glow transition-all">
                  <FileSpreadsheet className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  Universal Format Support
                </h3>
                <p className="text-sm text-white/50 mb-4">
                  Upload PDF, Word (DOCX/DOC), Excel (XLSX/XLS), PowerPoint (PPTX/PPT), images (PNG/JPG), and more.
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {['PDF', 'DOCX', 'XLSX', 'PPTX', 'PNG', 'JPG'].map((fmt) => (
                    <span key={fmt} className="px-2 py-0.5 bg-teal-500/10 text-teal-400 text-[10px] font-medium rounded-full border border-teal-500/20">
                      {fmt}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-teal-400 text-xs font-medium">
                  <ScanLine className="w-3.5 h-3.5" />
                  Plus document scanning with auto-crop
                </div>
              </CardContent>
            </Card>

            {/* Compliance Ledger */}
            <Card className="glass-card rounded-2xl border-amber-500/20 hover:border-amber-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/10 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center mb-4 group-hover:shadow-glow-gold transition-all">
                  <BookOpen className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  Compliance Ledger
                </h3>
                <p className="text-sm text-white/50 mb-4">
                  Complete audit trail for every stamp. Filter, search, export CSV, revoke with reason.
                </p>
                <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  Regulatory-grade audit logging
                </div>
              </CardContent>
            </Card>

            {/* QR Verification */}
            <Card className="glass-card rounded-2xl border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center mb-4 group-hover:shadow-glow transition-all">
                  <QrCode className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  Instant QR Verification
                </h3>
                <p className="text-sm text-white/50 mb-4">
                  Scan any TLS stamp with your phone. Get instant VALID/REVOKED/EXPIRED status.
                </p>
                <Link to="/verify" className="flex items-center gap-2 text-cyan-400 text-xs font-medium hover:text-cyan-300 transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Try verification now
                </Link>
              </CardContent>
            </Card>

            {/* Admin Controls */}
            <Card className="glass-card rounded-2xl border-red-500/20 hover:border-red-500/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/10 group">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center mb-4 group-hover:shadow-glow transition-all">
                  <Scale className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-white mb-2">
                  Regulatory Controls
                </h3>
                <p className="text-sm text-white/50 mb-4">
                  Bulk revoke for suspended advocates. Super admin safety controls with confirmation.
                </p>
                <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  Institutional-grade security
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {[
              { icon: ShieldCheck, text: "Cryptographically Signed", color: "text-blue-400" },
              { icon: Fingerprint, text: "SHA-256 Hash Binding", color: "text-emerald-400" },
              { icon: Globe, text: "Public Key Verification", color: "text-purple-400" },
              { icon: Lock, text: "Non-Forgeable", color: "text-amber-400" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-sm text-white/70">{item.text}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/verify">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all" data-testid="cert-verify-cta">
                Verify a Stamp
                <ShieldCheck className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-xl px-8 py-6 text-base font-medium" data-testid="cert-explore-cta">
                Explore the Platform
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About TLS Section */}
      <section id="about" className="py-24 md:py-32 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <Badge className="bg-tls-blue-electric/20 text-tls-blue-electric border-tls-blue-electric/30 rounded-full px-4 py-1.5">
                About Us
              </Badge>
              <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-white">
                The Voice of Tanzania's Legal Profession
              </h2>
              <p className="text-lg text-white/60 leading-relaxed">
                Established in 1954, the Tanganyika Law Society (TLS) is the statutory bar association 
                representing all advocates admitted to practice law in Tanzania. We are committed to 
                maintaining the highest standards of legal practice and ensuring that justice is 
                accessible to all Tanzanians.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                {[
                  { icon: Gavel, title: "Professional Standards", desc: "Upholding ethics and excellence" },
                  { icon: Heart, title: "Access to Justice", desc: "Pro bono and legal aid programs" },
                  { icon: GraduationCap, title: "Legal Education", desc: "Continuous professional development" },
                  { icon: Globe, title: "Advocacy", desc: "Championing rule of law" }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-tls-gold" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{item.title}</p>
                      <p className="text-xs text-white/50">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="glass-card rounded-3xl p-8 space-y-6">
                <h3 className="font-heading text-2xl font-semibold text-white">Our Mission</h3>
                <p className="text-white/60 leading-relaxed">
                  To promote the rule of law, protect the independence of the legal profession, 
                  ensure access to justice for all, and maintain the highest standards of professional 
                  conduct among advocates in Tanzania.
                </p>
                <div className="pt-4 border-t border-white/10">
                  <h4 className="font-semibold text-white mb-3">Core Values</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Integrity", "Excellence", "Independence", "Service", "Justice"].map((value) => (
                      <Badge key={value} className="bg-white/5 text-white/70 border-white/10 rounded-full">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-tls-blue-electric/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="text-center mb-16 space-y-4">
            <Badge className="bg-tls-gold/20 text-tls-gold border-tls-gold/30 rounded-full px-4 py-1.5">
              Services
            </Badge>
            <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-white">
              What We Offer
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Comprehensive services for advocates and the public
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: QrCode, title: "Digital Stamps", desc: "Issue tamper-proof digital stamps with QR verification. Supports PDF, DOCX, DOC, XLSX, PPTX, PNG, JPG and document scanning.", color: "tls-blue-electric", link: "/digital-stamps" },
              { icon: FileCheck, title: "Physical Stamps", desc: "Order official TLS-approved physical stamps for your legal practice", color: "tls-gold", link: "/order-stamp" },
              { icon: ShieldCheck, title: "Document Verification", desc: "Public portal to verify authenticity of any stamped legal document", color: "emerald-500", link: "/verify" },
              { icon: GraduationCap, title: "CLE Programs", desc: "Continuing Legal Education courses for professional development", color: "purple-500" },
              { icon: Heart, title: "Pro Bono Services", desc: "Coordinated legal aid programs for underserved communities", color: "rose-500" },
              { icon: Landmark, title: "Advocacy & Policy", desc: "Representation in legal reforms and policy development", color: "cyan-500" }
            ].map((service, i) => (
              <Card key={i} className={`glass-card rounded-2xl hover:border-${service.color}/30 transition-all group`} data-testid={`service-${i}`}>
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-2xl bg-${service.color}/20 flex items-center justify-center mb-4 group-hover:shadow-glow transition-all`}>
                    <service.icon className={`w-7 h-7 text-${service.color}`} />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-white mb-2">{service.title}</h3>
                  <p className="text-white/50 text-sm mb-4">{service.desc}</p>
                  {service.link && (
                    <Link to={service.link} className={`text-sm text-${service.color} flex items-center gap-1 hover:gap-2 transition-all`}>
                      Learn more <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* News & Events Grid */}
      <section id="news" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* News Column */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 rounded-full px-4 py-1.5 mb-3">
                    <Newspaper className="w-3.5 h-3.5 mr-2" />
                    News
                  </Badge>
                  <h2 className="font-heading text-3xl font-bold text-white">Latest Updates</h2>
                </div>
                <Button variant="ghost" className="text-white/60 hover:text-white">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {NEWS_ITEMS.map((news) => (
                  <Card key={news.id} className="glass-card rounded-2xl hover:border-white/20 transition-all group cursor-pointer" data-testid={`news-${news.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-white/5 text-white/60 border-white/10 text-xs rounded-full">
                              {news.category}
                            </Badge>
                            {news.urgent && (
                              <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/30 text-xs rounded-full">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-white group-hover:text-tls-blue-electric transition-colors">{news.title}</h3>
                          <p className="text-sm text-white/50 mt-1 line-clamp-2">{news.excerpt}</p>
                          <p className="text-xs text-white/30 mt-2">{news.date}</p>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-white/30 group-hover:text-tls-blue-electric transition-colors flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            {/* Events Column */}
            <div id="events">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 rounded-full px-4 py-1.5 mb-3">
                    <Calendar className="w-3.5 h-3.5 mr-2" />
                    Events
                  </Badge>
                  <h2 className="font-heading text-3xl font-bold text-white">Upcoming Events</h2>
                </div>
                <Button variant="ghost" className="text-white/60 hover:text-white">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {EVENTS.map((event) => (
                  <Card key={event.id} className="glass-card rounded-2xl hover:border-purple-500/30 transition-all group cursor-pointer" data-testid={`event-${event.id}`}>
                    <CardContent className="p-5">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex flex-col items-center justify-center flex-shrink-0">
                          <p className="text-xs text-purple-400">{event.date.split(" ")[0]}</p>
                          <p className="text-xl font-bold text-white">{event.date.split(" ")[1].replace(",", "")}</p>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-white/5 text-white/60 border-white/10 text-xs rounded-full">
                              {event.type}
                            </Badge>
                            {event.cle_points && (
                              <Badge className="bg-tls-gold/20 text-tls-gold border-tls-gold/30 text-xs rounded-full">
                                {event.cle_points} CLE Points
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-white">{event.title}</h3>
                          <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {event.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {event.location}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Find an Advocate Directory */}
      <section id="directory" className="py-24 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-tls-gold/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-tls-gold/20 text-tls-gold border-tls-gold/30 rounded-full px-4 py-1.5">
                Advocate Directory
              </Badge>
              <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-white">
                Find a Verified Advocate
              </h2>
              <p className="text-lg text-white/60 leading-relaxed">
                Search our comprehensive directory of registered advocates in Tanzania. 
                Verify credentials, check practicing status, and find legal representation 
                in your region.
              </p>
              
              <form onSubmit={handleAdvocateSearch} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    type="text"
                    placeholder="Search by name or roll number..."
                    value={advocateSearch}
                    onChange={(e) => setAdvocateSearch(e.target.value)}
                    className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-xl text-lg focus:border-tls-gold"
                    data-testid="advocate-search-input"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-tls-gold hover:bg-tls-gold/90 text-black font-semibold rounded-xl" data-testid="advocate-search-btn">
                  Search Directory
                  <Search className="w-4 h-4 ml-2" />
                </Button>
              </form>
              
              <div className="flex flex-wrap gap-2 pt-2">
                <p className="text-sm text-white/40 mr-2">Popular:</p>
                {["Dar es Salaam", "Arusha", "Corporate Law", "Criminal Defense"].map((tag) => (
                  <Badge key={tag} className="bg-white/5 text-white/60 border-white/10 rounded-full cursor-pointer hover:bg-white/10">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="glass-card rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Featured Advocates</h3>
                <Badge className="bg-tls-verified/20 text-tls-verified border-tls-verified/30 text-xs rounded-full">
                  Verified
                </Badge>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Adv. Sarah Mwakasege", roll: "ADV/2020/1234", specialty: "Corporate Law", region: "Dar es Salaam" },
                  { name: "Adv. John Kimario", roll: "ADV/2018/5678", specialty: "Criminal Defense", region: "Arusha" },
                  { name: "Adv. Grace Mushi", roll: "ADV/2019/9012", specialty: "Family Law", region: "Mwanza" },
                  { name: "Adv. Peter Massawe", roll: "ADV/2021/3456", specialty: "Property Law", region: "Dodoma" }
                ].map((advocate, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-tls-gold/30 transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-full bg-tls-gold/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-tls-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{advocate.name}</p>
                      <p className="text-xs text-white/40 font-mono">{advocate.roll}</p>
                      <p className="text-xs text-white/50 mt-1">{advocate.specialty} • {advocate.region}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-tls-verified flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Regional Offices */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16 space-y-4">
            <Badge className="bg-cyan-500/20 text-cyan-500 border-cyan-500/30 rounded-full px-4 py-1.5">
              <MapPin className="w-3.5 h-3.5 mr-2" />
              Locations
            </Badge>
            <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-white">
              Regional Offices
            </h2>
            <p className="text-lg text-white/50">Find TLS offices across Tanzania</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {REGIONAL_OFFICES.map((office, i) => (
              <Card key={i} className={`glass-card rounded-2xl transition-all ${office.isHQ ? 'border-tls-gold/30 ring-1 ring-tls-gold/20' : 'hover:border-white/20'}`} data-testid={`office-${i}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${office.isHQ ? 'bg-tls-gold/20' : 'bg-white/5'}`}>
                        <Building2 className={`w-5 h-5 ${office.isHQ ? 'text-tls-gold' : 'text-white/60'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{office.name}</h3>
                        {office.isHQ && (
                          <Badge className="bg-tls-gold/20 text-tls-gold border-tls-gold/30 text-xs rounded-full mt-1">
                            Headquarters
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-white/60">
                      <MapPin className="w-4 h-4 text-white/40" />
                      {office.address}
                    </p>
                    <p className="flex items-center gap-2 text-white/60">
                      <Phone className="w-4 h-4 text-white/40" />
                      {office.phone}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Join TLS CTA */}
      <section className="py-24 md:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-tls-blue-electric/10 to-transparent" />
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center relative">
          <div className="glass-card rounded-3xl p-12 md:p-16">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-tls-gold/20 flex items-center justify-center mb-8">
              <Scale className="w-10 h-10 text-tls-gold" />
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white mb-6">
              Join the Legal Community
            </h2>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              Become a member of the Tanganyika Law Society and access exclusive benefits, 
              professional development, and a network of legal professionals across Tanzania.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button size="lg" className="bg-tls-gold hover:bg-tls-gold/90 text-black rounded-full px-10 py-7 text-lg font-semibold shadow-glow-gold hover:shadow-glow-lg transition-all hover:scale-105" data-testid="cta-join">
                  Apply for Membership
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 rounded-full px-10 py-7 text-lg font-semibold" data-testid="cta-login">
                  Member Login
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-white/10">
              {[
                { icon: BookOpen, label: "CLE Access" },
                { icon: QrCode, label: "Digital Stamps" },
                { icon: Users, label: "Networking" }
              ].map((benefit, i) => (
                <div key={i} className="text-center">
                  <benefit.icon className="w-6 h-6 text-tls-gold mx-auto mb-2" />
                  <p className="text-sm text-white/60">{benefit.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-tls-gold to-tls-gold/70 flex items-center justify-center">
                  <span className="text-black font-heading font-bold text-lg">TLS</span>
                </div>
                <div>
                  <p className="text-white font-heading font-semibold text-lg">Tanganyika Law Society</p>
                  <p className="text-white/40 text-xs">Upholding Justice Since 1954</p>
                </div>
              </div>
              <p className="text-white/50 text-sm mb-6 max-w-sm">
                The premier bar association in Tanzania, dedicated to advancing the legal profession 
                and ensuring access to justice for all.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Globe className="w-5 h-5 text-white/60" />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Mail className="w-5 h-5 text-white/60" />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Phone className="w-5 h-5 text-white/60" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li><a href="#about" className="hover:text-white transition-colors">About TLS</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">Services</a></li>
                <li><a href="#news" className="hover:text-white transition-colors">News</a></li>
                <li><a href="#events" className="hover:text-white transition-colors">Events</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">For Members</h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li><Link to="/login" className="hover:text-white transition-colors">Member Portal</Link></li>
                <li><Link to="/verify" className="hover:text-white transition-colors">Verify Stamp</Link></li>
                <li><a href="#directory" className="hover:text-white transition-colors">Find Advocate</a></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Join TLS</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-3 text-sm text-white/50">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  TLS Tower, Ohio Street<br />Dar es Salaam
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +255 22 211 5995
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  info@tls.or.tz
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} Tanganyika Law Society. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-white/40">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Code of Conduct</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
