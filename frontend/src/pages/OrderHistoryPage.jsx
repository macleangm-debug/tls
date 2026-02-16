import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { DashboardLayout } from "./AdvocateDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Package, Truck, CheckCircle2, Clock, XCircle, MapPin } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OrderHistoryPage = () => {
  const { getAuthHeaders } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`, getAuthHeaders());
      setOrders(response.data);
    } catch (error) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending_approval": return <Clock className="w-5 h-5" />;
      case "approved": case "in_production": return <Package className="w-5 h-5" />;
      case "dispatched": return <Truck className="w-5 h-5" />;
      case "delivered": return <CheckCircle2 className="w-5 h-5" />;
      case "cancelled": return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending_approval": return "bg-yellow-100 text-yellow-700";
      case "approved": return "bg-blue-100 text-blue-700";
      case "in_production": return "bg-purple-100 text-purple-700";
      case "dispatched": return "bg-orange-100 text-orange-700";
      case "delivered": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-700";
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "refunded": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const formatStatus = (status) => status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  return (
    <DashboardLayout title="Order History" subtitle="Track your physical stamp orders">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-tls-blue"></div>
        </div>
      ) : orders.length === 0 ? (
        <Card data-testid="no-orders">
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="font-heading text-xl text-slate-600 mb-2">No Orders Yet</h3>
            <p className="text-slate-500">You haven't placed any stamp orders yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow" data-testid={`order-${order.id}`}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      order.status === "delivered" ? "bg-green-100" : "bg-tls-gold/10"
                    }`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-tls-blue">{order.stamp_type_name}</h4>
                      <p className="text-sm text-slate-500">Qty: {order.quantity}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Ordered: {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Status & Price */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={getStatusColor(order.status)}>
                      {formatStatus(order.status)}
                    </Badge>
                    <Badge className={getPaymentStatusColor(order.payment_status)}>
                      {formatStatus(order.payment_status)}
                    </Badge>
                    <div className="text-right">
                      <p className="font-semibold text-tls-blue">{order.total_price.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">{order.currency}</p>
                    </div>
                  </div>
                </div>

                {/* Delivery & Tracking */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex items-start gap-2 text-sm text-slate-500">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{order.delivery_address}</span>
                  </div>
                  {order.tracking_number && (
                    <div className="text-sm">
                      <span className="text-slate-500">Tracking: </span>
                      <span className="font-mono text-tls-blue">{order.tracking_number}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default OrderHistoryPage;
