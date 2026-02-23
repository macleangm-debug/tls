import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { Plus, Receipt, Users } from "lucide-react";
import axios from "axios";
import { API } from "./shared";

export const InvoicesTab = ({ token }) => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "", items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }], due_date: "", notes: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        axios.get(`${API}/api/practice/invoices`, { headers }),
        axios.get(`${API}/api/practice/clients`, { headers })
      ]);
      setInvoices(invoicesRes.data.invoices);
      setClients(clientsRes.data.clients);
    } catch (error) {
      toast.error("Failed to fetch data");
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      toast.error("Please select a client");
      return;
    }
    try {
      await axios.post(`${API}/api/practice/invoices`, formData, { headers });
      toast.success("Invoice created");
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create invoice");
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const getStatusColor = (status) => {
    const colors = { draft: "bg-gray-500", sent: "bg-blue-500", paid: "bg-emerald-500", overdue: "bg-red-500" };
    return colors[status] || colors.draft;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Invoices</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-tls-blue-electric" disabled={clients.length === 0}>
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </div>

      {showForm && (
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <select value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})} className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2" required>
                  <option value="">Select Client *</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="bg-white/5 border-white/10 text-white" required />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-white/50">Invoice Items</p>
                {formData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="bg-white/5 border-white/10 text-white col-span-2" />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))} className="bg-white/5 border-white/10 text-white" />
                    <Input type="number" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-white/20 text-white">
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">Create Invoice</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-white/20 text-white">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="glass-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">{invoice.invoice_number}</h3>
                  <p className="text-sm text-white/50">{invoice.client_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">TZS {invoice.total?.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(invoice.status)}`} />
                    <span className="text-xs text-white/50 capitalize">{invoice.status}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {invoices.length === 0 && clients.length > 0 && (
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No invoices yet</p>
        </div>
      )}

      {clients.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">Add clients first before creating invoices</p>
        </div>
      )}
    </div>
  );
};
