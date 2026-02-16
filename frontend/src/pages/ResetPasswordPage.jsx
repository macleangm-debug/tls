import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Shield, Eye, EyeOff, Check, X, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, checks: {} });

  // Password validation rules
  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
      noCommon: !/(password|qwerty|abc123|123456|letmein|welcome|admin)/i.test(password),
      noSequence: !/(.)\1{3,}/.test(password) && !/(abcd|bcde|1234|2345|qwer)/i.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    return { score, checks };
  };

  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(validatePassword(newPassword));
    } else {
      setPasswordStrength({ score: 0, checks: {} });
    }
  }, [newPassword]);

  useEffect(() => {
    if (!token) {
      navigate("/forgot-password");
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordStrength.score < 7) {
      setError("Password does not meet all security requirements");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/reset-password`, {
        token,
        new_password: newPassword
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength.score < 3) return "bg-red-500";
    if (passwordStrength.score < 5) return "bg-yellow-500";
    if (passwordStrength.score < 7) return "bg-blue-500";
    return "bg-emerald-500";
  };

  const PasswordRule = ({ met, label }) => (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-emerald-400' : 'text-slate-500'}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen bg-[#02040A] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Password Reset Successful!</h1>
            <p className="text-slate-400 mb-6">
              Your password has been changed. You can now login with your new password.
            </p>
            <Link to="/login">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#02040A] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Invalid Reset Link</h1>
            <p className="text-slate-400 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Request New Link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#02040A] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Link to="/login" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Create New Password</h1>
            <p className="text-slate-400">Enter a strong password for your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">New Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-10 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {newPassword && (
                <div className="mt-3">
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded ${i <= passwordStrength.score ? getStrengthColor() : 'bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/50 rounded-lg">
                    <PasswordRule met={passwordStrength.checks.length} label="12+ characters" />
                    <PasswordRule met={passwordStrength.checks.uppercase} label="Uppercase (A-Z)" />
                    <PasswordRule met={passwordStrength.checks.lowercase} label="Lowercase (a-z)" />
                    <PasswordRule met={passwordStrength.checks.number} label="Number (0-9)" />
                    <PasswordRule met={passwordStrength.checks.special} label="Special character" />
                    <PasswordRule met={passwordStrength.checks.noCommon} label="No common words" />
                    <PasswordRule met={passwordStrength.checks.noSequence} label="No sequences" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full bg-slate-800 border rounded-lg py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none ${
                    confirmPassword && confirmPassword !== newPassword 
                      ? 'border-red-500' 
                      : confirmPassword && confirmPassword === newPassword 
                      ? 'border-emerald-500' 
                      : 'border-slate-700'
                  }`}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium"
              disabled={loading || passwordStrength.score < 7 || newPassword !== confirmPassword}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
