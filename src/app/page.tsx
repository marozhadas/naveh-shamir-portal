import { ConnectedHeader } from "@/editor/connected/ConnectedHeader";
import { ConnectedFooter } from "@/editor/connected/ConnectedFooter";
import { ConnectedHero } from "@/editor/connected/ConnectedHero";
import { ConnectedMovableSections } from "@/editor/connected/ConnectedMovableSections";
import { isEditorEnabled } from "@/editor/config/editor-capabilities";
import { EditableRegion } from "@/editor/components/EditableRegion/EditableRegion";
import { EditorHost } from "@/editor/EditorHost";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toURLSearchParams(resolved: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) params.append(key, entry);
  }
  return params;
}

export default async function Home({ searchParams }: HomeProps) {
  const editorEnabled = isEditorEnabled(toURLSearchParams(await searchParams));

  return (
    <EditorHost enabled={editorEnabled}>
      <a href="#main-content" className="skip-link">
        דלגו לתוכן הראשי
      </a>
      <EditableRegion id="home.header" label="כותרת עליונה">
        <ConnectedHeader />
      </EditableRegion>
      <main id="main-content">
        <EditableRegion id="home.hero" label="אזור ראשי">
          <ConnectedHero />
        </EditableRegion>
        <ConnectedMovableSections />
      </main>
      <EditableRegion id="home.footer" label="פוטר">
        <ConnectedFooter />
      </EditableRegion>
    </EditorHost>
  );
}
