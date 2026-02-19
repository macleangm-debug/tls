import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  CreditCard, QrCode, Smartphone, Building2, DollarSign,
  TrendingUp, Receipt, Clock, CheckCircle, XCircle,
  ArrowUpRight, RefreshCw, Download, Copy, Send,
  PieChart, BarChart3, FileText, AlertCircle, Loader2
} from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

// Payment Method Icons
const PaymentMethodIcon = ({ method, className = "w-5 h-5" }) => {
  switch (method) {
    case 'momo': return <Smartphone className={className} />;
    case 'qr_code': return <QrCode className={className} />;
    case 'bank': return <Building2 className={className} />;
    case 'card': return <CreditCard className={className} />;
    default: return <CreditCard className={className} />;
  }
};

// Status Badge
const StatusBadge = ({ status }) => {
  const config = {
    pending: { color: "bg-amber-500/20 text-amber-400", icon: Clock },
    processing: { color: "bg-blue-500/20 text-blue-400", icon: RefreshCw },
    completed: { color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle },
    failed: { color: "bg-red-500/20 text-red-400", icon: XCircle },
    cancelled: { color: "bg-gray-500/20 text-gray-400", icon: XCircle },
    refunded: { color: "bg-purple-500/20 text-purple-400", icon: RefreshCw }
  };
  
  const { color, icon: Icon } = config[status] || config.pending;
  
  return (
    <Badge className={`${color} gap-1 capitalize`}>
      <Icon className="w-3 h-3" />
      {status}
    </Badge>
  );
};

