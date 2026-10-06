"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Hairline lavender progress bar at the top of the viewport while a route is loading. It never delays or controls navigation:
 * it only listens (capture phase) for plain clicks on same-origin links to a different path, starts the bar at once, and
 * finishes when `usePathname()` reaches the destination. A safety timeout clears it if the navigation never arrives
 * (cancelled, error). Pure CSS animation, so it costs nothing while idle.
 */
export function RouteProgress() {
  const path = usePathname();
  const [nav, setNav] = useState<{ id: number; to: string } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.pathname === location.pathname) return;
      setNav((n) => ({ id: (n?.id ?? 0) + 1, to: u.pathname }));
      clearTimeout(timer);
      timer = setTimeout(() => setNav(null), 15_000);
    };
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); clearTimeout(timer); };
  }, []);

  if (!nav) return null;
  const busy = nav.to !== path;
  return <div key={nav.id} className="route-progress" data-state={busy ? "run" : "done"} aria-hidden />;
}
