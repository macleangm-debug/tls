import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
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
  Gavel, UserCheck, CalendarIcon, ClockIcon, ChevronRight,
  Check, X, ArrowRight, ListTodo, GripVertical
} from "lucide-react";
import axios from "axios";
import { API, ConfirmDialog, DateTimePicker } from "./shared";

// FullCalendar imports
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// Custom CSS for FullCalendar dark theme
const calendarStyles = `
  .fc {
    --fc-border-color: rgba(255, 255, 255, 0.1);
    --fc-button-bg-color: rgba(255, 255, 255, 0.1);
    --fc-button-border-color: rgba(255, 255, 255, 0.2);
    --fc-button-text-color: #fff;
    --fc-button-hover-bg-color: rgba(255, 255, 255, 0.2);
    --fc-button-hover-border-color: rgba(255, 255, 255, 0.3);
    --fc-button-active-bg-color: #3b82f6;
    --fc-button-active-border-color: #3b82f6;
    --fc-today-bg-color: rgba(59, 130, 246, 0.15);
    --fc-event-bg-color: #3b82f6;
    --fc-event-border-color: #3b82f6;
    --fc-page-bg-color: transparent;
    --fc-neutral-bg-color: rgba(255, 255, 255, 0.05);
    --fc-list-event-hover-bg-color: rgba(255, 255, 255, 0.1);
  }
  .fc .fc-toolbar-title { color: #fff; font-size: 1.1rem; }
  .fc .fc-col-header-cell-cushion { color: rgba(255, 255, 255, 0.6); font-weight: 500; }
  .fc .fc-daygrid-day-number { color: rgba(255, 255, 255, 0.7); }
  .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { color: #fff; font-weight: bold; }
  .fc .fc-daygrid-day:hover { background: rgba(255, 255, 255, 0.05); }
  .fc .fc-event { border-radius: 4px; font-size: 0.75rem; padding: 2px 4px; cursor: pointer; }
  .fc .fc-event-main { padding: 1px 2px; }
  .fc .fc-timegrid-slot-label { color: rgba(255, 255, 255, 0.5); }
  .fc .fc-timegrid-axis { color: rgba(255, 255, 255, 0.5); }
  .fc-theme-standard td, .fc-theme-standard th { border-color: rgba(255, 255, 255, 0.08); }
  .fc .fc-scrollgrid { border-color: rgba(255, 255, 255, 0.08); }
  .fc .fc-daygrid-day-events { min-height: 1.5em; }
  .fc-event-completed { opacity: 0.5; text-decoration: line-through; }
  .fc-event-cancelled { opacity: 0.4; text-decoration: line-through; background: #6b7280 !important; border-color: #6b7280 !important; }
`;

