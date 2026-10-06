import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { ContactLetter, ContactReach } from "@/components/contact/ContactLetter";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send a question, a bug report or an idea for IPO GMP Desk. Letters go straight to the developer.",
  alternates: { canonical: "/contact" },
  openGraph: { url: "/contact", title: "Contact IPO GMP Desk" },
};

const REASONS = [
  { icon: "pie", label: "Data", text: "Report incorrect or missing information." },
  { icon: "bolt", label: "Ideas", text: "Suggest a feature, metric or improvement." },
  { icon: "info", label: "Questions", text: "Ask about the data or how it\u2019s calculated." },
] as const;

const css = (o: Record<string, string | number>) => o as React.CSSProperties;

export default function Page() {
  return (
    <>
      <div data-no-footer hidden />
      <div className="mt-0 grid items-center gap-10 sm:-mb-2 lg:mt-3 lg:grid-cols-[minmax(0,36rem)_minmax(0,32rem)] lg:justify-center lg:gap-12">
        {/* Editorial introduction to the letter: open and light, so the letter stays the centrepiece. */}
        <div>
          <div className="enter">
            <p className="t-caption tracking-[0.18em]">Get in touch</p>
            <h1 className="t-h1 mt-3">Have something to say?</h1>
            <p className="t-body mt-4 max-w-lg">
              Found an issue with the data? Have a question about an IPO? Or have an idea that could make the desk better?
            </p>
          </div>

          <ul className="mt-6 divide-y divide-line border-y border-line">
            {REASONS.map((r, k) => (
              <li key={r.label} className="enter group flex items-start gap-4 py-3" style={css({ "--i": k + 1 })}>
                <span className="mt-0.5 text-faint transition-colors duration-200 group-hover:text-accent"><Icon name={r.icon} size={16} className="ico-pop" /></span>
                <div className="transition-transform duration-300 ease-out group-hover:translate-x-1">
                  <h2 className="t-caption tracking-[0.14em] !text-fg transition-colors duration-200 group-hover:!text-accent">{r.label}</h2>
                  <p className="t-small mt-1">{r.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="enter mt-6" style={css({ "--i": 4 })}>
            <p className="t-caption tracking-[0.18em]">Prefer email?</p>
            <div className="mt-2.5"><ContactReach /></div>
          </div>
        </div>

        <div className="enter flex lg:justify-end" style={css({ "--i": 1 })}>
          <ContactLetter />
        </div>
      </div>
    </>
  );
}
