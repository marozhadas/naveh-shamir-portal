export type QuickLinkColorVariant = "yellow" | "green" | "blue" | "orange";

export type QuickLink = {
  id: string;
  label: string;
  href: string;
  icon: string;
  colorVariant: QuickLinkColorVariant;
};
