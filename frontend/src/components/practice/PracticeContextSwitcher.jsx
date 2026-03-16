// frontend/src/components/practice/PracticeContextSwitcher.jsx
import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, User, Check } from "lucide-react";
import { usePracticeContextSafe } from "../../context/PracticeContext";

export default function PracticeContextSwitcher() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const practiceCtx = usePracticeContextSafe();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't render if no context or only one option
  if (!practiceCtx || !practiceCtx.activeContext || practiceCtx.availableContexts.length <= 1) {
    return null;
  }

  const { availableContexts, activeContext, setActiveContextId } = practiceCtx;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
      >
        {activeContext.type === "personal" ? (
          <User className="h-4 w-4 text-emerald-400" />
        ) : (
          <Building2 className="h-4 w-4 text-sky-400" />
        )}
        <span className="max-w-[150px] truncate">{activeContext.label}</span>
        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-white/10 bg-[#0a0f1a] shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Switch Practice Context</p>
          </div>
          <div className="py-1">
            {availableContexts.map((ctx) => (
              <button
                key={ctx.id}
                type="button"
                onClick={() => {
                  setActiveContextId(ctx.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  activeContext.id === ctx.id 
                    ? "bg-emerald-500/10 text-white" 
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  {ctx.type === "personal" ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-sky-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{ctx.label}</p>
                    <p className="text-xs text-white/40">
                      {ctx.type === "personal" ? "Individual workspace" : "Team workspace"}
                    </p>
                  </div>
                </div>
                {activeContext.id === ctx.id && (
                  <Check className="h-4 w-4 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
