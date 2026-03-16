// frontend/src/config/navigation/idcNav.js
import {
  Home,
  CreditCard,
  Wallet,
  Banknote,
  Settings,
  SlidersHorizontal,
  Users,
  ShoppingBag,
  Shield,
  LifeBuoy,
  BarChart3,
  Presentation,
  FileText,
  Building2,
  Activity,
  TrendingUp,
} from "lucide-react";

export const idcNav = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", path: "/super-admin", icon: Home },
    ],
  },
  {
    group: "Commercial",
    items: [
      { label: "Membership Billing", path: "/super-admin/billing", icon: CreditCard },
      { label: "Practice Mgmt Pricing", path: "/super-admin/pricing/practice", icon: Wallet },
      { label: "Verification Pricing", path: "/super-admin/pricing/verification", icon: Wallet },
      { label: "Revenue Sharing", path: "/super-admin/revenue-sharing", icon: Banknote },
      { label: "Payment Gateways", path: "/super-admin/gateways", icon: CreditCard },
    ],
  },
  {
    group: "Platform",
    items: [
      { label: "System Settings", path: "/super-admin/settings", icon: Settings },
      { label: "Profession / Tenants", path: "/super-admin/tenants", icon: Building2 },
      { label: "Feature Toggles", path: "/super-admin/features", icon: SlidersHorizontal },
      { label: "Manage Admins", path: "/super-admin/admins", icon: Users },
    ],
  },
  {
    group: "Operations",
    items: [
      { label: "Physical Orders", path: "/idc/orders", icon: ShoppingBag },
      { label: "Audit Logs", path: "/super-admin/audit", icon: Shield },
      { label: "Support", path: "/super-admin/support", icon: LifeBuoy },
    ],
  },
  {
    group: "Analytics",
    items: [
      { label: "Revenue Analytics", path: "/super-admin/analytics/revenue", icon: TrendingUp },
      { label: "Usage Analytics", path: "/super-admin/analytics/usage", icon: Activity },
      { label: "Adoption", path: "/super-admin/analytics/adoption", icon: BarChart3 },
    ],
  },
  {
    group: "Sales",
    items: [
      { label: "Product Presentation", path: "/super-admin/presentation", icon: Presentation },
      { label: "Printable Version", path: "/super-admin/presentation-print", icon: FileText },
    ],
  },
];

export default idcNav;
