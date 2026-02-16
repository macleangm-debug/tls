import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { 
  Search, Package, Truck, CheckCircle2, Clock, XCircle, MapPin,
  Eye, User, Calendar, FileText, Droplet, Building2, Briefcase, Info
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status configurations
const STATUS_CONFIG = {
  pending_review: { color: "bg-yellow-500/20 text-yellow-400", icon: Clock, label: "Pending Review" },
  approved: { color: "bg-blue-500/20 text-blue-400", icon: CheckCircle2, label: "Approved" },
  in_production: { color: "bg-purple-500/20 text-purple-400", icon: Package, label: "In Production" },
  quality_check: { color: "bg-indigo-500/20 text-indigo-400", icon: Eye, label: "Quality Check" },
  ready_dispatch: { color: "bg-orange-500/20 text-orange-400", icon: Truck, label: "Ready for Dispatch" },
  dispatched: { color: "bg-teal-500/20 text-teal-400", icon: Truck, label: "Dispatched" },
  delivered: { color: "bg-green-500/20 text-green-400", icon: CheckCircle2, label: "Delivered" },
  cancelled: { color: "bg-red-500/20 text-red-400", icon: XCircle, label: "Cancelled" }
};

const AdminOrders = () => {
  const { user, getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      // Fetch physical orders (new system)
      const response = await axios.get(`${API}/physical-orders`, getAuthHeaders());
      setOrders(response.data);
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.advocate_name.toLowerCase().includes(search.toLowerCase()) ||
      o.delivery_address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price) => new Intl.NumberFormat('en-TZ').format(price);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-TZ', { 
    month: 'short', day: 'numeric', year: 'numeric' 
  });

  const getItemIcon = (item) => {
    if (item.product_type === "ink") return Droplet;
    if (item.format === "desk") return Building2;
    return Briefcase;
  };

  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending_review;

  // Count orders by status
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout title="Order Tracking" subtitle="Track physical stamp orders (read-only)">
      {/* Info Banner */}
      <Card className="glass-card rounded-xl mb-6 border-blue-500/30 bg-blue-500/10">
        <CardContent className="p-4 flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-400" />
          <p className="text-white/80 text-sm">
            This is a <strong>read-only view</strong> of physical stamp orders. 
            Order status updates are managed by IDC (production partner).
          </p>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          const count = statusCounts[status] || 0;
          return (
            <Card 
              key={status} 
              className={`glass-card rounded-xl cursor-pointer transition-all ${
                statusFilter === status ? 'ring-2 ring-white/30' : ''
              }`}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
                  <span className="text-white font-bold">{count}</span>
                </div>
                <p className="text-white/50 text-xs mt-1 truncate">{config.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="glass-card rounded-xl mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <Input
                placeholder="Search by Order ID, Advocate name, or Address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0f1a] border-white/10">
                <SelectItem value="all" className="text-white">All Orders</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <SelectItem key={status} value={status} className="text-white">
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="glass-card rounded-xl">
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <h3 className="text-xl text-white/60 mb-2">No Orders Found</h3>
            <p className="text-white/40">
              {search || statusFilter !== "all" 
                ? "Try adjusting your filters" 
                : "No physical stamp orders yet"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card 
                key={order.id} 
                className="glass-card rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => setSelectedOrder(order)}
                data-testid={`order-${order.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Order Info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.color.split(' ')[0]}`}>
                        <StatusIcon className={`w-6 h-6 ${statusConfig.color.split(' ')[1]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-mono text-white font-semibold">{order.id}</h4>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                          <Badge className={`${order.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {order.payment_status}
                          </Badge>
                        </div>
                        <p className="text-white/70 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {order.advocate_name}
                        </p>
                        <p className="text-white/50 text-sm flex items-center gap-2 mt-1">
                          <MapPin className="w-3 h-3" />
                          {order.delivery_address.slice(0, 50)}...
                        </p>
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="flex flex-wrap gap-2 lg:w-64">
                      {order.items.slice(0, 3).map((item, idx) => {
                        const Icon = getItemIcon(item);
                        return (
                          <div key={idx} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
                            <Icon className="w-3 h-3 text-emerald-400" />
                            <span className="text-white/60 text-xs">{item.name.split(' ')[0]} × {item.quantity}</span>
                          </div>
                        );
                      })}
                      {order.items.length > 3 && (
                        <span className="text-white/40 text-xs">+{order.items.length - 3} more</span>
                      )}
                    </div>

                    {/* Price & Date */}
                    <div className="text-right">
                      <p className="text-emerald-400 font-bold text-lg">TZS {formatPrice(order.total_price)}</p>
                      <p className="text-white/40 text-sm flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    {/* View Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/50 hover:text-white hover:bg-white/10"
                    >
                      <Eye className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order Details Dialog (Read-Only) */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-[#0a0f1a] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Order Details</span>
                  <Badge className={getStatusConfig(selectedOrder.status).color}>
                    {getStatusConfig(selectedOrder.status).label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Order ID & Date */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/50 text-sm">Order ID</p>
                    <p className="text-white font-mono text-lg">{selectedOrder.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-sm">Created</p>
                    <p className="text-white">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                </div>

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

                {/* Tracking Number */}
                {selectedOrder.tracking_number && (
                  <div className="space-y-1">
                    <p className="text-white/50 text-sm flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Tracking Number
                    </p>
                    <p className="text-emerald-400 font-mono bg-emerald-500/10 rounded-lg p-3">
                      {selectedOrder.tracking_number}
                    </p>
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
                
                {/* Status History */}
                {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <p className="text-white/70 font-medium">Status History</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminOrders;
