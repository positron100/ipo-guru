"use client";
import { useId, useState } from "react";
import type { GmpPoint } from "@/lib/types";
import { dateOnly, signedRupee } from "@/lib/format";
import { gmpText } from "@/components/Gmp";

/** GMP trend: gradient area, self-drawing line, hover/keyboard crosshair. Data is also listed in a table beside it. */
export function GmpChart({ points }: { points: GmpPoint[] }) {
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const pts = [...points].reverse(); // oldest → newest
  const W = 640, H = 220, PX = 28, PT = 20, PB = 28;
  const ys = pts.map((p) => p.gmp);
  const min = Math.min(0, ...ys), max = Math.max(0, ...ys), span = max - min || 1;
  const x = (k: number) => PX + (k * (W - 2 * PX)) / (pts.length - 1);
  const y = (v: number) => H - PB - ((v - min) / span) * (H - PT - PB);
  const line = pts.map((p, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(p.gmp).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = pts.length - 1;
  const idx = hover ?? last;
  const cur = pts[idx];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(last, Math.round(((px - PX) / (W - 2 * PX)) * last))));
  };

  return (
    <figure>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="num text-2xl font-semibold tracking-tight">{gmpText(cur.gmp)}</div>
        <div className="t-small text-faint">{dateOnly(cur.observedAt)}</div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        tabIndex={0}
        className="w-full touch-pan-y select-none overflow-visible rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        aria-label={`GMP trend from ${dateOnly(pts[0].observedAt)} to ${dateOnly(pts[last].observedAt)}, ${signedRupee(ys[0])} to ${signedRupee(ys[last])} per share`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setHover(Math.max(0, idx - 1));
          if (e.key === "ArrowRight") setHover(Math.min(last, idx + 1));
          if (e.key === "Escape") setHover(null);
        }}
        onBlur={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={PX} x2={W - PX} y1={y(0)} y2={y(0)} stroke="var(--border-strong)" strokeDasharray="4 5" className="chart-zero" />
        <path d={area} fill={`url(#${gid})`} className="chart-area" />
        <path d={line} pathLength={1} fill="none" stroke="var(--accent)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="draw-line" />
        <line x1={x(idx)} x2={x(idx)} y1={PT - 6} y2={H - PB + 6} stroke="var(--accent)" strokeOpacity={0.35} />
        {pts.map((p, k) => (
          <circle key={k} cx={x(k)} cy={y(p.gmp)} r={k === idx ? 6 : 3} fill={k === idx ? "var(--accent)" : "var(--bg)"} stroke="var(--accent)" strokeWidth={2} className="chart-dot" style={{ transition: "r .15s", "--p": pts.length > 1 ? k / (pts.length - 1) : 0 } as React.CSSProperties} />
        ))}
      </svg>
      <figcaption className="t-small mt-3 text-faint">GMP (₹ per share) over time. Dashed line is zero. <span className="[@media(hover:none)]:hidden">Hover or use ← → keys to inspect.</span><span className="hidden [@media(hover:none)]:inline">Touch or drag to inspect.</span></figcaption>
    </figure>
  );
}
