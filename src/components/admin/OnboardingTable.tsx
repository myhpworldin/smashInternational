import Link from "next/link";
import type { OnboardingDoc } from "@/server/repositories/onboarding.repo";
import { ONBOARDING_ADMIN_LABEL } from "@/shared/types/onboarding";
import { completionPercent } from "@/shared/onboarding/completeness";
import { getServiceById } from "@/shared/config/services";
import { formatINR } from "@/lib/format/currency";
import { formatDateTime } from "@/lib/format/date";

function companyName(doc: OnboardingDoc): string {
  const company = doc.company as { name?: string } | null;
  return company?.name ?? "(no company name yet)";
}

function servicesLabel(doc: OnboardingDoc): string {
  if (doc.selectedServiceIds.length === 0) return "None";
  const labels = doc.selectedServiceIds.map((id) => getServiceById(id)?.label ?? id);
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
}

function budgetLabel(doc: OnboardingDoc): string {
  const budget = doc.budget as { monthlyTotal?: number } | null;
  return budget?.monthlyTotal !== undefined ? formatINR(budget.monthlyTotal) : "—";
}

// Two renderings of the same rows — a table for desktop, stacked cards for
// mobile — rather than one table forced to scroll horizontally on a phone.
export default function OnboardingTable({ records }: { records: OnboardingDoc[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-carbon text-left text-xs tracking-[0.1em] text-ash uppercase">
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Submitted</th>
              <th className="py-2 pr-4">Services</th>
              <th className="py-2 pr-4">Monthly budget</th>
              <th className="py-2 pr-4">Complete</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {records.map((doc) => (
              <tr key={doc._id.toHexString()} className="border-b border-carbon/60 text-bone">
                <td className="py-3 pr-4">{companyName(doc)}</td>
                <td className="py-3 pr-4 text-ash">{ONBOARDING_ADMIN_LABEL[doc.status]}</td>
                <td className="py-3 pr-4 text-ash">
                  {doc.submittedAt ? formatDateTime(doc.submittedAt) : "—"}
                </td>
                <td className="py-3 pr-4 text-ash">{servicesLabel(doc)}</td>
                <td className="py-3 pr-4 text-ash">{budgetLabel(doc)}</td>
                <td className="py-3 pr-4 text-ash">{completionPercent(doc)}%</td>
                <td className="py-3">
                  <Link
                    href={`/admin/onboarding/${doc._id.toHexString()}`}
                    className="text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {records.map((doc) => (
          <li key={doc._id.toHexString()} className="flex flex-col gap-2 border border-carbon p-4">
            <div className="flex items-center justify-between">
              <span className="font-body text-sm text-bone">{companyName(doc)}</span>
              <span className="font-body text-xs text-ash">{ONBOARDING_ADMIN_LABEL[doc.status]}</span>
            </div>
            <p className="font-body text-xs text-ash">{servicesLabel(doc)}</p>
            <div className="flex items-center justify-between font-body text-xs text-ash">
              <span>{doc.submittedAt ? formatDateTime(doc.submittedAt) : "Not submitted"}</span>
              <span>{completionPercent(doc)}% complete</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body text-xs text-ash">{budgetLabel(doc)}</span>
              <Link
                href={`/admin/onboarding/${doc._id.toHexString()}`}
                className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
              >
                View
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
