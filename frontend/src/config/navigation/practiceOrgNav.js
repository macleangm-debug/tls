// frontend/src/config/navigation/practiceOrgNav.js
import {
  Home,
  Users,
  Shield,
  FolderOpen,
  FileText,
  CheckSquare,
  CalendarDays,
  Receipt,
  LayoutTemplate,
  Stamp,
  GitBranch,
  CreditCard,
  BarChart3,
  Settings,
  Building2,
} from "lucide-react";

export const practiceOrgNav = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/organization", icon: Home },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Team Members", path: "/organization/team", icon: Users },
      { label: "Clients", path: "/organization/clients", icon: Building2 },
      { label: "Cases / Matters", path: "/organization/cases", icon: FolderOpen },
      { label: "Documents", path: "/organization/documents", icon: FileText },
      { label: "Tasks", path: "/organization/tasks", icon: CheckSquare },
      { label: "Calendar", path: "/organization/calendar", icon: CalendarDays },
      { label: "Invoices", path: "/organization/invoices", icon: Receipt },
      { label: "Templates", path: "/organization/templates", icon: LayoutTemplate },
    ],
  },
  {
    group: "Certification",
    items: [
      { label: "Team Stamping", path: "/organization/stamping", icon: Stamp },
      { label: "Stamp Ledger", path: "/organization/stamp-ledger", icon: FileText },
      { label: "Approval Workflows", path: "/organization/workflows", icon: GitBranch },
    ],
  },
  {
    group: "Billing",
    items: [
      { label: "Subscription", path: "/organization/billing", icon: CreditCard },
      { label: "Usage", path: "/organization/usage", icon: BarChart3 },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "Organization Profile", path: "/organization/settings/profile", icon: Building2 },
      { label: "Roles & Permissions", path: "/organization/settings/roles", icon: Shield },
      { label: "Security", path: "/organization/settings/security", icon: Settings },
    ],
  },
];

export default practiceOrgNav;
