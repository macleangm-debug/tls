import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Users, Briefcase, Calendar, CheckSquare, Receipt, 
  FolderOpen, Mail, PieChart, FileSignature, FileCheck
} from "lucide-react";
import axios from "axios";

// Import all tab components from the modular practice-management directory
import {
  DashboardTab,
  ClientsTab,
  CasesTab,
  DocumentsTab,
  CalendarTab,
  TasksTab,
  InvoicesTab,
  MessagesTab,
  TemplatesTab,
  DocumentGeneratorTab,
  API
} from "../components/practice-management";

const PracticeManagementPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [analytics, setAnalytics] = useState(null);
  const [caseAnalytics, setCaseAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchAnalytics = useCallback(async () => {
    try {
      const [dashRes, caseRes, revenueRes] = await Promise.all([
        axios.get(`${API}/api/practice/analytics/dashboard`, { headers }),
        axios.get(`${API}/api/practice/analytics/cases`, { headers }),
        axios.get(`${API}/api/practice/analytics/revenue`, { headers })
      ]);
      setAnalytics(dashRes.data);
      setCaseAnalytics(caseRes.data);
      setRevenueData(revenueRes.data.revenue_by_period);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleNavigate = (tab) => {
    if (tab.startsWith('new-')) {
      const section = tab.replace('new-', '') + 's';
      setActiveTab(section);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <DashboardLayout title="Practice Management" subtitle="Manage your clients, cases, tasks, and billing">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <PieChart className="w-4 h-4 mr-1" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Users className="w-4 h-4 mr-1" /> Clients
          </TabsTrigger>
          <TabsTrigger value="cases" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Briefcase className="w-4 h-4 mr-1" /> Cases
          </TabsTrigger>
          <TabsTrigger value="doc-generator" className="data-[state=active]:bg-emerald-600 rounded-lg text-xs px-3" data-testid="doc-generator-tab">
            <FileCheck className="w-4 h-4 mr-1" /> Doc Generator
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <FolderOpen className="w-4 h-4 mr-1" /> Documents
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Calendar className="w-4 h-4 mr-1" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <CheckSquare className="w-4 h-4 mr-1" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Receipt className="w-4 h-4 mr-1" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <FileSignature className="w-4 h-4 mr-1" /> Templates
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-tls-blue-electric rounded-lg text-xs px-3">
            <Mail className="w-4 h-4 mr-1" /> Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab analytics={analytics} caseAnalytics={caseAnalytics} revenueData={revenueData} onNavigate={handleNavigate} />
        </TabsContent>

        <TabsContent value="clients">
          <ClientsTab token={token} />
        </TabsContent>

        <TabsContent value="cases">
          <CasesTab token={token} />
        </TabsContent>

        <TabsContent value="doc-generator">
          <DocumentGeneratorTab token={token} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab token={token} />
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarTab token={token} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab token={token} />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTab token={token} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab token={token} />
        </TabsContent>

        <TabsContent value="messages">
          <MessagesTab token={token} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default PracticeManagementPage;
