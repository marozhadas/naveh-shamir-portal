import type { ComponentType } from "react";
import { FacebookIcon } from "@/components/ui/FacebookIcon";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import { TiktokIcon } from "@/components/ui/TiktokIcon";
import { YoutubeIcon } from "@/components/ui/YoutubeIcon";
import { LinkedinIcon } from "@/components/ui/LinkedinIcon";
import type { BusinessSocialLinks } from "@/types/business";
import { isSafeHref } from "@/utils/validate-href";
import styles from "./BusinessSocialLinksRow.module.css";

const PLATFORM_LABEL: Record<keyof BusinessSocialLinks, string> = {
  instagram: "אינסטגרם",
  facebook: "פייסבוק",
  tiktok: "טיקטוק",
  youtube: "יוטיוב",
  linkedin: "לינקדאין",
};

type PlatformIconProps = { size?: number; "aria-hidden"?: boolean | "true" | "false" };

const PLATFORM_ICON: Record<keyof BusinessSocialLinks, ComponentType<PlatformIconProps>> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
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
        {entries.map(({ platform, url }) => {
          const Icon = PLATFORM_ICON[platform];
          return (
            <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <Icon size={15} aria-hidden="true" />
              {PLATFORM_LABEL[platform]}
            </a>
          );
        })}
      </div>
    </section>
  );
}
