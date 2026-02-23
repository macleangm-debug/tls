import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Bell, Mail, Clock, Save, RefreshCw, Check } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export const ReminderSettings = ({ token }) => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API}/api/notifications/reminder-preferences`, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreferences(response.data.preferences);
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to load notification preferences");
      // Set defaults if API fails
      setPreferences({
        in_app_reminders: true,
        in_app_calendar: true,
        in_app_tasks: true,
        in_app_system: true,
        email_reminders: true,
        email_calendar: true,
        email_tasks: true,
        email_system: false,
        reminder_times: [15, 60, 1440]
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPreferences();
  }, [token]);

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setHasChanges(true);
  };

  const handleReminderTimeToggle = (minutes) => {
    setPreferences(prev => {
      const currentTimes = prev.reminder_times || [15, 60, 1440];
      const newTimes = currentTimes.includes(minutes)
        ? currentTimes.filter(t => t !== minutes)
        : [...currentTimes, minutes].sort((a, b) => a - b);
      return { ...prev, reminder_times: newTimes };
    });
    setHasChanges(true);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const csrfToken = localStorage.getItem("tls_csrf_token") || "";
      await axios.put(`${API}/api/notifications/reminder-preferences`, preferences, { 
        headers: { 
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken
        }
      });
      toast.success("Notification preferences saved!");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const reminderTimeOptions = [
    { minutes: 5, label: "5 min", description: "Just before" },
    { minutes: 15, label: "15 min", description: "Quick heads-up" },
    { minutes: 30, label: "30 min", description: "Prepare time" },
    { minutes: 60, label: "1 hour", description: "Ample notice" },
    { minutes: 120, label: "2 hours", description: "Extra prep" },
    { minutes: 1440, label: "1 day", description: "Day before" },
    { minutes: 2880, label: "2 days", description: "Early notice" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-white/50" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <p className="text-white/50">Failed to load preferences</p>
        <Button variant="outline" className="mt-4 border-white/20 text-white" onClick={fetchPreferences}>
          Retry
        </Button>
      </div>
    );
  }

  const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        disabled={disabled}
        className="sr-only peer" 
      />
      <div className={`w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
    </label>
  );

  return (
    <div className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            Reminder & Notification Settings
          </h2>
          <p className="text-sm text-white/50 mt-1">Configure how and when you receive notifications</p>
        </div>
        <Button 
          onClick={savePreferences} 
          disabled={saving || !hasChanges} 
          className={`${hasChanges ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-600'}`}
          data-testid="save-reminder-prefs-btn"
        >
          {saving ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
          ) : hasChanges ? (
            <><Save className="w-4 h-4 mr-2" /> Save Changes</>
          ) : (
            <><Check className="w-4 h-4 mr-2" /> Saved</>
          )}
        </Button>
      </div>

      {hasChanges && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-amber-400 text-sm flex items-center gap-2">
            <Bell className="w-4 h-4" />
            You have unsaved changes
          </p>
        </div>
      )}

      {/* In-App Notifications */}
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-blue-400" />
            </div>
            In-App Notifications
          </CardTitle>
          <CardDescription className="text-white/50">
            Notifications shown within the TLS Portal when you're logged in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
            <div>
              <p className="text-white font-medium">Event Reminders</p>
              <p className="text-xs text-white/50">Get notified before your calendar events start</p>
            </div>
            <ToggleSwitch 
              checked={preferences.in_app_reminders} 
              onChange={() => handleToggle('in_app_reminders')} 
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
            <div>
              <p className="text-white font-medium">Calendar Updates</p>
              <p className="text-xs text-white/50">New events, rescheduled meetings, and cancellations</p>
            </div>
            <ToggleSwitch 
              checked={preferences.in_app_calendar} 
              onChange={() => handleToggle('in_app_calendar')} 
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
            <div>
              <p className="text-white font-medium">Task Alerts</p>
              <p className="text-xs text-white/50">Due dates, overdue tasks, and assignment changes</p>
            </div>
            <ToggleSwitch 
              checked={preferences.in_app_tasks} 
              onChange={() => handleToggle('in_app_tasks')} 
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
            <div>
              <p className="text-white font-medium">System Notifications</p>
              <p className="text-xs text-white/50">Important updates, maintenance notices, and announcements</p>
            </div>
            <ToggleSwitch 
              checked={preferences.in_app_system} 
              onChange={() => handleToggle('in_app_system')} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-purple-400" />
            </div>
            Email Notifications
          </CardTitle>
          <CardDescription className="text-white/50">
            Notifications sent to your registered email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
            <div>
              <p className="text-white font-medium">Event Reminders</p>
              <p className="text-xs text-white/50">Email reminders sent before your events</p>
            </div>
            <ToggleSwitch 
              checked={preferences.email_reminders} 
              onChange={() => handleToggle('email_reminders')} 
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
            <div>
              <p className="text-white font-medium">Calendar Updates</p>
              <p className="text-xs text-white/50">Email when events are created, modified, or cancelled</p>
            </div>
            <ToggleSwitch 
              checked={preferences.email_calendar} 
              onChange={() => handleToggle('email_calendar')} 
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
            <div>
              <p className="text-white font-medium">Task Due Dates</p>
              <p className="text-xs text-white/50">Email reminders for upcoming task deadlines</p>
            </div>
            <ToggleSwitch 
              checked={preferences.email_tasks} 
              onChange={() => handleToggle('email_tasks')} 
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/[0.07] transition-colors">
            <div>
              <p className="text-white font-medium">System Emails</p>
              <p className="text-xs text-white/50">Security alerts, account changes, and billing notices</p>
            </div>
            <ToggleSwitch 
              checked={preferences.email_system} 
              onChange={() => handleToggle('email_system')} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Reminder Timing */}
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            Reminder Timing
          </CardTitle>
          <CardDescription className="text-white/50">
            Choose when to receive reminders before your events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {reminderTimeOptions.map((option) => {
              const isSelected = (preferences.reminder_times || []).includes(option.minutes);
              return (
                <button
                  key={option.minutes}
                  onClick={() => handleReminderTimeToggle(option.minutes)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    isSelected 
                      ? "bg-emerald-500/20 border-emerald-500 text-white" 
                      : "bg-white/5 border-white/10 text-white/70 hover:border-white/30 hover:bg-white/10"
                  }`}
                  data-testid={`reminder-time-${option.minutes}`}
                >
                  <p className="text-lg font-bold">{option.label}</p>
                  <p className="text-xs opacity-60">{option.description}</p>
                  {isSelected && (
                    <Badge className="mt-2 bg-emerald-500/30 text-emerald-400 border-0 text-xs">
                      Active
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-white/40 mt-4 text-center">
            Select multiple options to receive reminders at different times before your events
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-3 justify-end">
        <Button 
          variant="outline" 
          className="border-white/20 text-white hover:bg-white/10"
          onClick={() => {
            setPreferences({
              in_app_reminders: true,
              in_app_calendar: true,
              in_app_tasks: true,
              in_app_system: true,
              email_reminders: true,
              email_calendar: true,
              email_tasks: true,
              email_system: false,
              reminder_times: [15, 60, 1440]
            });
            setHasChanges(true);
          }}
        >
          Reset to Defaults
        </Button>
        <Button 
          variant="outline" 
          className="border-white/20 text-white hover:bg-white/10"
          onClick={() => {
            const allOff = {
              in_app_reminders: false,
              in_app_calendar: false,
              in_app_tasks: false,
              in_app_system: false,
              email_reminders: false,
              email_calendar: false,
              email_tasks: false,
              email_system: false,
              reminder_times: []
            };
            setPreferences(allOff);
            setHasChanges(true);
          }}
        >
          Turn All Off
        </Button>
      </div>
    </div>
  );
};

export default ReminderSettings;
