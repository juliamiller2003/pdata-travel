import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";
import LoginAwareMain from "@/components/LoginAwareMain";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "Pdata Travel – Travel Planning & Journaling",
  description: "Plan trips and journal your adventures as a solo traveler.",
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
    <html lang="en" suppressHydrationWarning>
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
