import { getServiceById } from "@/shared/config/services";
import { formatDateTime } from "@/lib/format/date";
import type { OnboardingStatus } from "@/shared/types/onboarding";
import StatusIcon from "@/components/onboarding/StatusIcon";

type OnboardingStatusScreenProps = {
  status: OnboardingStatus;
  submittedAt: string | null;
  selectedServiceIds: string[];
  companyName: string | null;
  reviewNotes: string | null;
};

const STATUS_COPY: Record<string, { heading: string; message: string; next: string }> = {
  submitted: {
    heading: "Under Review",
    message: "Your information has been submitted to the SMASH team.",
    next: "Our team is reviewing what you've shared and will reach out if anything else is needed.",
  },
  under_review: {
    heading: "Under Review",
    message: "Your information has been submitted to the SMASH team.",
    next: "Our team is actively reviewing your details and will reach out if anything else is needed.",
  },
  approved: {
    heading: "Approved",
    message: "Your onboarding has been approved by the SMASH team.",
    next: "We'll be in touch shortly to kick things off.",
  },
};

// Rendered instead of the editable wizard once a submission exists —
// editing is intentionally not possible from here (see page.tsx's branch),
// so there is no path back into the form short of an admin requesting
// changes, which flips status back to "changes_requested".
export default function OnboardingStatusScreen({
  status,
  submittedAt,
  selectedServiceIds,
  companyName,
  reviewNotes,
}: OnboardingStatusScreenProps) {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.submitted;
  const services = selectedServiceIds.map((id) => getServiceById(id)).filter((s) => s !== undefined);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center md:px-0">
      <StatusIcon />
      <div className="flex flex-col gap-2">
        <p className="font-body text-xs tracking-[0.14em] text-smash-text uppercase">{copy.heading}</p>
        <h1 className="font-display text-2xl text-bone">{copy.message}</h1>
        <p className="font-body text-sm text-ash">{copy.next}</p>
      </div>

      {submittedAt && (
        <p className="font-body text-xs text-ash">Submitted {formatDateTime(submittedAt)}</p>
      )}

      {status === "approved" && reviewNotes && (
        <p className="font-body text-sm text-bone">{reviewNotes}</p>
      )}

      <div className="mt-4 flex w-full flex-col gap-3 border border-carbon p-5 text-left">
        <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">Summary</p>
        {companyName && <p className="font-body text-sm text-bone">{companyName}</p>}
        <ul className="flex flex-col gap-0.5 font-body text-xs text-ash">
          {services.map((s) => (
            <li key={s!.id}>{s!.label}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
