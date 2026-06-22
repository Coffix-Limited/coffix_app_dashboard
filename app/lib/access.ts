import { StaffRole } from "@/app/dashboard/staffs/interface/staff";

// Route prefixes that ONLY admins may access.
// A route not listed here is allowed for all authenticated staff.
export const ADMIN_ONLY_PREFIXES = [
  "/dashboard/categories",
  "/dashboard/modifierGroups",
  "/dashboard/users",
  "/dashboard/transactions",
  "/dashboard/staffs",
  "/dashboard/notifications",
  "/dashboard/globalSettings",
  "/dashboard/emailTemplates",
  "/dashboard/referrals",
  "/dashboard/coupons",
  "/dashboard/logs",
  "/dashboard/import",
];

export function canAccess(pathname: string, role: StaffRole | undefined): boolean {
  if (role === "admin") return true;
  // non-admin: deny if path matches or is nested under any admin-only prefix
  return !ADMIN_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}
