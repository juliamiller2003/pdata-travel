import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});
import Nav from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";
import LoginAwareMain from "@/components/LoginAwareMain";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata: Metadata = {
  metadataBase: new URL("https://pdata-travel-two.vercel.app"),
  title: {
    default: "Pathway Travel – Built for Backpackers, Not Suitcase Travellers",
    template: "%s – Pathway Travel",
  },
  description: "Keep your routes, budget, and notes in one place. Spend less time planning and more time finding the places that aren't on the map.",
  keywords: ["travel planning", "backpacker app", "travel journal", "trip planner", "budget travel", "solo travel", "itinerary planner"],
  openGraph: {
    title: "Built for people who travel with a backpack, not a suitcase.",
    description: "Pathway keeps your routes, budget, and notes in one place — so you can spend less time planning and more time finding the places that aren't on the map.",
    url: "https://pdata-travel-two.vercel.app",
    siteName: "Pathway Travel",
    images: [{ url: "/og.jpg", width: 1340, height: 895, alt: "Volcano sunrise from the trail — Pathway Travel" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Built for people who travel with a backpack, not a suitcase.",
    description: "Pathway keeps your routes, budget, and notes in one place — so you can spend less time planning and more time finding the places that aren't on the map.",
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning className={plusJakarta.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#9fb8b8" />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <OfflineBanner />
          <div className="flex items-center justify-center gap-1.5 bg-[#cadede] dark:bg-[#2e2e2e] px-4 py-2 text-xs text-[#1e1e1e] dark:text-[#efefef]">
            Thank you for being a beta tester! Leave feedback here:&nbsp;
            <a
              href="https://forms.gle/AVgyaQaKBVUVTFKVA"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-[#9fb8b8]"
            >
              feedback form
            </a>
          </div>
          <Nav user={user} />
          <LoginAwareMain>{children}</LoginAwareMain>
          <footer className="mt-16 border-t border-gray-100 dark:border-[#2e2e2e] px-4 py-6 text-center text-xs text-gray-400 dark:text-[#9fb8b8]">
            <a href="/privacy" className="hover:text-[#9fb8b8] transition-colors underline underline-offset-2">
              Privacy Policy
            </a>
            <span className="mx-2">·</span>
            Pathway Travel beta
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
