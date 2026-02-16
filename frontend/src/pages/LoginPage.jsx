import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Sparkles, Mail } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setShowVerificationMessage(false);
    try {
      const userData = await login(email, password);
      toast.success("Welcome back!");
      // Check user role to redirect appropriately
      if (userData?.role === "super_admin") {
        navigate("/super-admin");
      } else if (userData?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      const message = error.response?.data?.detail || "Login failed";
      // Check if it's an email verification error
      if (message.includes("verify your email")) {
        setShowVerificationMessage(true);
      }
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
          
          <Card className="glass-card rounded-3xl border-white/10" data-testid="login-card">
            <CardHeader className="space-y-4 pb-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-tls-blue-electric/20 flex items-center justify-center animate-pulse-glow">
                  <ShieldCheck className="w-8 h-8 text-tls-blue-electric" />
                </div>
              </div>
              <div>
                <CardTitle className="font-heading text-3xl text-white">Welcome Back</CardTitle>
                <CardDescription className="text-white/50 mt-2">Sign in to your advocate account</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="advocate@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-tls-blue-electric focus:ring-1 focus:ring-tls-blue-electric/50"
                    data-testid="email-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/70">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl pr-12 focus:border-tls-blue-electric focus:ring-1 focus:ring-tls-blue-electric/50"
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                      data-testid="toggle-password"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <Button
                  type="submit"
                  className="w-full h-12 bg-tls-blue-electric hover:bg-tls-blue-electric/90 text-white font-semibold rounded-xl shadow-glow-sm hover:shadow-glow transition-all"
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              
              <div className="mt-4 text-center">
                <Link to="/forgot-password" className="text-sm text-white/50 hover:text-white/70 transition-colors" data-testid="forgot-password-link">
                  Forgot your password?
                </Link>
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-sm text-white/50">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-tls-blue-electric hover:text-tls-blue-electric/80 font-medium transition-colors" data-testid="register-link">
                    Register here
                  </Link>
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-tls-gold" />
                  <p className="text-xs font-medium text-white/70">Demo Credentials</p>
                </div>
                <p className="text-xs text-white/50">
                  <strong className="text-white/70">Admin:</strong> admin@tls.or.tz / TLS@Admin2024
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
