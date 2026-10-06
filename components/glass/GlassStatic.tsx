import type { ElementType, ReactNode } from "react";

type Props = { children?: ReactNode; className?: string; as?: ElementType } & Record<string, unknown>;

/** Static translucent surfaces (no client JS). The shared recipe lives in `.glass` (globals.css). The interactive variant is GlowCard in Glass.tsx. */
export function GlassSurface({ children, className = "", as: Tag = "div", ...rest }: Props) {
  return <Tag className={`glass ${className}`} {...rest}>{children}</Tag>;
}
export const GlassCard = ({ className = "", ...p }: Props) => <GlassSurface className={`glass-card ${className}`} {...p} />;
export const GlassPanel = ({ className = "", ...p }: Props) => <GlassSurface className={`glass-panel ${className}`} {...p} />;
