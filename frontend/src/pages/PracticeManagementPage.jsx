import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "./AdvocateDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Users, Briefcase, Calendar, CheckSquare, Receipt, 
  FolderOpen, Mail, PieChart, FileSignature, FileCheck,
  ChevronRight
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

// Menu groups configuration
const menuGroups = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { value: "dashboard", label: "Dashboard", icon: PieChart }
    ]
  },
  {
    id: "clients-cases",
    label: "Client & Cases",
    items: [
      { value: "clients", label: "Clients", icon: Users },
      { value: "cases", label: "Cases", icon: Briefcase }
    ]
  },
  {
    id: "documents",
    label: "Documents",
    items: [
      { value: "doc-generator", label: "Generator", icon: FileCheck, highlight: true },
      { value: "documents", label: "Vault", icon: FolderOpen },
      { value: "templates", label: "Templates", icon: FileSignature }
    ]
  },
  {
    id: "planning",
    label: "Planning",
    items: [
      { value: "calendar", label: "Calendar", icon: Calendar },
      { value: "tasks", label: "Tasks", icon: CheckSquare }
    ]
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { value: "invoices", label: "Invoices", icon: Receipt }
    ]
  },
  {
    id: "communication",
    label: "Comms",
    items: [
      { value: "messages", label: "Messages", icon: Mail }
    ]
  }
];

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

  // Find active group for highlighting
  const getActiveGroup = () => {
    for (const group of menuGroups) {
      if (group.items.some(item => item.value === activeTab)) {
        return group.id;
      }
    }
    return "overview";
  };

  return (
    <DashboardLayout title="Practice Management" subtitle="Manage your clients, cases, tasks, and billing">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Grouped Navigation */}
        <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
          <div className="flex flex-wrap gap-4 items-start">
            {menuGroups.map((group, groupIndex) => (
              <div key={group.id} className="flex items-center gap-1">
                {/* Group Container */}
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 px-1 font-medium">
                    {group.label}
                  </span>
                  <div className="flex gap-0.5 bg-slate-800/50 rounded-lg p-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => setActiveTab(item.value)}
                          data-testid={`${item.value}-tab`}
                          className={`
                            flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium
                            transition-all duration-200
                            ${isActive 
                              ? item.highlight 
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
                                : 'bg-tls-blue-electric text-white shadow-lg shadow-tls-blue-electric/30'
                              : 'text-slate-400 hover:text-white hover:bg-white/10'
                            }
                          `}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Separator between groups (except last) */}
                {groupIndex < menuGroups.length - 1 && (
                  <div className="hidden lg:block h-10 w-px bg-slate-700/50 mx-2 self-end mb-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Hidden TabsList for Tabs component to work */}
        <TabsList className="hidden">
          {menuGroups.flatMap(group => 
            group.items.map(item => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))
          )}
        </TabsList>

        {/* Tab Contents */}
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
