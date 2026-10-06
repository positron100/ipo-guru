// Synthetic HTML that mirrors the *structure* of IPO Watch pages (TablePress listings, unclassed detail tables,
// per-IPO GMP/subscription tables). Companies and numbers are invented; no site content is copied.

const page = (body: string) => `<html><head><title>x</title></head><body><article>${body}</article></body></html>`;
const table = (rows: string[][], head?: string[]) =>
  `<figure class="wp-block-table"><table>${head ? `<thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` : ""}<tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></figure>`;
const link = (slug: string, text: string, status?: string) =>
  `<a href="https://ipowatch.in/${slug}/" target="_blank">${text}</a>${status ? `<br><span style="color:green">${status}</span>` : ""}`;

export const gmpListingHtml = () =>
  page(
    table(
      [
        [link("acme-widgets-ipo", "Acme Widgets", "Open"), "<strong>₹20</strong>", "🔴", "₹220", "₹240 (9.09%)", "30-5 Oct"],
        [link("zenith-foods-ipo", "Zenith Foods", "Upcoming"), "<strong>₹-</strong>", "🟡", "₹-", "₹- (0.00%)", "21-23 Oct*"],
        [link("flat-metals-ipo", "Flat Metals", "Closed"), "<strong>₹0</strong>", "🟡", "₹82", "₹82 (0.00%)", "5-7 Oct"],
        ["<a href='https://example.com/evil-ipo/'>Evil</a>", "₹5", "", "₹10", "", "1-2 Oct"], // other host: ignored
        [link("acme-widgets-ipo", "Acme Widgets", "Open"), "<strong>₹25</strong>", "🟢", "₹220", "₹245 (11.36%)", "30-5 Oct"], // duplicate row
      ],
      ["Company", "GMP*", "Trend", "Price Band", "Est. Gain", "Date"],
    ),
  );

export const upcomingHtml = () =>
  page(
    table(
      [
        [link("acme-widgets-ipo", "Acme Widgets"), "30-5 October", "₹178 Cr.", "₹208 to ₹220", "<a href='#'>Apply IPO</a>"],
        [link("zenith-foods-ipo", "Zenith Foods"), "21-23 October", "₹90.5 Cr.", "₹140 to ₹148", "<a href='#'>Apply IPO</a>"],
        [link("tba-corp-ipo", "TBA Corp"), "TBA", "₹- Cr.", "₹-", ""],
      ],
      ["Company", "IPO Date", "IPO Size", "IPO Price Band", "Application"],
    ),
  );

export const subscriptionOverviewHtml = () =>
  page(
    table(
      [
        [link("acme-widgets-ipo", "Acme Widgets"), "SME", "October 5, 2026", "14.11", "0.62", "0.01", "0.40", "17:37"],
        [link("zenith-foods-ipo", "Zenith Foods"), "Mainboard", "October 23, 2026", "-", "N/A", "", "-", "-"],
      ],
      ["IPO", "Type", "Closing Date", "QIB  (X)", "NII  (X)", "Retail  (X)", "Total (X)", "Last Updated"],
    ),
  );

export interface DetailsOpts { omitOfs?: boolean; omitLot?: boolean; noTables?: boolean; badDates?: boolean; smeLot?: boolean }
export const detailsHtml = (o: DetailsOpts = {}) => {
  if (o.noTables) return page("<h1>Acme Widgets IPO Date, Review, Price, Allotment Details</h1><p>Nothing here</p>");
  const kv = [
    ["IPO Open Date", o.badDates ? "TBA" : "September 30, 2026"],
    ["IPO Close Date", o.badDates ? "2026" : "October5, 2026"], // note the missing space, as seen on the real site
    ["Face Value", "₹10 Per Equity Share"],
    ["IPO Price Band", "₹208 to ₹220 Per Share"],
    ["Issue Size", "Approx ₹178 Crores"],
    ["Fresh Issue", "Approx ₹145 Crores"],
    ...(o.omitOfs ? [] : [["Offer for Sale:", "Approx 15,00,000 Equity Shares"]]),
    ["Issue Type", "Book Building Issue"],
    ["IPO Listing", "NSE SME"],
    ["DRHP Draft Prospectus", ""],
  ];
  const lot = o.omitLot ? "" : table(o.smeLot ? [["Retail Minimum", "2", "3200", "₹2,62,400"], ["Retail Maximum", "2", "3200", "₹2,62,400"]] : [["Retail Minimum", "1", "68", "₹14,960"], ["Retail Maximum", "13", "884", "₹1,94,480"]], ["Application", "Lot Size", "Shares", "Amount"]);
  const timeline = table([
    ["IPO Open Date:", "September 30, 2026"], ["IPO Close Date:", "October 5, 2026"], ["Basis of Allotment:", "October 6, 2026"],
    ["Refunds:", "October 7, 2026"], ["Credit to Demat Account:", "October 7, 2026"], ["IPO Listing Date:", "October 8, 2026"],
  ]);
  return page(`<h1>Q Template Page</h1><h1>Acme Widgets IPO Date, Review, Price, Allotment Details</h1>${table(kv)}${lot}${table([["Anchor Bidding Date", "September 29, 2026"], ["Shares Offered", "[.] Shares"]])}${o.badDates ? "" : timeline}`);
};

export const gmpPageHtml = (variant: "normal" | "empty" | "bad" = "normal") =>
  page(
    variant === "empty"
      ? "<p>No GMP table yet</p>"
      : table(
          variant === "bad"
            ? [["5 October", "abc", "🔴", "9.09%", "13:50"], ["31 February", "₹20", "", "1%", "10:00"], ["4 October", "₹-", "–", "-%", "03:38"], ["3 October", "₹0", "🟡", "0.00%", "10:22"]]
            : [["5 October", "₹20", "🔴", "9.09%", "13:50"], ["3 October", "₹20", "🔴", "9.09%", "10:22"], ["1 October", "₹35", "🟢", "15.91%", "17:15"], ["28 September", "₹-", "–", "-%", "03:38"]],
          ["Date", "IPO GMP", "GMP Trend", "Gain", "Last Updated"],
        ),
  );

export const subscriptionPageHtml = (variant: "retail" | "full" | "none" | "bad" = "retail") => {
  if (variant === "none") return page("<p>Subscription has not started</p>");
  const head = ["Category", "Day 1", "Day 2", "Day 3"];
  if (variant === "full")
    return page(table([["QIB", "1.00", "1.00", "1.33"], ["B-NII", "0.01", "0.50", "1.20"], ["S-NII", "0.02", "0.70", "2.10"], ["NII", "0.01", "0.84", "1.89"], ["RII", "0.06", "0.49", "1.75"], ["Employee", "-", "0.10", "0.30"], ["Shareholders", "N/A", "-", "0.5"], ["Others", "", "", "0.00"], ["Total", "0.06", "0.60", "1.79"]], head));
  if (variant === "bad") return page(table([["QIB", "12.34x", "x", "—"], ["Total", "−", "0", "abc"]], head));
  return page(table([["QIB", "1.00", "1.00", "1.33"], ["NII", "0.01", "0.84", "1.89"], ["RII", "0.06", "0.49", "1.75"], ["Total", "0.06", "0.60", "1.79"]], head));
};
