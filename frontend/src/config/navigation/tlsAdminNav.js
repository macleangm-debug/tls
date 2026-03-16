// frontend/src/config/navigation/tlsAdminNav.js
import {
  Home,
  Users,
  Upload,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  CalendarDays,
  ClipboardCheck,
  ShoppingBag,
  BarChart3,
  Bell,
  FileWarning,
  Ban,
} from "lucide-react";

export const tlsAdminNav = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/admin", icon: Home },
      { label: "Notifications", path: "/admin/notifications", icon: Bell },
    ],
  },
  {
    group: "Member Operations",
    items: [
      { label: "Advocates", path: "/admin/advocates", icon: Users },
      { label: "Bulk Import", path: "/admin/import", icon: Upload },
      { label: "Member Compliance", path: "/admin/compliance", icon: ClipboardCheck },
    ],
  },
  {
    group: "Certification Oversight",
    items: [
      { label: "Stamp Monitoring", path: "/admin/stamps", icon: Stamp },
      { label: "Verification Oversight", path: "/admin/verification", icon: ShieldCheck },
      { label: "Fraud Alerts", path: "/admin/fraud", icon: ShieldAlert },
      { label: "Revocations", path: "/admin/revocations", icon: Ban },
    ],
  },
  {
    group: "Association Operations",
    items: [
      { label: "TLS Events", path: "/admin/tls-events", icon: CalendarDays },
      { label: "Attendance", path: "/admin/attendance", icon: ClipboardCheck },
      { label: "Orders", path: "/admin/orders", icon: ShoppingBag },
    ],
  },
  {
    group: "Reports",
    items: [
      { label: "Member Reports", path: "/admin/reports/members", icon: BarChart3 },
      { label: "Certification Reports", path: "/admin/reports/certification", icon: BarChart3 },
      { label: "Revenue Reports", path: "/admin/reports/revenue", icon: BarChart3 },
    ],
  },
];

export default tlsAdminNav;
