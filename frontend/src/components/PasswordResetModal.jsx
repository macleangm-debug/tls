import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Lock, Eye, EyeOff, Shield, AlertTriangle, Check, X } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const PasswordResetModal = ({ isOpen, onClose }) => {
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    // Validate password strength
    if (passwordStrength.score < 7) {
      setError("Password does not meet all security requirements");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password");
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/20 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Password Reset Required</h2>
            <p className="text-sm text-slate-400">Please change your default password to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-10 text-white focus:border-emerald-500 focus:outline-none"
                placeholder="Enter current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">New Password</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-10 text-white focus:border-emerald-500 focus:outline-none"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Password strength bar */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded ${i <= passwordStrength.score ? getStrengthColor() : 'bg-slate-700'}`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <PasswordRule met={passwordStrength.checks.length} label="12+ characters" />
                  <PasswordRule met={passwordStrength.checks.uppercase} label="Uppercase (A-Z)" />
                  <PasswordRule met={passwordStrength.checks.lowercase} label="Lowercase (a-z)" />
                  <PasswordRule met={passwordStrength.checks.number} label="Number (0-9)" />
                  <PasswordRule met={passwordStrength.checks.special} label="Special char" />
                  <PasswordRule met={passwordStrength.checks.noCommon} label="No common words" />
                  <PasswordRule met={passwordStrength.checks.noSequence} label="No sequences" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-slate-800 border rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none ${
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
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg font-medium"
            disabled={loading || passwordStrength.score < 7 || newPassword !== confirmPassword}
          >
            {loading ? "Changing Password..." : "Change Password"}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-500 text-center">
            For security reasons, you cannot skip this step. Your account will remain restricted until you change your password.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetModal;
