import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, siteUrl } from "@/lib/site";
import { getSource } from "@/lib/ipo-data";
import { Navbar } from "@/components/nav/Navbar";
import { ScrollDownHint } from "@/components/ScrollHints";
import { RoutePrefetcher } from "@/components/nav/Prefetch";
import { RouteProgress } from "@/components/nav/RouteProgress";
import { INTRO_HEAD_SCRIPT, IntroOverlay } from "@/components/OpeningAnimation";
import { Providers } from "@/components/motion/Providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

/** Lets the page extend under the notch / rounded corners; the fixed navbar, gutters and floating arrow add the safe-area insets themselves. */
export const viewport: Viewport = { viewportFit: "cover" };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME}: Indian IPO GMP, dates and status`, template: `%s | ${SITE_NAME}` },
  description:
    "Track Indian IPOs: status, price band, dates, lot size and unofficial grey-market premium (GMP), with a plain-language explanation of how estimates are calculated.",
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_IN" },
  twitter: { card: "summary" },
};

/** Runs before first paint: explicit choice from localStorage, else the OS preference. Avoids a theme flash. */
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  const source = getSource();
  return (
    <html lang="en-IN" data-scroll-behavior="smooth" suppressHydrationWarning className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: INTRO_HEAD_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <IntroOverlay />
        <Providers>
          <div className="ambient" aria-hidden />
          <a href="#main" className="sr-only z-[60] rounded-full bg-accent px-4 py-2 text-accent-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
            Skip to content
          </a>
          <Navbar name={SITE_NAME} />
          <ScrollDownHint />
          <RoutePrefetcher />
          <RouteProgress />
          <main id="main" className="page flex-1 pb-8 pt-28 sm:pt-36">{children}</main>
          <footer className="page pb-6">
            <div className="glass glass-panel space-y-2 p-6 text-sm leading-relaxed text-faint lg:p-8">
              <p>
                GMP is unofficial, unregulated grey-market sentiment. It can change quickly or be wrong, and it is not investment advice or a
                guaranteed listing prediction. {SITE_NAME} is not a SEBI-registered adviser.
              </p>
              <p>
                IPO and GMP data sourced from{" "}
                <a className="link text-muted" href={source.url} rel="noopener">{source.name}</a>. Estimates on this site are our own
                arithmetic on that data.
              </p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
