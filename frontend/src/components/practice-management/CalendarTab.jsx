import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Calendar as CalendarWidget } from "../ui/calendar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../ui/dropdown-menu";
import { toast } from "sonner";
import { 
  Calendar, Plus, Edit, Trash2, Eye, Copy, MoreVertical,
  AlertTriangle, Clock, CheckSquare, Bell, MapPin, Building,
  List, CalendarDays, Gavel, UserCheck, CalendarIcon, ClockIcon
} from "lucide-react";
import axios from "axios";
import { API, ConfirmDialog, DateTimePicker } from "./shared";

export const CalendarTab = ({ token }) => {
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [viewEvent, setViewEvent] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("list");
  const [formData, setFormData] = useState({
    title: "", event_type: "meeting", start_datetime: "", end_datetime: "", location: "", description: "", client_id: "", case_id: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [eventsRes, clientsRes, casesRes] = await Promise.all([
        axios.get(`${API}/api/practice/events`, { headers }),
        axios.get(`${API}/api/practice/clients`, { headers }),
        axios.get(`${API}/api/practice/cases`, { headers })
      ]);
      setEvents(eventsRes.data.events);
      setClients(clientsRes.data.clients);
      setCases(casesRes.data.cases);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editEvent) {
        await axios.put(`${API}/api/practice/events/${editEvent.id}`, formData, { headers });
        toast.success("Event updated successfully");
      } else {
        await axios.post(`${API}/api/practice/events`, formData, { headers });
        toast.success("Event created successfully");
      }
      setShowForm(false);
      setEditEvent(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save event");
    }
  };

  const resetForm = () => {
    setFormData({ title: "", event_type: "meeting", start_datetime: "", end_datetime: "", location: "", description: "", client_id: "", case_id: "" });
  };

  const handleEditEvent = (event) => {
    setEditEvent(event);
    setFormData({
      title: event.title,
      event_type: event.event_type,
      start_datetime: event.start_datetime ? new Date(event.start_datetime).toISOString().slice(0, 16) : "",
      end_datetime: event.end_datetime ? new Date(event.end_datetime).toISOString().slice(0, 16) : "",
      location: event.location || "",
      description: event.description || "",
      client_id: event.client_id || "",
      case_id: event.case_id || ""
    });
    setShowForm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteEvent) return;
    try {
      await axios.delete(`${API}/api/practice/events/${deleteEvent.id}`, { headers });
      toast.success("Event deleted successfully");
      setDeleteEvent(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete event");
    }
  };

  const handleDuplicateEvent = async (event) => {
    const duplicateData = {
      title: `${event.title} (Copy)`,
      event_type: event.event_type,
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      location: event.location,
      description: event.description,
      client_id: event.client_id,
      case_id: event.case_id
    };
    try {
      await axios.post(`${API}/api/practice/events`, duplicateData, { headers });
      toast.success("Event duplicated successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to duplicate event");
    }
  };

  const handleMarkEventComplete = async (event) => {
    try {
      await axios.patch(`${API}/api/practice/events/${event.id}/status`, { status: "completed" }, { headers });
      toast.success("Event marked as completed");
      fetchData();
    } catch (error) {
      toast.error("Failed to update event status");
    }
  };

  const handleSetEventReminder = async (event, reminderMinutes = [15, 30, 60, 1440]) => {
    try {
      await axios.patch(`${API}/api/practice/events/${event.id}/reminder`, { reminder_minutes: reminderMinutes }, { headers });
      toast.success("Reminders set successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to set reminders");
    }
  };

  const getEventTypeColor = (type) => {
    const colors = { 
      court_hearing: "bg-red-500 text-red-100", 
      meeting: "bg-blue-500 text-blue-100", 
      deadline: "bg-amber-500 text-amber-100", 
      reminder: "bg-purple-500 text-purple-100", 
      appointment: "bg-emerald-500 text-emerald-100" 
    };
    return colors[type] || colors.meeting;
  };

  const getEventTypeIcon = (type) => {
    switch(type) {
      case 'court_hearing': return <Gavel className="w-4 h-4" />;
      case 'deadline': return <AlertTriangle className="w-4 h-4" />;
      case 'reminder': return <Clock className="w-4 h-4" />;
      case 'appointment': return <UserCheck className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const eventDates = events.map(e => new Date(e.start_datetime));
  
  const selectedDateEvents = events.filter(e => {
    const eventDate = new Date(e.start_datetime).toDateString();
    return eventDate === selectedDate.toDateString();
  }).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

  const upcomingEvents = events
    .filter(e => new Date(e.start_datetime) >= new Date())
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 10);

  const overdueEvents = events.filter(e => 
    e.event_type === 'deadline' && 
    new Date(e.start_datetime) < new Date() &&
    !e.completed
  );

  const getEventTypeCount = (type) => {
    return selectedDateEvents.filter(e => e.event_type === type).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Calendar & Events</h2>
          {overdueEvents.length > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {overdueEvents.length} overdue
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
            <button 
              onClick={() => setViewMode("list")} 
              className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
              data-testid="calendar-view-list-btn"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("calendar")} 
              className={`p-1.5 rounded transition-colors ${viewMode === "calendar" ? "bg-tls-blue-electric text-white" : "text-white/50 hover:text-white"}`}
              data-testid="calendar-view-grid-btn"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => { setEditEvent(null); resetForm(); setShowForm(true); }} className="bg-tls-blue-electric" data-testid="add-event-btn">
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        </div>
      </div>

      {/* Event Form Modal */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditEvent(null); resetForm(); } }}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">{editEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
            <DialogDescription className="text-white/60">
              {editEvent ? "Update the event details below" : "Fill in the details for your new event"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/50">Event Title *</label>
                <Input placeholder="Enter event title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Event Type</label>
                <select value={formData.event_type} onChange={(e) => setFormData({...formData, event_type: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                  <option value="meeting">Meeting</option>
                  <option value="court_hearing">Court Hearing</option>
                  <option value="deadline">Deadline</option>
                  <option value="reminder">Reminder</option>
                  <option value="appointment">Appointment</option>
                </select>
              </div>
              <DateTimePicker 
                label="Start Date & Time *" 
                value={formData.start_datetime} 
                onChange={(val) => setFormData({...formData, start_datetime: val})} 
              />
              <DateTimePicker 
                label="End Date & Time" 
                value={formData.end_datetime} 
                onChange={(val) => setFormData({...formData, end_datetime: val})} 
              />
              <div className="space-y-1">
                <label className="text-xs text-white/50">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input placeholder="Enter location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="pl-10 bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Link to Client</label>
                <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                  <option value="">Select client (optional)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-white/50">Link to Case</label>
                <select value={formData.case_id} onChange={(e) => setFormData({...formData, case_id: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                  <option value="">Select case (optional)</option>
                  {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-white/50">Description</label>
                <Textarea placeholder="Add event notes or description..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-white/5 border-white/10 text-white" rows={3} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditEvent(null); resetForm(); }} className="border-white/20 text-white hover:bg-white/10">
                Cancel
              </Button>
              <Button type="submit" className="bg-tls-blue-electric hover:bg-tls-blue-electric/90">
                {editEvent ? "Save Changes" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Event Modal */}
      <Dialog open={!!viewEvent} onOpenChange={(open) => !open && setViewEvent(null)}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-lg">
          {viewEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEventTypeColor(viewEvent.event_type)}`}>
                    {getEventTypeIcon(viewEvent.event_type)}
                  </div>
                  <div>
                    <DialogTitle className="text-white text-lg">{viewEvent.title}</DialogTitle>
                    <Badge className="capitalize mt-1">{viewEvent.event_type.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 text-white/70">
                  <CalendarIcon className="w-4 h-4 text-white/50" />
                  <span>
                    {new Date(viewEvent.start_datetime).toLocaleString('en-GB', { 
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
                {viewEvent.end_datetime && (
                  <div className="flex items-center gap-3 text-white/70">
                    <ClockIcon className="w-4 h-4 text-white/50" />
                    <span>Until {new Date(viewEvent.end_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {viewEvent.location && (
                  <div className="flex items-center gap-3 text-white/70">
                    <MapPin className="w-4 h-4 text-white/50" />
                    <span>{viewEvent.location}</span>
                  </div>
                )}
                {viewEvent.description && (
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-white/60 text-sm">{viewEvent.description}</p>
                  </div>
                )}
                {(viewEvent.client_name || viewEvent.case_title) && (
                  <div className="flex flex-wrap gap-2">
                    {viewEvent.client_name && <Badge variant="outline" className="border-white/20 text-white/70">{viewEvent.client_name}</Badge>}
                    {viewEvent.case_title && <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">{viewEvent.case_title}</Badge>}
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { handleEditEvent(viewEvent); setViewEvent(null); }} className="border-white/20 text-white hover:bg-white/10">
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" onClick={() => { handleDuplicateEvent(viewEvent); setViewEvent(null); }} className="border-white/20 text-white hover:bg-white/10">
                  <Copy className="w-4 h-4 mr-2" /> Duplicate
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteEvent}
        onOpenChange={(open) => !open && setDeleteEvent(null)}
        title="Delete Event"
        description={`Are you sure you want to delete "${deleteEvent?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      {viewMode === "calendar" ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="glass-card border-white/10 lg:col-span-1">
            <CardContent className="p-4">
              <CalendarWidget
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md bg-transparent text-white"
                modifiers={{ hasEvent: eventDates }}
                modifiersStyles={{
                  hasEvent: { backgroundColor: 'rgba(59, 130, 246, 0.3)', borderRadius: '50%', fontWeight: 'bold' }
                }}
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center text-white",
                  caption_label: "text-sm font-medium text-white",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-white/10 hover:bg-white/20 text-white rounded-md p-0 flex items-center justify-center",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex justify-between",
                  head_cell: "text-white/50 rounded-md w-8 font-normal text-[0.8rem] text-center",
                  row: "flex w-full mt-2 justify-between",
                  cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                  day: "h-8 w-8 p-0 font-normal text-white/70 hover:bg-white/10 rounded-md flex items-center justify-center cursor-pointer",
                  day_selected: "bg-tls-blue-electric text-white hover:bg-tls-blue-electric",
                  day_today: "bg-white/20 text-white font-bold",
                  day_outside: "text-white/30",
                }}
              />
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-white/50 mb-2">Legend</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Meeting</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Court</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Deadline</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Appointment</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-white/10 lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-sm text-white/50">{selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} scheduled</p>
                </div>
                {selectedDateEvents.length > 0 && (
                  <div className="flex gap-2">
                    {getEventTypeCount('meeting') > 0 && <Badge className="bg-blue-500/20 text-blue-400">{getEventTypeCount('meeting')} meetings</Badge>}
                    {getEventTypeCount('court_hearing') > 0 && <Badge className="bg-red-500/20 text-red-400">{getEventTypeCount('court_hearing')} court</Badge>}
                    {getEventTypeCount('deadline') > 0 && <Badge className="bg-amber-500/20 text-amber-400">{getEventTypeCount('deadline')} deadlines</Badge>}
                  </div>
                )}
              </div>
              
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedDateEvents.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getEventTypeColor(event.event_type)}`}>
                        {getEventTypeIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-white">{event.title}</h4>
                            <p className="text-xs text-white/50">
                              {new Date(event.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              {event.end_datetime && ` - ${new Date(event.end_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                            {event.location && <p className="text-xs text-white/40 mt-1">{event.location}</p>}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/50 hover:text-white">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[160px]">
                              <DropdownMenuItem onClick={() => setViewEvent(event)} className="hover:bg-white/10 cursor-pointer">
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditEvent(event)} className="hover:bg-white/10 cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" /> Edit Event
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateEvent(event)} className="hover:bg-white/10 cursor-pointer">
                                <Copy className="mr-2 h-4 w-4" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem onClick={() => handleMarkEventComplete(event)} className="hover:bg-emerald-500/20 text-emerald-400 cursor-pointer" disabled={event.status === 'completed'}>
                                <CheckSquare className="mr-2 h-4 w-4" /> Mark Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSetEventReminder(event)} className="hover:bg-blue-500/20 text-blue-400 cursor-pointer">
                                <Bell className="mr-2 h-4 w-4" /> Set Reminder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem onClick={() => setDeleteEvent(event)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-white/20" />
                  <p className="text-white/40">No events on this day</p>
                  <Button 
                    onClick={() => {
                      const dateStr = selectedDate.toISOString().slice(0, 16);
                      setFormData({...formData, start_datetime: dateStr});
                      setShowForm(true);
                    }} 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 border-white/20 text-white"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="glass-card border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-white">{events.length}</p>
                <p className="text-xs text-white/50">Total Events</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">{upcomingEvents.length}</p>
                <p className="text-xs text-white/50">Upcoming</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{events.filter(e => e.event_type === 'deadline').length}</p>
                <p className="text-xs text-white/50">Deadlines</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-white/10">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-400">{events.filter(e => e.event_type === 'court_hearing').length}</p>
                <p className="text-xs text-white/50">Court Hearings</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white/70">Upcoming Events</h3>
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="glass-card border-white/10 hover:border-white/20 transition-all" data-testid={`event-card-${event.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEventTypeColor(event.event_type)}`}>
                      {getEventTypeIcon(event.event_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-white">{event.title}</h3>
                          <p className="text-sm text-white/50 mt-1">
                            {new Date(event.start_datetime).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {event.location && (
                            <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                              <Building className="w-3 h-3" /> {event.location}
                            </p>
                          )}
                          {(event.client_name || event.case_title) && (
                            <div className="flex items-center gap-2 mt-2">
                              {event.client_name && <Badge variant="outline" className="text-xs border-white/20 text-white/60">{event.client_name}</Badge>}
                              {event.case_title && <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">{event.case_title}</Badge>}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[160px]">
                            <DropdownMenuItem onClick={() => setViewEvent(event)} className="hover:bg-white/10 cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditEvent(event)} className="hover:bg-white/10 cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateEvent(event)} className="hover:bg-white/10 cursor-pointer">
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => handleMarkEventComplete(event)} className="hover:bg-emerald-500/20 text-emerald-400 cursor-pointer" disabled={event.status === 'completed'}>
                              <CheckSquare className="mr-2 h-4 w-4" /> Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSetEventReminder(event)} className="hover:bg-blue-500/20 text-blue-400 cursor-pointer">
                              <Bell className="mr-2 h-4 w-4" /> Set Reminder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => setDeleteEvent(event)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {events.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No events scheduled</p>
          <p className="text-white/30 text-sm mt-1">Create your first event to get started</p>
        </div>
      )}
    </div>
  );
};
