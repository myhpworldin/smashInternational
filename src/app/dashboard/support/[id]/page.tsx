import { notFound } from "next/navigation";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getSupportTicketForClient } from "@/server/services/supportTickets.service";
import { SUPPORT_TICKET_STATUS_LABEL } from "@/shared/types/supportTicket";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import ClientStatusBadge from "@/components/client/ClientStatusBadge";
import EmptyState from "@/components/client/EmptyState";
import { FieldGrid, Field } from "@/components/client/FieldGrid";
import { formatDateTime } from "@/lib/format/date";

// Stage 1 Phase 15 §23 — same ownership pattern as every other client
// detail page this session.
export default async function SupportTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { doc } = await resolveOnboardingIdentity();
  const ticket = await getSupportTicketForClient(id, doc.clientId);
  if (!ticket) notFound();

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader
        eyebrow="Support"
        title={ticket.subject}
        action={<ClientStatusBadge label={SUPPORT_TICKET_STATUS_LABEL[ticket.status]} tone="neutral" />}
      />

      <ClientSection title="Details">
        <FieldGrid>
          {ticket.serviceLabel && <Field label="Service" value={ticket.serviceLabel} />}
          {ticket.priority && <Field label="Priority" value={ticket.priority} />}
          <Field label="Created" value={formatDateTime(ticket.createdAt)} />
          <Field label="Last updated" value={formatDateTime(ticket.updatedAt)} />
        </FieldGrid>
        <p className="mt-3 font-body text-sm text-bone">{ticket.description}</p>
      </ClientSection>

      <ClientSection title="Conversation">
        {ticket.messages.length === 0 ? (
          <EmptyState message="No replies yet." />
        ) : (
          <ul className="flex flex-col gap-3">
            {ticket.messages.map((m) => (
              <li key={m.id} className="flex flex-col gap-1 border border-carbon p-3">
                <span className="font-body text-xs text-ash">
                  {m.senderName} · {formatDateTime(m.createdAt)}
                </span>
                <p className="font-body text-sm text-bone">{m.text}</p>
              </li>
            ))}
          </ul>
        )}
      </ClientSection>
    </div>
  );
}
