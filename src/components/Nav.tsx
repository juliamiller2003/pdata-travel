"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import NavMenu from "@/components/NavMenu";

interface NavProps {
  user: User | null;
}

export default function Nav({ user }: NavProps) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "?";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo + hamburger */}
        <div className="flex items-center gap-2">
          {user && <NavMenu />}
          <Link href="/trips" className="flex items-center gap-2 font-bold text-brand-700 text-lg">
            <svg
              className="h-7 w-7 text-brand-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            Pdata Travel
          </Link>
        </div>

        {/* Right side */}
        {user && (
          <div className="flex items-center gap-3">
            <Link href="/trips/new" className="btn-primary hidden sm:inline-flex">
              + New Trip
            </Link>

            <div className="relative group">
              <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-200"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white text-sm font-semibold ring-2 ring-gray-200">
                    {initials}
                  </span>
                )}
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 mt-1 w-44 rounded-lg border border-gray-100 bg-white py-1 shadow-lg opacity-0 invisible group-focus-within:opacity-100 group-focus-within:visible transition-all">
                <p className="truncate px-3 py-2 text-xs text-gray-500">{user.email}</p>
                <hr className="my-1 border-gray-100" />
                <Link
                  href="/settings"
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Settings
                </Link>
                <button
                  onClick={signOut}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
