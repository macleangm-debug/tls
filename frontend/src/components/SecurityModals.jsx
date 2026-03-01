import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { AlertTriangle, Lock, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";

// ============== CONFIRMATION MODAL ==============

const ConfirmationContext = createContext(null);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation must be used within ConfirmationProvider");
  }
  return context;
};

export const ConfirmationProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
    confirmText: "Confirm",
    cancelText: "Cancel",
    variant: "default", // default, danger, warning
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfig({
        title: options.title || "Confirm Action",
        message: options.message || "Are you sure you want to proceed?",
        confirmText: options.confirmText || "Confirm",
        cancelText: options.cancelText || "Cancel",
        variant: options.variant || "default",
        onConfirm: () => {
          setIsOpen(false);
          resolve(true);
        },
        onCancel: () => {
          setIsOpen(false);
          resolve(false);
        },
      });
      setIsOpen(true);
    });
  }, []);

  const getVariantStyles = () => {
    switch (config.variant) {
      case "danger":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
          iconBg: "bg-red-500/20",
          confirmBtn: "bg-red-600 hover:bg-red-700",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          iconBg: "bg-amber-500/20",
          confirmBtn: "bg-amber-600 hover:bg-amber-700",
        };
      default:
        return {
          icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
          iconBg: "bg-emerald-500/20",
          confirmBtn: "bg-emerald-600 hover:bg-emerald-700",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && config.onCancel()}>
        <DialogContent className="bg-[#0a0f1a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
                {styles.icon}
              </div>
              <div>
                <DialogTitle className="text-white">{config.title}</DialogTitle>
                <DialogDescription className="text-white/60 mt-1">
                  {config.message}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={config.onCancel}
              className="border-white/10 text-white hover:bg-white/10"
            >
              {config.cancelText}
            </Button>
            <Button onClick={config.onConfirm} className={styles.confirmBtn}>
              {config.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmationContext.Provider>
  );
};

// ============== PIN LOCK SYSTEM ==============

const PIN_STORAGE_KEY = "tls_pin_settings";
const PIN_LOCK_KEY = "tls_pin_locked";
const LAST_ACTIVITY_KEY = "tls_last_activity";

const PinLockContext = createContext(null);

export const usePinLock = () => {
  const context = useContext(PinLockContext);
  if (!context) {
    throw new Error("usePinLock must be used within PinLockProvider");
  }
  return context;
};

