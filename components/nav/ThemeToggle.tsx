"use client";
import { setThemeWithReveal } from "./themeReveal";
import { Magnetic } from "@/components/motion/Magnetic";

const SVG = { viewBox: "0 0 24 24", width: 17, height: 17, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

/**
 * The inline script in layout.tsx sets data-theme before paint. The icon is picked by CSS (`dark:` variant)
 * so it is already correct in the view-transition's "new" snapshot.
 */
export function ThemeToggle() {
  return (
    <Magnetic strength={5}>
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        void setThemeWithReveal(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      className="hit group grid size-10 place-items-center rounded-full text-muted transition-[color,background-color,transform] duration-200 hover:bg-line hover:text-fg active:scale-90"
    >
      <svg {...SVG} className="ico ico-spin dark:hidden"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      <svg {...SVG} className="ico ico-pop hidden dark:block"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
    </button>
    </Magnetic>
  );
}
