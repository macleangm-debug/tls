import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import { usePinLock, useConfirmation } from "../components/SecurityModals";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { 
  Lock, ShieldCheck, Eye, EyeOff, Settings, Clock, 
  FileText, Calendar, Users, Briefcase, AlertTriangle,
  CheckCircle2, Unlock
} from "lucide-react";

// Pages that can be locked
const LOCKABLE_PAGES = [
  { path: "/practice-management", name: "Practice Management", icon: Briefcase, description: "Clients, cases, calendar, and tasks" },
  { path: "/stamp-ledger", name: "Stamp Ledger", icon: FileText, description: "All issued stamps and verification" },
  { path: "/profile", name: "My Profile", icon: Users, description: "Personal and professional information" },
];

const PinSettingsPage = () => {
  const { user } = useAuth();
  const { pinSettings, setupPin, disablePin, updateSettings, lockPage, unlockPage, isPageLocked } = usePinLock();
  const { confirm } = useConfirmation();
  
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [error, setError] = useState("");

  // Setup new PIN
  const handleSetupPin = async () => {
    setError("");
    
    if (newPin.length < 4 || newPin.length > 6) {
      setError("PIN must be 4-6 digits");
      return;
    }
    
    if (newPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    
    // If PIN already exists, verify current PIN first
    if (pinSettings.enabled && pinSettings.pin) {
      if (currentPin !== pinSettings.pin) {
        setError("Current PIN is incorrect");
        return;
      }
    }
    
    setupPin(newPin, {
      globalLock: pinSettings.globalLock,
      autoLockMinutes: pinSettings.autoLockMinutes,
      lockedPages: pinSettings.lockedPages,
    });
    
    setNewPin("");
    setConfirmPin("");
    setCurrentPin("");
    setIsSettingUp(false);
    toast.success(pinSettings.enabled ? "PIN updated successfully" : "PIN enabled successfully");
  };

  // Disable PIN
  const handleDisablePin = async () => {
    const confirmed = await confirm({
      title: "Disable PIN Protection?",
      message: "This will remove PIN protection from your account. Anyone with access to your device will be able to view your data.",
      confirmText: "Disable PIN",
      variant: "danger",
    });
    
    if (confirmed) {
      disablePin();
      setNewPin("");
      setConfirmPin("");
      setCurrentPin("");
      toast.success("PIN protection disabled");
    }
  };

  // Toggle global lock
  const handleToggleGlobalLock = (enabled) => {
    updateSettings({ globalLock: enabled });
    toast.success(enabled ? "Auto-lock enabled" : "Auto-lock disabled");
  };

  // Update auto-lock time
  const handleUpdateAutoLockTime = (minutes) => {
    updateSettings({ autoLockMinutes: parseInt(minutes) });
    toast.success(`Auto-lock set to ${minutes} minutes`);
  };

  // Toggle page lock
  const handleTogglePageLock = (pagePath, enabled) => {
    if (enabled) {
      lockPage(pagePath);
      toast.success("Page lock enabled");
    } else {
      unlockPage(pagePath);
      toast.success("Page lock disabled");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            PIN & Security Settings
          </h1>
          <p className="text-white/50 mt-1">
            Protect your account with PIN lock and security features
          </p>
        </div>

        {/* PIN Status */}
        <div className={`rounded-2xl p-6 border ${
          pinSettings.enabled 
            ? "bg-emerald-500/10 border-emerald-500/30" 
            : "bg-amber-500/10 border-amber-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                pinSettings.enabled ? "bg-emerald-500/20" : "bg-amber-500/20"
              }`}>
                {pinSettings.enabled 
                  ? <Lock className="w-7 h-7 text-emerald-400" />
                  : <Unlock className="w-7 h-7 text-amber-400" />
                }
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${pinSettings.enabled ? "text-emerald-400" : "text-amber-400"}`}>
                  {pinSettings.enabled ? "PIN Protection Enabled" : "PIN Protection Disabled"}
                </h3>
                <p className="text-white/60">
                  {pinSettings.enabled 
                    ? "Your account is protected with a PIN"
                    : "Enable PIN to protect your sensitive data"
                  }
                </p>
              </div>
            </div>
            <Badge className={pinSettings.enabled 
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }>
              {pinSettings.enabled ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        {/* Setup/Change PIN */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              <h2 className="font-semibold text-white">
                {pinSettings.enabled ? "Change PIN" : "Setup PIN"}
              </h2>
            </div>
            {!isSettingUp && (
              <Button 
                onClick={() => setIsSettingUp(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {pinSettings.enabled ? "Change PIN" : "Setup PIN"}
              </Button>
            )}
          </div>
          
          {isSettingUp && (
            <div className="p-4 space-y-4">
              {/* Current PIN (if updating) */}
              {pinSettings.enabled && (
                <div>
                  <Label className="text-white/70">Current PIN</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showCurrentPin ? "text" : "password"}
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter current PIN"
                      className="bg-white/5 border-white/10 text-white pr-10"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPin(!showCurrentPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                    >
                      {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              
              {/* New PIN */}
              <div>
                <Label className="text-white/70">New PIN (4-6 digits)</Label>
                <div className="relative mt-1">
                  <Input
                    type={showNewPin ? "text" : "password"}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter new PIN"
                    className="bg-white/5 border-white/10 text-white pr-10"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Confirm PIN */}
              <div>
                <Label className="text-white/70">Confirm PIN</Label>
                <div className="relative mt-1">
                  <Input
                    type={showConfirmPin ? "text" : "password"}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Confirm new PIN"
                    className="bg-white/5 border-white/10 text-white pr-10"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                  >
                    {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {error && (
                <p className="text-red-400 text-sm flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </p>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleSetupPin} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {pinSettings.enabled ? "Update PIN" : "Enable PIN"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsSettingUp(false);
                    setNewPin("");
                    setConfirmPin("");
                    setCurrentPin("");
                    setError("");
                  }}
                  className="border-white/10 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {!isSettingUp && !pinSettings.enabled && (
            <div className="p-4">
              <p className="text-white/50 text-sm">
                Setting up a PIN adds an extra layer of security. When enabled, you'll be asked for your PIN after a period of inactivity or when accessing locked pages.
              </p>
            </div>
          )}
        </div>

        {/* Global Auto-Lock Settings */}
        {pinSettings.enabled && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-white">Auto-Lock Settings</h2>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {/* Global Lock Toggle */}
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <p className="text-white font-medium">Auto-lock after inactivity</p>
                  <p className="text-sm text-white/50">Lock the app when you're away</p>
                </div>
                <Switch
                  checked={pinSettings.globalLock}
                  onCheckedChange={handleToggleGlobalLock}
                />
              </div>
              
              {/* Auto-lock time */}
              {pinSettings.globalLock && (
                <div className="p-4 bg-white/5 rounded-xl">
                  <Label className="text-white/70">Lock after (minutes)</Label>
                  <select
                    value={pinSettings.autoLockMinutes}
                    onChange={(e) => handleUpdateAutoLockTime(e.target.value)}
                    className="mt-2 w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2"
                  >
                    <option value="1">1 minute</option>
                    <option value="2">2 minutes</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Per-Page Lock Settings */}
        {pinSettings.enabled && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-white">Page-Level Locks</h2>
              </div>
              <p className="text-white/50 text-sm mt-1">
                Require PIN to access specific pages
              </p>
            </div>
            <div className="divide-y divide-white/5">
              {LOCKABLE_PAGES.map((page) => {
                const isLocked = isPageLocked(page.path);
                return (
                  <div key={page.path} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isLocked ? "bg-emerald-500/20" : "bg-white/10"
                      }`}>
                        <page.icon className={`w-5 h-5 ${isLocked ? "text-emerald-400" : "text-white/50"}`} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{page.name}</p>
                        <p className="text-xs text-white/50">{page.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isLocked}
                      onCheckedChange={(checked) => handleTogglePageLock(page.path, checked)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Disable PIN */}
        {pinSettings.enabled && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-red-400 font-medium">Disable PIN Protection</h3>
                <p className="text-white/50 text-sm">Remove PIN lock from your account</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleDisablePin}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Disable PIN
              </Button>
            </div>
          </div>
        )}

        {/* Security Tips */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
          <h3 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Security Tips
          </h3>
          <ul className="space-y-2 text-sm text-white/60">
            <li>• Use a unique PIN that you don't use elsewhere</li>
            <li>• Enable auto-lock if you use shared devices</li>
            <li>• Lock sensitive pages like Practice Management for extra security</li>
            <li>• Never share your PIN with anyone</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PinSettingsPage;
