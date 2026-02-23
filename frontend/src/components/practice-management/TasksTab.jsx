import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Edit, Trash2, MoreVertical, AlertTriangle, Clock, CheckSquare, Target } from "lucide-react";
import axios from "axios";
import { API } from "./shared";

export const TasksTab = ({ token }) => {
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filter, setFilter] = useState("all");
  const [formData, setFormData] = useState({ 
    title: "", description: "", due_date: "", priority: "medium", status: "pending", client_id: "", case_id: "" 
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const params = filter !== "all" ? { status: filter } : {};
      const [tasksRes, clientsRes, casesRes] = await Promise.all([
        axios.get(`${API}/api/practice/tasks`, { headers, params }),
        axios.get(`${API}/api/practice/clients`, { headers }),
        axios.get(`${API}/api/practice/cases`, { headers })
      ]);
      setTasks(tasksRes.data.tasks);
      setClients(clientsRes.data.clients);
      setCases(casesRes.data.cases);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editTask) {
        await axios.put(`${API}/api/practice/tasks/${editTask.id}`, formData, { headers });
        toast.success("Task updated");
      } else {
        await axios.post(`${API}/api/practice/tasks`, formData, { headers });
        toast.success("Task created");
      }
      setShowForm(false);
      setEditTask(null);
      setFormData({ title: "", description: "", due_date: "", priority: "medium", status: "pending", client_id: "", case_id: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save task");
    }
  };

  const handleEditTask = (task) => {
    setEditTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      due_date: task.due_date ? task.due_date.split('T')[0] : "",
      priority: task.priority,
      status: task.status,
      client_id: task.client_id || "",
      case_id: task.case_id || ""
    });
    setShowForm(true);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await axios.delete(`${API}/api/practice/tasks/${taskId}`, { headers });
      toast.success("Task deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await axios.put(`${API}/api/practice/tasks/${taskId}`, { status: newStatus }, { headers });
      toast.success(newStatus === "completed" ? "Task completed!" : "Task reopened");
      fetchData();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(`${API}/api/practice/tasks/${taskId}`, { status: newStatus }, { headers });
      toast.success(`Task status updated to ${newStatus.replace('_', ' ')}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const getPriorityColor = (priority) => {
    const colors = { low: "text-gray-400 bg-gray-500/10", medium: "text-blue-400 bg-blue-500/10", high: "text-amber-400 bg-amber-500/10", urgent: "text-red-400 bg-red-500/10" };
    return colors[priority] || colors.medium;
  };

  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "in_progress", "completed"].map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className={filter === f ? "bg-tls-blue-electric" : "border-white/20 text-white"}>
              {f === "all" ? "All" : f.replace('_', ' ')}
            </Button>
          ))}
        </div>
        <Button onClick={() => { setEditTask(null); setShowForm(!showForm); }} className="bg-tls-blue-electric" data-testid="add-task-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Task
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{tasks.length}</p>
            <p className="text-xs text-white/50">Total Tasks</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{completedTasks.length}</p>
            <p className="text-xs text-white/50">Completed</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{overdueTasks.length}</p>
            <p className="text-xs text-white/50">Overdue</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{urgentTasks.length}</p>
            <p className="text-xs text-white/50">Urgent</p>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <h3 className="text-white font-medium mb-4">{editTask ? "Edit Task" : "New Task"}</h3>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <Input placeholder="Task Title *" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              <div>
                <label className="text-xs text-white/50 block mb-1">Due Date</label>
                <Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="bg-white/5 border-white/10 text-white" />
              </div>
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="">Link to Client (optional)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={formData.case_id} onChange={(e) => setFormData({...formData, case_id: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2">
                <option value="">Link to Case (optional)</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="bg-white/5 border-white/10 text-white md:col-span-2" rows={2} />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">{editTask ? "Update Task" : "Create Task"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditTask(null); }} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {overdueTasks.length > 0 && filter === "all" && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-red-400 font-medium">{overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}</p>
                <p className="text-red-400/70 text-sm">Please review and complete these tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {tasks.map((task) => {
          const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
          return (
            <Card key={task.id} className={`glass-card border-white/10 hover:border-white/20 transition-all ${task.status === 'completed' ? 'opacity-60' : ''} ${isOverdue ? 'border-red-500/30' : ''}`} data-testid={`task-card-${task.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => toggleTaskStatus(task.id, task.status)} 
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 hover:border-white/50'}`}
                  >
                    {task.status === 'completed' && <CheckSquare className="w-4 h-4 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-white/50' : 'text-white'}`}>{task.title}</h3>
                        {task.description && <p className="text-sm text-white/40 mt-1 truncate">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {task.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-white/50'}`}>
                              <Clock className="w-3 h-3" />
                              {isOverdue ? 'Overdue: ' : 'Due: '}{new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {task.client_name && <Badge variant="outline" className="text-xs border-white/20 text-white/60">{task.client_name}</Badge>}
                          {task.case_title && <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">{task.case_title}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white hover:bg-white/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1a1f2e] border-white/10 text-white min-w-[160px]">
                            <DropdownMenuItem onClick={() => handleEditTask(task)} className="hover:bg-white/10 cursor-pointer">
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "pending")} className="hover:bg-white/10 cursor-pointer" disabled={task.status === "pending"}>
                              <Clock className="mr-2 h-4 w-4 text-amber-400" /> Set Pending
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "in_progress")} className="hover:bg-white/10 cursor-pointer" disabled={task.status === "in_progress"}>
                              <Target className="mr-2 h-4 w-4 text-blue-400" /> Set In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateTaskStatus(task.id, "completed")} className="hover:bg-white/10 cursor-pointer" disabled={task.status === "completed"}>
                              <CheckSquare className="mr-2 h-4 w-4 text-emerald-400" /> Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="hover:bg-red-500/20 text-red-400 cursor-pointer">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No tasks yet</p>
          <p className="text-white/30 text-sm mt-1">Create your first task to get started</p>
        </div>
      )}
    </div>
  );
};
