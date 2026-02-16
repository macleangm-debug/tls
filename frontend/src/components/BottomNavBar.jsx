import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileText, Plus, Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BottomNavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Don't show on public pages or when not logged in
  const publicPaths = ['/', '/login', '/register', '/verify'];
  const isPublicPage = publicPaths.some(path => 
    location.pathname === path || location.pathname.startsWith('/verify/')
  );
  
  if (!user || isPublicPage) {
    return null;
  }

  const navItems = [
    { 
      id: 'dashboard',
      icon: Home, 
      label: 'Home', 
      path: '/dashboard',
      isActive: location.pathname === '/dashboard'
    },
    { 
      id: 'stamps',
      icon: FileText, 
      label: 'My Stamps', 
      path: '/my-stamps',
      isActive: location.pathname === '/my-stamps'
    },
    { 
      id: 'stamp',
      icon: Plus, 
      label: 'Stamp', 
      path: '/stamp-document',
      isCenter: true,
      isActive: location.pathname === '/stamp-document'
    },
    { 
      id: 'verify',
      icon: Shield, 
      label: 'Verify', 
      path: '/stamp-verification',
      isActive: location.pathname === '/stamp-verification'
    },
    { 
      id: 'profile',
      icon: User, 
      label: 'Profile', 
      path: '/profile',
      isActive: location.pathname === '/profile'
    }
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav bar */}
      <div className="h-20 md:hidden" />
      
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" data-testid="bottom-nav">
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-[#0a0f1a]/90 backdrop-blur-xl border-t border-white/10" />
        
        {/* Safe area padding for iOS */}
        <div className="relative flex items-end justify-around px-2 pb-safe">
          <div className="flex items-end justify-around w-full py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              if (item.isCenter) {
                // Center action button - stands out
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className="relative -mt-6 flex flex-col items-center group"
                    data-testid={`nav-${item.id}`}
                  >
                    {/* Glow effect */}
                    <div className="absolute inset-0 -top-2 bg-emerald-500/30 blur-xl rounded-full scale-150 group-hover:bg-emerald-400/40 transition-all" />
                    
                    {/* Button */}
                    <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                      item.isActive 
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/50 scale-110' 
                        : 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30 group-hover:scale-105 group-hover:shadow-emerald-500/50'
                    }`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                    
                    {/* Label */}
                    <span className={`text-[10px] font-semibold mt-1.5 transition-colors ${
                      item.isActive ? 'text-emerald-400' : 'text-white/60 group-hover:text-emerald-400'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              }
              
              // Regular nav items
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center py-2 px-3 group"
                  data-testid={`nav-${item.id}`}
                >
                  <div className={`relative p-2 rounded-xl transition-all duration-300 ${
                    item.isActive 
                      ? 'bg-white/10' 
                      : 'group-hover:bg-white/5'
                  }`}>
                    {/* Active indicator dot */}
                    {item.isActive && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                    )}
                    <Icon className={`w-5 h-5 transition-colors ${
                      item.isActive 
                        ? 'text-emerald-400' 
                        : 'text-white/50 group-hover:text-white/80'
                    }`} />
                  </div>
                  <span className={`text-[10px] font-medium mt-1 transition-colors ${
                    item.isActive 
                      ? 'text-emerald-400' 
                      : 'text-white/40 group-hover:text-white/70'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <style>{`
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 8px);
        }
      `}</style>
    </>
  );
};

export default BottomNavBar;
