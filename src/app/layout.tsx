import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import { ThemeProvider } from "@/components/ThemeProvider";
import LoginAwareMain from "@/components/LoginAwareMain";

export const metadata: Metadata = {
  title: "Pdata Travel – Travel Planning & Journaling",
  description: "Plan trips and journal your adventures as a solo traveler.",
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
      <body>
        <ThemeProvider>
          <Nav user={user} />
          <LoginAwareMain>{children}</LoginAwareMain>
        </ThemeProvider>
      </body>
    </html>
  );
}
