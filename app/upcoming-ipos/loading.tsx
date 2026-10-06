import { CardGridSkeleton, HeaderSkeleton, LoadingShell, SectionTitleSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <LoadingShell>
      <HeaderSkeleton />
      <SectionTitleSkeleton />
      <CardGridSkeleton />
    </LoadingShell>
  );
}
