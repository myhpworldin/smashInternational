import { requireRole } from "@/server/auth/dal";
import DashboardRail from "@/components/layout/DashboardRail";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");

  return (
    <div className="min-h-dvh">
      <DashboardRail label="Admin" />
      {children}
    </div>
  );
}
