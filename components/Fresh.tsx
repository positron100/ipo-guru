"use client";
import { useSyncExternalStore } from "react";
import { dateTimeIST } from "@/lib/format";

// One shared 30 s ticker for every <Fresh> on the page.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  timer ??= setInterval(() => listeners.forEach((l) => l()), 30_000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) { clearInterval(timer); timer = undefined; }
  };
};

export function ago(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : dateTimeIST(iso);
}

/**
 * "● Updated 4 min ago". The server renders the absolute IST time (a static page cannot know "now"); the browser swaps in
 * the relative form and keeps it current. Stale data (> 6 h) loses the live pulse so freshness is honest, not decorative.
 */
export function Fresh({ iso, label = "Updated", className = "" }: { iso: string; label?: string; className?: string }) {
  const text = useSyncExternalStore(subscribe, () => ago(iso), () => dateTimeIST(iso));
  const old = useSyncExternalStore(subscribe, () => Date.now() - Date.parse(iso) > 6 * 3_600_000, () => false);
  return (
    <span className={`t-small inline-flex items-center gap-2 text-muted ${className}`} title={dateTimeIST(iso)}>
      <span className={`live-dot ${old ? "text-faint" : "text-gain"}`} aria-hidden />
      {label} <time dateTime={iso} suppressHydrationWarning>{text}</time>
    </span>
  );
}
