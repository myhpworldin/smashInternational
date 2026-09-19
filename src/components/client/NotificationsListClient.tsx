"use client";

import { useState } from "react";
import Link from "next/link";
import type { ClientNotification } from "@/shared/types/clientNotification";
import { formatDateTime } from "@/lib/format/date";

const READ_STORAGE_KEY = "smash_read_notification_ids";

function readReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(READ_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeReadIds(ids: Set<string>) {
  try {
    window.sessionStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage can be unavailable (private browsing, quota) — this is only
    // ever a same-tab fallback for the notification types below that have
    // no persisted read-state at all, never the source of truth for the
    // real ones, so it fails silently rather than blocking the UI.
  }
}

// Stage 1 Phase 15 §6/§8, real persistence added Phase 23 — a
// notification's `isRead` is now real server state for every type Phase
// 22 persists (approval/deliverable/report/document/support-ticket
// events); the sessionStorage set is kept only as an additive, same-tab
// convenience for the two older event types that are still derived live
// from statusHistory on every load and have no read-state to persist
// against (onboarding/service-engagement transitions — see
// clientNotifications.service.ts). Marking read fires a real request to
// persist it; the local set updates immediately regardless of whether
// that request has resolved yet, so the UI never waits on the network to
// feel responsive.
export default function NotificationsListClient({ notifications }: { notifications: ClientNotification[] }) {
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const persisted = notifications.filter((n) => n.isRead).map((n) => n.id);
    return new Set([...persisted, ...readReadIds()]);
  });

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      writeReadIds(next);
      return next;
    });
    fetch(`/api/client/notifications/${id}/read`, { method: "PATCH" }).catch(() => {
      // Best-effort persistence — the notification stays visually marked
      // read locally either way; a failed request just means it may show
      // as unread again next time this list is freshly loaded from the
      // server, not a broken UI right now.
    });
  };

  const markAllRead = () => {
    const next = new Set(notifications.map((n) => n.id));
    setReadIds(next);
    writeReadIds(next);
    fetch("/api/client/notifications/read-all", { method: "PATCH" }).catch(() => {});
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1 border border-carbon px-4 py-6">
        <p className="font-body text-sm text-bone">You&apos;re all caught up.</p>
        <p className="font-body text-sm text-ash">No new notifications.</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="flex flex-col gap-4">
      {unreadCount > 0 && (
        <button
          type="button"
          onClick={markAllRead}
          className="self-start font-body text-xs text-ash underline hover:text-bone"
        >
          Mark all as read
        </button>
      )}
      <ul className="flex flex-col gap-2">
        {notifications.map((n) => {
          const isRead = readIds.has(n.id);
          return (
            <li
              key={n.id}
              className={`flex items-center justify-between gap-3 border px-4 py-3 ${
                isRead ? "border-carbon" : "border-white/30 bg-carbon"
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-sm text-bone">
                  {!isRead && (
                    <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full bg-smash-text" />
                  )}
                  {n.title}
                </span>
                <span className="font-body text-xs text-ash">{formatDateTime(n.createdAt)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {!isRead && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="font-body text-xs text-ash underline hover:text-bone"
                  >
                    Mark read
                  </button>
                )}
                <Link
                  href={n.href}
                  onClick={() => markRead(n.id)}
                  className="font-body text-xs text-bone underline hover:text-ash"
                >
                  View
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
