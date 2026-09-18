"use client";

import { useState } from "react";
import type { NotificationRow } from "@/shared/types/notification";
import { formatDateTime } from "@/lib/format/date";

// Server-rendered initial data (the staff page fetches it the same way it
// already fetches assignments — Phase 4 §14 asks to reuse the existing
// refresh/query strategy, not add realtime infra); this component only
// owns the one interactive bit, marking a notification read.
export default function StaffNotifications({ initialNotifications }: { initialNotifications: NotificationRow[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch(`/api/staff/notifications/${id}/read`, { method: "PATCH" }).catch(() => {
      // Best-effort — a failed mark-read isn't worth surfacing an error
      // for; the notification is still visible either way.
    });
  };

  if (notifications.length === 0) {
    return <p className="font-body text-sm text-ash">No notifications yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {notifications.map((n) => (
        <li
          key={n.id}
          className={`flex flex-col gap-1 border p-4 ${
            n.read ? "border-white/15 bg-carbon" : "border-smash bg-smash-dim"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-body text-sm text-bone">{n.title}</span>
            {!n.read && (
              <button
                type="button"
                onClick={() => handleMarkRead(n.id)}
                className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
              >
                Mark read
              </button>
            )}
          </div>
          <span className="font-body text-xs text-ash">{n.message}</span>
          <span className="font-body text-xs text-ash">{formatDateTime(new Date(n.createdAt))}</span>
        </li>
      ))}
    </ul>
  );
}
