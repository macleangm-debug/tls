import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  ShoppingCart, FileText, Check, Loader2, CreditCard, Smartphone, 
  Stamp, Truck, Package, MapPin, Shield, Award, ChevronRight,
  Clock, CheckCircle2, Info, Plus, Minus, Trash2, Droplet, 
  Building2, Briefcase, X
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Product Categories
const STAMP_TYPES = [
  { 
    id: "certificate", 
    name: "Certificate Stamp", 
    description: "For certifying legal documents and agreements",
    icon: FileText,
    color: "#10B981"
  },
  { 
    id: "notary", 
    name: "Notary Stamp", 
    description: "For notarization services and official attestations",
    icon: Shield,
    color: "#3B82F6"
  }
];

const STAMP_FORMATS = [
  { 
    id: "desk", 
    name: "Desk Stamp", 
    description: "Large format for office use",
    icon: Building2,
    priceModifier: 1.0
  },
  { 
    id: "pocket", 
    name: "Pocket Stamp", 
    description: "Compact & portable for fieldwork",
    icon: Briefcase,
    priceModifier: 0.85
  }
];

const PRODUCTS = {
  stamps: {
    certificate: { desk: 150000, pocket: 127500 },
    notary: { desk: 200000, pocket: 170000 }
  },
  ink: {
    id: "ink_refill",
    name: "Stamp Ink Refill",
    description: "High-quality ink for stamp refills (30ml bottle)",
    price: 15000,
    icon: Droplet,
    color: "#8B5CF6"
  }
};

