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
    default: "Pathway Travel – Travel Planning & Journaling",
    template: "%s – Pathway Travel",
  },
  description: "Plan trips and journal your adventures as a solo traveler. Budget tracking, offline maps, AI itineraries, packing lists — built for backpackers.",
  keywords: ["travel planning", "backpacker app", "travel journal", "trip planner", "budget travel", "solo travel", "itinerary planner"],
  openGraph: {
    title: "Pathway Travel – Travel Planning & Journaling",
    description: "Plan trips and journal your adventures as a solo traveler. Built for backpackers.",
    url: "https://pdata-travel-two.vercel.app",
    siteName: "Pathway Travel",
    images: [{ url: "/og.jpg", width: 1340, height: 895, alt: "Pathway Travel" }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pathway Travel – Travel Planning & Journaling",
    description: "Plan trips and journal your adventures as a solo traveler. Built for backpackers.",
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
        </ThemeProvider>
      </body>
    </html>
  );
}
