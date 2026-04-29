"use client";

import { useEffect, useState } from "react";
import { getSectionVisibility, type SectionKey } from "@/lib/tripSections";

export default function SectionGuard({ section, children }: { section: SectionKey; children: React.ReactNode }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(getSectionVisibility()[section]);
  }, [section]);

  if (!visible) return null;
  return <>{children}</>;
}
