// frontend/src/utils/featureGates.js

/**
 * Check if user has access to Practice Management module
 * This checks multiple possible sources of entitlement:
 * - Direct subscription
 * - Organization membership
 * - TLS included access
 * - IDC override
 */
export function hasPracticeManagementAccess(user) {
  if (!user) return false;

  // Check direct individual subscription
  if (user.practice_management_active === true) return true;
  if (user.practice_management_plan_status === "active") return true;
  
  // Check if TLS includes PM for this user
  if (user.practice_management_included === true) return true;
  
  // Check if user has active membership that includes PM
  if (user.membership_tier === "premium" || user.membership_tier === "professional") return true;
  
  // Check organization access
  if (user.organizations?.some(org => org.practice_management_enabled)) return true;

  // Default: no access (will redirect to plans page)
  return false;
}

/**
 * Check if user has access to verification features
 */
export function hasVerificationAccess(user) {
  if (!user) return false;
  
  // All advocates can verify stamps
  if (user.role === "advocate") return true;
  if (user.role === "admin") return true;
  if (user.role === "superadmin") return true;
  
  // Institutional users with active verification package
  if (user.role === "institution" && user.verification_package_active) return true;
  
  return false;
}

/**
 * Check if user can access specific practice module tab
 */
export function canAccessPracticeTab(user, tabName) {
  if (!hasPracticeManagementAccess(user)) return false;
  
  // All tabs available if PM access is granted
  // Future: can add per-tab gating here
  const allTabs = ["calendar", "tasks", "clients", "cases", "documents", "invoices", "templates"];
  return allTabs.includes(tabName);
}

/**
 * Get the practice management plan tier for display
 */
export function getPracticeManagementTier(user) {
  if (!user) return null;
  
  if (user.practice_management_plan_status === "active") {
    return user.practice_management_tier || "standard";
  }
  
  if (user.practice_management_included) {
    return "tls-included";
  }
  
  if (user.organizations?.some(org => org.practice_management_enabled)) {
    return "organization";
  }
  
  return null;
}
