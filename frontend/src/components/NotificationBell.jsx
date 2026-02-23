import { useState, useEffect, useCallback } from "react";
import { Bell, Check, Trash2, X, Calendar, CheckSquare, Info, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export const NotificationBell = ({ token }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/api/notifications?limit=10`, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/api/notifications/unread-count`, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/api/notifications/mark-read/${notificationId}`, {}, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/api/notifications/mark-all-read`, {}, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/api/notifications/${notificationId}`, { headers });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "reminder":
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case "success":
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "error":
        return <X className="w-4 h-4 text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-9 w-9 p-0 text-white/70 hover:text-white hover:bg-white/10"
          data-testid="notification-bell"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-xs bg-red-500 border-0"
              data-testid="notification-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 bg-[#1a1f2e] border-white/10 text-white max-h-[400px] overflow-hidden"
        data-testid="notification-dropdown"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-blue-400 hover:text-blue-300 h-auto p-1"
              onClick={markAllAsRead}
              disabled={loading}
            >
              <Check className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3 text-white/20" />
              <p className="text-white/50 text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 focus:bg-white/5 ${
                  !notification.read ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : ''
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
                data-testid={`notification-item-${notification.id}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  notification.type === 'reminder' ? 'bg-blue-500/20' :
                  notification.type === 'success' ? 'bg-emerald-500/20' :
                  notification.type === 'warning' ? 'bg-amber-500/20' :
                  notification.type === 'error' ? 'bg-red-500/20' : 'bg-white/10'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${notification.read ? 'text-white/70' : 'text-white'}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-white/50 truncate">{notification.message}</p>
                  <p className="text-xs text-white/30 mt-1">{getTimeAgo(notification.created_at)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white/30 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                  onClick={(e) => deleteNotification(notification.id, e)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-white/50 hover:text-white"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/dashboard?tab=notifications';
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
