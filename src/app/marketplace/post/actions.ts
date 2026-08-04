"use server";

import { createPublicSupabaseClient } from "@/lib/supabase/public-client";
import { uploadMarketplaceMedia } from "@/repositories/marketplace-media-service";
import { slugify } from "@/utils/slugify";
import { marketplaceListingSchema, EMPTY_LISTING_FORM_VALUES, type MarketplaceListingFormValues } from "./schema";
import type { MarketplaceListingImage } from "@/types/marketplace";

export type MarketplaceListingActionState = {
  status: "idle" | "validation-error" | "server-error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof MarketplaceListingFormValues, string[]>>;
  values: MarketplaceListingFormValues;
};

const GENERIC_SERVER_ERROR_MESSAGE = "לא הצלחנו לשמור את המודעה כרגע. הפרטים שמילאת נשמרו, ואפשר לנסות שוב בעוד רגע.";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readFormValues(formData: FormData): MarketplaceListingFormValues {
  return {
    title: readField(formData, "title"),
    description: readField(formData, "description"),
    listingType: readField(formData, "listingType") as MarketplaceListingFormValues["listingType"],
    categoryId: readField(formData, "categoryId"),
    isFree: formData.get("isFree") === "on",
    price: readField(formData, "price"),
    condition: readField(formData, "condition"),
    area: readField(formData, "area"),
    contactName: readField(formData, "contactName"),
    phone: readField(formData, "phone"),
    whatsappPhone: readField(formData, "whatsappPhone"),
  };
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

/** Every insert is forced to status="pending" — RLS enforces this regardless of what's sent (see create_marketplace_listings migration), so it never becomes visible until an admin approves it. */
export async function submitMarketplaceListingAction(
  _prevState: MarketplaceListingActionState,
  formData: FormData,
): Promise<MarketplaceListingActionState> {
  const raw = readFormValues(formData);
  const result = marketplaceListingSchema.safeParse(raw);

  if (!result.success) {
    return {
      status: "validation-error",
      message: "יש כמה פרטים שצריך לתקן",
      fieldErrors: result.error.flatten().fieldErrors,
      values: raw,
    };
  }

  let images: MarketplaceListingImage[] = [];
  const imagesRaw = formData.get("images");
  if (typeof imagesRaw === "string" && imagesRaw) {
    try {
      images = JSON.parse(imagesRaw);
    } catch {
      images = [];
    }
  }

  const values = result.data;
  const supabase = createPublicSupabaseClient();
  const baseSlug = slugify(values.title);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : slugify(values.title, randomSuffix());
    const { error } = await supabase.from("marketplace_listings").insert({
      slug,
      title: values.title,
      description: values.description,
      listing_type: values.listingType,
      category_id: values.categoryId,
      price: values.isFree ? null : Number(values.price),
      is_free: values.isFree,
      condition: values.condition || null,
      images,
      area: values.area || null,
      contact_name: values.contactName,
      phone: values.phone || null,
      whatsapp_phone: values.whatsappPhone || null,
      status: "pending",
      rejection_reason: null,
      reviewed_at: null,
    });

    if (!error) {
      return { status: "success", values: EMPTY_LISTING_FORM_VALUES };
    }

    if (error.code !== "23505") {
      console.error("[submitMarketplaceListingAction] insert failed:", error.code, error.message);
      return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE, values: raw };
    }
  }

  console.error("[submitMarketplaceListingAction] exhausted slug-collision retries");
  return { status: "server-error", message: GENERIC_SERVER_ERROR_MESSAGE, values: raw };
}

export type UploadImageActionResult = { success: true; url: string } | { success: false; message: string };

const UPLOAD_ERROR_MESSAGE: Record<string, string> = {
  "not-configured": "העלאת תמונות אינה זמינה כרגע.",
  "invalid-type": "יש להעלות קובץ JPG, PNG או WebP בלבד.",
  "too-large": "התמונה גדולה מדי — עד 5MB.",
  "upload-failed": "העלאת התמונה נכשלה. נסו שוב.",
};

/** Called once per image the form uploads, before the listing itself is submitted — mirrors uploadBusinessMediaAction. */
export async function uploadMarketplaceImageAction(draftId: string, file: File): Promise<UploadImageActionResult> {
  const result = await uploadMarketplaceMedia(draftId, file);
  if (!result.success) {
    return { success: false, message: UPLOAD_ERROR_MESSAGE[result.reason] };
  }
  return { success: true, url: result.url };
}
