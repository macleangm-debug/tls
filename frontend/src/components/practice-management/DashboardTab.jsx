import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { 
  Briefcase, Users, CheckSquare, TrendingUp, AlertTriangle, 
  Clock, Receipt, Calendar, ChevronRight, Plus, Target,
  ArrowUpRight, UserCheck, PieChart, Gavel
} from "lucide-react";
import { DonutChart, BarChart } from "./shared";

export const DashboardTab = ({ analytics, caseAnalytics, revenueData, recentActivity, onNavigate }) => {
  const caseStatusData = caseAnalytics?.by_status ? Object.entries(caseAnalytics.by_status).map(([key, value]) => ({ label: key, value })) : [];
  const caseTypeData = caseAnalytics?.by_type ? Object.entries(caseAnalytics.by_type).map(([key, value]) => ({ label: key, value })) : [];
  const revenueChartData = revenueData ? Object.entries(revenueData).map(([key, value]) => ({ label: key.slice(-2), value })).slice(-6) : [];

  const statusColors = ["#10B981", "#F59E0B", "#6B7280", "#8B5CF6"];
  const typeColors = ["#3B82F6", "#EC4899", "#14B8A6", "#F97316", "#8B5CF6", "#6B7280"];

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-white/10" data-testid="metric-active-cases">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{analytics?.summary?.active_cases || 0}</p>
                <p className="text-xs text-white/50">Active Cases</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <ArrowUpRight className="w-3 h-3 text-emerald-500 mr-1" />
              <span className="text-emerald-500">+2 this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10" data-testid="metric-total-clients">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{analytics?.summary?.total_clients || 0}</p>
                <p className="text-xs text-white/50">Total Clients</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <UserCheck className="w-3 h-3 text-emerald-500 mr-1" />
              <span className="text-white/50">Active relationships</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10" data-testid="metric-pending-tasks">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{analytics?.summary?.pending_tasks || 0}</p>
                <p className="text-xs text-white/50">Pending Tasks</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            {analytics?.summary?.overdue_tasks > 0 && (
              <div className="mt-2 flex items-center text-xs">
                <AlertTriangle className="w-3 h-3 text-red-500 mr-1" />
                <span className="text-red-400">{analytics.summary.overdue_tasks} overdue</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10" data-testid="metric-revenue">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-white">TZS {((analytics?.financials?.monthly_revenue || 0) / 1000).toFixed(0)}K</p>
                <p className="text-xs text-white/50">Monthly Revenue</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-teal-500" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <Receipt className="w-3 h-3 text-amber-500 mr-1" />
              <span className="text-amber-400">{analytics?.financials?.pending_count || 0} pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Case Status Distribution */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-500" />
              Cases by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[180px]">
            <div className="flex items-center justify-center gap-6 h-full">
              {caseStatusData.length > 0 ? (
                <>
                  <div className="flex-shrink-0">
                    <DonutChart data={caseStatusData} colors={statusColors} size={120} />
                  </div>
                  <div className="space-y-2">
                    {caseStatusData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[idx % statusColors.length] }} />
                        <span className="text-white/60 capitalize">{item.label}</span>
                        <span className="text-white font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-white/40 text-sm py-8">No cases yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Case Types */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Gavel className="w-4 h-4 text-purple-500" />
              Cases by Type
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[180px] overflow-y-auto">
            {caseTypeData.length > 0 ? (
              <div className="space-y-2">
                {caseTypeData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 capitalize">{item.label}</span>
                        <span className="text-white">{item.value}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${(item.value / Math.max(...caseTypeData.map(d => d.value))) * 100}%`,
                            backgroundColor: typeColors[idx % typeColors.length]
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm py-8 text-center">No cases yet</p>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[180px]">
            {revenueChartData.length > 0 ? (
              <BarChart data={revenueChartData} color="#10B981" height={160} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-white/40 text-sm">No revenue data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Alerts & Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Attention Required */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.summary?.overdue_tasks > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg cursor-pointer hover:bg-red-500/20 transition-all" onClick={() => onNavigate('tasks')}>
                  <Clock className="w-5 h-5 text-red-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{analytics.summary.overdue_tasks} Overdue Tasks</p>
                    <p className="text-xs text-white/50">Requires immediate attention</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              )}
              {analytics?.financials?.pending_count > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg cursor-pointer hover:bg-amber-500/20 transition-all" onClick={() => onNavigate('invoices')}>
                  <Receipt className="w-5 h-5 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{analytics.financials.pending_count} Unpaid Invoices</p>
                    <p className="text-xs text-white/50">TZS {(analytics.financials.pending_invoices || 0).toLocaleString()} pending</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              )}
              {analytics?.summary?.upcoming_events > 0 && (
                <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg cursor-pointer hover:bg-purple-500/20 transition-all" onClick={() => onNavigate('calendar')}>
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{analytics.summary.upcoming_events} Upcoming Events</p>
                    <p className="text-xs text-white/50">In the next 7 days</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              )}
              {!analytics?.summary?.overdue_tasks && !analytics?.financials?.pending_count && !analytics?.summary?.upcoming_events && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                    <CheckSquare className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-white/60 text-sm">All caught up!</p>
                  <p className="text-white/40 text-xs">No urgent items</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Stats */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              Quick Stats & Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-white">{analytics?.summary?.total_documents || 0}</p>
                <p className="text-xs text-white/50">Documents Stored</p>
              </div>
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-white">{analytics?.summary?.stamps_this_month || 0}</p>
                <p className="text-xs text-white/50">Stamps This Month</p>
              </div>
              <Button className="col-span-2 bg-tls-blue-electric hover:bg-tls-blue-electric/90" onClick={() => onNavigate('new-case')}>
                <Plus className="w-4 h-4 mr-2" /> New Case
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => onNavigate('new-client')}>
                <Users className="w-4 h-4 mr-2" /> Add Client
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => onNavigate('new-invoice')}>
                <Receipt className="w-4 h-4 mr-2" /> New Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
