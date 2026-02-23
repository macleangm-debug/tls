import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import axios from "axios";
import { API } from "./shared";

export const MessagesTab = ({ token }) => {
  const [messages, setMessages] = useState([]);
  const [folder, setFolder] = useState("inbox");

  const headers = { Authorization: `Bearer ${token}` };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/api/practice/messages`, { headers, params: { folder } });
      setMessages(response.data.messages);
    } catch (error) {
      toast.error("Failed to fetch messages");
    }
  };

  useEffect(() => { fetchMessages(); }, [folder]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {["inbox", "sent", "archived"].map((f) => (
          <Button key={f} variant={folder === f ? "default" : "outline"} size="sm" onClick={() => setFolder(f)} className={folder === f ? "bg-tls-blue-electric" : "border-white/20 text-white capitalize"}>
            {f}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {messages.map((msg) => (
          <Card key={msg.id} className={`glass-card border-white/10 cursor-pointer ${!msg.read ? 'border-l-2 border-l-tls-blue-electric' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`font-medium ${!msg.read ? 'text-white' : 'text-white/70'}`}>{msg.subject}</h3>
                  <p className="text-sm text-white/50">{msg.sender_name}</p>
                </div>
                <span className="text-xs text-white/40">{new Date(msg.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <p className="text-white/50">No messages in {folder}</p>
        </div>
      )}
    </div>
  );
};
