import { GlassPanel } from "@/components/glass/GlassStatic";
import { BoardSkeleton, CardGridSkeleton, LoadingShell, SectionTitleSkeleton } from "@/components/Skeletons";

/** GMP Today skeleton in the real composition: headline, four summary tiles, featured panel, mover cards, table. */
export default function Loading() {
  const s = (c: string) => <div className={`skeleton ${c}`} aria-hidden />;
  return (
    <LoadingShell>
      <div className="mt-6 grid items-end gap-5 sm:gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div className="space-y-6">{s("h-9 w-56 max-w-full !rounded-full")}{s("h-14 w-4/5 max-w-lg sm:h-20")}</div>
        <div className="space-y-3">{s("h-4 w-full")}{s("h-4 w-5/6")}{s("h-4 w-2/3")}</div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 4 }, (_, k) => <div key={k} className="skeleton h-28 !rounded-[var(--radius-card)] sm:h-36 lg:h-44" aria-hidden />)}
      </div>
      <SectionTitleSkeleton />
      <GlassPanel className="grid gap-6 p-5 sm:gap-10 sm:p-10 lg:grid-cols-[1.25fr_1fr] lg:p-14">
        <div className="space-y-6">{s("h-3 w-40")}{s("h-8 w-3/5 sm:h-10 sm:w-80")}{s("h-24 w-full max-w-sm sm:h-28 sm:w-96")}</div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">{s("h-20 sm:h-24")}{s("h-24")}{s("h-24")}{s("h-24")}</div>
      </GlassPanel>
      <SectionTitleSkeleton />
      <CardGridSkeleton n={3} />
      <SectionTitleSkeleton />
      <BoardSkeleton rows={5} />
    </LoadingShell>
  );
}
