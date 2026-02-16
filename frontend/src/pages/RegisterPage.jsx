import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, UserPlus, Mail, CheckCircle } from "lucide-react";

const REGIONS = [
  "Dar es Salaam", "Arusha", "Dodoma", "Mwanza", "Mbeya",
  "Tanga", "Morogoro", "Zanzibar", "Kilimanjaro", "Iringa"
];

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    roll_number: "",
    phone: "",
    region: "Dar es Salaam"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email || !formData.password || !formData.roll_number || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    try {
      await register(formData);
      toast.success("Registration successful! Welcome to TLS.");
      navigate("/dashboard");
    } catch (error) {
      const message = error.response?.data?.detail || "Registration failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02040A] text-white overflow-hidden noise-overlay">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-hero-glow pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-30" />
      
      <div className="min-h-screen flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center text-sm text-white/60 hover:text-white mb-8 transition-colors group" data-testid="back-link">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          
          <Card className="glass-card rounded-3xl border-white/10" data-testid="register-card">
            <CardHeader className="space-y-4 pb-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-tls-gold/20 flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-tls-gold" />
                </div>
              </div>
              <div>
                <CardTitle className="font-heading text-3xl text-white">Join TLS Verify</CardTitle>
                <CardDescription className="text-white/50 mt-2">Create your advocate account</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-white/70">Full Name *</Label>
                  <Input
                    id="full_name"
                    placeholder="As per TLS records"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-tls-blue-electric"
                    data-testid="fullname-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="roll_number" className="text-white/70">Roll Number *</Label>
                  <Input
                    id="roll_number"
                    placeholder="e.g., ADV/2024/1234"
                    value={formData.roll_number}
                    onChange={(e) => handleChange("roll_number", e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl font-mono focus:border-tls-blue-electric"
                    data-testid="rollnumber-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="advocate@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-tls-blue-electric"
                    data-testid="email-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white/70">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="+255 7XX XXX XXX"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-tls-blue-electric"
                    data-testid="phone-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="region" className="text-white/70">Region</Label>
                  <Select value={formData.region} onValueChange={(v) => handleChange("region", v)}>
                    <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white rounded-xl relative z-10" data-testid="region-select">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0B1120] border-white/10 z-50">
                      {REGIONS.map(region => (
                        <SelectItem key={region} value={region} className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer">{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/70">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl pr-12 focus:border-tls-blue-electric"
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 bg-tls-blue-electric hover:bg-tls-blue-electric/90 text-white font-semibold rounded-xl shadow-glow-sm hover:shadow-glow transition-all mt-2"
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-white/50">
                  Already have an account?{" "}
                  <Link to="/login" className="text-tls-blue-electric hover:text-tls-blue-electric/80 font-medium transition-colors" data-testid="login-link">
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
