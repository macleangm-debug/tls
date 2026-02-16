import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  Package, Truck, CheckCircle2, Clock, XCircle, MapPin, 
  ArrowLeft, Search, Filter, User, Phone, Calendar,
  ChevronRight, MessageSquare, Send, FileText, Droplet,
  Building2, Briefcase, RefreshCw, Eye, Settings
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Order status columns for Kanban
const STATUS_COLUMNS = [
  { id: "pending_review", name: "Pending Review", color: "bg-yellow-500", icon: Clock },
  { id: "approved", name: "Approved", color: "bg-blue-500", icon: CheckCircle2 },
  { id: "in_production", name: "In Production", color: "bg-purple-500", icon: Package },
  { id: "quality_check", name: "Quality Check", color: "bg-indigo-500", icon: Eye },
  { id: "ready_dispatch", name: "Ready for Dispatch", color: "bg-orange-500", icon: Truck },
  { id: "dispatched", name: "Dispatched", color: "bg-teal-500", icon: Truck },
  { id: "delivered", name: "Delivered", color: "bg-green-500", icon: CheckCircle2 }
];

// Helper to get item icon
const getItemIcon = (item) => {
  if (item.product_type === "ink") return Droplet;
  if (item.format === "desk") return Building2;
  return Briefcase;
};

// Helper to format price
const formatPrice = (price) => new Intl.NumberFormat('en-TZ').format(price);

// Helper to format date
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-TZ', { 
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
});

// Order Card component for Kanban
const OrderCard = ({ order, onDragStart, onClick }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, order)}
      onClick={onClick}
      className="bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group relative"
      data-testid={`order-card-${order.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-white font-mono text-xs">{order.id}</p>
          <p className="text-white/70 text-sm font-medium truncate max-w-[140px]">{order.advocate_name}</p>
        </div>
        <Badge className={`text-[10px] ${order.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
          {order.payment_status}
        </Badge>
      </div>
      
      <div className="space-y-1 mb-2">
        {order.items.slice(0, 2).map((item, idx) => {
          const Icon = getItemIcon(item);
          return (
            <div key={idx} className="flex items-center gap-2 text-xs text-white/50">
              <Icon className="w-3 h-3" />
              <span className="truncate">{item.name} × {item.quantity}</span>
            </div>
          );
        })}
        {order.items.length > 2 && (
          <p className="text-xs text-white/40">+{order.items.length - 2} more items</p>
        )}
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <span className="text-white/40 text-[10px]">{formatDate(order.created_at).split(',')[0]}</span>
        <span className="text-emerald-400 text-xs font-semibold">TZS {formatPrice(order.total_price)}</span>
      </div>
      
      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

// Kanban Column component
const KanbanColumn = ({ column, orders, onDrop, onOrderClick, onDragStart }) => {
  const Icon = column.icon;
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("ring-2", "ring-white/20");
  };
  
  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove("ring-2", "ring-white/20");
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-white/20");
    const orderId = e.dataTransfer.getData("orderId");
    if (orderId) {
      onDrop(orderId, column.id);
    }
  };
  
  return (
    <div 
      className="flex-1 min-w-[220px] max-w-[280px] flex flex-col bg-white/5 rounded-2xl overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={`kanban-column-${column.id}`}
    >
      {/* Column Header */}
      <div className={`px-4 py-3 ${column.color} bg-opacity-20 border-b border-white/10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${column.color.replace('bg-', 'text-').replace('-500', '-400')}`} />
            <span className="text-white font-medium text-sm">{column.name}</span>
          </div>
          <Badge className="bg-white/10 text-white/70 text-xs">
            {orders.length}
          </Badge>
        </div>
      </div>
      
      {/* Column Body */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)]">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onDragStart={onDragStart}
            onClick={() => onOrderClick(order)}
          />
        ))}
        {orders.length === 0 && (
          <div className="text-center py-8 text-white/30 text-sm">
            No orders
          </div>
        )}
      </div>
    </div>
  );
};

