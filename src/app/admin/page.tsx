import { requireRole } from "@/server/auth/dal";

export default async function AdminDashboardPage() {
  await requireRole("admin");

  return (
    <main className="px-6 py-10 md:px-10">
      <h1 className="font-display text-xl text-bone">Admin</h1>
      <p className="mt-2 font-body text-sm text-ash">
        Client onboarding tools will live here.
      </p>
    </main>
  );
}
