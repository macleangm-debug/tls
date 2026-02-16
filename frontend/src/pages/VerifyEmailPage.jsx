import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, Mail, ArrowLeft, Loader2 } from "lucide-react";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState("loading"); // loading, success, error, no-token
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/verify-email/${token}`);
        setStatus("success");
        setMessage(response.data.message);
        toast.success("Email verified successfully!");
      } catch (error) {
        setStatus("error");
        const errorMsg = error.response?.data?.detail || "Verification failed. Please try again.";
        setMessage(errorMsg);
        toast.error(errorMsg);
      }
    };

    verifyEmail();
  }, [token]);

  const handleResendVerification = async (e) => {
    e.preventDefault();
    if (!resendEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setResending(true);
    try {
      await axios.post(`${API_URL}/api/auth/resend-verification`, { email: resendEmail });
      toast.success("Verification email sent! Please check your inbox.");
      setResendEmail("");
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to send verification email";
      toast.error(errorMsg);
    } finally {
      setResending(false);
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
          
          <Card className="glass-card rounded-3xl border-white/10" data-testid="verify-email-card">
            <CardHeader className="space-y-4 pb-4 text-center">
              <div className="flex justify-center">
                {status === "loading" && (
                  <div className="w-16 h-16 rounded-2xl bg-tls-blue-electric/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-tls-blue-electric animate-spin" />
                  </div>
                )}
                {status === "success" && (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                )}
                {status === "error" && (
                  <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                )}
                {status === "no-token" && (
                  <div className="w-16 h-16 rounded-2xl bg-tls-gold/20 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-tls-gold" />
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="font-heading text-3xl text-white">
                  {status === "loading" && "Verifying Email..."}
                  {status === "success" && "Email Verified!"}
                  {status === "error" && "Verification Failed"}
                  {status === "no-token" && "Verify Your Email"}
                </CardTitle>
                <CardDescription className="text-white/50 mt-2" data-testid="verify-status-message">
                  {status === "loading" && "Please wait while we verify your email address."}
                  {status === "success" && message}
                  {status === "error" && message}
                  {status === "no-token" && "Enter your email to receive a new verification link."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {status === "success" && (
                <div className="space-y-4">
                  <p className="text-white/70 text-center">
                    Your email has been verified. You can now log in to your account.
                  </p>
                  <Link to="/login" className="block" data-testid="login-link">
                    <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-glow-sm hover:shadow-glow transition-all">
                      Continue to Login
                    </Button>
                  </Link>
                </div>
              )}
              
              {(status === "error" || status === "no-token") && (
                <form onSubmit={handleResendVerification} className="space-y-4">
                  <p className="text-white/70 text-center text-sm mb-4">
                    {status === "error" 
                      ? "If your verification link has expired, enter your email below to receive a new one."
                      : "Didn't receive a verification email? Enter your email below."}
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/70">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="advocate@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-tls-blue-electric"
                      data-testid="resend-email-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 bg-tls-blue-electric hover:bg-tls-blue-electric/90 text-white font-semibold rounded-xl shadow-glow-sm hover:shadow-glow transition-all"
                    disabled={resending}
                    data-testid="resend-verification-btn"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Resend Verification Email"
                    )}
                  </Button>
                  
                  <div className="mt-4 text-center">
                    <Link to="/login" className="text-tls-blue-electric hover:text-tls-blue-electric/80 text-sm font-medium transition-colors" data-testid="back-to-login-link">
                      Back to Login
                    </Link>
                  </div>
                </form>
              )}
              
              {status === "loading" && (
                <div className="flex justify-center py-4">
                  <div className="animate-pulse text-white/50">Checking verification status...</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
