"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Prefetch policy (all guarded, none of it blocks the initial load):
 *  1. Idle: once the page is interactive and the browser is idle, prefetch the three main routes.
 *  2. Hover / focus / touch on a link: prefetch its route; for IPO detail pages also *warm* it (see below) after a short dwell.
 *  3. Idle warm of the few IPOs the page itself is about (open ones), passed in by the server component.
 *
 * "Warm" = a low-priority GET of the detail page. A detail page can need several polite upstream requests the first
 * time it renders (IPO Watch provider: ~25 s cold); rendering it ahead of the click makes the click instant.
 * Warming is capped per session so hovering a long table can never queue dozens of renders.
 */
const MAIN_ROUTES = ["/", "/ipo-gmp-today", "/upcoming-ipos"];
const MAX_WARMS = 8;      // per page session
const MAX_INFLIGHT = 2;   // concurrent warm requests
const DWELL_MS = 200;     // pointer must rest on a link this long before it counts as intent

const warmed = new Set<string>();
let inflight = 0;

const saveData = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
const idle = (cb: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 1500));

function warm(href: string) {
  if (warmed.has(href) || warmed.size >= MAX_WARMS || inflight >= MAX_INFLIGHT || saveData()) return;
  warmed.add(href);
  inflight++;
  fetch(href, { priority: "low", headers: { purpose: "prefetch" } } as RequestInit)
    .catch(() => undefined)
    .finally(() => { inflight--; });
}

/** Prefetch the main routes during idle time, after the page is interactive. */
export function RoutePrefetcher() {
  const router = useRouter();
  useEffect(() => {
    if (saveData()) return;
    const h = idle(() => MAIN_ROUTES.forEach((r) => router.prefetch(r)));
    return () => ("cancelIdleCallback" in window && typeof h === "number" ? cancelIdleCallback(h) : clearTimeout(h as ReturnType<typeof setTimeout>));
  }, [router]);
  return null;
}

/** Idle-time warm of specific detail pages (e.g. the open IPOs on this page). Sequential, spaced out, capped. */
export function WarmIdle({ hrefs }: { hrefs: string[] }) {
  const key = hrefs.join("|");
  useEffect(() => {
    if (saveData()) return;
    const list = key ? key.split("|") : [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    const h = idle(() => list.slice(0, 4).forEach((href, k) => timers.push(setTimeout(() => warm(href), k * 2500))));
    return () => { timers.forEach(clearTimeout); if ("cancelIdleCallback" in window && typeof h === "number") cancelIdleCallback(h); };
  }, [key]);
  return null;
}

/** next/link that prefetches on intent. `warm` additionally renders the (slow, dynamic) target ahead of the click. */
export function WarmLink({ href, warm: doWarm = false, onPointerEnter, onPointerLeave, onFocus, onTouchStart, ...rest }: React.ComponentProps<typeof Link> & { warm?: boolean }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const to = typeof href === "string" ? href : href.pathname ?? "";
  const intent = (immediate: boolean) => {
    router.prefetch(to);
    if (!doWarm) return;
    clearTimeout(timer.current);
    if (immediate) warm(to);
    else timer.current = setTimeout(() => warm(to), DWELL_MS);
  };
  return (
    <Link
      href={href}
      {...rest}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") intent(false); onPointerEnter?.(e); }}
      onPointerLeave={(e) => { clearTimeout(timer.current); onPointerLeave?.(e); }}
      onFocus={(e) => { intent(false); onFocus?.(e); }}
      onTouchStart={(e) => { intent(true); onTouchStart?.(e); }}
    />
  );
}
