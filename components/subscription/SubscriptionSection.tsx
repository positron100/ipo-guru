import type { SubscriptionData } from "@/lib/types";
import { buildInsight, buildSubscription, pickKpis } from "@/lib/subscription";
import { GlassPanel } from "@/components/glass/GlassStatic";
import { InView } from "@/components/motion/InView";
import { SubscriptionKpis } from "./SubscriptionKpis";
import { SubscriptionChart } from "./SubscriptionChart";
import type { Series } from "./SubscriptionChart";
import { SubscriptionMatrix, SubscriptionTotal } from "./SubscriptionMatrix";
import { SubscriptionInsight } from "./SubscriptionInsight";

/** Cool, muted line colours (Total uses the accent). Colour is only an identifier; the legend pills and the table carry the names. */
const PALETTE = ["#38bdf8", "#a78bfa", "#2dd4bf", "#fb923c", "#f472b6", "#94a3b8", "#facc15"];

/**
 * Subscription section for an IPO detail page. Server component: it shapes the already-fetched `ipo.subscription` into a view
 * model (lib/subscription.ts) and passes only the small chart series to the client. Returns null when there is nothing to show,
 * so the page can fall back to its existing messages.
 */
export function SubscriptionSection({ data }: { data: SubscriptionData }) {
  const model = buildSubscription(data);
  if (!model) return null;

  const kpis = pickKpis(model);
  const insight = buildInsight(model);
  const series: Series[] = [
    ...(model.total ? [{ key: "total", label: model.total.label, color: "var(--accent)", values: model.total.values }] : []),
    ...model.categories.map((c, i) => ({ key: c.key, label: c.label, color: PALETTE[i % PALETTE.length], values: c.values })),
  ];

  return (
    <div className="space-y-14 sm:space-y-12 lg:space-y-16">
      <SubscriptionKpis kpis={kpis} />

      {model.hasHistory && (
        <div>
          <h3 className="t-h2">Subscription momentum</h3>
          <p className="t-body mt-2 mb-6">Track how investor demand evolved through the issue period.</p>
          <InView>
            <GlassPanel className="p-5 sm:p-7 lg:p-9">
              <SubscriptionChart dayLabels={model.dayLabels} series={series} />
            </GlassPanel>
          </InView>
        </div>
      )}

      <div className="max-sm:border-t max-sm:border-line max-sm:pt-10">
        <h3 className="t-h2">Category-wise subscription</h3>
        <p className="t-body mt-2 mb-6">Exact multiples by investor category and day. The latest day is highlighted.</p>
        <InView className="space-y-4 lg:space-y-5">
          <SubscriptionMatrix model={model} />
          <SubscriptionTotal model={model} />
        </InView>
      </div>

      {insight.lines.length > 0 && <SubscriptionInsight insight={insight} />}
    </div>
  );
}
