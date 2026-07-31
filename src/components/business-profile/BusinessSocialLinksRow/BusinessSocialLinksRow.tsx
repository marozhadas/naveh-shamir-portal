import { ExternalLink } from "lucide-react";
import type { BusinessSocialLinks } from "@/types/business";
import { isSafeHref } from "@/utils/validate-href";
import styles from "./BusinessSocialLinksRow.module.css";

// lucide-react (this project's only icon set) doesn't ship brand/platform logos, so every link
// uses the same generic external-link icon and is disambiguated by its visible label instead.
const PLATFORM_LABEL: Record<keyof BusinessSocialLinks, string> = {
  instagram: "אינסטגרם",
  facebook: "פייסבוק",
  tiktok: "טיקטוק",
  youtube: "יוטיוב",
  linkedin: "לינקדאין",
};

type BusinessSocialLinksRowProps = {
  socialLinks: BusinessSocialLinks | undefined;
};

/** Only real, https-only links are rendered — spec section 17: no empty/unsafe links shown. */
export function BusinessSocialLinksRow({ socialLinks }: BusinessSocialLinksRowProps) {
  if (!socialLinks) return null;

  const entries = (Object.keys(PLATFORM_LABEL) as Array<keyof BusinessSocialLinks>)
    .map((platform) => ({ platform, url: socialLinks[platform] }))
    .filter((entry): entry is { platform: keyof BusinessSocialLinks; url: string } =>
      Boolean(entry.url && entry.url.startsWith("https://") && isSafeHref(entry.url)),
    );

  if (entries.length === 0) return null;

  return (
    <section className={styles.section} aria-label="קישורים חברתיים">
      <div className={styles.row}>
        {entries.map(({ platform, url }) => (
          <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className={styles.link}>
            <ExternalLink size={15} aria-hidden="true" />
            {PLATFORM_LABEL[platform]}
          </a>
        ))}
      </div>
    </section>
  );
}