export const CalendarTab = ({ token }) => {
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [viewEvent, setViewEvent] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [completeOutcome, setCompleteOutcome] = useState("");
  const [rescheduleData, setRescheduleData] = useState({ new_start: "", new_end: "", reason: "" });
  const [convertTaskData, setConvertTaskData] = useState({ title: "", due_date: "", priority: "high" });
  const [formData, setFormData] = useState({
    title: "", event_type: "meeting", start_datetime: "", end_datetime: "", 
    location: "", court: "", description: "", client_id: "", case_id: "", priority: "medium"
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [eventsRes, clientsRes, casesRes, tasksRes] = await Promise.all([
        axios.get(`${API}/api/practice/events`, { headers }),
        axios.get(`${API}/api/practice/clients`, { headers }),
        axios.get(`${API}/api/practice/cases`, { headers }),
        axios.get(`${API}/api/practice/tasks`, { headers }).catch(() => ({ data: { tasks: [] } }))
      ]);
      setEvents(eventsRes.data.events || []);
      setClients(clientsRes.data.clients || []);
      setCases(casesRes.data.cases || []);
      setTasks(tasksRes.data.tasks || []);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Transform events and tasks for FullCalendar
  const calendarEvents = useMemo(() => {
    const eventItems = events.map(e => ({
      id: `event-${e.id}`,
      title: e.title,
      start: e.start_datetime,
      end: e.end_datetime,
      backgroundColor: getEventColor(e.event_type, e.status, e.priority),
      borderColor: getEventColor(e.event_type, e.status, e.priority),
      classNames: e.status === 'completed' ? ['fc-event-completed'] : e.status === 'cancelled' ? ['fc-event-cancelled'] : [],
      extendedProps: { type: 'event', data: e }
    }));
    
    // Add tasks with due dates as calendar items
    const taskItems = tasks
      .filter(t => t.due_date && t.status !== 'completed')
      .map(t => ({
        id: `task-${t.id}`,
        title: `📋 ${t.title}`,
        start: t.due_date,
        allDay: true,
        backgroundColor: getPriorityColor(t.priority),
        borderColor: getPriorityColor(t.priority),
        extendedProps: { type: 'task', data: t }
      }));
    
    return [...eventItems, ...taskItems];
  }, [events, tasks]);

  function getEventColor(type, status, priority) {
    if (status === 'completed') return "#6b7280";
    if (status === 'cancelled') return "#6b7280";
    
    // Priority-based colors for high priority
    if (priority === 'high') {
      const highColors = { court_hearing: "#dc2626", deadline: "#dc2626", meeting: "#dc2626" };
      if (highColors[type]) return highColors[type];
    }
    
    const colors = { 
      court_hearing: "#ef4444", 
      meeting: "#3b82f6", 
      deadline: "#f59e0b", 
      reminder: "#a855f7", 
      appointment: "#10b981" 
    };
    return colors[type] || colors.meeting;
  }

  function getPriorityColor(priority) {
    const colors = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
    return colors[priority] || colors.medium;
  }

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
    setFormData({ title: "", event_type: "meeting", start_datetime: "", end_datetime: "", location: "", court: "", description: "", client_id: "", case_id: "", priority: "medium" });
  };

  const handleEditEvent = (event) => {
    setEditEvent(event);
    setFormData({
      title: event.title,
      event_type: event.event_type,
      start_datetime: event.start_datetime ? new Date(event.start_datetime).toISOString().slice(0, 16) : "",
      end_datetime: event.end_datetime ? new Date(event.end_datetime).toISOString().slice(0, 16) : "",
      location: event.location || "",
      court: event.court || "",
      description: event.description || "",
      client_id: event.client_id || "",
      case_id: event.case_id || "",
      priority: event.priority || "medium"
    });
    setShowForm(true);
  };

  // Mark Complete
  const handleCompleteEvent = async () => {
    if (!viewEvent) return;
    try {
      await axios.post(`${API}/api/practice/events/${viewEvent.id}/complete`, { outcome: completeOutcome }, { headers });
      toast.success("Event marked as completed");
      setShowCompleteDialog(false);
      setCompleteOutcome("");
      setViewEvent(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to complete event");
    }
  };

  // Cancel Event
  const handleCancelEvent = async () => {
    if (!viewEvent || cancelReason.length < 5) {
      toast.error("Please provide a reason (min 5 characters)");
      return;
    }
    try {
      await axios.post(`${API}/api/practice/events/${viewEvent.id}/cancel`, { reason: cancelReason }, { headers });
      toast.success("Event cancelled");
      setShowCancelDialog(false);
      setCancelReason("");
      setViewEvent(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to cancel event");
    }
  };

  // Reschedule Event
  const handleRescheduleEvent = async () => {
    if (!viewEvent || !rescheduleData.new_start) {
      toast.error("Please select a new date/time");
      return;
    }
    try {
      await axios.post(`${API}/api/practice/events/${viewEvent.id}/reschedule`, {
        new_start_datetime: rescheduleData.new_start,
        new_end_datetime: rescheduleData.new_end || null,
        reason: rescheduleData.reason
      }, { headers });
      toast.success("Event rescheduled");
      setShowRescheduleDialog(false);
      setRescheduleData({ new_start: "", new_end: "", reason: "" });
      setViewEvent(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to reschedule event");
    }
  };

  // Convert to Task
  const handleConvertToTask = async () => {
    if (!viewEvent) return;
    try {
      await axios.post(`${API}/api/practice/events/${viewEvent.id}/convert-to-task`, {
        task_title: convertTaskData.title || null,
        due_date: convertTaskData.due_date || null,
        priority: convertTaskData.priority
      }, { headers });
      toast.success("Follow-up task created");
      setShowConvertDialog(false);
      setConvertTaskData({ title: "", due_date: "", priority: "high" });
      fetchData();
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  // Drag & Drop Handler
  const handleEventDrop = async (info) => {
    const eventId = info.event.id.replace('event-', '');
    const newStart = info.event.start.toISOString();
    const newEnd = info.event.end ? info.event.end.toISOString() : null;
    
    try {
      await axios.patch(`${API}/api/practice/events/${eventId}/move?new_start=${encodeURIComponent(newStart)}${newEnd ? `&new_end=${encodeURIComponent(newEnd)}` : ''}`, {}, { headers });
      toast.success("Event moved");
      fetchData();
    } catch (error) {
      info.revert();
      toast.error("Failed to move event");
    }
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

  const handleDateClick = (info) => {
    const dateStr = `${info.dateStr}T09:00`;
    setFormData({...formData, start_datetime: dateStr, end_datetime: `${info.dateStr}T10:00`});
    setEditEvent(null);
    setShowForm(true);
  };

  const handleEventClick = (info) => {
    const { type, data } = info.event.extendedProps;
    if (type === 'event') {
      setViewEvent(data);
    } else if (type === 'task') {
      toast.info(`Task: ${data.title}`, { description: `Due: ${new Date(data.due_date).toLocaleDateString()}` });
    }
  };

  // Computed data
  const upcomingEvents = events
    .filter(e => new Date(e.start_datetime) >= new Date() && e.status === 'scheduled')
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 7);

  const overdueDeadlines = events.filter(e => 
    e.event_type === 'deadline' && 
    new Date(e.start_datetime) < new Date() &&
    e.status === 'scheduled'
  );

  const overdueTasks = tasks.filter(t => 
    t.due_date && 
    new Date(t.due_date) < new Date() && 
    t.status !== 'completed'
  );

  const totalOverdue = overdueDeadlines.length + overdueTasks.length;

  const getEventTypeIcon = (type) => {
    switch(type) {
      case 'court_hearing': return <Gavel className="w-4 h-4" />;
      case 'deadline': return <AlertTriangle className="w-4 h-4" />;
      case 'reminder': return <Clock className="w-4 h-4" />;
      case 'appointment': return <UserCheck className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
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

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      rescheduled: "bg-amber-500/20 text-amber-400 border-amber-500/30"
    };
    return styles[status] || styles.scheduled;
  };

  return (
    <div className="space-y-6">
      {/* Inject custom styles */}
      <style>{calendarStyles}</style>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Calendar & Events</h2>
          <p className="text-sm text-white/50">Track hearings, deadlines, meetings, and tasks</p>
        </div>
        <div className="flex items-center gap-3">
          {totalOverdue > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {totalOverdue} overdue
            </Badge>
          )}
          <Button 
            onClick={() => { setEditEvent(null); resetForm(); setShowForm(true); }} 
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="add-event-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Event
          </Button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Widget - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <Card className="glass-card border-white/10 rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                height="auto"
                events={calendarEvents}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                editable={true}
                selectable
                dayMaxEvents={3}
                eventDisplay="block"
                nowIndicator
                weekNumbers={false}
                fixedWeekCount={false}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Takes 1 column */}
        <div className="space-y-4">
          {/* Upcoming Events Panel */}
          <Card className="glass-card border-white/10 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Upcoming Events
                </h3>
                <span className="text-xs text-white/40">Next 7 days</span>
              </div>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-start gap-3 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      onClick={() => setViewEvent(event)}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getEventTypeColor(event.event_type)}`}>
                        {getEventTypeIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{event.title}</p>
                        <p className="text-xs text-white/50">
                          {new Date(event.start_datetime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' • '}
                          {new Date(event.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {event.priority === 'high' && <Badge className="bg-red-500/20 text-red-400 text-[10px]">High</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  <p className="text-sm text-white/40">No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overdue Panel */}
          {(overdueDeadlines.length > 0 || overdueTasks.length > 0) && (
            <Card className="glass-card border-red-500/20 rounded-2xl bg-red-500/5">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  Overdue Items ({totalOverdue})
                </h3>
                <div className="space-y-2">
                  {overdueDeadlines.slice(0, 3).map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg cursor-pointer hover:bg-red-500/20"
                      onClick={() => setViewEvent(event)}
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{event.title}</p>
                        <p className="text-xs text-red-400">
                          Due: {new Date(event.start_datetime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {overdueTasks.slice(0, 3).map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg"
                    >
                      <CheckSquare className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{task.title}</p>
                        <p className="text-xs text-red-400">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card className="glass-card border-white/10 rounded-2xl">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3">This Month</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-lg font-bold text-blue-400">{events.filter(e => e.event_type === 'meeting' && e.status === 'scheduled').length}</p>
                  <p className="text-xs text-white/50">Meetings</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg text-center">
                  <p className="text-lg font-bold text-red-400">{events.filter(e => e.event_type === 'court_hearing' && e.status === 'scheduled').length}</p>
                  <p className="text-xs text-white/50">Court</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-lg text-center">
                  <p className="text-lg font-bold text-emerald-400">{events.filter(e => e.status === 'completed').length}</p>
                  <p className="text-xs text-white/50">Completed</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-lg text-center">
                  <p className="text-lg font-bold text-amber-400">{tasks.filter(t => t.status !== 'completed').length}</p>
                  <p className="text-xs text-white/50">Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="glass-card border-white/10 rounded-2xl">
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold text-white/50 mb-2">Event Types</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> <span className="text-white/60">Meeting</span></span>
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> <span className="text-white/60">Court</span></span>
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> <span className="text-white/60">Deadline</span></span>
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> <span className="text-white/60">Appointment</span></span>
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> <span className="text-white/60">Reminder</span></span>
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-500"></span> <span className="text-white/60">Completed</span></span>
              </div>
              <p className="text-[10px] text-white/30 mt-2 flex items-center gap-1">
                <GripVertical className="w-3 h-3" /> Drag events to reschedule
              </p>
            </CardContent>
          </Card>
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-white/50">Event Type</label>
                  <select value={formData.event_type} onChange={(e) => setFormData({...formData, event_type: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                    <option value="meeting">Meeting</option>
                    <option value="court_hearing">Court Hearing</option>
                    <option value="deadline">Deadline</option>
                    <option value="reminder">Reminder</option>
                    <option value="appointment">Appointment</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
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
                <label className="text-xs text-white/50">Court / Registry</label>
                <div className="relative">
                  <Gavel className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input placeholder="e.g., High Court DSM" value={formData.court} onChange={(e) => setFormData({...formData, court: e.target.value})} className="pl-10 bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Link to Client</label>
                <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                  <option value="">Select client (optional)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
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
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editEvent ? "Save Changes" : "Create Event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Event Modal - Professional with Actions */}
      <Dialog open={!!viewEvent} onOpenChange={(open) => !open && setViewEvent(null)}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-lg">
          {viewEvent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getEventTypeColor(viewEvent.event_type)}`}>
                      {getEventTypeIcon(viewEvent.event_type)}
                    </div>
                    <div>
                      <DialogTitle className={`text-white text-lg ${viewEvent.status === 'completed' ? 'line-through opacity-60' : ''}`}>{viewEvent.title}</DialogTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge className={getStatusBadge(viewEvent.status)}>{viewEvent.status}</Badge>
                        {viewEvent.priority === 'high' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30">High Priority</Badge>}
                      </div>
                    </div>
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
                {viewEvent.court && (
                  <div className="flex items-center gap-3 text-white/70">
                    <Gavel className="w-4 h-4 text-white/50" />
                    <span>{viewEvent.court}</span>
                  </div>
                )}
                {viewEvent.description && (
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-white/60 text-sm">{viewEvent.description}</p>
                  </div>
                )}
                {viewEvent.outcome && (
                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 mb-1">Outcome:</p>
                    <p className="text-white/70 text-sm">{viewEvent.outcome}</p>
                  </div>
                )}
                {viewEvent.cancel_reason && (
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-xs text-red-400 mb-1">Cancellation Reason:</p>
                    <p className="text-white/70 text-sm">{viewEvent.cancel_reason}</p>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              {viewEvent.status === 'scheduled' && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Button onClick={() => setShowCompleteDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Check className="w-4 h-4 mr-2" /> Mark Complete
                  </Button>
                  <Button onClick={() => setShowRescheduleDialog(true)} variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                    <ArrowRight className="w-4 h-4 mr-2" /> Reschedule
                  </Button>
                  <Button onClick={() => setShowConvertDialog(true)} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <ListTodo className="w-4 h-4 mr-2" /> Create Task
                  </Button>
                  <Button onClick={() => setShowCancelDialog(true)} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                </div>
              )}
              
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { handleEditEvent(viewEvent); setViewEvent(null); }} className="border-white/20 text-white hover:bg-white/10">
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" onClick={() => setDeleteEvent(viewEvent)} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Event Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Mark Event as Complete</DialogTitle>
            <DialogDescription className="text-white/60">
              Optionally add notes about the outcome
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea 
              placeholder="What was the outcome? (optional)" 
              value={completeOutcome} 
              onChange={(e) => setCompleteOutcome(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)} className="border-white/20 text-white">Cancel</Button>
            <Button onClick={handleCompleteEvent} className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="w-4 h-4 mr-2" /> Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Event Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Cancel Event</DialogTitle>
            <DialogDescription className="text-white/60">
              Please provide a reason for cancellation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea 
              placeholder="Reason for cancellation (required)" 
              value={cancelReason} 
              onChange={(e) => setCancelReason(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              rows={3}
            />
            <p className="text-xs text-white/40">Minimum 5 characters required</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="border-white/20 text-white">Back</Button>
            <Button onClick={handleCancelEvent} className="bg-red-600 hover:bg-red-700" disabled={cancelReason.length < 5}>
              <X className="w-4 h-4 mr-2" /> Cancel Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Event Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Reschedule Event</DialogTitle>
            <DialogDescription className="text-white/60">
              Select a new date and time
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DateTimePicker 
              label="New Start Date & Time" 
              value={rescheduleData.new_start} 
              onChange={(val) => setRescheduleData({...rescheduleData, new_start: val})} 
            />
            <DateTimePicker 
              label="New End Date & Time (optional)" 
              value={rescheduleData.new_end} 
              onChange={(val) => setRescheduleData({...rescheduleData, new_end: val})} 
            />
            <div className="space-y-1">
              <label className="text-xs text-white/50">Reason (optional)</label>
              <Textarea 
                placeholder="Why is this being rescheduled?" 
                value={rescheduleData.reason} 
                onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                className="bg-white/5 border-white/10 text-white"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)} className="border-white/20 text-white">Cancel</Button>
            <Button onClick={handleRescheduleEvent} className="bg-amber-600 hover:bg-amber-700" disabled={!rescheduleData.new_start}>
              <ArrowRight className="w-4 h-4 mr-2" /> Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Task Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="bg-[#0a0d14] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Create Follow-up Task</DialogTitle>
            <DialogDescription className="text-white/60">
              Create a task linked to this event
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs text-white/50">Task Title</label>
              <Input 
                placeholder={`Follow up: ${viewEvent?.title || ''}`}
                value={convertTaskData.title} 
                onChange={(e) => setConvertTaskData({...convertTaskData, title: e.target.value})}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/50">Due Date</label>
                <Input 
                  type="date"
                  value={convertTaskData.due_date} 
                  onChange={(e) => setConvertTaskData({...convertTaskData, due_date: e.target.value})}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">Priority</label>
                <select 
                  value={convertTaskData.priority} 
                  onChange={(e) => setConvertTaskData({...convertTaskData, priority: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)} className="border-white/20 text-white">Cancel</Button>
            <Button onClick={handleConvertToTask} className="bg-blue-600 hover:bg-blue-700">
              <ListTodo className="w-4 h-4 mr-2" /> Create Task
            </Button>
          </DialogFooter>
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
    </div>
  );
};
