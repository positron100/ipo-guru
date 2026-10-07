import { Icon } from "@/components/Icon";
import { istToday } from "@/lib/ipoguru-normalize";

/**
 * Breathing UI primitives (the CSS lives in the "Breathing UI" block of app/globals.css).
 * Rules: data moves with meaning, direction moves continuously, a changed value animates only when it really changed.
 * Level 1 (idle, subtle): arrows, dots, the closing clock. Closed/listed/no-GMP data stays still (`still`).
 * Other pieces are plain classes: `.live-dot` (status/freshness heartbeat), `.dot-breathe` (a dot's soft ring),
 * `.rail-seg` (the light travelling a progression rail), `.chart-latest-ring`, and `.breathe-card` (featured cards only:
 * the card's shadow and border breathe, never its size, position or background).
 */
type Dir = "up" | "down" | "flat";

/** The arrow keeps drifting the way it points (never rotates), so its meaning is the same as when it is still. */
export function BreathingArrow({ dir, size = 14, still = false }: { dir: Dir; size?: number; still?: boolean }) {
  return (
    <span aria-hidden className={`inline-flex ${still ? "" : `drift-${dir}`}`}>
      <Icon name={dir} size={size} />
    </span>
  );
}

/** CTA arrow: drifts toward where it points, further on hover/press (translate only, so nothing around it moves). */
export function CtaArrow({ size = 15 }: { size?: number }) {
  return (
    <span aria-hidden className="cta-arrow inline-flex">
      <Icon name="arrow" size={size} className="ico-right" />
    </span>
  );
}

/**
 * A small clock for an IPO that closes within 3 IST days; it pulses slowly, faster the closer the deadline (3 days: slow,
 * 1 day: medium, today: fast). Renders nothing otherwise, so far-off and already-closed IPOs stay still.
 */
export function ClosingClock({ close }: { close: string | null }) {
  if (!close) return null;
  const d = Math.round((Date.parse(close.slice(0, 10)) - Date.parse(istToday())) / 86_400_000);
  if (!(d >= 0 && d <= 3)) return null;
  return (
    <span role="img" aria-label={d === 0 ? "Closes today" : `Closes in ${d} day${d > 1 ? "s" : ""}`} data-urgency={d === 0 ? "fast" : d === 1 ? "mid" : "slow"} className="clock-pulse">
      <Icon name="clock" size={13} />
    </span>
  );
}
