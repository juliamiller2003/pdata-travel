"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <footer className="mt-16 border-t border-gray-100 dark:border-[#2e2e2e] px-4 py-6 text-center text-xs text-gray-400 dark:text-[#9fb8b8]">
      <Link href="/privacy" className="hover:text-[#9fb8b8] transition-colors underline underline-offset-2">
        Privacy Policy
      </Link>
      <span className="mx-2">·</span>
      Pathway Travel beta
    </footer>
  );
}
