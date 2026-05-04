import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface HomeProps {
  searchParams: { code?: string; next?: string };
}

export default async function MarketingPage({ searchParams }: HomeProps) {
  // Preserve existing auth callback redirect
  const { code, next } = searchParams;
  if (code) {
    redirect(`/auth/callback?code=${code}${next ? `&next=${next}` : ""}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/trips");

  const features = [
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
        </svg>
      ),
      title: "Interactive World Map",
      description: "See every country you've visited highlighted on an interactive map. Click any country to log a trip or revisit memories.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      ),
      title: "AI Trip Discovery",
      description: "Not sure where to go? Tell us your vibe, budget, and travel dates — Take a Chance finds three tailored destinations instantly.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h4.5M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      ),
      title: "Smart Itineraries",
      description: "Plan each day with activities, times, and places. Let AI generate a full itinerary from a single prompt, then edit it however you like.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
      ),
      title: "Travel Journal",
      description: "Capture memories while they're fresh. Write journal entries linked to specific trip days, with photos attached.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
        </svg>
      ),
      title: "Expense Tracking",
      description: "Set a trip budget and log every expense by category. A live progress bar shows exactly how much of your budget remains.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
        </svg>
      ),
      title: "Flight Tracking",
      description: "Add flights to any trip by flight number and date. Departure, arrival, airline, and status all in one place.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
        </svg>
      ),
      title: "Country Profiles",
      description: "Before you pack, check outlet types, local currency, and typical weather for the exact month you're traveling — automatically.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.111 8.111A6.003 6.003 0 0012 6c3.314 0 6 2.686 6 6 0 1.344-.442 2.586-1.188 3.576M3.22 10.22A9.96 9.96 0 003 12c0 5.523 4.477 10 10 10a9.96 9.96 0 005.78-1.843" />
        </svg>
      ),
      title: "Offline Access",
      description: "Your itinerary and journal are cached locally, so you can read them on the plane or anywhere without a connection.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Travel Stats",
      description: "See your lifetime travel stats — countries visited, distance traveled, and a full timeline of every adventure.",
    },
  ];

  return (
    <div className="bg-[#efefef] dark:bg-[#1e1e1e]">

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#cadede] dark:bg-[#2e2e2e] px-3 py-1 text-xs font-medium text-[#1e1e1e] dark:text-[#cadede] mb-6">
          Now in beta
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#1e1e1e] dark:text-[#efefef] leading-tight tracking-tight">
          Your travel, beautifully<br className="hidden sm:block" /> organized.
        </h1>
        <p className="mt-5 text-lg text-gray-500 dark:text-[#9fb8b8] max-w-xl mx-auto leading-relaxed">
          Plan trips, discover new destinations with AI, track your adventures, and journal your memories — all in one place.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e1e1e] dark:bg-[#9fb8b8] px-6 py-3 text-sm font-semibold text-white dark:text-[#1e1e1e] hover:opacity-90 transition-opacity"
          >
            Start planning
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] bg-white dark:bg-transparent px-6 py-3 text-sm font-medium text-[#1e1e1e] dark:text-[#efefef] hover:border-[#9fb8b8] transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <hr className="border-[#e0e0e0] dark:border-[#2e2e2e]" />
      </div>

      {/* Features */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-[#9fb8b8] mb-10 text-center">
          Everything you need
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[#e0e0e0] dark:border-[#2e2e2e] bg-white dark:bg-transparent p-5"
            >
              <div className="mb-3 inline-flex items-center justify-center rounded-lg bg-[#cadede] dark:bg-[#2e2e2e] p-2 text-[#1e1e1e] dark:text-[#9fb8b8]">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-[#1e1e1e] dark:text-[#efefef] mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 dark:text-[#9fb8b8] leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-20">
        <div className="rounded-2xl bg-[#cadede] dark:bg-[#2e2e2e] px-8 py-10 text-center">
          <h2 className="text-2xl font-bold text-[#1e1e1e] dark:text-[#efefef] mb-2">
            Ready for your next adventure?
          </h2>
          <p className="text-sm text-[#1e1e1e]/70 dark:text-[#9fb8b8] mb-6">
            Free to use during beta. No credit card required.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1e1e1e] dark:bg-[#9fb8b8] px-6 py-3 text-sm font-semibold text-white dark:text-[#1e1e1e] hover:opacity-90 transition-opacity"
          >
            Get started free
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

    </div>
  );
}