export const PinLockProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinSettings, setPinSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(PIN_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {
        enabled: false,
        pin: null,
        autoLockMinutes: 5,
        lockedPages: [], // For per-page locking
        globalLock: true, // Global lock after inactivity
      };
    } catch {
      return { enabled: false, pin: null, autoLockMinutes: 5, lockedPages: [], globalLock: true };
    }
  });
  
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [unlockCallback, setUnlockCallback] = useState(null);
  const [lockReason, setLockReason] = useState("inactivity");

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinSettings));
  }, [pinSettings]);

  // Auto-lock timer for global lock
  useEffect(() => {
    if (!pinSettings.enabled || !pinSettings.globalLock) return;

    const checkInactivity = () => {
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity);
        const lockAfter = pinSettings.autoLockMinutes * 60 * 1000;
        if (elapsed > lockAfter && !isLocked) {
          setIsLocked(true);
          setLockReason("inactivity");
          setShowPinModal(true);
        }
      }
    };

    // Update activity on user interaction
    const updateActivity = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    };

    // Initial activity
    updateActivity();

    // Listen for user activity
    window.addEventListener("click", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("scroll", updateActivity);
    window.addEventListener("mousemove", updateActivity);

    // Check inactivity periodically
    const interval = setInterval(checkInactivity, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      window.removeEventListener("mousemove", updateActivity);
      clearInterval(interval);
    };
  }, [pinSettings.enabled, pinSettings.globalLock, pinSettings.autoLockMinutes, isLocked]);

  // Check if page requires PIN
  const isPageLocked = useCallback((pagePath) => {
    if (!pinSettings.enabled) return false;
    return pinSettings.lockedPages.includes(pagePath);
  }, [pinSettings]);

  // Request PIN unlock
  const requestUnlock = useCallback((reason = "access", callback = null) => {
    if (!pinSettings.enabled || !pinSettings.pin) {
      callback?.();
      return Promise.resolve(true);
    }
    
    return new Promise((resolve) => {
      setLockReason(reason);
      setPinInput("");
      setPinError("");
      setShowPinModal(true);
      setUnlockCallback(() => (success) => {
        resolve(success);
        callback?.(success);
      });
    });
  }, [pinSettings]);

  // Verify PIN
  const verifyPin = useCallback(() => {
    if (pinInput === pinSettings.pin) {
      setIsLocked(false);
      setShowPinModal(false);
      setPinInput("");
      setPinError("");
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      unlockCallback?.(true);
      setUnlockCallback(null);
      return true;
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setPinInput("");
      return false;
    }
  }, [pinInput, pinSettings.pin, unlockCallback]);

  // Setup PIN
  const setupPin = useCallback((newPin, settings = {}) => {
    setPinSettings(prev => ({
      ...prev,
      enabled: true,
      pin: newPin,
      ...settings,
    }));
    setIsLocked(false);
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  // Disable PIN
  const disablePin = useCallback(() => {
    setPinSettings({
      enabled: false,
      pin: null,
      autoLockMinutes: 5,
      lockedPages: [],
      globalLock: true,
    });
    setIsLocked(false);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setPinSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Lock specific pages
  const lockPage = useCallback((pagePath) => {
    setPinSettings(prev => ({
      ...prev,
      lockedPages: [...new Set([...prev.lockedPages, pagePath])],
    }));
  }, []);

  const unlockPage = useCallback((pagePath) => {
    setPinSettings(prev => ({
      ...prev,
      lockedPages: prev.lockedPages.filter(p => p !== pagePath),
    }));
  }, []);

  // Manual lock
  const lock = useCallback(() => {
    if (pinSettings.enabled && pinSettings.pin) {
      setIsLocked(true);
      setLockReason("manual");
      setShowPinModal(true);
    }
  }, [pinSettings]);

  return (
    <PinLockContext.Provider value={{
      isLocked,
      pinSettings,
      isPageLocked,
      requestUnlock,
      setupPin,
      disablePin,
      updateSettings,
      lockPage,
      unlockPage,
      lock,
    }}>
      {children}
      
      {/* PIN Entry Modal */}
      <Dialog open={showPinModal} onOpenChange={() => {}}>
        <DialogContent className="bg-[#0a0f1a] border-white/10 text-white max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-emerald-400" />
              </div>
              <DialogTitle className="text-white text-xl">
                {lockReason === "inactivity" ? "Session Locked" : "Enter PIN"}
              </DialogTitle>
              <DialogDescription className="text-white/60 mt-2">
                {lockReason === "inactivity" 
                  ? "Your session was locked due to inactivity. Enter your PIN to continue."
                  : "Enter your PIN to access this page."}
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="py-4">
            <Label className="text-white/70 sr-only">PIN</Label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPinInput(val);
                  setPinError("");
                }}
                placeholder="Enter PIN"
                className="bg-white/5 border-white/10 text-white text-center text-2xl tracking-[0.5em] h-14"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {pinError && (
              <p className="text-red-400 text-sm text-center mt-2">{pinError}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={verifyPin} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12">
              <Lock className="w-4 h-4 mr-2" />
              Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PinLockContext.Provider>
  );
};

// ============== PAGE LOCK GUARD ==============

export const PageLockGuard = ({ pagePath, children }) => {
  const { isPageLocked, requestUnlock, pinSettings } = usePinLock();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkLock = async () => {
      if (!pinSettings.enabled || !isPageLocked(pagePath)) {
        setUnlocked(true);
        setChecking(false);
        return;
      }

      setChecking(false);
      const result = await requestUnlock("page");
      setUnlocked(result);
    };

    checkLock();
  }, [pagePath, isPageLocked, requestUnlock, pinSettings.enabled]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!unlocked && pinSettings.enabled && isPageLocked(pagePath)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Lock className="w-16 h-16 text-white/30 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Page Locked</h2>
        <p className="text-white/50 mb-4">This page requires PIN verification.</p>
        <Button onClick={() => requestUnlock("page").then(setUnlocked)} className="bg-emerald-600 hover:bg-emerald-700">
          <Lock className="w-4 h-4 mr-2" />
          Enter PIN
        </Button>
      </div>
    );
  }

  return children;
};

export default { ConfirmationProvider, useConfirmation, PinLockProvider, usePinLock, PageLockGuard };
