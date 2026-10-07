"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { duration, ease } from "@/components/motion/tokens";

/**
 * Phone-only modal sheet that slides up from the bottom. Transform/opacity only (no layout animation), page scroll is locked while
 * open, Escape / backdrop / the close button dismiss it, focus moves in and returns to whatever opened it, and the bottom padding
 * clears the home indicator.
 */
export function BottomSheet({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const html = document.documentElement, prev = html.style.overflow;
    html.style.overflow = "hidden";
    closeBtn.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => { html.style.overflow = prev; window.removeEventListener("keydown", key); opener.current?.focus({ preventScroll: true }); };
  }, [open, onClose]);

  // Portalled to <body>: an ancestor with a transform/translate animation would otherwise trap `fixed` and the z-index.
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] sm:hidden">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: duration.transition, ease: ease.out }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl border border-b-0 border-line-strong bg-bg shadow-[var(--shadow-lg)]"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ duration: duration.transition, ease: ease.out }}
          >
            <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
              <h2 className="t-h3 text-lg">{title}</h2>
              <button ref={closeBtn} type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`} className="grid size-11 shrink-0 place-items-center rounded-full text-muted active:bg-line">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
            {footer && <div className="border-t border-line px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** One selectable row/chip inside a sheet: >=44px tall, clear selected state. */
export function Choice({ on, onClick, children, className = "" }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button" role="radio" aria-checked={on} onClick={onClick}
      className={`flex min-h-11 items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-left text-[0.9375rem] font-medium transition-colors duration-150 ${on ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-fg"} ${className}`}
    >
      {children}
      {on && <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0"><path d="m5 12 5 5 9-9" /></svg>}
    </button>
  );
}
