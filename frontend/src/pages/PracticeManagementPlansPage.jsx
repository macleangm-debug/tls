// frontend/src/pages/PracticeManagementPlansPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Check, ArrowLeft, Briefcase, Calendar, CheckSquare, Users, 
  FolderOpen, FileText, Receipt, LayoutTemplate, Star, Zap,
  Building2, Crown
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../context/AuthContext";

const plans = [
  {
    id: "starter",
    name: "Starter",
    description: "Essential practice tools for individual advocates",
    price: "49,000",
    period: "month",
    icon: Briefcase,
    color: "emerald",
    popular: false,
    features: [
      "Calendar & Scheduling",
      "Task Management",
      "Up to 25 Active Clients",
      "Up to 50 Active Cases",
      "Basic Document Templates",
      "Email Support",
    ],
    limitations: [
      "No team features",
      "No custom branding",
      "Limited storage (1GB)",
    ]
  },
  {
    id: "professional",
    name: "Professional",
    description: "Complete practice management for growing practices",
    price: "99,000",
    period: "month",
    icon: Star,
    color: "amber",
    popular: true,
    features: [
      "Everything in Starter",
      "Unlimited Clients & Cases",
      "Invoice Generation",
      "Advanced Templates",
      "Client Portal Access",
      "Priority Support",
      "10GB Storage",
      "Custom Fields",
    ],
    limitations: [
      "Single user only",
    ]
  },
  {
    id: "firm",
    name: "Firm / Chamber",
    description: "Team collaboration for law firms and chambers",
    price: "249,000",
    period: "month",
    icon: Building2,
    color: "purple",
    popular: false,
    features: [
      "Everything in Professional",
      "Up to 10 Team Members",
      "Role-based Permissions",
      "Shared Workspaces",
      "Team Calendar",
      "Approval Workflows",
      "50GB Storage",
      "Dedicated Account Manager",
    ],
    limitations: []
  },
];

const allFeatures = [
  { icon: Calendar, name: "Calendar & Scheduling", desc: "Manage appointments, court dates, and deadlines" },
  { icon: CheckSquare, name: "Task Management", desc: "Track to-dos, reminders, and workflows" },
  { icon: Users, name: "Client Management", desc: "Store client information and communication history" },
  { icon: FolderOpen, name: "Case / Matter Tracking", desc: "Organize cases with documents, notes, and timelines" },
  { icon: FileText, name: "Document Management", desc: "Store, organize, and search legal documents" },
  { icon: Receipt, name: "Invoicing", desc: "Generate professional invoices and track payments" },
  { icon: LayoutTemplate, name: "Templates", desc: "Create reusable document and email templates" },
];

export default function PracticeManagementPlansPage() {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  return (
    <div className="min-h-screen bg-[#02040A]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#050810]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-white">Practice Management</h1>
              <p className="text-white/50 text-sm">Choose the right plan for your practice</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 mb-4">
            <Zap className="w-3 h-3 mr-1" />
            Professional Tools
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Streamline Your Legal Practice
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-8">
            Manage clients, cases, tasks, and documents all in one place. 
            Integrated with your TLS certification workflow.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-white/5 rounded-xl">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingPeriod === "monthly" 
                  ? "bg-emerald-600 text-white" 
                  : "text-white/60 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                billingPeriod === "annual" 
                  ? "bg-emerald-600 text-white" 
                  : "text-white/60 hover:text-white"
              }`}
            >
              Annual
              <span className="ml-1 text-emerald-400 text-xs">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const annualPrice = Math.round(parseInt(plan.price.replace(",", "")) * 0.8 * 12);
            const displayPrice = billingPeriod === "annual" 
              ? Math.round(annualPrice / 12).toLocaleString()
              : plan.price;

            return (
              <Card 
                key={plan.id} 
                className={`bg-white/5 border-white/10 relative overflow-hidden ${
                  plan.popular ? 'ring-2 ring-amber-500/50' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl bg-${plan.color}-500/20 flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 text-${plan.color}-400`} />
                  </div>
                  <CardTitle className="text-white">{plan.name}</CardTitle>
                  <p className="text-white/50 text-sm">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-white">TZS {displayPrice}</span>
                    <span className="text-white/50">/month</span>
                    {billingPeriod === "annual" && (
                      <p className="text-emerald-400 text-sm mt-1">
                        Billed TZS {annualPrice.toLocaleString()}/year
                      </p>
                    )}
                  </div>

                  <Button 
                    className={`w-full mb-6 ${
                      plan.popular 
                        ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    Get Started
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-white/80 text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation, i) => (
                      <div key={i} className="flex items-start gap-2 opacity-50">
                        <span className="w-4 h-4 text-center text-white/40 mt-0.5 flex-shrink-0">-</span>
                        <span className="text-white/50 text-sm">{limitation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* TLS Included Notice */}
        <Card className="bg-emerald-500/10 border-emerald-500/20 mb-16">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">TLS Members May Have Included Access</h3>
                <p className="text-white/60 text-sm">
                  Depending on your TLS membership tier, Practice Management may be included at no additional cost. 
                  Contact TLS to verify your entitlements or check your membership dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-xl font-semibold text-white mb-6 text-center">
            Everything You Need to Run Your Practice
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Card key={i} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <Icon className="w-8 h-8 text-emerald-400 mb-3" />
                    <h4 className="text-white font-medium mb-1">{feature.name}</h4>
                    <p className="text-white/50 text-sm">{feature.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FAQ or Contact */}
        <div className="text-center">
          <p className="text-white/60 mb-4">
            Have questions about Practice Management?
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/help">
              <Button variant="outline">View Help Center</Button>
            </Link>
            <Button variant="outline">Contact Support</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
