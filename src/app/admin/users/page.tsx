import { requireRole } from "@/server/auth/dal";
import { listUsersForAdmin } from "@/server/services/adminUsers.service";
import UserManagementView from "@/components/admin/users/UserManagementView";
import UserManagementTabs from "@/components/admin/users/UserManagementTabs";

export default async function AdminUsersPage() {
  const session = await requireRole("admin");
  const users = await listUsersForAdmin();

  return (
    <main className="flex flex-col gap-6 px-6 py-10 md:px-10">
      <h1 className="font-display text-xl text-bone">User Management</h1>
      <UserManagementTabs active="users" />
      <UserManagementView initialUsers={users} currentUserId={session.userId} />
    </main>
  );
}
