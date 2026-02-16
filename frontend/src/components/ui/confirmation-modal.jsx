import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog";
import { Button } from "./button";
import { AlertTriangle, CheckCircle, Info, Trash2, X, Loader2 } from "lucide-react";

/**
 * Standard Confirmation Modal for TLS Platform
 * 
 * Usage:
 * <ConfirmationModal
 *   open={showModal}
 *   onOpenChange={setShowModal}
 *   onConfirm={() => handleDelete()}
 *   title="Delete Template?"
 *   description="This action cannot be undone."
 *   confirmText="Delete"
 *   variant="danger"
 * />
 * 
 * Variants: "danger" | "warning" | "success" | "info"
 */

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: "bg-red-500/20",
    iconColor: "text-red-500",
    confirmBg: "bg-red-500 hover:bg-red-600",
    borderColor: "border-red-500/30"
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-500",
    confirmBg: "bg-amber-500 hover:bg-amber-600",
    borderColor: "border-amber-500/30"
  },
  success: {
    icon: CheckCircle,
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-500",
    confirmBg: "bg-emerald-500 hover:bg-emerald-600",
    borderColor: "border-emerald-500/30"
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-500",
    confirmBg: "bg-blue-500 hover:bg-blue-600",
    borderColor: "border-blue-500/30"
  }
};

export const ConfirmationModal = ({
  open,
  onOpenChange,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  children
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const config = VARIANTS[variant] || VARIANTS.danger;
  const IconComponent = config.icon;

  const handleConfirm = async () => {
    if (onConfirm) {
      setIsLoading(true);
      try {
        await onConfirm();
      } finally {
        setIsLoading(false);
      }
    }
    onOpenChange(false);
  };

  const isProcessing = loading || isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-md bg-[#0B1120] border ${config.borderColor} rounded-2xl p-0 overflow-hidden`}>
        {/* Header with colored accent */}
        <div className={`h-1 w-full ${config.confirmBg.split(' ')[0]}`} />
        
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
              <IconComponent className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogHeader className="p-0 space-y-2">
                <DialogTitle className="text-xl font-bold text-white">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-white/60 text-sm">
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Optional custom content */}
          {children && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl">
              {children}
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="mt-6 flex gap-3 sm:gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="flex-1 h-11 bg-white/5 hover:bg-white/10 text-white border-0 rounded-xl"
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`flex-1 h-11 ${config.confirmBg} text-white rounded-xl font-semibold shadow-lg`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Success Toast Modal - For showing success messages
 */
export const SuccessModal = ({
  open,
  onOpenChange,
  title = "Success!",
  description = "Your action was completed successfully.",
  buttonText = "Continue"
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-[#0B1120] border border-emerald-500/30 rounded-2xl p-0 overflow-hidden">
        <div className="h-1 w-full bg-emerald-500" />
        
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <DialogHeader className="p-0 space-y-2">
            <DialogTitle className="text-xl font-bold text-white">
              {title}
            </DialogTitle>
            <DialogDescription className="text-white/60 text-sm">
              {description}
            </DialogDescription>
          </DialogHeader>
          
          <Button
            onClick={() => onOpenChange(false)}
            className="mt-6 w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold"
          >
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
