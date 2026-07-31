import { z } from "zod";

export const colorTokenSchema = z.enum([
  "navy",
  "yellow",
  "green",
  "orange",
  "cyan",
  "whatsapp",
  "surface",
  "background",
  "inverse",
  "navy-muted",
  "highlight",
  "success",
  "text-primary",
  "text-secondary",
  "text-inverse",
  "text-on-accent",
  "muted",
  "border",
]);

export const spacingTokenSchema = z.enum([
  "0",
  "4",
  "8",
  "12",
  "16",
  "20",
  "24",
  "32",
  "40",
  "48",
  "64",
  "80",
  "96",
]);

export const radiusTokenSchema = z.enum(["sm", "md", "lg", "pill"]);

export const shadowTokenSchema = z.enum(["none", "sm", "card", "card-hover", "modal"]);

export const fontSizeTokenSchema = z.enum(["xs", "sm", "base", "lg", "xl", "2xl", "display"]);

export const fontWeightTokenSchema = z.enum(["light", "regular", "medium", "demibold", "bold", "black"]);

export const textAlignTokenSchema = z.enum(["start", "center"]);

export const buttonVariantTokenSchema = z.enum(["primary", "secondary", "accent", "whatsapp"]);

export const containerWidthTokenSchema = z.enum(["md", "lg", "xl"]);

export const iconTokenSchema = z.enum([
  "phone",
  "calendar-days",
  "hand-heart",
  "store",
  "message-circle",
  "clipboard-list",
  "map-pin",
  "users",
  "home",
  "heart",
  "book-open",
  "gift",
]);

const HTTPS_OR_LOCAL_PATTERN = /^(https:\/\/|\/)/;

export const editableImageSchema = z.object({
  src: z
    .string()
    .min(1)
    .refine((value) => HTTPS_OR_LOCAL_PATTERN.test(value), {
      message: "התמונה חייבת להיות קישור https:// או נתיב מקומי שמתחיל ב-/",
    })
    .refine((value) => !value.startsWith("data:"), {
      message: "לא ניתן לשמור תמונת Base64 בתוך קובץ ההגדרות",
    }),
  alt: z.string().max(160),
  objectFit: z.enum(["cover", "contain"]),
});
