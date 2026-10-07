"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Pills } from "@/components/Pills";
import { duration, ease } from "@/components/motion/tokens";

export interface Series { key: string; label: string; color: string; values: (number | null)[] }

const PL = 54, PR = 30, PT = 26, PB = 46;

/** Smallest "nice" axis maximum (and step) that fits `v`, with at most five grid steps. */
function axis(v: number): { max: number; step: number } {
  const top = Math.max(v, 1.1); // keep the 1x line on the chart
  for (let p = -2; p <= 6; p++) {
    for (const f of [1, 2, 2.5, 5]) {
      const step = f * 10 ** p;
      const n = Math.ceil(top / step);
      if (n <= 5 && n >= 2) return { max: n * step, step };
    }
  }
  return { max: top, step: top / 4 };
}
const fmtTick = (t: number) => `${Number.isInteger(t) ? t : Number(t.toFixed(2))}x`;

/**
 * Subscription momentum: one line per category across the reported days. Only real readings are plotted (a missing reading
 * breaks the line, it is never interpolated). Filter by category, hover or use the arrow keys to inspect a day, and
 * the exact values are in the matrix below. Linear scale from zero, so line heights are comparable.
 */
export function SubscriptionChart({ dayLabels, series }: { dayLabels: string[]; series: Series[] }) {
  const gid = useId();
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>("all");
  const [pillHover, setPillHover] = useState<string | null>(null);
  const [hover, setHover] = useState<{ i: number; key: string } | null>(null);
  // The drawing is sized to its container (1 SVG unit = 1 CSS px), so axis text and dots stay a constant, readable size on every screen.
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.max(200, Math.round(e.contentRect.width));
      setSize({ w, h: Math.round(Math.min(400, Math.max(250, w * 0.34))) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = size?.w ?? 760, H = size?.h ?? 300;

  const visible = useMemo(() => (active === "all" ? series : series.filter((s) => s.key === active)), [series, active]);
  const n = dayLabels.length;
  const peak = Math.max(0, ...visible.flatMap((s) => s.values).filter((v): v is number => v !== null));
  const { max, step } = axis(peak);
  const x = (i: number) => PL + (n === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (n - 1));
  const y = (v: number) => H - PB - (v / max) * (H - PT - PB);
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, k) => k * step);

  const pathOf = (s: Series) => {
    let d = "", pen = false;
    s.values.forEach((v, i) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  // The series whose area is shaded: the selected one, otherwise the first (Total when reported).
  const primary = visible[0];
  const areaOf = (s: Series) => {
    const pts = s.values.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter((p): p is readonly [number, number] => p !== null);
    if (pts.length < 2) return "";
    return `M${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L")} L${pts.at(-1)![0].toFixed(1)},${y(0)} L${pts[0][0].toFixed(1)},${y(0)} Z`;
  };

  // Touch: the reading stays after the finger lifts (pointerleave fires on release), until a tap lands outside the chart.
  useEffect(() => {
    if (!hover) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setHover(null); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [hover]);

  const focus = hover?.key ?? (active === "all" ? pillHover : active);
  const dim = (s: Series) => (focus && focus !== s.key ? 0.22 : 1);

  const locate = (clientX: number, clientY: number) => {
    const r = box.current!.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W, py = ((clientY - r.top) / r.height) * H;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - PL) / (W - PL - PR)) * (n - 1))));
    let best: { key: string; d: number } | null = null;
    for (const s of visible) {
      const v = s.values[i];
      if (v === null) continue;
      const d = Math.abs(y(v) - py);
      if (!best || d < best.d) best = { key: s.key, d };
    }
    setHover(best ? { i, key: best.key } : null);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const keys = visible.filter((s) => s.values.some((v) => v !== null)).map((s) => s.key);
    if (keys.length === 0) return;
    const cur = hover ?? { i: n - 1, key: keys[0] };
    const withValue = (i: number, k: string) => visible.find((s) => s.key === k)?.values[i] !== null;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const i = Math.max(0, Math.min(n - 1, cur.i + (e.key === "ArrowRight" ? 1 : -1)));
      setHover({ i, key: withValue(i, cur.key) ? cur.key : (keys.find((k) => withValue(i, k)) ?? cur.key) });
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const j = (keys.indexOf(cur.key) + (e.key === "ArrowDown" ? 1 : -1) + keys.length) % keys.length;
      setHover({ i: cur.i, key: keys[j] });
    } else if (e.key === "Escape") setHover(null);
  };

  const hs = hover ? visible.find((s) => s.key === hover.key) : undefined;
  const hv = hs && hover ? hs.values[hover.i] : null;
  const tip = hs && hover && hv !== null ? { left: Math.max(14, Math.min(86, (x(hover.i) / W) * 100)), top: (y(hv) / H) * 100 } : null;

  const options = [{ value: "all", label: "All" }, ...series.map((s) => ({ value: s.key, label: s.label, dot: s.color }))];

  return (
    <figure>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Pills fit label="Chart category" value={active} onChange={(v) => { setActive(v); setHover(null); }} onHover={setPillHover} options={options} />
      </div>

      <div
        ref={box}
        style={{ minHeight: size ? undefined : 280 }}
        className="relative touch-pan-y rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        tabIndex={0}
        role="group"
        aria-label={`Subscription multiple by day for ${visible.map((s) => s.label).join(", ")}. Use the arrow keys to inspect values.`}
        onPointerDown={(e) => locate(e.clientX, e.clientY)}
        onPointerMove={(e) => locate(e.clientX, e.clientY)}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(null); }}
        onBlur={() => setHover(null)}
        onKeyDown={onKey}
      >
        {size && <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block select-none overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary?.color ?? "var(--accent)"} stopOpacity="0.28" />
              <stop offset="100%" stopColor={primary?.color ?? "var(--accent)"} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
              <text x={PL - 12} y={y(t) + 4} textAnchor="end" className="num" fontSize={11} fill="var(--fg-faint)">{fmtTick(t)}</text>
            </g>
          ))}
          {max >= 1 && (
            <g className="chart-zero">
              <line x1={PL} x2={W - PR} y1={y(1)} y2={y(1)} stroke="var(--border-strong)" strokeDasharray="4 5" />
              <text x={W - PR} y={y(1) - 7} textAnchor="end" fontSize={10.5} fill="var(--fg-faint)">1x · fully subscribed</text>
            </g>
          )}
          {dayLabels.map((d, i) => (
            <text key={d} x={x(i)} y={H - PB + 26} textAnchor="middle" fontSize={12} fontWeight={i === n - 1 ? 600 : 400} fill={i === n - 1 ? "var(--fg)" : "var(--fg-muted)"}>{d}</text>
          ))}

          {primary && <path d={areaOf(primary)} fill={`url(#${gid})`} className="chart-area" />}

          {hover && <line x1={x(hover.i)} x2={x(hover.i)} y1={PT - 8} y2={H - PB} stroke="var(--border-strong)" strokeDasharray="3 4" />}

          {visible.map((s) => (
            <motion.path
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth={s.key === "total" ? 3.2 : 2.3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ d: pathOf(s), pathLength: reduce ? 1 : 0, opacity: 1 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              animate={{ d: pathOf(s), opacity: dim(s) }}
              transition={{ d: { duration: reduce ? 0 : duration.reveal, ease: ease.out }, opacity: { duration: duration.interactive }, pathLength: { duration: reduce ? 0 : duration.cinematic, ease: ease.out } }}
            />
          ))}

          {visible.map((s) =>
            s.values.map((v, i) =>
              v === null ? null : (
                <motion.circle
                  key={`${s.key}-${i}`}
                  fill="var(--bg)"
                  stroke={s.color}
                  strokeWidth={2.2}
                  className="chart-dot"
                  initial={{ r: 3.8 }}
                  animate={{ cx: x(i), cy: y(v), r: hover?.key === s.key && hover.i === i ? 6.5 : 3.8, opacity: dim(s) }}
                  transition={{ duration: reduce ? 0 : duration.reveal, ease: ease.out }}
                  style={{ "--p": n > 1 ? i / (n - 1) : 0 } as React.CSSProperties}
                />
              ),
            ),
          )}
          {primary && n > 1 && primary.values[n - 1] !== null && (
            <circle className="chart-latest-ring" cx={x(n - 1)} cy={y(primary.values[n - 1] as number)} r={5} fill="none" stroke={primary.color} strokeWidth={1.6} aria-hidden />
          )}
        </svg>}

        {tip && hs && hover && hv !== null && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[14rem] rounded-xl border border-line bg-bg px-3.5 py-2.5 shadow-[var(--shadow-lg)] transition-[left,top] duration-150 ease-out"
            style={{ left: `${tip.left}%`, top: `${tip.top}%`, transform: "translate(-50%, calc(-100% - 14px))" }}
            role="status"
          >
            <p className="t-small flex items-center gap-2 font-medium"><span className="size-2 rounded-full" style={{ background: hs.color }} aria-hidden />{hs.label}</p>
            <p className="t-caption mt-1">{dayLabels[hover.i]}</p>
            <p className="t-metric num mt-1 text-xl">{hv.toFixed(2)}x</p>
          </div>
        )}
      </div>

      <figcaption className="t-small mt-4 text-faint">Subscription multiple (x) by day. <span className="[@media(hover:none)]:hidden">Hover or use the arrow keys to inspect; exact figures are listed below.</span><span className="hidden [@media(hover:none)]:inline">Touch or drag across the chart to inspect; exact figures are listed below.</span></figcaption>
    </figure>
  );
}
