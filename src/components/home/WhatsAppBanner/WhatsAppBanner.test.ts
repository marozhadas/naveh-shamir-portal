import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { WhatsAppBanner } from "./WhatsAppBanner";
import { defaultWhatsAppBannerSettings } from "@/editor/config/editor-defaults";
import { isPlaceholderWhatsAppUrl } from "@/utils/validate-whatsapp-group-url";
import type { WhatsAppBannerEditorSettings } from "@/editor/schemas/whatsapp.schema";

function render(whatsappUrl: string): string {
  const settings: WhatsAppBannerEditorSettings = { ...defaultWhatsAppBannerSettings, content: { ...defaultWhatsAppBannerSettings.content, whatsappUrl } };
  return renderToStaticMarkup(createElement(WhatsAppBanner, { settings }));
}

describe("community WhatsApp link placeholder", () => {
  it("recognises the stand-in invite link", () => {
    expect(isPlaceholderWhatsAppUrl("https://chat.whatsapp.com/nevesh-community-placeholder")).toBe(true);
    expect(isPlaceholderWhatsAppUrl("https://chat.whatsapp.com/FRJpg0jTLx8KDsNmVfOGzW")).toBe(false);
  });

  it("does not send visitors to the placeholder: the join button is not rendered, the rest of the banner stays", () => {
    const html = render("https://chat.whatsapp.com/nevesh-community-placeholder");
    expect(html).not.toContain("placeholder");
    expect(html).not.toContain("הצטרפו עכשיו");
    expect(html).toContain(defaultWhatsAppBannerSettings.content.title);
  });

  it("shows the join button as soon as a real link is set", () => {
    const html = render("https://chat.whatsapp.com/FRJpg0jTLx8KDsNmVfOGzW");
    expect(html).toContain("הצטרפו עכשיו");
    expect(html).toContain("https://chat.whatsapp.com/FRJpg0jTLx8KDsNmVfOGzW");
  });
});
