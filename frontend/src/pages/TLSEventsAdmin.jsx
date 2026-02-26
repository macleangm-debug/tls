import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import {
  Building, Plus, Edit, Trash2, Calendar, Clock, Users, AlertTriangle,
  ChevronRight, Globe, MapPin, RefreshCw, X, Check, Bell
} from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function TLSEventsAdmin() {
  const { getAuthHeaders } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "tls_announcement",
    priority: "medium",
    start_at: "",
    end_at: "",
    all_day: false,
    is_mandatory: false,
    require_ack: false,
    show_in_sidebar: true,
    audience_scope: "all",
    audience_regions: "",
    recurrence_enabled: false,
    recurrence_rule: "",
    recurrence_count: 12
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/tls/events`, getAuthHeaders());
      setEvents(res.data.events || []);
    } catch (error) {
      toast.error("Failed to fetch TLS events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_type: "tls_announcement",
      priority: "medium",
      start_at: "",
      end_at: "",
      all_day: false,
      is_mandatory: false,
      require_ack: false,
      show_in_sidebar: true,
      audience_scope: "all",
      audience_regions: "",
      recurrence_enabled: false,
      recurrence_rule: "",
      recurrence_count: 12
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.start_at) {
      toast.error("Title and start date are required");
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      event_type: formData.event_type,
      priority: formData.priority,
      start_at: formData.start_at,
      end_at: formData.end_at || null,
      all_day: formData.all_day,
      timezone: "Africa/Dar_es_Salaam",
      is_mandatory: formData.is_mandatory,
      require_ack: formData.require_ack,
      show_in_sidebar: formData.show_in_sidebar,
      audience: {
        scope: formData.audience_scope,
        regions: formData.audience_scope === "region" 
          ? formData.audience_regions.split(",").map(r => r.trim()).filter(Boolean)
          : [],
        roles: []
      },
      recurrence: formData.recurrence_enabled ? {
        enabled: true,
        rule: formData.recurrence_rule,
        count: formData.recurrence_count
      } : { enabled: false }
    };

    try {
      if (editEvent) {
        await axios.patch(`${API}/api/tls/events/${editEvent.id}`, payload, getAuthHeaders());
        toast.success("TLS event updated");
      } else {
        await axios.post(`${API}/api/tls/events`, payload, getAuthHeaders());
        toast.success("TLS event created");
      }
      setShowForm(false);
      setEditEvent(null);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save event");
    }
  };

  const handleEdit = (event) => {
    setEditEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      priority: event.priority,
      start_at: event.start_at?.slice(0, 16) || "",
      end_at: event.end_at?.slice(0, 16) || "",
      all_day: event.all_day || false,
      is_mandatory: event.is_mandatory || false,
      require_ack: event.require_ack || false,
      show_in_sidebar: event.show_in_sidebar !== false,
      audience_scope: event.audience?.scope || "all",
      audience_regions: event.audience?.regions?.join(", ") || "",
      recurrence_enabled: event.recurrence?.enabled || false,
      recurrence_rule: event.recurrence?.rule || "",
      recurrence_count: event.recurrence?.count || 12
    });
    setShowForm(true);
  };

  const handleCancel = async (eventId) => {
    const reason = prompt("Enter cancellation reason (min 5 characters):");
    if (!reason || reason.length < 5) {
      toast.error("Cancellation reason is required (min 5 characters)");
      return;
    }
    
    try {
      await axios.post(`${API}/api/tls/events/${eventId}/cancel`, { reason }, getAuthHeaders());
      toast.success("TLS event cancelled");
      fetchEvents();
    } catch (error) {
      toast.error("Failed to cancel event");
    }
  };

  const handleDelete = async () => {
    if (!showDeleteDialog) return;
    try {
      await axios.delete(`${API}/api/tls/events/${showDeleteDialog.id}`, getAuthHeaders());
      toast.success("TLS event deleted permanently");
      setShowDeleteDialog(null);
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete event");
    }
  };

  const eventTypeColors = {
    agm: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    cpd: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    deadline: "bg-red-500/20 text-red-400 border-red-500/30",
    holiday: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    branch_meeting: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    tls_announcement: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    other: "bg-gray-500/20 text-gray-400 border-gray-500/30"
  };

  const recurrenceTemplates = [
    { label: "Weekly (Monday)", value: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO" },
    { label: "Bi-weekly (Saturday)", value: "FREQ=WEEKLY;INTERVAL=2;BYDAY=SA" },
    { label: "Monthly (1st)", value: "FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=1" },
    { label: "Quarterly", value: "FREQ=MONTHLY;INTERVAL=3" },
    { label: "Yearly (June 15)", value: "FREQ=YEARLY;INTERVAL=1;BYMONTH=6;BYMONTHDAY=15" }
  ];

  return (
    <div className="space-y-6" data-testid="tls-events-admin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Building className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">TLS Global Events</h1>
            <p className="text-white/50 text-sm">Manage organization-wide events, CPD sessions, and notices</p>
          </div>
        </div>
        <Button 
          onClick={() => { resetForm(); setEditEvent(null); setShowForm(true); }}
          className="bg-purple-600 hover:bg-purple-700"
          data-testid="create-tls-event-btn"
        >
          <Plus className="w-4 h-4 mr-2" /> Create TLS Event
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{events.length}</p>
              <p className="text-xs text-white/50">Total Events</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {events.filter(e => e.status === "scheduled").length}
              </p>
              <p className="text-xs text-white/50">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {events.filter(e => e.is_mandatory).length}
              </p>
              <p className="text-xs text-white/50">Mandatory</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {events.filter(e => e.recurrence?.enabled).length}
              </p>
              <p className="text-xs text-white/50">Recurring</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" /> All TLS Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-white/50">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-white/50">
              No TLS events created yet. Click "Create TLS Event" to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div 
                  key={event.id} 
                  className={`p-4 rounded-xl border ${event.status === 'cancelled' ? 'bg-gray-800/30 border-gray-500/20 opacity-60' : 'bg-white/5 border-white/10'}`}
                  data-testid={`tls-event-${event.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${eventTypeColors[event.event_type]?.split(' ')[0] || 'bg-purple-500/20'}`}>
                        <Building className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold flex items-center gap-2">
                          {event.title}
                          {event.status === 'cancelled' && (
                            <Badge className="bg-gray-500/20 text-gray-400 text-xs">Cancelled</Badge>
                          )}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge className={eventTypeColors[event.event_type] || eventTypeColors.other}>
                            {event.event_type?.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          {event.is_mandatory && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Mandatory</Badge>
                          )}
                          {event.recurrence?.enabled && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              <RefreshCw className="w-3 h-3 mr-1" /> Recurring
                            </Badge>
                          )}
                          <Badge className={event.audience?.scope === 'all' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}>
                            {event.audience?.scope === 'all' ? (
                              <><Globe className="w-3 h-3 mr-1" /> Nationwide</>
                            ) : (
                              <><MapPin className="w-3 h-3 mr-1" /> {event.audience?.regions?.join(', ')}</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-white/50 text-sm mt-2 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.start_at).toLocaleDateString('en-GB', { 
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.start_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        {event.description && (
                          <p className="text-white/40 text-sm mt-1 line-clamp-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {event.status !== 'cancelled' && (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(event)}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCancel(event.id)}
                          className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowDeleteDialog(event)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditEvent(null); resetForm(); } }}>
        <DialogContent className="bg-[#0a0d14] border-purple-500/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-400" />
              {editEvent ? 'Edit TLS Event' : 'Create TLS Event'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Event Title *</label>
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Annual General Meeting 2026"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              
              <div>
                <label className="text-xs text-white/50 mb-1 block">Description</label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Event details and instructions..."
                  className="bg-white/5 border-white/10 text-white min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Event Type</label>
                  <select 
                    value={formData.event_type}
                    onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2"
                  >
                    <option value="agm">AGM (Annual General Meeting)</option>
                    <option value="cpd">CPD Session</option>
                    <option value="deadline">Deadline</option>
                    <option value="holiday">Holiday</option>
                    <option value="branch_meeting">Branch Meeting</option>
                    <option value="tls_announcement">TLS Announcement</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" /> Date & Time
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Start Date/Time *</label>
                  <Input 
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => setFormData({...formData, start_at: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">End Date/Time</label>
                  <Input 
                    type="datetime-local"
                    value={formData.end_at}
                    onChange={(e) => setFormData({...formData, end_at: e.target.value})}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-3 text-white/70 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.all_day}
                  onChange={(e) => setFormData({...formData, all_day: e.target.checked})}
                  className="rounded border-white/20"
                />
                All-day event
              </label>
            </div>

            {/* Audience */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> Audience
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Scope</label>
                  <select 
                    value={formData.audience_scope}
                    onChange={(e) => setFormData({...formData, audience_scope: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2"
                  >
                    <option value="all">All Members (Nationwide)</option>
                    <option value="region">Specific Regions</option>
                  </select>
                </div>
                {formData.audience_scope === "region" && (
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Regions (comma-separated)</label>
                    <Input 
                      value={formData.audience_regions}
                      onChange={(e) => setFormData({...formData, audience_regions: e.target.value})}
                      placeholder="e.g., Dar es Salaam, Arusha, Mwanza"
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Recurrence */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-purple-400" /> Recurrence
              </h4>
              <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer mb-3">
                <input 
                  type="checkbox" 
                  checked={formData.recurrence_enabled}
                  onChange={(e) => setFormData({...formData, recurrence_enabled: e.target.checked})}
                  className="rounded border-white/20"
                />
                This is a recurring event
              </label>
              {formData.recurrence_enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Recurrence Pattern</label>
                    <select 
                      value={formData.recurrence_rule}
                      onChange={(e) => setFormData({...formData, recurrence_rule: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2"
                    >
                      <option value="">Select a pattern...</option>
                      {recurrenceTemplates.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Number of Occurrences</label>
                    <Input 
                      type="number"
                      min="1"
                      max="52"
                      value={formData.recurrence_count}
                      onChange={(e) => setFormData({...formData, recurrence_count: parseInt(e.target.value) || 12})}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" /> Options
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({...formData, is_mandatory: e.target.checked})}
                    className="rounded border-white/20"
                  />
                  Mark as mandatory (shows "Required" badge)
                </label>
                <label className="flex items-center gap-2 text-white/70 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.show_in_sidebar}
                    onChange={(e) => setFormData({...formData, show_in_sidebar: e.target.checked})}
                    className="rounded border-white/20"
                  />
                  Show in sidebar (Upcoming Events)
                </label>
                <label className="flex items-center gap-2 text-white/50 text-sm cursor-not-allowed opacity-50">
                  <input 
                    type="checkbox" 
                    checked={formData.require_ack}
                    onChange={(e) => setFormData({...formData, require_ack: e.target.checked})}
                    className="rounded border-white/20"
                    disabled
                  />
                  Require acknowledgement (coming soon)
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setShowForm(false); setEditEvent(null); resetForm(); }}
              className="border-white/20 text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="save-tls-event-btn"
            >
              {editEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(null)}>
        <DialogContent className="bg-[#0a0d14] border-red-500/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete TLS Event
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/70 py-4">
            Are you sure you want to permanently delete "{showDeleteDialog?.title}"? 
            This action cannot be undone. Consider cancelling instead to keep the audit trail.
          </p>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(null)}
              className="border-white/20 text-white"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
