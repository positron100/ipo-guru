import { GlassPanel } from "@/components/glass/GlassStatic";
import { BoardSkeleton, CardGridSkeleton, LoadingShell, SectionTitleSkeleton } from "@/components/Skeletons";

/** GMP Today skeleton in the real composition: headline, four summary tiles, featured panel, mover cards, table. */
export default function Loading() {
  const s = (c: string) => <div className={`skeleton ${c}`} aria-hidden />;
  return (
    <LoadingShell>
      <div className="mt-6 grid items-end gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div className="space-y-6">{s("h-9 w-56 !rounded-full")}{s("h-20 w-full max-w-lg")}</div>
        <div className="space-y-3">{s("h-4 w-full")}{s("h-4 w-5/6")}{s("h-4 w-2/3")}</div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: 4 }, (_, k) => <div key={k} className="skeleton h-36 !rounded-[var(--radius-card)] lg:h-44" aria-hidden />)}
      </div>
      <SectionTitleSkeleton />
      <GlassPanel className="grid gap-10 p-10 lg:grid-cols-[1.25fr_1fr] lg:p-14">
        <div className="space-y-6">{s("h-3 w-40")}{s("h-10 w-80")}{s("h-28 w-96 max-w-full")}</div>
        <div className="grid grid-cols-2 gap-4">{s("h-24")}{s("h-24")}{s("h-24")}{s("h-24")}</div>
      </GlassPanel>
      <SectionTitleSkeleton />
      <CardGridSkeleton n={3} />
      <SectionTitleSkeleton />
      <BoardSkeleton rows={5} />
    </LoadingShell>
  );
}
