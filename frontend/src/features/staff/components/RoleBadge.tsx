import type { UserRole } from "@/api/types";
import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: UserRole;
}

function roleClass(role: UserRole) {
  if (role === "OWNER") return "bg-purple-100 text-purple-800";
  if (role === "MANAGER") return "bg-blue-100 text-blue-800";
  return "bg-slate-100 text-slate-700";
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return <Badge className={roleClass(role)}>{role}</Badge>;
}
