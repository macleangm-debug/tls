// frontend/src/layouts/WorkspaceSidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Lock } from "lucide-react";
import { cn } from "../lib/utils";

export default function WorkspaceSidebar({ 
  sections, 
  logo,
  title,
  subtitle,
  userInfo,
  accentColor = "emerald",
  onSignOut,
  gatedModules = [], // Array of module gates user has access to
}) {
  const navigate = useNavigate();
  
  const colorClasses = {
    emerald: {
      active: "bg-emerald-600 text-white",
      badge: "bg-emerald-500/20 text-emerald-400",
      accent: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    purple: {
      active: "bg-purple-600 text-white",
      badge: "bg-purple-500/20 text-purple-400",
      accent: "text-purple-400",
      border: "border-purple-500/30",
    },
    blue: {
      active: "bg-blue-600 text-white",
      badge: "bg-blue-500/20 text-blue-400",
      accent: "text-blue-400",
      border: "border-blue-500/30",
    },
    amber: {
      active: "bg-amber-600 text-white",
      badge: "bg-amber-500/20 text-amber-400",
      accent: "text-amber-400",
      border: "border-amber-500/30",
    },
  };
  
  const colors = colorClasses[accentColor] || colorClasses.emerald;

  const handleItemClick = (item, e) => {
    // If item is gated and user doesn't have access, redirect to plans page
    if (item.gate && !gatedModules.includes(item.gate)) {
      e.preventDefault();
      navigate(`/${item.gate}/plans`);
    }
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#050810] border-r border-white/5 z-40 flex flex-col overflow-hidden">
      {/* Header / Logo */}
      <div className="p-6 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          {logo}
          <div>
            <p className="text-white font-semibold">{title}</p>
            <p className={cn("text-xs", colors.accent)}>{subtitle}</p>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      {userInfo && (
        <div className="p-4 border-b border-white/5 flex-shrink-0">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white font-semibold truncate">{userInfo.name}</p>
            <p className="text-white/40 text-xs truncate">{userInfo.email}</p>
            {userInfo.badge && (
              <span className={cn("inline-block mt-2 px-2 py-1 rounded text-xs font-medium", colors.badge, colors.border, "border")}>
                {userInfo.badge}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 250px)' }}>
        {sections.map((section) => (
          <div key={section.group}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">
              {section.group}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isGated = item.gate && !gatedModules.includes(item.gate);
                
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={(e) => handleItemClick(item, e)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                        isActive && !isGated
                          ? colors.active
                          : "text-white/70 hover:bg-white/5 hover:text-white",
                        isGated && "opacity-60"
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isGated && <Lock className="h-3 w-3 text-white/40" />}
                      {item.badge && !isGated && (
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", colors.badge)}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out */}
      {onSignOut && (
        <div className="p-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
