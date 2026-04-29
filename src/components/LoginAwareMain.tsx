"use client";

import { usePathname } from "next/navigation";

export default function LoginAwareMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>;
}
