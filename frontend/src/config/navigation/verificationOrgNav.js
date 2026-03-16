// frontend/src/config/navigation/verificationOrgNav.js
import {
  Home,
  ShieldCheck,
  History,
  ShieldAlert,
  KeyRound,
  Webhook,
  CreditCard,
  BarChart3,
  Building2,
  Settings,
  Users,
  FileText,
} from "lucide-react";

export const verificationOrgNav = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/verification-org", icon: Home },
    ],
  },
  {
    group: "Verification",
    items: [
      { label: "Verify Document", path: "/verification-org/verify", icon: ShieldCheck },
      { label: "Verification History", path: "/verification-org/history", icon: History },
      { label: "Fraud Alerts", path: "/verification-org/fraud", icon: ShieldAlert },
      { label: "Verification Reports", path: "/verification-org/reports", icon: BarChart3 },
    ],
  },
  {
    group: "Integration",
    items: [
      { label: "API Keys", path: "/verification-org/api-keys", icon: KeyRound },
      { label: "Webhooks", path: "/verification-org/webhooks", icon: Webhook },
      { label: "API Documentation", path: "/verification-org/api-docs", icon: FileText },
    ],
  },
  {
    group: "Billing",
    items: [
      { label: "Packages", path: "/verification-org/packages", icon: CreditCard },
      { label: "Usage", path: "/verification-org/usage", icon: BarChart3 },
    ],
  },
  {
    group: "Settings",
    items: [
      { label: "Organization Profile", path: "/verification-org/settings/profile", icon: Building2 },
      { label: "Team Access", path: "/verification-org/settings/team", icon: Users },
      { label: "Security", path: "/verification-org/settings/security", icon: Settings },
    ],
  },
];

export default verificationOrgNav;