const StampOrderPage = () => {
  const { user, getAuthHeaders } = useAuth();
  
  // Cart state
  const [cart, setCart] = useState([]);
  
  // Selection state
  const [selectedStampType, setSelectedStampType] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [stampQuantity, setStampQuantity] = useState(1);
  const [inkQuantity, setInkQuantity] = useState(0);
  
  // Order state
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [paymentData, setPaymentData] = useState({
    provider: "mpesa",
    phone_number: user?.phone || ""
  });

  // Calculate stamp price
  const getStampPrice = () => {
    if (!selectedStampType || !selectedFormat) return 0;
    return PRODUCTS.stamps[selectedStampType][selectedFormat];
  };

  // Add stamp to cart
  const addStampToCart = () => {
    if (!selectedStampType || !selectedFormat || stampQuantity < 1) {
      toast.error("Please select stamp type and format");
      return;
    }

    const stampType = STAMP_TYPES.find(t => t.id === selectedStampType);
    const format = STAMP_FORMATS.find(f => f.id === selectedFormat);
    const price = getStampPrice();

    const existingIndex = cart.findIndex(
      item => item.type === "stamp" && item.stampType === selectedStampType && item.format === selectedFormat
    );

    if (existingIndex >= 0) {
      // Update quantity of existing item
      const newCart = [...cart];
      newCart[existingIndex].quantity += stampQuantity;
      setCart(newCart);
    } else {
      // Add new item
      setCart([...cart, {
        id: `stamp_${selectedStampType}_${selectedFormat}_${Date.now()}`,
        type: "stamp",
        stampType: selectedStampType,
        format: selectedFormat,
        name: `${stampType.name} (${format.name})`,
        price,
        quantity: stampQuantity,
        icon: stampType.icon,
        color: stampType.color
      }]);
    }

    // Reset selection
    setSelectedStampType(null);
    setSelectedFormat(null);
    setStampQuantity(1);
    toast.success("Added to cart!");
  };

  // Add ink to cart
  const addInkToCart = () => {
    if (inkQuantity < 1) {
      toast.error("Please select quantity");
      return;
    }

    const existingIndex = cart.findIndex(item => item.type === "ink");

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += inkQuantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: `ink_${Date.now()}`,
        type: "ink",
        name: PRODUCTS.ink.name,
        price: PRODUCTS.ink.price,
        quantity: inkQuantity,
        icon: Droplet,
        color: PRODUCTS.ink.color
      }]);
    }

    setInkQuantity(0);
    toast.success("Added to cart!");
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId, delta) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Calculate cart total
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error("Please enter delivery address");
      return;
    }

    setLoading(true);
    try {
      const orderItems = cart.map(item => ({
        product_type: item.type,
        stamp_type: item.stampType || null,
        format: item.format || null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));

      const response = await axios.post(`${API}/physical-orders`, {
        items: orderItems,
        delivery_address: deliveryAddress,
        special_instructions: specialInstructions,
        customization: {
          advocate_name: user?.full_name,
          tls_number: user?.tls_member_number,
          roll_number: user?.roll_number
        }
      }, getAuthHeaders());
      
      setOrderId(response.data.id);
      setShowPayment(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  // Process payment
  const handlePayment = async () => {
    if (!paymentData.phone_number) {
      toast.error("Please enter your phone number");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/payments/initiate`, {
        order_id: orderId,
        provider: paymentData.provider,
        phone_number: paymentData.phone_number
      }, getAuthHeaders());

      // Simulate payment success (mocked)
      await axios.post(`${API}/payments/confirm/${orderId}`, {}, getAuthHeaders());
      
      setShowPayment(false);
      setShowSuccess(true);
      setCart([]);
    } catch (error) {
      toast.error("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-TZ').format(price);
  };

  return (
    <DashboardLayout title="Order Physical Stamps" subtitle="Order official TLS stamps and accessories">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stamp Selection Card */}
          <Card className="glass-card rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
              <CardTitle className="text-white flex items-center gap-3">
                <Stamp className="w-6 h-6 text-emerald-400" />
                Order Stamps
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Step 1: Select Stamp Type */}
              <div className="space-y-3">
                <Label className="text-white/70 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Select Stamp Type
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {STAMP_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedStampType(type.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          selectedStampType === type.id
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                        data-testid={`stamp-type-${type.id}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${type.color}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: type.color }} />
                          </div>
                          <span className="text-white font-semibold">{type.name}</span>
                        </div>
                        <p className="text-white/50 text-sm">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Format */}
              {selectedStampType && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-white/70 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                    Select Format
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    {STAMP_FORMATS.map((format) => {
                      const Icon = format.icon;
                      const price = PRODUCTS.stamps[selectedStampType][format.id];
                      return (
                        <button
                          key={format.id}
                          onClick={() => setSelectedFormat(format.id)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            selectedFormat === format.id
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          }`}
                          data-testid={`stamp-format-${format.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-blue-400" />
                              <span className="text-white font-semibold">{format.name}</span>
                            </div>
                            <Badge className="bg-white/10 text-white">
                              TZS {formatPrice(price)}
                            </Badge>
                          </div>
                          <p className="text-white/50 text-sm">{format.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Quantity & Add to Cart */}
              {selectedStampType && selectedFormat && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-white/70 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold">3</span>
                    Quantity
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setStampQuantity(Math.max(1, stampQuantity - 1))}
                        className="text-white hover:bg-white/10"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center text-white font-bold text-lg">{stampQuantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setStampQuantity(stampQuantity + 1)}
                        className="text-white hover:bg-white/10"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-white/50 text-sm">Subtotal</p>
                      <p className="text-white font-bold text-xl">TZS {formatPrice(getStampPrice() * stampQuantity)}</p>
                    </div>
                    <Button
                      onClick={addStampToCart}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      data-testid="add-stamp-to-cart"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ink Refills Card */}
          <Card className="glass-card rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <CardTitle className="text-white flex items-center gap-3">
                <Droplet className="w-6 h-6 text-purple-400" />
                Ink Refills
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Droplet className="w-7 h-7 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{PRODUCTS.ink.name}</h3>
                    <p className="text-white/50 text-sm">{PRODUCTS.ink.description}</p>
                    <p className="text-purple-400 font-bold mt-1">TZS {formatPrice(PRODUCTS.ink.price)} each</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/5 rounded-xl p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setInkQuantity(Math.max(0, inkQuantity - 1))}
                      className="text-white hover:bg-white/10"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center text-white font-bold">{inkQuantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setInkQuantity(inkQuantity + 1)}
                      className="text-white hover:bg-white/10"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={addInkToCart}
                    disabled={inkQuantity < 1}
                    className="bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50"
                    data-testid="add-ink-to-cart"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card className="glass-card rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white flex items-center gap-3">
                <Truck className="w-6 h-6 text-orange-400" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-white/70">Delivery Address *</Label>
                <Textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter full delivery address including city and region..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]"
                  data-testid="delivery-address"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Special Instructions (Optional)</Label>
                <Textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special requests or instructions for your order..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  data-testid="special-instructions"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cart */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-white/10 bg-gradient-to-r from-tls-gold/20 to-orange-500/10">
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <ShoppingCart className="w-6 h-6 text-tls-gold" />
                    Your Cart
                  </span>
                  {cart.length > 0 && (
                    <Badge className="bg-tls-gold text-black">{cart.length} items</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 mx-auto text-white/20 mb-3" />
                    <p className="text-white/50">Your cart is empty</p>
                    <p className="text-white/30 text-sm">Add stamps or ink to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                          data-testid={`cart-item-${item.id}`}
                        >
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${item.color}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: item.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{item.name}</p>
                            <p className="text-white/50 text-xs">TZS {formatPrice(item.price)} × {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
                              onClick={() => updateCartQuantity(item.id, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-white text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10"
                              onClick={() => updateCartQuantity(item.id, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Cart Total */}
                    <div className="border-t border-white/10 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white/70">Total</span>
                        <span className="text-white font-bold text-2xl">
                          TZS {formatPrice(getCartTotal())}
                        </span>
                      </div>
                      <Button
                        onClick={handleSubmitOrder}
                        disabled={loading || cart.length === 0 || !deliveryAddress.trim()}
                        className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl"
                        data-testid="checkout-btn"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5 mr-2" />
                            Proceed to Payment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Info */}
            <Card className="glass-card rounded-2xl p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Delivery</p>
                    <p className="text-white/50 text-xs">5-7 business days within Tanzania</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Quality Guaranteed</p>
                    <p className="text-white/50 text-xs">Official TLS-approved stamps</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Professional Grade</p>
                    <p className="text-white/50 text-xs">Long-lasting impression quality</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="bg-[#0a0f1a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Complete Payment</DialogTitle>
            <DialogDescription className="text-white/60">
              Total: TZS {formatPrice(getCartTotal())}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-white/70">Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "mpesa", name: "M-Pesa", icon: Smartphone },
                  { id: "tigopesa", name: "Tigo Pesa", icon: Smartphone },
                  { id: "airtel", name: "Airtel Money", icon: Smartphone },
                  { id: "bank", name: "Bank Transfer", icon: Building2 }
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentData({ ...paymentData, provider: method.id })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      paymentData.provider === method.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <method.icon className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-sm">{method.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {paymentData.provider !== "bank" && (
              <div className="space-y-2">
                <Label className="text-white/70">Phone Number</Label>
                <Input
                  type="tel"
                  value={paymentData.phone_number}
                  onChange={(e) => setPaymentData({ ...paymentData, phone_number: e.target.value })}
                  placeholder="+255 xxx xxx xxx"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPayment(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pay Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-[#0a0f1a] border-white/10 text-white max-w-md text-center">
          <div className="py-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <DialogTitle className="text-2xl mb-2">Order Placed Successfully!</DialogTitle>
            <DialogDescription className="text-white/60">
              Order ID: <span className="text-emerald-400 font-mono">{orderId}</span>
            </DialogDescription>
            <p className="text-white/50 text-sm mt-4">
              You will receive updates on your order status via email and SMS.
              Track your order in the Order History section.
            </p>
          </div>
          <DialogFooter className="justify-center">
            <Button
              onClick={() => {
                setShowSuccess(false);
                setDeliveryAddress("");
                setSpecialInstructions("");
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StampOrderPage;