// Collect Payment Modal
const CollectPaymentModal = ({ isOpen, onClose, token, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    service_type: "invoice",
    client_name: "",
    client_phone: "",
    client_email: ""
  });
  const [paymentResult, setPaymentResult] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const resetModal = () => {
    setStep(1);
    setPaymentMethod(null);
    setFormData({ amount: "", description: "", service_type: "invoice", client_name: "", client_phone: "", client_email: "" });
    setPaymentResult(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleInitiatePayment = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === 'momo' && formData.client_phone) {
        // Send MoMo push
        const response = await axios.post(`${API}/api/payments/momo/push`, {
          phone_number: formData.client_phone,
          amount: parseFloat(formData.amount),
          description: formData.description || "Payment",
          service_type: formData.service_type
        }, { headers });
        setPaymentResult(response.data);
      } else if (paymentMethod === 'qr_code') {
        // Generate QR code
        const response = await axios.post(
          `${API}/api/payments/generate-qr?amount=${formData.amount}&description=${encodeURIComponent(formData.description || 'Payment')}&service_type=${formData.service_type}`,
          {},
          { headers }
        );
        setPaymentResult(response.data);
      } else {
        // General payment initiation
        const response = await axios.post(`${API}/api/payments/initiate`, {
          amount: parseFloat(formData.amount),
          payment_method: paymentMethod,
          description: formData.description || "Payment",
          service_type: formData.service_type,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email
        }, { headers });
        setPaymentResult(response.data);
      }
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const simulateComplete = async () => {
    if (!paymentResult?.payment_id) return;
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/api/payments/simulate-complete/${paymentResult.payment_id}`,
        {},
        { headers }
      );
      if (response.data.success) {
        toast.success("Payment completed successfully!");
        onSuccess?.();
        handleClose();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to complete payment");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const paymentMethods = [
    { id: 'qr_code', name: 'QR Code', icon: QrCode, color: 'bg-purple-500', desc: 'Client scans to pay' },
    { id: 'momo', name: 'Mobile Money', icon: Smartphone, color: 'bg-amber-500', desc: 'USSD push to phone' },
    { id: 'bank', name: 'Bank Transfer', icon: Building2, color: 'bg-blue-500', desc: 'Direct bank deposit' },
    { id: 'card', name: 'Card Payment', icon: CreditCard, color: 'bg-emerald-500', desc: 'Debit/Credit card' }
  ];

  const serviceTypes = [
    { value: 'invoice', label: 'Invoice Payment' },
    { value: 'consultation', label: 'Consultation Fee' },
    { value: 'certification', label: 'Certification Fee' },
    { value: 'digital_stamp', label: 'Digital Stamp' },
    { value: 'physical_stamp', label: 'Physical Stamp' },
    { value: 'other', label: 'Other Service' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0a0d14] border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            Collect Payment
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {step === 1 && "Select payment method"}
            {step === 2 && "Enter payment details"}
            {step === 3 && "Payment initiated"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Payment Method */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => { setPaymentMethod(method.id); setStep(2); }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-lg ${method.color}/20 flex items-center justify-center mb-3`}>
                  <method.icon className={`w-5 h-5 ${method.color.replace('bg-', 'text-')}`} />
                </div>
                <p className="font-medium text-white">{method.name}</p>
                <p className="text-xs text-white/50">{method.desc}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Payment Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <PaymentMethodIcon method={paymentMethod} className="w-6 h-6 text-tls-blue-electric" />
              <div>
                <p className="text-white font-medium capitalize">{paymentMethod?.replace('_', ' ')}</p>
                <p className="text-xs text-white/50">Selected payment method</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto text-white/50" onClick={() => setStep(1)}>
                Change
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Amount (TZS) *</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-white/5 border-white/10 text-white text-lg font-mono"
                  data-testid="payment-amount-input"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Service Type</label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2"
                >
                  {serviceTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-white/60 mb-1 block">Description</label>
                <Input
                  placeholder="Payment description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {paymentMethod === 'momo' && (
                <div>
                  <label className="text-sm text-white/60 mb-1 block">Client Phone Number *</label>
                  <Input
                    placeholder="+255 7XX XXX XXX"
                    value={formData.client_phone}
                    onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              )}

              {(paymentMethod === 'bank' || paymentMethod === 'card') && (
                <>
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Client Name</label>
                    <Input
                      placeholder="Client full name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Client Email</label>
                    <Input
                      type="email"
                      placeholder="client@email.com"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => setStep(1)} variant="outline" className="border-white/20 text-white">
                Back
              </Button>
              <Button onClick={handleInitiatePayment} className="flex-1 bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                {paymentMethod === 'momo' ? 'Send Push' : paymentMethod === 'qr_code' ? 'Generate QR' : 'Initiate Payment'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Result */}
        {step === 3 && paymentResult && (
          <div className="space-y-4">
            {/* QR Code Display */}
            {paymentResult.qr_code && (
              <div className="text-center p-6 bg-white rounded-xl">
                <img
                  src={`data:image/png;base64,${paymentResult.qr_code}`}
                  alt="Payment QR Code"
                  className="mx-auto w-48 h-48"
                />
              </div>
            )}

            {/* MoMo Push Result */}
            {paymentResult.ussd_preview && (
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-white/50 mb-2">USSD Preview (Client's Phone)</p>
                <pre className="text-sm text-white font-mono whitespace-pre-wrap bg-black/30 p-3 rounded-lg">
                  {paymentResult.ussd_preview}
                </pre>
              </div>
            )}

            {/* Bank Details */}
            {paymentResult.bank_details && (
              <div className="p-4 bg-white/5 rounded-xl space-y-2">
                <p className="text-sm text-white/50">Bank Transfer Details</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-white/60">Bank:</span>
                    <span className="text-white">{paymentResult.bank_details.bank_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Account:</span>
                    <span className="text-white font-mono">{paymentResult.bank_details.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Reference:</span>
                    <span className="text-white font-mono">{paymentResult.bank_details.reference}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Reference */}
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50">Payment Reference</p>
                  <p className="text-white font-mono">{paymentResult.payment_reference}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(paymentResult.payment_reference)}>
                  <Copy className="w-4 h-4 text-white/60" />
                </Button>
              </div>
              {paymentResult.amount && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-white/50">Amount</p>
                  <p className="text-xl font-bold text-emerald-500">TZS {paymentResult.amount?.toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Instructions */}
            {paymentResult.instructions && (
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <p className="text-sm text-blue-400">{paymentResult.instructions}</p>
              </div>
            )}

            {/* Simulation Note */}
            {paymentResult.simulation_note && (
              <div className="p-3 bg-amber-500/10 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-400">{paymentResult.simulation_note}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleClose} variant="outline" className="border-white/20 text-white">
                Close
              </Button>
              <Button onClick={simulateComplete} className="flex-1 bg-emerald-500 hover:bg-emerald-600" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Simulate Payment Complete
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Revenue Charts
const RevenueByServiceChart = ({ data }) => {
  const services = Object.entries(data || {});
  const total = services.reduce((sum, [_, v]) => sum + v.total, 0);
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6'];

  if (services.length === 0) {
    return <p className="text-white/40 text-center py-8">No revenue data yet</p>;
  }

  return (
    <div className="space-y-3">
      {services.map(([service, data], idx) => (
        <div key={service} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-white/60 capitalize">{service.replace('_', ' ')}</span>
            <span className="text-white">TZS {data.total.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${total > 0 ? (data.total / total) * 100 : 0}%`,
                backgroundColor: colors[idx % colors.length]
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Payment History Item
const PaymentHistoryItem = ({ payment }) => {
  return (
    <Card className="glass-card border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
              <PaymentMethodIcon method={payment.payment_method} className="w-5 h-5 text-white/60" />
            </div>
            <div>
              <p className="font-medium text-white">{payment.description || 'Payment'}</p>
              <p className="text-xs text-white/50">{payment.payment_reference}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-white">TZS {payment.amount?.toLocaleString()}</p>
            <StatusBadge status={payment.status} />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
          <span className="capitalize">{payment.service_type?.replace('_', ' ')}</span>
          <span>{new Date(payment.created_at).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Payments Page
const PaymentsPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("collect");
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [revenueData, setRevenueData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [revenueRes, historyRes] = await Promise.all([
        axios.get(`${API}/api/payments/revenue/summary`, { headers }),
        axios.get(`${API}/api/payments/history?limit=20`, { headers })
      ]);
      setRevenueData(revenueRes.data);
      setPayments(historyRes.data.payments);
    } catch (error) {
      console.error("Failed to fetch payment data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePaymentSuccess = () => {
    fetchData();
  };

  return (
    <DashboardLayout title="Payments & Revenue" subtitle="Collect payments and track your revenue">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button onClick={() => setShowCollectModal(true)} className="bg-emerald-500 hover:bg-emerald-600" data-testid="collect-payment-btn">
            <DollarSign className="w-4 h-4 mr-2" /> Collect Payment
          </Button>
        </div>

        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">
                    TZS {((revenueData?.total_revenue || 0) / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-white/50">Total Revenue</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">
                    TZS {((revenueData?.monthly_revenue || 0) / 1000).toFixed(0)}K
                  </p>
                  <p className="text-xs text-white/50">This Month</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{revenueData?.total_transactions || 0}</p>
                  <p className="text-xs text-white/50">Transactions</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">
                    TZS {((revenueData?.yearly_revenue || 0) / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-white/50">This Year</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="collect" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <DollarSign className="w-4 h-4 mr-2" /> Collect
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <Receipt className="w-4 h-4 mr-2" /> History
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-tls-blue-electric rounded-lg">
              <PieChart className="w-4 h-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="collect" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quick Payment Options */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Quick Payment Collection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={() => setShowCollectModal(true)} variant="outline" className="w-full justify-start border-white/10 text-white hover:bg-white/5">
                    <QrCode className="w-5 h-5 mr-3 text-purple-500" />
                    <div className="text-left">
                      <p className="font-medium">Generate QR Code</p>
                      <p className="text-xs text-white/50">Client scans to pay instantly</p>
                    </div>
                  </Button>
                  <Button onClick={() => setShowCollectModal(true)} variant="outline" className="w-full justify-start border-white/10 text-white hover:bg-white/5">
                    <Smartphone className="w-5 h-5 mr-3 text-amber-500" />
                    <div className="text-left">
                      <p className="font-medium">Send MoMo Push</p>
                      <p className="text-xs text-white/50">USSD prompt to client's phone</p>
                    </div>
                  </Button>
                  <Button onClick={() => setShowCollectModal(true)} variant="outline" className="w-full justify-start border-white/10 text-white hover:bg-white/5">
                    <Building2 className="w-5 h-5 mr-3 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium">Bank Transfer</p>
                      <p className="text-xs text-white/50">Share bank details with reference</p>
                    </div>
                  </Button>
                  <Button onClick={() => setShowCollectModal(true)} variant="outline" className="w-full justify-start border-white/10 text-white hover:bg-white/5">
                    <CreditCard className="w-5 h-5 mr-3 text-emerald-500" />
                    <div className="text-left">
                      <p className="font-medium">Card Payment</p>
                      <p className="text-xs text-white/50">Accept debit/credit cards</p>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              {/* Revenue by Service */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-tls-blue-electric" />
                    Revenue by Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RevenueByServiceChart data={revenueData?.by_service} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <PaymentHistoryItem key={payment.id} payment={payment} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/50">No payment history yet</p>
                <p className="text-white/30 text-sm">Collect your first payment to see it here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Revenue by Service */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Revenue by Service Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <RevenueByServiceChart data={revenueData?.by_service} />
                </CardContent>
              </Card>

              {/* Revenue by Payment Method */}
              <Card className="glass-card border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Revenue by Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(revenueData?.by_method || {}).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(revenueData.by_method).map(([method, data]) => (
                        <div key={method} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <PaymentMethodIcon method={method} className="w-5 h-5 text-white/60" />
                            <span className="text-white capitalize">{method.replace('_', ' ')}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">TZS {data.total.toLocaleString()}</p>
                            <p className="text-xs text-white/50">{data.count} transactions</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-center py-8">No data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Collect Payment Modal */}
        <CollectPaymentModal
          isOpen={showCollectModal}
          onClose={() => setShowCollectModal(false)}
          token={token}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </DashboardLayout>
  );
};

export default PaymentsPage;
