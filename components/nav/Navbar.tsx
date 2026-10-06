"use client";
import { WarmLink as Link } from "./Prefetch";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, type Variants } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { duration, ease, spring } from "@/components/motion/tokens";
import { Magnetic } from "@/components/motion/Magnetic";
import { LiquidIndicator } from "@/components/motion/Liquid";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/ipo-gmp-today", label: "GMP today" },
  { href: "/upcoming-ipos", label: "Upcoming" },
  { href: "/contact", label: "Contact" },
] as const;

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));

const panel: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...spring.snappy, staggerChildren: 0.04, delayChildren: 0.04 } },
  exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: duration.micro, ease: ease.exit } },
};
const item: Variants = { hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0 }, exit: { opacity: 0 } };

export function Navbar({ name }: { name: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const navBox = useRef<HTMLElement>(null);
  const menuBox = useRef<HTMLElement>(null);
  const [menuHover, setMenuHover] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-50 px-5 sm:top-4 sm:px-8 lg:px-12 2xl:px-16">
      <div
        data-scrolled={scrolled}
        className="glass nav-glass mx-auto flex max-w-4xl items-center justify-between rounded-full py-2 pl-4 pr-2 lg:py-2.5 lg:pl-5"
      >
        <Link href="/" className="hit group flex items-center gap-2.5 rounded-full py-1 pr-2 font-semibold tracking-tight" aria-label={`${name} home`}>
          <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-accent-fg shadow-[0_6px_16px_-6px_var(--accent)] transition-transform duration-300 group-hover:rotate-[-8deg] group-active:scale-90">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" />
            </svg>
          </span>
          <span className="text-[0.95rem]">{name}</span>
        </Link>

        <div className="flex items-center gap-1">
          <LayoutGroup id="nav">
            <nav ref={navBox} aria-label="Main" className="relative hidden items-center sm:flex" onPointerLeave={() => setHover(null)}>
              <LiquidIndicator containerRef={navBox} selector="[aria-current=page]" watch={path} className="liquid liquid-lav rounded-full" />
              {LINKS.map((l) => {
                const active = isActive(path, l.href);
                return (
                  <Magnetic key={l.href} strength={4}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(l.href); }}
                    onFocus={() => setHover(l.href)}
                    onBlur={() => setHover(null)}
                    className={`relative block rounded-full px-4 py-2 text-[0.9375rem] font-medium active:scale-[0.97] transition-colors duration-200 ${active ? "text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {hover === l.href && !active && (
                      <motion.span layoutId="nav-hover" className="absolute inset-0 -z-10 rounded-full bg-line" transition={spring.indicator} />
                    )}
                    {l.label}
                  </Link>
                  </Magnetic>
                );
              })}
            </nav>
          </LayoutGroup>
          <ThemeToggle />
          <button
            type="button"
            className="hit grid size-9 place-items-center rounded-full text-muted transition hover:bg-line hover:text-fg active:scale-90 sm:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            ref={menuBox}
            id="mobile-menu"
            aria-label="Mobile"
            onPointerLeave={() => setMenuHover(null)}
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ transformOrigin: "top right" }}
            className="glass glass-panel mx-auto mt-2 max-w-4xl bg-[var(--surface-strong)] p-2 sm:hidden"
          >
            {/* One highlight for the whole menu: it glides to whichever item the pointer is on. */}
            <LiquidIndicator containerRef={menuBox} selector="[data-menu-hover]" watch={menuHover} visible={menuHover !== null} axis="y" inset={8} className="liquid-hover rounded-xl" />
            {LINKS.map((l) => (
              <motion.div key={l.href} variants={item} className="relative z-10" data-menu-hover={menuHover === l.href ? "" : undefined}>
                <Link
                  href={l.href}
                  aria-current={isActive(path, l.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  onPointerEnter={(e) => { if (e.pointerType === "mouse") setMenuHover(l.href); }}
                  onFocus={() => setMenuHover(l.href)}
                  className={`block rounded-xl px-4 py-3 text-[0.95rem] font-medium transition-colors active:scale-[0.98] ${isActive(path, l.href) ? "bg-accent-soft text-accent" : "text-muted hover:text-fg"}`}
                >
                  {l.label}
                </Link>
              </motion.div>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
