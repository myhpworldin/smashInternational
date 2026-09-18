import Link from "next/link";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { listEngagementsForClient } from "@/server/services/serviceEngagements.service";
import { listSupportTicketsForClient } from "@/server/services/supportTickets.service";
import { SUPPORT_TICKET_STATUS_LABEL } from "@/shared/types/supportTicket";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import EmptyState from "@/components/client/EmptyState";
import SupportTicketForm from "@/components/client/SupportTicketForm";
import { formatDateTime } from "@/lib/format/date";

export default async function SupportPage() {
  const { doc } = await resolveOnboardingIdentity();
  const [tickets, engagements] = await Promise.all([
    listSupportTicketsForClient(doc.clientId),
    listEngagementsForClient(doc.clientId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Communication" title="Support" />

      <ClientSection title="Your Tickets">
        {tickets.length === 0 ? (
          <EmptyState message="No support tickets." />
        ) : (
          <ul className="flex flex-col gap-2">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/dashboard/support/${t.id}`}
                  className="flex items-center justify-between gap-3 border border-carbon p-4 transition-colors duration-150 hover:border-white/30 focus-visible:-outline-offset-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-body text-sm text-bone">{t.subject}</span>
                    <span className="font-body text-xs text-ash">Updated {formatDateTime(t.updatedAt)}</span>
                  </div>
                  <ClientStatusBadge label={SUPPORT_TICKET_STATUS_LABEL[t.status]} tone="neutral" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </ClientSection>

      <ClientSection title="Create a Ticket">
        <SupportTicketForm serviceOptions={engagements.map((e) => e.serviceLabel)} />
      </ClientSection>
    </div>
  );
}
