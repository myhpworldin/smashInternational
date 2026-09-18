import Link from "next/link";
import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { listConversationsForClient } from "@/server/services/messages.service";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import { formatDateTime } from "@/lib/format/date";

export default async function MessagesPage() {
  const { doc } = await resolveOnboardingIdentity();
  const conversations = await listConversationsForClient(doc.clientId);

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="Communication" title="Messages" />

      {conversations.length === 0 ? (
        <div className="flex flex-col items-start gap-1 border border-carbon px-4 py-6">
          <p className="font-body text-sm text-bone">No conversations yet.</p>
          <p className="font-body text-sm text-ash">Start a conversation with the SMASH team.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/dashboard/messages/${c.id}`}
                className="flex items-center justify-between gap-3 border border-carbon p-4 transition-colors duration-150 hover:border-white/30 focus-visible:-outline-offset-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-body text-sm text-bone">{c.subject}</span>
                  {c.serviceLabel && <span className="font-body text-xs text-ash">{c.serviceLabel}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {c.unreadCount > 0 && (
                    <span className="rounded-full bg-smash-text px-1.5 py-0.5 font-body text-[10px] text-void">
                      {c.unreadCount}
                    </span>
                  )}
                  <span className="font-body text-xs text-ash">{formatDateTime(c.lastMessageAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
