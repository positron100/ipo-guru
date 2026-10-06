"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { duration, ease } from "@/components/motion/tokens";

/** `words`: a rotating slot. `text` must equal `words[0]` (what is typed first and what crawlers see). */
export interface Part { text: string; className?: string; words?: string[] }
type Phase = "idle" | "type" | "erase";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = matchMedia(REDUCED);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/**
 * Pachinko reel. The word leaves by rolling forward and down (rotateX to -80deg, accelerating), the next one rolls in from
 * above (rotateX 80deg -> 0) on an under-damped spring, so it overshoots a few degrees and settles. Perspective is set per
 * element so the roll reads as a small drum, not a cube. Transform + opacity only. Reduced motion: opacity + 6px slide.
 */
const R = 80;                 // degrees the word starts/ends at while out of view
const SHIFT = "0.32em";
const reel: Variants = {
  enter: { rotateX: R, y: `-${SHIFT}`, opacity: 0 },
  show: {
    rotateX: 0, y: 0, opacity: 1,
    transition: {
      rotateX: { type: "spring", stiffness: 300, damping: 21, mass: 0.8, delay: 0.1 },
      y: { type: "spring", stiffness: 300, damping: 21, mass: 0.8, delay: 0.1 },
      opacity: { duration: duration.micro, delay: 0.1 },
    },
  },
  leave: { rotateX: -R, y: SHIFT, opacity: 0, transition: { duration: duration.interactive, ease: ease.exit } },
};
const calm: Variants = {
  enter: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: duration.interactive, delay: 0.1 } },
  leave: { opacity: 0, y: -6, transition: { duration: duration.interactive } },
};

/**
 * Inline slot that reserves the width of its widest word (so the heading never reflows), shows the typed text while the
 * intro types, then rolls through `words`. The width sizers are CSS pseudo-content, so only the real word is text in the DOM.
 */
function ReelSlot({ words, className = "", typed, rest, caret, rolling, reduced, every = 3400, firstAfter = 2800 }: {
  words: string[]; className?: string; typed: string; rest: string; caret: React.ReactNode; rolling: boolean; reduced: boolean; every?: number; firstAfter?: number;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!rolling) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const next = () => setI((v) => (v + 1) % words.length);
    const t = setTimeout(() => { next(); id = setInterval(next, every); }, firstAfter);
    return () => { clearTimeout(t); clearInterval(id); };
  }, [rolling, words.length, every, firstAfter]);

  // Padding gives gradient-clipped text room for descenders (p, g) and the overshoot of the roll; the negative margin cancels it so layout is unchanged.
  const layer = `col-start-1 row-start-1 -mb-[0.2em] -mt-[0.1em] whitespace-nowrap px-[0.06em] pb-[0.2em] pt-[0.1em] -mx-[0.06em] ${className}`;
  return (
    <span className="inline-grid align-baseline">
      {words.map((w) => (
        <span key={w} aria-hidden data-w={w} className="invisible col-start-1 row-start-1 whitespace-nowrap before:content-[attr(data-w)]" />
      ))}
      {rolling ? (
        <AnimatePresence initial={false}>
          <motion.span
            key={words[i]}
            className={layer}
            variants={reduced ? calm : reel}
            initial="enter"
            animate="show"
            exit="leave"
            style={{ transformPerspective: 700, transformOrigin: "50% 55%", backfaceVisibility: "hidden" }}
          >
            {words[i]}
          </motion.span>
        </AnimatePresence>
      ) : (
        <span className={layer}>{typed}{caret}<span className="invisible">{rest}</span></span>
      )}
    </span>
  );
}

/**
 * Types `parts` out; with `loop` (default) it then holds, erases and types again, otherwise it types once and any part
 * with `words` starts rolling through them like a reel.
 * Smoothness: typing progress is time-based on requestAnimationFrame (steady characters-per-second, no timer drift) and each
 * new letter eases in. React only re-renders when a whole character is added or removed.
 * Layout/SEO: the full text is always in the DOM (untyped characters are `visibility: hidden`), so nothing shifts, crawlers
 * and `aria-label` see the full heading, and reduced-motion users get the finished text immediately.
 * The caret sits zero-width after the last typed character: solid while typing, breathing (shrink/expand) while idle.
 */
export function Typewriter({ parts, speed = 85, delay = 350, hold = 5000, loop = true, label }: { parts: Part[]; speed?: number; delay?: number; hold?: number; loop?: boolean; label: string }) {
  const total = parts.reduce((n, p) => n + p.text.length, 0);
  const reduced = useSyncExternalStore(subscribeReduced, () => matchMedia(REDUCED).matches, () => false);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [settled, setSettled] = useState(false); // typed once, no loop: words may now roll
  const n = reduced ? total : typed;

  useEffect(() => {
    if (reduced) return;
    const typeRate = 1000 / speed;          // characters per second
    const eraseRate = 1000 / (speed * 0.5);
    let raf = 0, last = performance.now(), pos = 0, mode: Phase = "idle", next: Phase = "type", until = last + delay, shown = 0;

    const setMode = (m: Phase) => { mode = m; setPhase(m); };
    const frame = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000; // clamp so a background-tab stall does not jump the text
      last = now;
      if (mode === "idle") {
        if (now >= until) setMode(next);
      } else {
        pos += (mode === "type" ? typeRate : -eraseRate) * dt;
        if (pos >= total || pos <= 0) {
          pos = pos >= total ? total : 0;
          if (!loop && mode === "type") { until = Infinity; setSettled(true); }
          else { next = mode === "type" ? "erase" : "type"; until = now + (mode === "type" ? hold : 700); } // hold the finished text; rest briefly on the empty line
          setMode("idle");
        }
        const whole = Math.floor(pos);
        if (whole !== shown) { shown = whole; setTyped(whole); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced, total, speed, delay, hold, loop]);

  // Offset of each part in the full string. The caret belongs to the part typing currently ends in (the first one before any typing).
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((c, q) => c + q.text.length, 0));
  const caretAt = n === 0 ? 0 : parts.findIndex((p, i) => n <= starts[i] + p.text.length);

  return (
    <span aria-label={label}>
      {parts.map((p, i) => {
        const shown = Math.max(0, Math.min(p.text.length, n - starts[i]));
        // While typing forward, the newest letter eases in; keyed by position so each new letter replays the animation.
        const fresh = phase === "type" && i === caretAt && shown > 0;
        const head = fresh ? p.text.slice(0, shown - 1) : p.text.slice(0, shown);
        const lead = fresh ? <span key={n} className="tw-in">{p.text[shown - 1]}</span> : null;
        const caret = i === caretAt ? <span className={`tw-caret ${phase === "idle" ? "tw-caret--idle" : ""}`} /> : null;
        if (p.words) {
          return (
            <ReelSlot
              key={i}
              words={p.words}
              className={p.className}
              typed={head}
              rest={p.text.slice(shown)}
              caret={<>{lead}{caret}</>}
              rolling={!loop && (settled || reduced)}
              reduced={reduced}
            />
          );
        }
        return (
          <span key={i} className={p.className} aria-hidden>
            {head}{lead}{caret}
            <span className="invisible">{p.text.slice(shown)}</span>
          </span>
        );
      })}
    </span>
  );
}
