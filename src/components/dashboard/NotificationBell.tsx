"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, X } from "lucide-react";
import { useNotificationActions, useNotifications } from "@/hooks/use-notifications";
import type { ApiNotification } from "@/lib/api";

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isExternal(url: string) {
  return /^https:\/\//i.test(url);
}

function NotificationItem({ item, onOpen, onDismiss }: { item: ApiNotification; onOpen: () => void; onDismiss: () => void }) {
  const unread = !item.readAt;
  const body = (
    <>
      <div className="flex items-start gap-2">
        {unread && <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" aria-label="Unread" />}
        <div className="min-w-0 flex-1">
          <p className={`text-sm leading-snug ${unread ? "font-semibold text-neutral-950" : "font-medium text-neutral-700"}`}>{item.title}</p>
          <p className="mt-0.5 text-xs text-neutral-500 leading-relaxed whitespace-pre-line line-clamp-4">{item.body}</p>
          <p className="mt-1 text-[11px] text-neutral-400">{timeAgo(item.createdAt)}</p>
        </div>
      </div>
    </>
  );
  return (
    <li className="group relative rounded-md hover:bg-neutral-50">
      {item.actionUrl ? (
        isExternal(item.actionUrl) ? (
          <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" onClick={onOpen} className="block px-3 py-2.5 pr-8">
            {body}
          </a>
        ) : (
          <Link href={item.actionUrl} onClick={onOpen} className="block px-3 py-2.5 pr-8">
            {body}
          </Link>
        )
      ) : (
        <button type="button" onClick={onOpen} className="block w-full text-left px-3 py-2.5 pr-8 cursor-pointer">
          {body}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        title="Dismiss"
        aria-label={`Dismiss "${item.title}"`}
        className="absolute top-2 right-2 p-1 rounded text-neutral-300 hover:text-neutral-700 hover:bg-neutral-100 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

/** The dashboard's in-app notification inbox (messages from the FitCV team). */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useNotifications();
  const { markRead, markAllRead, dismiss } = useNotificationActions();
  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        title="Notifications"
        className="relative p-2 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:text-neutral-950 hover:border-neutral-400 transition-colors cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-300 bg-white shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200">
            <span className="text-sm font-semibold text-neutral-950">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-accent-strong hover:text-accent cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {isLoading ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-500">Loading…</p>
            ) : isError ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-500">Couldn&apos;t load notifications.</p>
            ) : !data?.items.length ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-500">You&apos;re all caught up.</p>
            ) : (
              <ul className="space-y-0.5">
                {data.items.map((item) => (
                  <NotificationItem
                    key={item.id}
                    item={item}
                    onOpen={() => {
                      if (!item.readAt) markRead.mutate(item.id);
                      if (item.actionUrl) setOpen(false);
                    }}
                    onDismiss={() => dismiss.mutate(item.id)}
                  />
                ))}
              </ul>
            )}
          </div>
          <div className="px-3 py-2 border-t border-neutral-200 text-right">
            <Link href="/dashboard/settings#notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-900">
              Notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
