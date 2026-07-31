export type QuickLinkColorVariant = "yellow" | "green" | "blue";

export type QuickLink = {
  id: string;
  label: string;
  href: string;
  icon: string;
  colorVariant: QuickLinkColorVariant;
};
