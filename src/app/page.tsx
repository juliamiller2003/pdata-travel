import Link from "next/link";

export default function MarketingPage() {

  const features = [
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
        </svg>
      ),
      title: "Budget tracking",
      description: "Set a daily budget and log every hostel, street food meal, and overnight bus. See instantly whether you're on track or burning through it.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
      ),
      title: "Offline maps",
      description: "Save hostel locations, bus stations, and hidden spots by coordinates. Access them without data — deep links to Google Maps and Maps.me built in.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h4.5M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      ),
      title: "AI itineraries",
      description: "Describe your travel style and budget — AI builds a day-by-day plan with real places, timings, and food stops. Edit anything, keep what works.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
      title: "All transport in one place",
      description: "Log flights by flight number and track buses, trains, ferries, and overnight sleepers. Every leg of the journey, organised.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
        </svg>
      ),
      title: "Country essentials",
      description: "Plug adapters, local SIM cards, visa requirements, currency, and what the weather actually does in the month you arrive — looked up automatically.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      ),
      title: "Not sure where? Just ask.",
      description: "Tell us your vibe, your budget per day, and how long you've got. Take a Chance finds three destinations that actually fit.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        </svg>
      ),
      title: "Journal & photos",
      description: "Write entries linked to specific days while the details are still vivid. Attach photos. You'll be glad you did when you're home.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      ),
      title: "Packing lists",
      description: "Build your kit list per trip. Check things off as you pack. Never arrive somewhere cold without a rain jacket again.",
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.111 8.111A6.003 6.003 0 0112 6c3.314 0 6 2.686 6 6 0 1.344-.442 2.586-1.188 3.576M3.22 10.22A9.96 9.96 0 003 12c0 5.523 4.477 10 10 10a9.96 9.96 0 005.78-1.843" />
        </svg>
      ),
      title: "Works offline",
      description: "On a 12-hour bus with no signal? Your itinerary, maps, and journal are cached locally. No connection needed.",
    },
  ];

  const stats = [
    { value: "190+", label: "countries you could be in" },
    { value: "$0", label: "to get started" },
    { value: "1", label: "bag. endless trips." },
  ];

  return (
    <div className="bg-[#efefef] dark:bg-[#1e1e1e]">

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#cadede] dark:bg-[#2e2e2e] px-3 py-1 text-xs font-medium text-[#1e1e1e] dark:text-[#cadede] mb-6">
          Free during beta
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#1e1e1e] dark:text-[#efefef] leading-tight tracking-tight max-w-2xl">
          Built for people who travel with a backpack, not a suitcase.
        </h1>
        <p className="mt-5 text-lg text-gray-500 dark:text-[#9fb8b8] max-w-xl leading-relaxed">
          Pathway keeps your routes, budget, and notes in one place — so you can spend less time planning and more time finding the places that aren&apos;t on the map.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e1e1e] dark:bg-[#9fb8b8] px-6 py-3 text-sm font-semibold text-white dark:text-[#1e1e1e] hover:opacity-90 transition-opacity"
          >
            Start planning free
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

      {/* Stats bar */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-14">
        <div className="grid grid-cols-3 divide-x divide-[#e0e0e0] dark:divide-[#2e2e2e] rounded-2xl border border-[#e0e0e0] dark:border-[#2e2e2e] bg-white dark:bg-transparent overflow-hidden">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-5 text-center">
              <p className="text-2xl font-bold text-[#1e1e1e] dark:text-[#efefef] tracking-tight">{s.value}</p>
              <p className="text-xs text-gray-400 dark:text-[#9fb8b8] mt-0.5 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <hr className="border-[#e0e0e0] dark:border-[#2e2e2e]" />
      </div>

      {/* Manifesto blurb */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-[#9fb8b8] mb-5">
          Why we built this
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          <p className="text-sm text-gray-600 dark:text-[#9fb8b8] leading-relaxed">
            Spreadsheets fall apart. Notes apps don&apos;t know what country you&apos;re in. And most travel apps are designed for people booking all-inclusive resorts, not sleeping on overnight trains and crossing borders on a whim.
          </p>
          <p className="text-sm text-gray-600 dark:text-[#9fb8b8] leading-relaxed">
            Pathway is different. It&apos;s light, flexible, and works offline — because real travel doesn&apos;t wait for a wifi signal.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <hr className="border-[#e0e0e0] dark:border-[#2e2e2e]" />
      </div>

      {/* Features */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-[#9fb8b8] mb-10">
          What&apos;s inside
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

      {/* Divider */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <hr className="border-[#e0e0e0] dark:border-[#2e2e2e]" />
      </div>

      {/* Use cases strip */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-[#9fb8b8] mb-8">
          Made for trips like these
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              heading: "Southeast Asia loop",
              body: "Bangkok → Chiang Mai → Luang Prabang → Hanoi. Track every night bus, border crossing, and baht spent.",
            },
            {
              heading: "Interrail or Eurail",
              body: "Hop between cities, log each leg, keep notes on the hostels worth returning to and the ones to avoid.",
            },
            {
              heading: "One-way ticket, no plan",
              body: "Land somewhere, figure it out. Ask AI where to go next based on your budget and how much time you have.",
            },
          ].map((c) => (
            <div key={c.heading} className="rounded-xl bg-[#cadede]/30 dark:bg-[#2e2e2e] border border-[#cadede] dark:border-[#2e2e2e] p-5">
              <h3 className="text-sm font-semibold text-[#1e1e1e] dark:text-[#efefef] mb-2">{c.heading}</h3>
              <p className="text-xs text-gray-500 dark:text-[#9fb8b8] leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pb-20">
        <div className="rounded-2xl bg-[#1e1e1e] dark:bg-[#2e2e2e] px-8 py-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#9fb8b8] mb-4">Ready?</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white dark:text-[#efefef] mb-3 leading-tight tracking-tight">
            Pack light. Plan smart.<br className="hidden sm:block" /> Go anywhere.
          </h2>
          <p className="text-sm text-[#9fb8b8] mb-8 max-w-sm mx-auto">
            Free during beta. No credit card. Works on your phone, offline, wherever you end up.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#cadede] px-6 py-3 text-sm font-semibold text-[#1e1e1e] hover:opacity-90 transition-opacity"
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