const IDCOrdersPage = () => {
  const { user, getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("kanban"); // kanban or list
  const [stats, setStats] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/physical-orders`, getAuthHeaders());
      setOrders(response.data);
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/physical-orders/stats/summary`, getAuthHeaders());
      setStats(response.data);
    } catch (error) {
      console.error("Failed to load stats");
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const params = new URLSearchParams({ 
        status: newStatus,
        note: statusNote || `Status changed to ${newStatus.replace(/_/g, " ")}`
      });
      if (trackingNumber && newStatus === "dispatched") {
        params.append("tracking_number", trackingNumber);
      }
      
      await axios.put(`${API}/physical-orders/${orderId}/status?${params}`, {}, getAuthHeaders());
      
      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status: newStatus, tracking_number: trackingNumber || o.tracking_number } : o
      ));
      
      toast.success(`Order moved to ${newStatus.replace(/_/g, " ")}`);
      setStatusNote("");
      setTrackingNumber("");
      fetchStats();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const addNote = async (orderId) => {
    if (!newNote.trim()) return;
    
    try {
      await axios.post(`${API}/physical-orders/${orderId}/notes?note=${encodeURIComponent(newNote)}`, {}, getAuthHeaders());
      
      // Refresh order details
      const response = await axios.get(`${API}/physical-orders/${orderId}`, getAuthHeaders());
      setSelectedOrder(response.data);
      setOrders(orders.map(o => o.id === orderId ? response.data : o));
      
      setNewNote("");
      toast.success("Note added");
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  const getOrdersByStatus = (status) => {
    return orders.filter(o => {
      const matchesStatus = o.status === status;
      const matchesSearch = search === "" || 
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.advocate_name.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  };

  const handleDragStart = (e, order) => {
    e.dataTransfer.setData("orderId", order.id);
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  return (
    <div className="min-h-screen bg-[#02040A]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#02040A]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/super-admin" className="text-white/50 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Physical Orders Management</h1>
                <p className="text-white/50 text-sm">IDC Production Workflow</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  type="text"
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              
              {/* Refresh */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setLoading(true); fetchOrders(); fetchStats(); }}
                className="border-white/10 text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              
              {/* View Toggle */}
              <div className="flex items-center bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    viewMode === "kanban" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    viewMode === "list" ? "bg-white/10 text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white/5 border-b border-white/10">
          <div className="max-w-[1800px] mx-auto px-6 py-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-400" />
                <span className="text-white/70 text-sm">Total: <strong className="text-white">{stats.total_orders}</strong></span>
              </div>
              {Object.entries(stats.by_status || {}).slice(0, 5).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${STATUS_COLUMNS.find(c => c.id === status)?.color || 'bg-gray-500'}`} />
                  <span className="text-white/50 text-sm">{status.replace(/_/g, " ")}: <strong className="text-white">{count}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : viewMode === "kanban" ? (
          /* Kanban View */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                orders={getOrdersByStatus(column.id)}
                onDrop={updateOrderStatus}
                onOrderClick={handleOrderClick}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        ) : (
          /* List View */
          <Card className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-white/50 text-sm font-medium">Order ID</th>
                    <th className="text-left px-4 py-3 text-white/50 text-sm font-medium">Advocate</th>
                    <th className="text-left px-4 py-3 text-white/50 text-sm font-medium">Items</th>
                    <th className="text-left px-4 py-3 text-white/50 text-sm font-medium">Total</th>
                    <th className="text-left px-4 py-3 text-white/50 text-sm font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-white/50 text-sm font-medium">Payment</th>
                    <th className="text-left px-4 py-3 text-white/50 text-sm font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-white/50 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(o => search === "" || o.id.toLowerCase().includes(search.toLowerCase()) || o.advocate_name.toLowerCase().includes(search.toLowerCase())).map((order) => (
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-mono text-sm">{order.id}</td>
                      <td className="px-4 py-3 text-white/80">{order.advocate_name}</td>
                      <td className="px-4 py-3 text-white/60 text-sm">
                        {order.items.map(i => `${i.name} (${i.quantity})`).join(", ").slice(0, 40)}...
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold">TZS {formatPrice(order.total_price)}</td>
                      <td className="px-4 py-3">
                        <Badge className={`${STATUS_COLUMNS.find(c => c.id === order.status)?.color || 'bg-gray-500'} text-white text-xs`}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${order.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {order.payment_status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-sm">{formatDate(order.created_at).split(',')[0]}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedOrder(order); setShowOrderDetails(true); }}
                          className="text-white/50 hover:text-white hover:bg-white/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>

      {/* Order Details Dialog */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="bg-[#0a0f1a] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Order {selectedOrder.id}</span>
                  <Badge className={`${STATUS_COLUMNS.find(c => c.id === selectedOrder.status)?.color || 'bg-gray-500'} text-white`}>
                    {selectedOrder.status.replace(/_/g, " ")}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-white/50 text-sm">Advocate</p>
                    <p className="text-white font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      {selectedOrder.advocate_name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/50 text-sm">TLS Number</p>
                    <p className="text-white font-mono">{selectedOrder.customization?.tls_number || "N/A"}</p>
                  </div>
                </div>
                
                {/* Delivery Address */}
                <div className="space-y-1">
                  <p className="text-white/50 text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Delivery Address
                  </p>
                  <p className="text-white bg-white/5 rounded-lg p-3">{selectedOrder.delivery_address}</p>
                </div>
                
                {/* Special Instructions */}
                {selectedOrder.special_instructions && (
                  <div className="space-y-1">
                    <p className="text-white/50 text-sm">Special Instructions</p>
                    <p className="text-amber-400 bg-amber-500/10 rounded-lg p-3">{selectedOrder.special_instructions}</p>
                  </div>
                )}
                
                {/* Order Items */}
                <div className="space-y-2">
                  <p className="text-white/50 text-sm">Order Items</p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => {
                      const Icon = getItemIcon(item);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-white font-medium">{item.name}</p>
                              <p className="text-white/50 text-sm">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="text-emerald-400 font-semibold">TZS {formatPrice(item.total_price)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-white/70 font-medium">Total</span>
                    <span className="text-emerald-400 font-bold text-xl">TZS {formatPrice(selectedOrder.total_price)}</span>
                  </div>
                </div>
                
                {/* Status Update */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <p className="text-white/70 font-medium">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_COLUMNS.filter(c => c.id !== selectedOrder.status).map((col) => {
                      const Icon = col.icon;
                      return (
                        <Button
                          key={col.id}
                          size="sm"
                          onClick={() => updateOrderStatus(selectedOrder.id, col.id)}
                          className={`${col.color} hover:opacity-80 text-white`}
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          {col.name}
                        </Button>
                      );
                    })}
                  </div>
                  
                  {/* Tracking Number (for dispatch) */}
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Tracking number (optional)"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
                
                {/* Status History */}
                {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <p className="text-white/70 font-medium">Status History</p>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {selectedOrder.status_history.slice().reverse().map((entry, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                          <div>
                            <p className="text-white">
                              <span className="font-medium">{entry.status.replace(/_/g, " ")}</span>
                              {entry.note && <span className="text-white/50 ml-2">- {entry.note}</span>}
                            </p>
                            <p className="text-white/40 text-xs">{entry.by} · {formatDate(entry.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <p className="text-white/70 font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notes
                  </p>
                  {selectedOrder.notes && selectedOrder.notes.length > 0 && (
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {selectedOrder.notes.slice().reverse().map((note, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-3">
                          <p className="text-white text-sm">{note.text}</p>
                          <p className="text-white/40 text-xs mt-1">{note.by} · {formatDate(note.timestamp)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      onKeyDown={(e) => e.key === "Enter" && addNote(selectedOrder.id)}
                    />
                    <Button
                      onClick={() => addNote(selectedOrder.id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IDCOrdersPage;
