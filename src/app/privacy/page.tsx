import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#9fb8b8] transition-colors"
      >
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-[#efefef]">
        Privacy Policy
      </h1>
      <p className="mt-1 text-xs text-gray-400 dark:text-[#9fb8b8]">
        Last updated: May 2026 · Beta version
      </p>

      <div className="mt-8 space-y-8 text-sm text-gray-700 dark:text-[#ccc] leading-relaxed">

        <section>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-[#efefef]">What Pathway Travel is</h2>
          <p>
            Pathway Travel is a trip-planning app for backpackers. It is currently in
            beta — features and data practices may change. We&apos;ll update this page
            when they do.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-[#efefef]">What we collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Your email address (used to sign in via magic link or Google OAuth)</li>
            <li>Trip data you create: destinations, dates, itineraries, budgets, journal entries, packing lists</li>
            <li>Optional settings: home country, travel preferences</li>
          </ul>
          <p className="mt-2">
            We do not collect payment information, precise location data, or any data
            beyond what you explicitly enter.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-[#efefef]">How we use it</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>To provide the app — storing and displaying your trips and lists</li>
            <li>To generate AI suggestions (itineraries, destination ideas) — your trip data is sent to Anthropic&apos;s Claude API for this purpose only</li>
            <li>To improve the app during beta — we may review anonymised usage patterns</li>
          </ul>
          <p className="mt-2">
            We do not sell your data, share it with advertisers, or use it for any
            purpose beyond operating Pathway Travel.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-[#efefef]">Where it&apos;s stored</h2>
          <p>
            Your data is stored in <strong>Supabase</strong> (PostgreSQL database hosted
            on AWS). Authentication is handled by Supabase Auth. AI features use the{" "}
            <strong>Anthropic Claude API</strong>. All providers operate under their
            own privacy policies and data-processing agreements.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-[#efefef]">Your rights</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>You can delete your trips and packing data at any time from within the app</li>
            <li>To request full account deletion, email us using the feedback form and we&apos;ll remove everything within 30 days</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-[#efefef]">Cookies &amp; local storage</h2>
          <p>
            We use a single session cookie managed by Supabase to keep you signed in.
            No tracking or advertising cookies are used.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-gray-900 dark:text-[#efefef]">Contact</h2>
          <p>
            Questions about privacy? Use the{" "}
            <a
              href="https://forms.gle/AVgyaQaKBVUVTFKVA"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[#9fb8b8] transition-colors"
            >
              beta feedback form
            </a>
            .
          </p>
        </section>

      </div>
    </div>
  );
}
