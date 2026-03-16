// frontend/src/config/navigation/advocateNav.js
import {
  Home,
  Briefcase,
  Calendar,
  CheckSquare,
  Users,
  FolderOpen,
  FileText,
  Receipt,
  LayoutTemplate,
  Stamp,
  Layers,
  ShieldCheck,
  BadgeCheck,
  Package,
  ShoppingBag,
  CreditCard,
  User,
  Shield,
  HelpCircle,
  Bell,
} from "lucide-react";

export const advocateNav = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: Home },
      { label: "Notifications", path: "/notifications", icon: Bell },
    ],
  },
  {
    group: "Practice",
    items: [
      {
        label: "Practice Management",
        path: "/practice-management",
        icon: Briefcase,
        gate: "practice_management",
        badge: "Pro",
      },
      { label: "Calendar", path: "/calendar", icon: Calendar, gate: "practice_management" },
      { label: "Tasks", path: "/tasks", icon: CheckSquare, gate: "practice_management" },
      { label: "Clients", path: "/clients", icon: Users, gate: "practice_management" },
      { label: "Cases", path: "/cases", icon: FolderOpen, gate: "practice_management" },
      { label: "Documents", path: "/documents", icon: FileText, gate: "practice_management" },
      { label: "Invoices", path: "/invoices", icon: Receipt, gate: "practice_management" },
      { label: "Templates", path: "/templates", icon: LayoutTemplate, gate: "practice_management" },
    ],
  },
  {
    group: "Certification",
    items: [
      { label: "Stamp Document", path: "/stamp-document", icon: Stamp },
      { label: "Batch Stamp", path: "/batch-stamp", icon: Layers },
      { label: "Stamp Ledger", path: "/stamp-ledger", icon: FileText },
      { label: "Verify Stamp", path: "/stamp-verification", icon: ShieldCheck },
      { label: "My Stamps", path: "/my-stamps", icon: BadgeCheck },
    ],
  },
  {
    group: "Commerce",
    items: [
      { label: "Physical Stamps", path: "/physical-stamps", icon: Package },
      { label: "Order History", path: "/orders", icon: ShoppingBag },
      { label: "Payments", path: "/payments", icon: CreditCard },
      { label: "Membership", path: "/membership", icon: CreditCard },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Profile", path: "/profile", icon: User },
      { label: "Security / PIN", path: "/pin-settings", icon: Shield },
      { label: "Help Center", path: "/help", icon: HelpCircle },
    ],
  },
];

export default advocateNav;
