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
    // Storage can be unavailable (private browsing, quota) — read/unread
    // is a pure UX convenience here, never a source of truth, so this
    // fails silently rather than blocking the UI.
  }
}

// Stage 1 Phase 15 §6/§8 — "read" is tracked in sessionStorage only
// (per-browser-tab-session, cleared on close, never synced anywhere) —
// there is no backend yet to persist it, and this never claims otherwise.
// The notifications themselves are real (server-derived), only the
// read/unread flag is this ephemeral.
export default function NotificationsListClient({ notifications }: { notifications: ClientNotification[] }) {
  // Lazy initializer (not an effect): runs once on this component's
  // first render, and readReadIds() itself falls back to an empty set
  // when window isn't available (SSR) — so this is correct on both the
  // server-rendered pass and the real client render, with no extra
  // render triggered by an effect calling setState.
  const [readIds, setReadIds] = useState<Set<string>>(() => readReadIds());

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      writeReadIds(next);
      return next;
    });
  };

  const markAllRead = () => {
    const next = new Set(notifications.map((n) => n.id));
    setReadIds(next);
    writeReadIds(next);
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
