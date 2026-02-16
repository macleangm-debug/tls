import { useState, useEffect } from 'react';
import { 
  Bell, BellOff, Loader2, Check, RefreshCw, 
  FileText, Shield, Clock, User, CreditCard, 
  Settings, Cloud, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

// Category icons mapping
const categoryIcons = {
  document_stamping: FileText,
  verification: Shield,
  expiry_warnings: Clock,
  account_security: User,
  billing: CreditCard,
  system: Settings,
  offline_sync: Cloud
};

const NotificationSettings = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({});
  const [grouped, setGrouped] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [allEnabled, setAllEnabled] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch(`${API}/api/notifications/preferences`, {
        headers: getAuthHeaders().headers
      });
      const data = await response.json();
      setPreferences(data.preferences);
      setGrouped(data.grouped);
      
      // Check if all are enabled
      const allOn = Object.values(data.preferences).every(v => v === true);
      setAllEnabled(allOn);
      
      // Expand first category by default
      const firstCategory = Object.keys(data.grouped)[0];
      if (firstCategory) {
        setExpandedCategories({ [firstCategory]: true });
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key, value) => {
    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    try {
      const response = await fetch(`${API}/api/notifications/preferences`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [key]: value })
      });
      
      if (!response.ok) throw new Error('Failed to update');
      
      // Update allEnabled state
      const newPrefs = { ...preferences, [key]: value };
      setAllEnabled(Object.values(newPrefs).every(v => v === true));
      
    } catch (error) {
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: !value }));
      toast.error('Failed to update preference');
    }
  };

  const toggleAll = async (enabled) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('enabled', enabled.toString());
      
      const response = await fetch(`${API}/api/notifications/preferences/toggle-all`, {
        method: 'POST',
        headers: getAuthHeaders().headers,
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to toggle');
      
      const data = await response.json();
      setPreferences(data.preferences);
      setAllEnabled(enabled);
      toast.success(enabled ? 'All notifications enabled' : 'All notifications disabled');
      
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/notifications/preferences/reset`, {
        method: 'POST',
        headers: getAuthHeaders().headers
      });
      
      if (!response.ok) throw new Error('Failed to reset');
      
      const data = await response.json();
      setPreferences(data.preferences);
      setAllEnabled(true);
      toast.success('Preferences reset to defaults');
      
    } catch (error) {
      toast.error('Failed to reset preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryKey) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Master Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          {allEnabled ? (
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
              <BellOff className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div>
            <h3 className="text-white font-semibold">Push Notifications</h3>
            <p className="text-white/50 text-sm">
              {allEnabled ? 'All notifications enabled' : 'Some notifications disabled'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={saving}
            className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => toggleAll(!allEnabled)}
            disabled={saving}
            className={allEnabled 
              ? 'bg-gray-600 hover:bg-gray-700 text-white' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }
          >
            {allEnabled ? (
              <>
                <ToggleRight className="w-4 h-4 mr-2" />
                Disable All
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 mr-2" />
                Enable All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preference Categories */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([categoryKey, category]) => {
          const IconComponent = categoryIcons[categoryKey] || Bell;
          const isExpanded = expandedCategories[categoryKey];
          const enabledCount = Object.values(category.preferences).filter(p => p.value).length;
          const totalCount = Object.keys(category.preferences).length;
          
          return (
            <Card 
              key={categoryKey} 
              className="bg-white/5 border-white/10 overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(categoryKey)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-medium">{category.label}</h4>
                    <p className="text-white/40 text-sm">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${enabledCount === totalCount ? 'text-emerald-400' : 'text-white/50'}`}>
                    {enabledCount}/{totalCount}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  )}
                </div>
              </button>
              
              {/* Category Preferences */}
              {isExpanded && (
                <div className="border-t border-white/10">
                  {Object.entries(category.preferences).map(([prefKey, pref]) => (
                    <div 
                      key={prefKey}
                      className="flex items-center justify-between px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-b-0"
                    >
                      <span className="text-white/80">{pref.label}</span>
                      <Switch
                        checked={preferences[prefKey]}
                        onCheckedChange={(checked) => updatePreference(prefKey, checked)}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-blue-300 text-sm font-medium">How notifications work</p>
            <p className="text-blue-300/70 text-sm mt-1">
              Push notifications are sent to all devices where you've enabled notifications. 
              You can install the TLS app on your phone for instant alerts even when the browser is closed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
