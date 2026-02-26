import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertTriangle, CreditCard, Clock, X, Lock } from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";

const API = process.env.REACT_APP_BACKEND_URL;

export function useMembershipStatus() {
  const { getAuthHeaders, user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role === 'admin' || user.role === 'super_admin') {
      setLoading(false);
      return;
    }
    
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/membership/status`, getAuthHeaders());
        setStatus(res.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch membership status:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [user]);

  return { status, loading, error };
}

export function MembershipStatusBanner({ onDismiss }) {
  const { status, loading } = useMembershipStatus();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if billing is not enabled, user is paid, or banner was dismissed
  if (loading || !status || !status.billing_enabled || status.is_paid || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Determine banner type
  const isBlocked = status.is_blocked;
  const isInGrace = status.is_in_grace;

  if (isBlocked) {
    // RED - Blocked state
    return (
      <div 
        className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
        data-testid="membership-blocked-banner"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-red-400 font-semibold">Membership Expired</h4>
              <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">
                {status.enforcement === 'block_all' ? 'Access Restricted' : 'Stamping Disabled'}
              </Badge>
            </div>
            <p className="text-white/70 text-sm">{status.message}</p>
            <div className="flex items-center gap-3 mt-3">
              <Button 
                size="sm" 
                className="bg-red-500 hover:bg-red-600 text-white"
                asChild
              >
                <Link to="/billing">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Renew Membership
                </Link>
              </Button>
              {status.fixed_price && (
                <span className="text-white/50 text-xs">
                  {status.currency} {status.fixed_price?.toLocaleString()} / {status.period}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isInGrace) {
    // AMBER - Grace period
    return (
      <div 
        className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
        data-testid="membership-grace-banner"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-amber-400 font-semibold">Grace Period Active</h4>
              <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
                {status.days_remaining} days left
              </Badge>
            </div>
            <p className="text-white/70 text-sm">{status.message}</p>
            <div className="flex items-center gap-3 mt-3">
              <Button 
                size="sm" 
                className="bg-amber-500 hover:bg-amber-600 text-white"
                asChild
              >
                <Link to="/billing">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Renew Now
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDismiss}
                className="text-white/50 hover:text-white"
              >
                <X className="w-4 h-4 mr-1" />
                Remind Later
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default warning (warn_only enforcement)
  return (
    <div 
      className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
      data-testid="membership-warning-banner"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-amber-400 font-semibold">Membership Expired</h4>
          </div>
          <p className="text-white/70 text-sm">{status.message}</p>
          <div className="flex items-center gap-3 mt-3">
            <Button 
              size="sm" 
              className="bg-amber-500 hover:bg-amber-600 text-white"
              asChild
            >
              <Link to="/billing">
                <CreditCard className="w-4 h-4 mr-2" />
                Renew Membership
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismiss}
              className="text-white/50 hover:text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact inline warning for stamp pages
export function MembershipInlineWarning({ showRenewButton = true }) {
  const { status, loading } = useMembershipStatus();

  if (loading || !status || !status.billing_enabled || status.is_paid) {
    return null;
  }

  const isBlocked = status.is_blocked;

  if (isBlocked) {
    return (
      <div 
        className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3"
        data-testid="membership-inline-blocked"
      >
        <Lock className="w-4 h-4 text-red-400" />
        <span className="text-red-400 text-sm flex-1">
          {status.enforcement === 'block_stamping' 
            ? 'Document stamping is disabled until membership is renewed.'
            : 'Access is restricted until membership is renewed.'}
        </span>
        {showRenewButton && (
          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" asChild>
            <Link to="/billing">Renew</Link>
          </Button>
        )}
      </div>
    );
  }

  return null;
}

export default MembershipStatusBanner;
