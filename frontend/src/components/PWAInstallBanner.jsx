import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Bell, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { 
  canInstall, 
  promptInstall, 
  isAppInstalled,
  requestNotificationPermission,
  getNotificationPermission
} from '../lib/pwa';

const PWAInstallBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(isAppInstalled());

    // Listen for install available event
    const handleInstallAvailable = () => {
      // Don't show if dismissed recently
      const dismissedAt = localStorage.getItem('pwa-banner-dismissed');
      if (dismissedAt) {
        const dismissedTime = new Date(dismissedAt).getTime();
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        if (dismissedTime > dayAgo) {
          return;
        }
      }
      setShowBanner(true);
    };

    const handleInstalled = () => {
      setShowBanner(false);
      setIsInstalled(true);
      // Show notification prompt after install
      setTimeout(() => {
        if (getNotificationPermission() !== 'granted') {
          setShowNotificationPrompt(true);
        }
      }, 2000);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);

    // Check if can install on mount
    setTimeout(() => {
      if (canInstall() && !isAppInstalled()) {
        handleInstallAvailable();
      }
    }, 3000);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', new Date().toISOString());
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      setShowNotificationPrompt(false);
    }
  };

  if (!showBanner && !showNotificationPrompt) return null;

  return (
    <>
      {/* Install Banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slideUp sm:left-auto sm:right-4 sm:max-w-sm">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-4 shadow-2xl shadow-emerald-500/20 border border-emerald-500/30">
            <button 
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold mb-1">Install TLS Verify</h3>
                <p className="text-white/80 text-sm mb-3">
                  Add to your home screen for quick access to document verification
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="bg-white text-emerald-700 hover:bg-white/90 rounded-lg h-9 px-4 font-medium"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Install
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg h-9"
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="flex gap-4 mt-4 pt-3 border-t border-white/20 text-xs text-white/70">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Fast access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" />
                <span>Notifications</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                <span>Works offline</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Permission Prompt */}
      {showNotificationPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-slideUp sm:left-auto sm:right-4 sm:max-w-sm">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 shadow-2xl shadow-blue-500/20 border border-blue-500/30">
            <button 
              onClick={() => setShowNotificationPrompt(false)}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold mb-1">Enable Notifications</h3>
                <p className="text-white/80 text-sm mb-3">
                  Get alerts for stamp expiry, verification updates, and important announcements
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleEnableNotifications}
                    size="sm"
                    className="bg-white text-blue-700 hover:bg-white/90 rounded-lg h-9 px-4 font-medium"
                  >
                    <Bell className="w-4 h-4 mr-1.5" />
                    Enable
                  </Button>
                  <Button
                    onClick={() => setShowNotificationPrompt(false)}
                    size="sm"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg h-9"
                  >
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default PWAInstallBanner;
