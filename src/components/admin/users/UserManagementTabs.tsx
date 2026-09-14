import Link from "next/link";

// The "User Management" section conceptually has two views — Users and
// Audit Log (Phase 7 spec: a dedicated section, not entries mixed into
// the primary user table). Same tab-row visual language as
// OnboardingListFilters' status tabs, so this reads as the same admin
// area rather than a bolted-on new one.
export default function UserManagementTabs({ active }: { active: "users" | "audit-log" }) {
  const tabs: { id: "users" | "audit-log"; label: string; href: string }[] = [
    { id: "users", label: "Users", href: "/admin/users" },
    { id: "audit-log", label: "Audit Log", href: "/admin/users/audit-log" },
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-carbon pb-4">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? "page" : undefined}
          className={`border px-3 py-2 font-body text-xs transition-colors duration-150 focus-visible:-outline-offset-2 ${
            active === tab.id
              ? "border-smash bg-smash-dim text-bone"
              : "border-white/15 bg-carbon text-bone hover:border-white/30"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
