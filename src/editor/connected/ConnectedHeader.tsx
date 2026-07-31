"use client";

import { Header } from "@/components/layout/Header";
import { defaultHeaderSettings } from "@/editor/config/editor-defaults";
import { useResolvedSectionSettings } from "@/editor/hooks/use-resolved-section-settings";

export function ConnectedHeader() {
  const settings = useResolvedSectionSettings("header", defaultHeaderSettings);
  return <Header settings={settings} />;
}
