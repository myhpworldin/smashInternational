import { notFound } from "next/navigation";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { getConversationForClient } from "@/server/services/messages.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import MessageComposer from "@/components/client/MessageComposer";
import EmptyState from "@/components/client/EmptyState";
import { formatDateTime } from "@/lib/format/date";

// Stage 1 Phase 15 §17 — same ownership pattern as every other client
// detail page this session: getConversationForClient returns null for a
// nonexistent id and one belonging to another client alike.
export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { doc } = await resolveOnboardingIdentity();
  const conversation = await getConversationForClient(id, doc.clientId);
  if (!conversation) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ClientPageHeader
        eyebrow={conversation.serviceLabel ?? "Communication"}
        title={conversation.subject}
      />

      {conversation.messages.length === 0 ? (
        <EmptyState message="No messages in this conversation yet." />
      ) : (
        <ul className="flex flex-col gap-3">
          {conversation.messages.map((m) => (
            <li
              key={m.id}
              className={`flex flex-col gap-1 border p-3 ${
                m.sender === "client" ? "self-end border-white/30 bg-carbon" : "self-start border-carbon"
              } max-w-[85%]`}
            >
              <span className="font-body text-xs text-ash">
                {m.senderName} · {formatDateTime(m.createdAt)}
              </span>
              <p className="font-body text-sm text-bone">{m.text}</p>
            </li>
          ))}
        </ul>
      )}

      <MessageComposer conversationId={conversation.id} />
    </div>
  );
}
