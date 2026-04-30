"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const LoginMapBackground = dynamic(() => import("@/components/LoginMapBackground"), { ssr: false });

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");

  // Force light mode on the login page
  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    html.style.colorScheme = "light";
    return () => {
      if (wasDark) {
        html.classList.add("dark");
        html.style.colorScheme = "dark";
      } else {
        html.style.colorScheme = "";
      }
    };
  }, []);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="login-page relative min-h-screen" style={{ colorScheme: "light" }}>
      {/* Full-screen map background */}
      <LoginMapBackground />

      {/* Beta banner */}
      <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-center gap-1.5 bg-[#cadede] px-4 py-2 text-xs text-[#1e1e1e]">
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

      {/* Overlay */}
      <div className="fixed inset-0 bg-white/20 z-10" />

      {/* Login card */}
      <div className="relative z-20 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Hero */}
          <div className="mb-6 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg">
                <svg className="h-8 w-8 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#1e1e1e]" style={{ textShadow: "0 1px 3px rgba(255,255,255,0.9), 0 0 12px rgba(255,255,255,0.8)" }}>Welcome to Pdata Travel</h1>
            <p className="mt-1 text-sm text-[#1e1e1e]" style={{ textShadow: "0 1px 2px rgba(255,255,255,0.9)" }}>Plan to travel.</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl p-6 space-y-4">
            {sent ? (
              <div className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-800">
                Check your email for a magic link to sign in!
              </div>
            ) : (
              <>
                <button onClick={handleGoogle} className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs text-gray-500">
                    <span className="bg-white px-2">or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleMagicLink} className="space-y-3">
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors">
                    {loading ? "Sending…" : "Send magic link"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
