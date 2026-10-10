import { describe, expect, it } from "vitest";
import { createArticleJsonLd, createSiteJsonLd, serializeJsonLd } from "./json-ld";
import type { CommunityNewsRow } from "@/types/community-news";

const ORIGIN = "https://neveshamir.co.il";

function article(overrides: Partial<CommunityNewsRow> = {}): CommunityNewsRow {
  return {
    id: "1",
    title: "חוזרים לשגרה",
    slug: "back-to-normal",
    excerpt: "המדריך המקומי לחזרה לשגרה",
    body: "גוף הכתבה",
    image_url: "https://nzhbwbbxnrcaiubgpjlc.supabase.co/storage/v1/object/public/community-news-media/a.webp",
    image_alt: null,
    status: "published",
    display_order: 0,
    created_at: "2026-10-01T08:00:00+00:00",
    updated_at: "2026-10-03T09:15:00.123456+00:00",
    published_at: "2026-10-02T07:30:00+00:00",
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

describe("createArticleJsonLd", () => {
  it("builds an Article for a published article from existing fields only", () => {
    const data = createArticleJsonLd(article())!;
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@type"]).toBe("Article");
    expect(data.headline).toBe("חוזרים לשגרה");
    expect(data.url).toBe(`${ORIGIN}/news/back-to-normal`);
    expect(data.mainEntityOfPage).toEqual({ "@type": "WebPage", "@id": `${ORIGIN}/news/back-to-normal` });
    expect(data.description).toBe("המדריך המקומי לחזרה לשגרה");
    expect(data.image).toEqual(["https://nzhbwbbxnrcaiubgpjlc.supabase.co/storage/v1/object/public/community-news-media/a.webp"]);
    expect(data.publisher).toMatchObject({ "@type": "Organization", name: "פורטל נווה שמיר", logo: { url: `${ORIGIN}/images/logo-color.png` } });
  });

  it("dates are the stored ISO timestamps exactly as they are — nothing pasted on, the instant never changes", () => {
    const data = createArticleJsonLd(article())!;
    expect(data.datePublished).toBe("2026-10-02T07:30:00+00:00");
    expect(data.dateModified).toBe("2026-10-03T09:15:00.123456+00:00");
    expect(String(data.datePublished)).not.toContain("+03:00");
    expect(new Date(String(data.datePublished)).toISOString()).toBe("2026-10-02T07:30:00.000Z");
  });

  it("no author is invented", () => {
    expect(createArticleJsonLd(article())).not.toHaveProperty("author");
  });

  it("never produces structured data for a draft", () => {
    expect(createArticleJsonLd(article({ status: "draft" }))).toBeNull();
  });

  it("leaves out what the data does not have: no image, no publish date", () => {
    const data = createArticleJsonLd(article({ image_url: null, published_at: null }))!;
    expect(data).not.toHaveProperty("image");
    expect(data).not.toHaveProperty("datePublished");
  });

  it("a root-relative image joins the official domain; a Hebrew slug is encoded like the canonical", () => {
    const data = createArticleJsonLd(article({ image_url: "/images/x.jpg", slug: "פתיחת-שנה" }))!;
    expect(data.image).toEqual([`${ORIGIN}/images/x.jpg`]);
    expect(String(data.url)).toBe(`${ORIGIN}/news/%D7%A4%D7%AA%D7%99%D7%97%D7%AA-%D7%A9%D7%A0%D7%94`);
  });
});

describe("createSiteJsonLd", () => {
  const data = createSiteJsonLd() as { "@context": string; "@graph": Record<string, unknown>[] };
  const organization = data["@graph"].find((node) => node["@type"] === "Organization")!;
  const website = data["@graph"].find((node) => node["@type"] === "WebSite")!;

  it("is one graph with exactly one Organization and one WebSite, linked by @id", () => {
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@graph"]).toHaveLength(2);
    expect(organization["@id"]).toBe(`${ORIGIN}/#organization`);
    expect(website["@id"]).toBe(`${ORIGIN}/#website`);
    expect(website.publisher).toEqual({ "@id": `${ORIGIN}/#organization` });
  });

  it("contains the minimum verified facts: name, url, logo", () => {
    expect(organization).toMatchObject({ name: "פורטל נווה שמיר", url: `${ORIGIN}/`, logo: { "@type": "ImageObject", url: `${ORIGIN}/images/logo-color.png` } });
    expect(website).toMatchObject({ name: "פורטל נווה שמיר", url: `${ORIGIN}/`, inLanguage: "he" });
  });

  it("invents nothing: no legal name, tax id, address, phone, email, sameAs or search action", () => {
    for (const node of data["@graph"]) {
      for (const key of ["legalName", "vatID", "taxID", "address", "telephone", "email", "sameAs", "potentialAction", "contactPoint", "branchOf", "subOrganization"]) {
        expect(node, key).not.toHaveProperty(key);
      }
    }
  });
});

describe("serializeJsonLd", () => {
  it("cannot break out of the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
