import localFont from "next/font/local";

export const ploni = localFont({
  src: [
    { path: "../fonts/ploni/ploni-ultralight-aaa.woff2", weight: "200", style: "normal" },
    { path: "../fonts/ploni/ploni-light-aaa.woff2", weight: "300", style: "normal" },
    { path: "../fonts/ploni/ploni-regular-aaa.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ploni/ploni-medium-aaa.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ploni/ploni-demibold-aaa.woff2", weight: "600", style: "normal" },
    { path: "../fonts/ploni/ploni-bold-aaa.woff2", weight: "700", style: "normal" },
    { path: "../fonts/ploni/ploni-ultrabold-aaa.woff2", weight: "800", style: "normal" },
    { path: "../fonts/ploni/ploni-black-aaa.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-ploni",
  display: "swap",
  fallback: ["Heebo", "Assistant", "system-ui", "sans-serif"],
});
