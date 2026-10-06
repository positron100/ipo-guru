import { GlassPanel } from "@/components/glass/GlassStatic";
import { HeaderSkeleton, LoadingShell, SectionTitleSkeleton } from "@/components/Skeletons";
import { SubscriptionSkeleton } from "@/components/subscription/SubscriptionSkeleton";

/** Section-aware detail skeleton: metrics, GMP hero, timeline, subscription rows. */
export default function Loading() {
  const s = (c: string) => <div className={`skeleton ${c}`} aria-hidden />;
  return (
    <LoadingShell>
      <HeaderSkeleton />
      <div className="mt-10 grid gap-5 sm:grid-cols-6 lg:mt-14 lg:grid-cols-12 lg:gap-6">
        {s("h-44 !rounded-[var(--radius-card)] sm:col-span-6 lg:col-span-5")}{s("h-44 !rounded-[var(--radius-card)] sm:col-span-3")}{s("h-44 !rounded-[var(--radius-card)] sm:col-span-3 lg:col-span-4")}
      </div>
      <SectionTitleSkeleton />
      <GlassPanel className="grid gap-10 p-10 md:grid-cols-[1.2fr_1fr] lg:p-14">
        <div className="space-y-4">{s("h-3 w-24")}{s("h-28 w-80")}{s("h-2 w-full")}</div>
        <div className="grid grid-cols-2 gap-3">{s("h-28")}{s("h-28")}{s("h-28")}{s("h-28")}</div>
      </GlassPanel>
      <SectionTitleSkeleton />
      <GlassPanel className="p-10">{s("h-8 w-full")}</GlassPanel>
      <SectionTitleSkeleton />
      <SubscriptionSkeleton />
    </LoadingShell>
  );
}
