import { Icon, type IconName } from "@/components/Icon";
import { GlowCard } from "@/components/glass/Glass";
import { NA } from "@/lib/format";

/**
 * Metric tile. `size="lg"` dominates (hero metrics); `sm` is the quiet detail tile.
 * Missing values read "Not available", never 0.
 */
export function Metric({
  label, value, sub, icon, size = "md", index = 0, className = "",
}: { label: string; value: string | null; sub?: string | null; icon?: IconName; size?: "sm" | "md" | "lg"; index?: number; className?: string }) {
  const big = size === "lg" ? "text-5xl lg:text-6xl" : size === "md" ? "text-3xl lg:text-4xl" : "text-xl";
  return (
    <GlowCard className={`enter flex flex-col justify-between gap-5 ${size === "sm" ? "p-5" : "p-5 sm:p-6 lg:p-8"} ${className}`} style={{ "--i": index } as React.CSSProperties}>
      <div className="flex items-center gap-2 text-faint">
        {icon && <Icon name={icon} size={16} className="ico-pop" />}
        <p className="t-caption">{label}</p>
      </div>
      <div>
        <p className={`t-metric ${big} ${value === null ? "!text-base !font-normal text-faint" : ""}`}>{value ?? NA}</p>
        {sub && <p className="t-small mt-2 text-faint">{sub}</p>}
      </div>
    </GlowCard>
  );
}
