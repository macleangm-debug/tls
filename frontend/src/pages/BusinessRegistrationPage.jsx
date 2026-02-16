import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";
import { 
  Shield, CheckCircle2, Zap, Lock, Globe, Building2, 
  ArrowRight, FileCheck, Users, Clock, BadgeCheck, 
  ChevronRight, Star, TrendingUp, Briefcase, Scale,
  CreditCard, Phone, Mail, MapPin, Loader2, Coins, Package,
  X, Gift, Percent
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Format TZS currency
const formatTZS = (amount) => {
  return new Intl.NumberFormat('en-TZ', { 
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function BusinessRegistrationPage() {
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [hasShownExitModal, setHasShownExitModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [pricingData, setPricingData] = useState({ public_fee: 50000, tiers: [] });
  const [formData, setFormData] = useState({
    organization_name: "",
    organization_type: "",
    registration_number: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "",
    expected_volume: "",
    use_case: "",
    password: "",
    confirm_password: ""
  });

  // Fetch pricing tiers on mount
  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/verification-tiers`);
        setPricingData(response.data);
      } catch (error) {
        console.error("Failed to fetch pricing tiers:", error);
        // Fallback defaults
        setPricingData({
          public_fee: 50000,
          tiers: [
            { id: "basic", name: "Basic", credits: 10, price_per_unit: 25000, total_price: 250000, description: "Save 50% vs public rate", savings_percent: 50 },
            { id: "standard", name: "Standard", credits: 50, price_per_unit: 20000, total_price: 1000000, description: "Save 60% vs public rate", popular: true, savings_percent: 60 },
            { id: "professional", name: "Professional", credits: 200, price_per_unit: 17500, total_price: 3500000, description: "Save 65% vs public rate", savings_percent: 65 },
            { id: "enterprise", name: "Enterprise", credits: 500, price_per_unit: 15000, total_price: 7500000, description: "Save 70% vs public rate", savings_percent: 70 }
          ]
        });
      }
    };
    fetchTiers();
  }, []);

  // Exit intent detection
  const handleMouseLeave = useCallback((e) => {
    if (e.clientY <= 0 && !hasShownExitModal) {
      setShowExitModal(true);
      setHasShownExitModal(true);
    }
  }, [hasShownExitModal]);

  useEffect(() => {
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [handleMouseLeave]);

  const orgTypes = [
    { value: "bank", label: "Bank / Financial Institution" },
    { value: "court", label: "Court / Judiciary" },
    { value: "government", label: "Government Agency" },
    { value: "law_firm", label: "Law Firm" },
    { value: "corporation", label: "Corporation / Enterprise" },
    { value: "insurance", label: "Insurance Company" },
    { value: "real_estate", label: "Real Estate Agency" },
    { value: "ngo", label: "NGO / Non-Profit" },
    { value: "other", label: "Other" }
  ];

  const volumeOptions = [
    { value: "1-50", label: "1-50 verifications/month" },
    { value: "51-200", label: "51-200 verifications/month" },
    { value: "201-500", label: "201-500 verifications/month" },
    { value: "501-1000", label: "501-1000 verifications/month" },
    { value: "1000+", label: "1000+ verifications/month" }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/institutions/register`, {
        name: formData.organization_name,
        type: formData.organization_type,
        registration_number: formData.registration_number,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        address: `${formData.address}, ${formData.city}`,
        expected_volume: formData.expected_volume,
        use_case: formData.use_case,
        password: formData.password
      });

      toast.success("Registration submitted successfully! We'll review your application within 24-48 hours.");
      navigate("/institutional");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { value: "50K+", label: "Documents Verified" },
    { value: "500+", label: "Advocates Registered" },
    { value: "99.9%", label: "Uptime" },
    { value: "<2s", label: "Verification Time" }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Instant Verification",
      description: "Verify any TLS-stamped document in under 2 seconds via API or bulk upload"
    },
    {
      icon: Shield,
      title: "Fraud Prevention",
      description: "Protect your organization from forged legal documents with cryptographic verification"
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Bank-grade encryption, dedicated API keys, and comprehensive audit logs"
    },
    {
      icon: Globe,
      title: "24/7 Availability",
      description: "Access verification services anytime with 99.9% guaranteed uptime"
    },
    {
      icon: TrendingUp,
      title: "Cost Savings",
      description: "Reduce manual verification costs by up to 80% with automated processing"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Add multiple users, set permissions, and track usage across departments"
    }
  ];

  const useCases = [
    {
      icon: Building2,
      title: "Banks & Financial Institutions",
      description: "Verify power of attorney, loan agreements, and legal documents before processing transactions"
    },
    {
      icon: Scale,
      title: "Courts & Legal Bodies",
      description: "Authenticate advocate submissions and ensure document integrity in legal proceedings"
    },
    {
      icon: Briefcase,
      title: "Corporate Legal Teams",
      description: "Verify contracts, agreements, and legal correspondence from external advocates"
    }
  ];

  const testimonials = [
    {
      quote: "TLS verification has reduced our document fraud incidents by 95%. The API integration was seamless.",
      author: "James Mwakasege",
      role: "Head of Legal",
      company: "CRDB Bank"
    },
    {
      quote: "We process hundreds of legal documents daily. Instant verification has transformed our workflow.",
      author: "Grace Mollel",
      role: "Court Administrator",
      company: "High Court of Tanzania"
    }
  ];

  return (
    <div className="min-h-screen bg-[#02040A]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#02040A]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">TLS</span>
              </div>
              <span className="text-white font-semibold text-lg">TLS Portal</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/verify" className="text-white/60 hover:text-white transition-colors text-sm">
                Verify Document
              </Link>
              <Link to="/login">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <BadgeCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Trusted by 200+ Organizations</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Verify Legal Documents<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                Instantly & Securely
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-white/60 mb-8 max-w-2xl mx-auto">
              Join Tanzania's leading institutions using TLS verification to authenticate 
              advocate-stamped documents. Eliminate fraud, reduce costs, and accelerate processing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-emerald-500/25"
                onClick={() => document.getElementById('register-form').scrollIntoView({ behavior: 'smooth' })}
              >
                Register Your Organization
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-xl"
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-white/40 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Choose TLS Verification?
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Protect your organization with Tanzania's most trusted legal document verification system
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="bg-white/[0.03] border-white/10 hover:border-emerald-500/30 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <benefit.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-white/50">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Get started in minutes with our simple verification process
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Register", desc: "Complete the registration form below", icon: FileCheck },
              { step: "2", title: "Get Approved", desc: "We verify your organization (24-48h)", icon: BadgeCheck },
              { step: "3", title: "Receive API Key", desc: "Get your unique institutional API key", icon: Lock },
              { step: "4", title: "Start Verifying", desc: "Verify unlimited documents instantly", icon: Zap }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                    <item.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-emerald-400 font-bold text-sm mb-2">STEP {item.step}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-white/50 text-sm">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%]">
                    <div className="border-t-2 border-dashed border-emerald-500/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent via-emerald-500/[0.03] to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for Your Industry
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Trusted by organizations across Tanzania's legal ecosystem
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="bg-gradient-to-b from-white/[0.05] to-transparent border-white/10 overflow-hidden group hover:border-emerald-500/30 transition-all">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                    <useCase.icon className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{useCase.title}</h3>
                  <p className="text-white/50 leading-relaxed">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Trusted by Industry Leaders
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/[0.03] border-white/10">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-white/80 text-lg mb-6 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                      <span className="text-white font-bold">{testimonial.author.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{testimonial.author}</div>
                      <div className="text-white/50 text-sm">{testimonial.role}, {testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing - Credit Packs */}
      <section id="pricing" className="py-20 px-4 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Prepaid Credit Packs</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Save Up to 70% vs Public Rate
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Public verification costs <span className="text-red-400 font-bold">TZS {formatTZS(pricingData.public_fee)}</span> per document.
              Register your business and pay as little as <span className="text-emerald-400 font-bold">TZS 15,000</span> per verification.
            </p>
          </div>

          {/* Public vs Business Comparison */}
          <div className="bg-gradient-to-r from-red-500/10 via-transparent to-emerald-500/10 rounded-2xl p-6 mb-10 border border-white/10">
            <div className="grid md:grid-cols-3 gap-6 items-center">
              <div className="text-center md:text-left">
                <div className="text-white/50 text-sm mb-1">Public Rate (No Account)</div>
                <div className="text-3xl font-bold text-red-400">TZS {formatTZS(pricingData.public_fee)}</div>
                <div className="text-white/40 text-sm">per verification</div>
              </div>
              <div className="text-center">
                <ArrowRight className="w-8 h-8 text-emerald-400 mx-auto rotate-90 md:rotate-0" />
                <div className="text-emerald-400 font-bold text-sm mt-2">SWITCH & SAVE</div>
              </div>
              <div className="text-center md:text-right">
                <div className="text-white/50 text-sm mb-1">Business Rate (With Account)</div>
                <div className="text-3xl font-bold text-emerald-400">TZS 15,000 - 25,000</div>
                <div className="text-white/40 text-sm">per verification</div>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingData.tiers.map((tier, index) => (
              <Card 
                key={tier.id} 
                className={`relative overflow-hidden transition-all hover:scale-105 ${
                  tier.popular 
                    ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 border-emerald-500/50 shadow-lg shadow-emerald-500/20' 
                    : 'bg-white/[0.03] border-white/10 hover:border-emerald-500/30'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-0 left-0 right-0 bg-emerald-500 text-white text-xs font-bold py-1 text-center">
                    MOST POPULAR
                  </div>
                )}
                <CardContent className={`p-6 ${tier.popular ? 'pt-10' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`text-lg font-bold ${tier.popular ? 'text-emerald-400' : 'text-white/80'}`}>
                      {tier.name}
                    </div>
                    <Package className={`w-5 h-5 ${tier.popular ? 'text-emerald-400' : 'text-white/40'}`} />
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-white">{tier.credits}</div>
                    <div className="text-white/50 text-sm">verifications</div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Per verification</span>
                      <div className="text-right">
                        <span className="text-red-400/60 line-through text-xs mr-2">TZS {formatTZS(pricingData.public_fee)}</span>
                        <span className="text-white font-bold">TZS {formatTZS(tier.price_per_unit)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Total price</span>
                      <span className="text-emerald-400 font-bold">TZS {formatTZS(tier.total_price)}</span>
                    </div>
                  </div>
                  
                  {/* Savings badge */}
                  <div className="bg-emerald-500/20 rounded-lg px-3 py-2 mb-4 border border-emerald-500/30">
                    <div className="text-emerald-400 text-sm font-bold text-center">
                      Save {tier.savings_percent || Math.round((1 - tier.price_per_unit / pricingData.public_fee) * 100)}%
                    </div>
                    <div className="text-emerald-400/60 text-xs text-center">
                      vs public rate
                    </div>
                  </div>
                  
                  <p className="text-white/40 text-xs text-center">{tier.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Break-even calculator hint */}
          <div className="mt-10 bg-white/[0.03] rounded-xl p-6 border border-white/10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-white font-semibold mb-1">Quick Math</h4>
                <p className="text-white/50 text-sm">
                  At public rate of TZS {formatTZS(pricingData.public_fee)}/verification, just <span className="text-emerald-400 font-bold">5 verifications</span> would cost you TZS {formatTZS(pricingData.public_fee * 5)}.
                  With a Basic pack, you get <span className="text-emerald-400 font-bold">10 verifications for TZS 250,000</span> — that's half price!
                </p>
              </div>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600 whitespace-nowrap"
                onClick={() => document.getElementById('register-form').scrollIntoView({ behavior: 'smooth' })}
              >
                Start Saving Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/50 text-sm mb-4">
              Need a custom volume? <a href="mailto:business@tls.or.tz" className="text-emerald-400 hover:underline">Contact us</a> for enterprise pricing.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-white/40 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Credits never expire</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Top up anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Bank & Mobile Money</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section id="register-form" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-b from-white/[0.05] to-white/[0.02] border-white/10 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-5">
                {/* Form Side Panel */}
                <div className="lg:col-span-2 bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 flex flex-col justify-center">
                  <div className="mb-6">
                    <Shield className="w-12 h-12 text-white/90 mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Register Your Organization</h3>
                    <p className="text-white/80">
                      Get instant access to Tanzania's most trusted legal document verification system.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      "Free registration - no upfront costs",
                      "Dedicated API key within 48 hours",
                      "24/7 technical support",
                      "Custom integration assistance"
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-200 flex-shrink-0" />
                        <span className="text-white/90 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form */}
                <div className="lg:col-span-3 p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>1</div>
                      <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/40'}`}>2</div>
                    </div>

                    {step === 1 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white mb-4">Organization Details</h4>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white/70">Organization Name *</Label>
                            <Input
                              placeholder="e.g., CRDB Bank PLC"
                              value={formData.organization_name}
                              onChange={(e) => handleInputChange('organization_name', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Organization Type *</Label>
                            <Select value={formData.organization_type} onValueChange={(v) => handleInputChange('organization_type', v)}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {orgTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white/70">Registration/TIN Number *</Label>
                            <Input
                              placeholder="Business registration number"
                              value={formData.registration_number}
                              onChange={(e) => handleInputChange('registration_number', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Expected Monthly Volume</Label>
                            <Select value={formData.expected_volume} onValueChange={(v) => handleInputChange('expected_volume', v)}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue placeholder="Select volume" />
                              </SelectTrigger>
                              <SelectContent>
                                {volumeOptions.map(vol => (
                                  <SelectItem key={vol.value} value={vol.value}>{vol.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white/70">City *</Label>
                            <Input
                              placeholder="e.g., Dar es Salaam"
                              value={formData.city}
                              onChange={(e) => handleInputChange('city', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Address</Label>
                            <Input
                              placeholder="Street address"
                              value={formData.address}
                              onChange={(e) => handleInputChange('address', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            />
                          </div>
                        </div>

                        <Button 
                          type="button" 
                          className="w-full bg-emerald-500 hover:bg-emerald-600"
                          onClick={() => {
                            if (!formData.organization_name || !formData.organization_type || !formData.registration_number || !formData.city) {
                              toast.error("Please fill all required fields");
                              return;
                            }
                            setStep(2);
                          }}
                        >
                          Continue
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-white mb-4">Contact & Security</h4>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white/70">Contact Person Name *</Label>
                            <Input
                              placeholder="Full name"
                              value={formData.contact_name}
                              onChange={(e) => handleInputChange('contact_name', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Email Address *</Label>
                            <Input
                              type="email"
                              placeholder="work@company.com"
                              value={formData.contact_email}
                              onChange={(e) => handleInputChange('contact_email', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white/70">Phone Number *</Label>
                          <Input
                            type="tel"
                            placeholder="+255 xxx xxx xxx"
                            value={formData.contact_phone}
                            onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white/70">How will you use TLS verification?</Label>
                          <Textarea
                            placeholder="Briefly describe your verification needs..."
                            value={formData.use_case}
                            onChange={(e) => handleInputChange('use_case', e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
                          />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-white/70">Create Password *</Label>
                            <Input
                              type="password"
                              placeholder="Min. 8 characters"
                              value={formData.password}
                              onChange={(e) => handleInputChange('password', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-white/70">Confirm Password *</Label>
                            <Input
                              type="password"
                              placeholder="Repeat password"
                              value={formData.confirm_password}
                              onChange={(e) => handleInputChange('confirm_password', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button 
                            type="button" 
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                            onClick={() => setStep(1)}
                          >
                            Back
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                Complete Registration
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                        </div>

                        <p className="text-white/40 text-xs text-center mt-4">
                          By registering, you agree to our Terms of Service and Privacy Policy
                        </p>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 rounded-3xl p-12 border border-emerald-500/20">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Join hundreds of organizations already using TLS verification to protect their business
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-white text-emerald-600 hover:bg-white/90 px-8"
                onClick={() => document.getElementById('register-form').scrollIntoView({ behavior: 'smooth' })}
              >
                Register Now - It's Free
              </Button>
              <div className="flex items-center gap-2 text-white/60">
                <Phone className="w-4 h-4" />
                <span>Questions? Call +255 22 211 0808</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">TLS</span>
              </div>
              <div>
                <div className="text-white font-semibold">Tanganyika Law Society</div>
                <div className="text-white/40 text-sm">Official Verification Portal</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-white/40 text-sm">
              <Link to="/verify" className="hover:text-white transition-colors">Verify Document</Link>
              <Link to="/login" className="hover:text-white transition-colors">Advocate Login</Link>
              <a href="mailto:support@tls.or.tz" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div className="text-white/30 text-sm">
              © 2026 TLS. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Exit Intent Modal */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="bg-[#0a0f1a] border-white/10 max-w-lg p-0 overflow-hidden">
          <div className="relative">
            {/* Close button */}
            <button 
              onClick={() => setShowExitModal(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Wait! Don't Leave Empty-Handed</h3>
              <p className="text-emerald-100">We have something special for you</p>
            </div>
            
            {/* Content */}
            <div className="p-8">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <Percent className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-lg">Save Up to 70%</span>
                </div>
                <p className="text-white/70 text-sm">
                  Register now and pay as little as <span className="text-white font-bold">TZS 15,000</span> per verification 
                  instead of <span className="text-red-400 line-through">TZS 50,000</span> public rate.
                </p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {[
                  "Free registration - no upfront costs",
                  "Credits never expire",
                  "Dedicated API access for automation",
                  "Priority customer support"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              
              <div className="space-y-3">
                <Button 
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 py-6 text-lg"
                  onClick={() => {
                    setShowExitModal(false);
                    document.getElementById('register-form').scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Yes, I Want to Save 70%
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <button 
                  onClick={() => setShowExitModal(false)}
                  className="w-full text-white/40 text-sm hover:text-white/60 py-2"
                >
                  No thanks, I'll pay full price
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
