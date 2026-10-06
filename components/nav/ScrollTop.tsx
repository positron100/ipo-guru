"use client";
import { useLayoutEffect } from "react";

// Back/forward restores the old scroll position; a link click (or anything else) starts a fresh page at the top.
let popped = false;
if (typeof window !== "undefined") {
  addEventListener("popstate", () => { popped = true; });
  addEventListener("click", () => { popped = false; }, true);
}

/**
 * Rendered by each loading.tsx. A cold route shows its skeleton at once, but the browser has only clamped the old scroll position to
 * the skeleton's shorter height, so the user would watch the middle of a skeleton until the content arrives. Start at the top instead.
 */
export function ScrollTop() {
  useLayoutEffect(() => { if (!popped) scrollTo({ top: 0, behavior: "instant" }); }, []);
  return null;
}
